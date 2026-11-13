<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\AuthMiddleware;
use Eirvan\Middleware\RateLimitMiddleware;
use Eirvan\Services\FirestoreService;
use Eirvan\Services\LoggerService;
use Eirvan\Validators\RequestValidator;
use RuntimeException;

/**
 * Authoritative Server-Side Order Creation, Listing, Status Transitions & Atomic Inventory Control.
 */
final class OrderController
{
    private const ALLOWED_STATUSES = [
        'Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned',
    ];

    public function __construct(
        private FirestoreService $firestore,
        private AuthMiddleware $auth,
        private RateLimitMiddleware $rateLimit,
        private LoggerService $logger
    ) {}

    public function create(array $input): array
    {
        $this->rateLimit->enforce('orders_create', 15, 600);

        $errors = RequestValidator::validateOrderPayload($input);
        if (!empty($errors)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => implode(' ', $errors)]];
        }

        $idempotencyKey = RequestValidator::cleanString($input['idempotencyKey'], 128);

        // Fast-path idempotency check before opening a write transaction
        $existingIdem = $this->firestore->getDocument('order_idempotency', $idempotencyKey);
        if (is_array($existingIdem) && !empty($existingIdem['orderId'])) {
            $existingOrder = $this->firestore->getDocument('orders', (string) $existingIdem['orderId']);
            if (is_array($existingOrder)) {
                return [
                    'status' => 200,
                    'body' => [
                        'success' => true,
                        'idempotentReplay' => true,
                        'order' => $this->sanitizeOrderForCustomer($existingOrder),
                    ],
                ];
            }
        }

        $couponCode = strtoupper(preg_replace('/[^A-Z0-9_\-]/', '', trim((string) ($input['couponCode'] ?? ''))) ?? '');
        $paymentMethod = (string) $input['paymentMethod'];
        $bankRef = RequestValidator::cleanString($input['bankReference'] ?? '', 120);

        try {
            $result = $this->firestore->runTransaction(function (string $tx) use ($input, $idempotencyKey, $couponCode, $paymentMethod, $bankRef) {
                $idemTxDoc = $this->firestore->getDocument('order_idempotency', $idempotencyKey, $tx);
                if (is_array($idemTxDoc) && !empty($idemTxDoc['orderId'])) {
                    $replayOrder = $this->firestore->getDocument('orders', (string) $idemTxDoc['orderId'], $tx);
                    if (is_array($replayOrder)) {
                        return [
                            'writes' => [],
                            'result' => [
                                'replay' => true,
                                'order' => $replayOrder,
                                'trackingToken' => null,
                            ],
                        ];
                    }
                }

                // 1. Load trusted store settings
                $settings = $this->firestore->getDocument('settings', 'main', $tx) ?? [
                    'freeShippingThreshold' => 3500,
                    'standardShippingRate' => 250,
                    'codEnabled' => true,
                ];

                if ($paymentMethod === 'COD' && isset($settings['codEnabled']) && $settings['codEnabled'] === false) {
                    throw new RuntimeException('VALIDATION:Cash on Delivery is currently disabled.');
                }

                $writes = [];
                $verifiedItems = [];
                $subtotal = 0;

                // Cache product documents read inside transaction so multi-variant items from same product share update state
                $productCache = [];

                foreach ((array) $input['items'] as $rawItem) {
                    if (!is_array($rawItem)) {
                        throw new RuntimeException('VALIDATION:Malformed cart item.');
                    }

                    $qty = (int) ($rawItem['quantity'] ?? 0);
                    if ($qty < 1 || $qty > 100) {
                        throw new RuntimeException('VALIDATION:Item quantity must be between 1 and 100.');
                    }

                    $customBuild = $rawItem['customBuild'] ?? null;

                    if (is_array($customBuild) && !empty($customBuild['kind'])) {
                        $computed = $this->verifyCustomBuildItem($rawItem, $customBuild, $qty, $tx);
                        $verifiedItems[] = $computed['orderItem'];
                        $subtotal += $computed['lineSubtotal'];
                        continue;
                    }

                    // Standard catalog product
                    $productId = RequestValidator::cleanString($rawItem['productId'] ?? '', 128);
                    $variantId = RequestValidator::cleanString($rawItem['variantId'] ?? '', 128);
                    if (!RequestValidator::isValidDocId($productId) || $variantId === '') {
                        throw new RuntimeException('VALIDATION:Invalid product reference in cart.');
                    }

                    if (!isset($productCache[$productId])) {
                        $prod = $this->firestore->getDocument('products', $productId, $tx);
                        if (!is_array($prod)) {
                            throw new RuntimeException('VALIDATION:One or more selected products are no longer available.');
                        }
                        $productCache[$productId] = $prod;
                    }

                    $prod = &$productCache[$productId];
                    $matchedIndex = null;
                    foreach ((array) ($prod['variants'] ?? []) as $idx => $variant) {
                        if (is_array($variant) && (string) ($variant['id'] ?? '') === $variantId) {
                            $matchedIndex = $idx;
                            break;
                        }
                    }

                    if ($matchedIndex === null) {
                        throw new RuntimeException('VALIDATION:Selected pack weight is unavailable for ' . ($prod['name'] ?? 'product') . '.');
                    }

                    $variant = $prod['variants'][$matchedIndex];
                    $currentStock = (int) ($variant['stock'] ?? 0);
                    if ($currentStock < $qty) {
                        throw new RuntimeException(sprintf(
                            'STOCK:Insufficient stock for %s (%s). Available: %d.',
                            (string) ($prod['name'] ?? 'item'),
                            (string) ($variant['weight'] ?? ''),
                            $currentStock
                        ));
                    }

                    $unitPrice = (int) round((float) (!empty($variant['salePrice']) ? $variant['salePrice'] : $variant['price']));
                    if ($unitPrice <= 0) {
                        throw new RuntimeException('VALIDATION:Invalid product pricing configuration.');
                    }

                    // Deduct stock on cached product inside transaction
                    $prod['variants'][$matchedIndex]['stock'] = $currentStock - $qty;
                    $anyInStock = false;
                    foreach ($prod['variants'] as $vCheck) {
                        if ((int) ($vCheck['stock'] ?? 0) > 0) {
                            $anyInStock = true;
                            break;
                        }
                    }
                    $prod['inStock'] = $anyInStock;
                    $prod['_dirty'] = true;

                    $lineSubtotal = $unitPrice * $qty;
                    $subtotal += $lineSubtotal;

                    $verifiedItems[] = [
                        'productId' => $productId,
                        'productName' => (string) ($prod['name'] ?? ''),
                        'variantId' => $variantId,
                        'variantWeight' => (string) ($variant['weight'] ?? ''),
                        'sku' => (string) ($variant['sku'] ?? ''),
                        'price' => $unitPrice,
                        'quantity' => $qty,
                        'subtotal' => $lineSubtotal,
                        'imageUrl' => (string) ($prod['imageUrl'] ?? ''),
                    ];
                }

                // Queue optimistic product stock updates
                foreach ($productCache as $pid => $prodDoc) {
                    if (!empty($prodDoc['_dirty'])) {
                        $expectedUpdateTime = (string) ($prodDoc['_updateTime'] ?? '');
                        $cleanProd = $prodDoc;
                        unset($cleanProd['_docId'], $cleanProd['_updateTime'], $cleanProd['_dirty']);
                        $writes[] = $this->firestore->buildUpdateWithPrecondition(
                            'products',
                            (string) $pid,
                            [
                                'variants' => $cleanProd['variants'],
                                'inStock' => $cleanProd['inStock'],
                            ],
                            $expectedUpdateTime,
                            ['variants', 'inStock']
                        );
                    }
                }

                // 2. Validate & apply optional coupon atomically
                $discountAmount = 0;
                $appliedCouponCode = null;

                if ($couponCode !== '') {
                    if (!RequestValidator::isValidDocId($couponCode)) {
                        throw new RuntimeException('VALIDATION:Invalid coupon code format.');
                    }
                    $coupon = $this->firestore->getDocument('coupons', $couponCode, $tx);
                    if (!is_array($coupon) || empty($coupon['isActive'])) {
                        throw new RuntimeException('VALIDATION:Coupon code is invalid or inactive.');
                    }
                    if (!empty($coupon['expiryDate']) && $this->isCouponExpired((string) $coupon['expiryDate'])) {
                        throw new RuntimeException('VALIDATION:This coupon code has expired.');
                    }
                    $minAmount = (float) ($coupon['minOrderAmount'] ?? 0);
                    if ($subtotal < $minAmount) {
                        throw new RuntimeException(sprintf(
                            'VALIDATION:Coupon %s requires a minimum order of Rs. %s.',
                            $couponCode,
                            number_format($minAmount)
                        ));
                    }

                    $discountVal = (float) ($coupon['discountValue'] ?? 0);
                    if (($coupon['discountType'] ?? '') === 'percentage') {
                        $discountAmount = (int) round(($subtotal * $discountVal) / 100);
                    } else {
                        $discountAmount = (int) min($subtotal, round($discountVal));
                    }
                    $appliedCouponCode = (string) ($coupon['code'] ?? $couponCode);

                    $writes[] = $this->firestore->buildIncrementWrite('coupons', $couponCode, 'usageCount', 1);
                }

                // 3. Calculate shipping & total on server
                $freeThreshold = (float) ($settings['freeShippingThreshold'] ?? 3500);
                $stdRate = (int) round((float) ($settings['standardShippingRate'] ?? 250));
                $shippingFee = ($subtotal === 0 || $subtotal >= $freeThreshold) ? 0 : $stdRate;
                $totalAmount = max(0, $subtotal + $shippingFee - $discountAmount);

                // 4. Mint order record + cryptographically random trackingToken
                $orderId = 'ord-' . gmdate('YmdHis') . '-' . bin2hex(random_bytes(3));
                $orderNumber = 'ZDS-' . gmdate('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
                $trackingToken = bin2hex(random_bytes(16));
                $trackingTokenHash = hash('sha256', $trackingToken);
                $trackingNumber = 'PK-' . random_int(100000000, 999999999);
                $createdAt = gmdate('c');

                $internalNotes = [];
                if ($bankRef !== '') {
                    $internalNotes[] = 'Bank Reference: ' . $bankRef;
                }

                $orderDoc = [
                    'id' => $orderId,
                    'orderNumber' => $orderNumber,
                    'createdAt' => $createdAt,
                    'customerName' => RequestValidator::cleanString($input['customerName'], 100),
                    'customerPhone' => RequestValidator::cleanString($input['customerPhone'], 30),
                    'normalizedPhone' => RequestValidator::normalizePhone((string) $input['customerPhone']),
                    'customerEmail' => RequestValidator::cleanString($input['customerEmail'] ?? '', 100),
                    'city' => RequestValidator::cleanString($input['city'], 50),
                    'province' => RequestValidator::cleanString($input['province'], 50),
                    'address' => RequestValidator::cleanString($input['address'], 300),
                    'specialInstructions' => RequestValidator::cleanString($input['specialInstructions'] ?? '', 500),
                    'items' => $verifiedItems,
                    'subtotal' => $subtotal,
                    'shippingFee' => $shippingFee,
                    'discountAmount' => $discountAmount,
                    'couponCode' => $appliedCouponCode ?? '',
                    'totalAmount' => $totalAmount,
                    'paymentMethod' => $paymentMethod,
                    'paymentReference' => $bankRef,
                    'paymentStatus' => 'Pending',
                    'orderStatus' => 'Pending',
                    'courier' => 'TCS Express Pakistan',
                    'trackingNumber' => $trackingNumber,
                    'trackingTokenHash' => $trackingTokenHash,
                    'idempotencyKey' => $idempotencyKey,
                    'stockRestored' => false,
                    'internalNotes' => $internalNotes,
                ];

                $writes[] = $this->firestore->buildCreateWrite('orders', $orderId, $orderDoc);
                $writes[] = $this->firestore->buildCreateWrite('order_idempotency', $idempotencyKey, [
                    'orderId' => $orderId,
                    'orderNumber' => $orderNumber,
                    'createdAt' => $createdAt,
                ]);

                return [
                    'writes' => $writes,
                    'result' => [
                        'replay' => false,
                        'order' => $orderDoc,
                        'trackingToken' => $trackingToken,
                    ],
                ];
            });

            $this->logger->info('order_created', [
                'orderId' => $result['order']['id'] ?? null,
                'orderNumber' => $result['order']['orderNumber'] ?? null,
                'paymentMethod' => $paymentMethod,
                'totalAmount' => $result['order']['totalAmount'] ?? 0,
            ]);

            $payload = [
                'success' => true,
                'order' => $this->sanitizeOrderForCustomer($result['order']),
            ];
            if (!empty($result['trackingToken'])) {
                $payload['trackingToken'] = $result['trackingToken'];
            }

            return [
                'status' => !empty($result['replay']) ? 200 : 201,
                'body' => $payload,
            ];
        } catch (RuntimeException $e) {
            $msg = $e->getMessage();
            if (str_starts_with($msg, 'VALIDATION:')) {
                return ['status' => 400, 'body' => ['success' => false, 'error' => substr($msg, 11)]];
            }
            if (str_starts_with($msg, 'STOCK:')) {
                return ['status' => 409, 'body' => ['success' => false, 'error' => substr($msg, 6)]];
            }
            $this->logger->error('order_create_failed', ['error' => $msg]);
            return [
                'status' => 500,
                'body' => ['success' => false, 'error' => 'Unable to process your order right now. Please try again.'],
            ];
        }
    }

    public function listAdmin(array $query): array
    {
        $this->auth->requireAdmin();

        $limit = max(1, min(300, (int) ($query['limit'] ?? 150)));
        $statusFilter = RequestValidator::cleanString($query['status'] ?? '', 30);

        $where = [];
        if ($statusFilter !== '' && in_array($statusFilter, self::ALLOWED_STATUSES, true)) {
            $where['orderStatus'] = $statusFilter;
        }

        $orders = $this->firestore->runQuery('orders', $where, 'createdAt', 'DESCENDING', $limit);
        $cleaned = array_map(fn(array $o): array => $this->sanitizeOrderForAdmin($o), $orders);

        return [
            'status' => 200,
            'body' => ['success' => true, 'orders' => $cleaned],
        ];
    }

    public function updateStatus(string $orderId, array $input): array
    {
        $admin = $this->auth->requireAdmin();

        if (!RequestValidator::isValidDocId($orderId)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid order ID.']];
        }

        $newStatus = RequestValidator::cleanString($input['orderStatus'] ?? '', 30);
        if (!in_array($newStatus, self::ALLOWED_STATUSES, true)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'Invalid orderStatus value.']];
        }

        $adminNote = RequestValidator::cleanString($input['adminNote'] ?? '', 300);
        $trackingNumber = isset($input['trackingNumber']) ? RequestValidator::cleanString($input['trackingNumber'], 50) : null;
        $courier = isset($input['courier']) ? RequestValidator::cleanString($input['courier'], 50) : null;
        $explicitPaymentStatus = isset($input['paymentStatus']) ? RequestValidator::cleanString($input['paymentStatus'], 20) : null;

        try {
            $updatedOrder = $this->firestore->runTransaction(function (string $tx) use (
                $orderId,
                $newStatus,
                $adminNote,
                $trackingNumber,
                $courier,
                $explicitPaymentStatus
            ) {
                $order = $this->firestore->getDocument('orders', $orderId, $tx);
                if (!is_array($order)) {
                    throw new RuntimeException('NOT_FOUND:Order not found.');
                }

                $notes = is_array($order['internalNotes'] ?? null) ? $order['internalNotes'] : [];
                if ($adminNote !== '') {
                    $notes[] = '[' . gmdate('Y-m-d') . '] ' . $adminNote;
                }

                $paymentStatus = (string) ($order['paymentStatus'] ?? 'Pending');
                if ($explicitPaymentStatus !== null && in_array($explicitPaymentStatus, ['Pending', 'Paid', 'Failed', 'Refunded'], true)) {
                    $paymentStatus = $explicitPaymentStatus;
                } elseif ($newStatus === 'Delivered' && ($order['paymentMethod'] ?? '') === 'COD') {
                    $paymentStatus = 'Paid';
                }

                $writes = [];
                $stockRestored = (bool) ($order['stockRestored'] ?? false);

                // Restore catalog variant stock once upon transition to Cancelled or Returned
                if (in_array($newStatus, ['Cancelled', 'Returned'], true) && !$stockRestored) {
                    $productCache = [];
                    foreach ((array) ($order['items'] ?? []) as $item) {
                        if (!is_array($item)) {
                            continue;
                        }
                        $pid = (string) ($item['productId'] ?? '');
                        $vid = (string) ($item['variantId'] ?? '');
                        $qty = (int) ($item['quantity'] ?? 0);
                        if ($pid === '' || $vid === '' || $qty <= 0 || str_starts_with($pid, 'custom-')) {
                            continue;
                        }
                        if (!isset($productCache[$pid])) {
                            $p = $this->firestore->getDocument('products', $pid, $tx);
                            if (is_array($p)) {
                                $productCache[$pid] = $p;
                            }
                        }
                        if (!isset($productCache[$pid])) {
                            continue;
                        }
                        foreach ((array) ($productCache[$pid]['variants'] ?? []) as $idx => $v) {
                            if (is_array($v) && (string) ($v['id'] ?? '') === $vid) {
                                $productCache[$pid]['variants'][$idx]['stock'] = (int) ($v['stock'] ?? 0) + $qty;
                                $productCache[$pid]['inStock'] = true;
                                $productCache[$pid]['_dirty'] = true;
                                break;
                            }
                        }
                    }

                    foreach ($productCache as $pid => $prodDoc) {
                        if (!empty($prodDoc['_dirty'])) {
                            $writes[] = $this->firestore->buildUpdateWithPrecondition(
                                'products',
                                (string) $pid,
                                [
                                    'variants' => $prodDoc['variants'],
                                    'inStock' => true,
                                ],
                                (string) ($prodDoc['_updateTime'] ?? ''),
                                ['variants', 'inStock']
                            );
                        }
                    }
                    $stockRestored = true;
                }

                $patchFields = [
                    'orderStatus' => $newStatus,
                    'paymentStatus' => $paymentStatus,
                    'internalNotes' => $notes,
                    'stockRestored' => $stockRestored,
                ];
                if ($trackingNumber !== null && $trackingNumber !== '') {
                    $patchFields['trackingNumber'] = $trackingNumber;
                }
                if ($courier !== null && $courier !== '') {
                    $patchFields['courier'] = $courier;
                }

                $writes[] = $this->firestore->buildUpdateWithPrecondition(
                    'orders',
                    $orderId,
                    $patchFields,
                    (string) ($order['_updateTime'] ?? ''),
                    array_keys($patchFields)
                );

                return [
                    'writes' => $writes,
                    'result' => array_merge($order, $patchFields),
                ];
            });

            $this->logger->info('order_status_updated', [
                'orderId' => $orderId,
                'newStatus' => $newStatus,
                'adminUid' => $admin['uid'],
            ]);

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'order' => $this->sanitizeOrderForAdmin($updatedOrder),
                ],
            ];
        } catch (RuntimeException $e) {
            if (str_starts_with($e->getMessage(), 'NOT_FOUND:')) {
                return ['status' => 404, 'body' => ['success' => false, 'error' => 'Order not found.']];
            }
            $this->logger->error('order_status_update_failed', ['orderId' => $orderId, 'error' => $e->getMessage()]);
            return ['status' => 500, 'body' => ['success' => false, 'error' => 'Failed to update order status.']];
        }
    }

    private function verifyCustomBuildItem(array $rawItem, array $customBuild, int $qty, string $tx): array
    {
        $kind = (string) ($customBuild['kind'] ?? '');
        $items = (array) ($customBuild['items'] ?? []);

        if (empty($items) || count($items) > 40) {
            throw new RuntimeException('VALIDATION:Custom selection contains an invalid number of ingredients.');
        }

        if ($kind === 'shahi-box') {
            $boxId = RequestValidator::cleanString($customBuild['boxId'] ?? '', 128);
            $boxDoc = $this->firestore->getDocument('shahi_boxes', $boxId, $tx);
            if (!is_array($boxDoc)) {
                throw new RuntimeException('VALIDATION:Selected Shahi gift box packaging is unavailable.');
            }
            $capacity = (int) ($boxDoc['capacity'] ?? 4);
            if (count($items) < 2 || count($items) > $capacity) {
                throw new RuntimeException("VALIDATION:Shahi Mix Box requires between 2 and {$capacity} fillings.");
            }

            $fillingsTotal = 0;
            $totalGrams = 0;
            $descParts = [];

            foreach ($items as $entry) {
                $ingId = RequestValidator::cleanString($entry['ingredientId'] ?? '', 128);
                $portionId = RequestValidator::cleanString($entry['portionId'] ?? '', 128);
                $ing = $this->firestore->getDocument('shahi_ingredients', $ingId, $tx);
                if (!is_array($ing) || empty($ing['inStock'])) {
                    throw new RuntimeException('VALIDATION:Selected ingredient is currently out of stock.');
                }

                $matchedPortion = null;
                foreach ((array) ($ing['portions'] ?? []) as $p) {
                    if (is_array($p) && (string) ($p['id'] ?? '') === $portionId) {
                        $matchedPortion = $p;
                        break;
                    }
                }
                if ($matchedPortion === null) {
                    throw new RuntimeException('VALIDATION:Selected portion weight is invalid for ' . ($ing['name'] ?? 'ingredient') . '.');
                }

                $fillingsTotal += (int) round((float) $matchedPortion['price']);
                $totalGrams += (int) ($matchedPortion['weightGrams'] ?? 0);
                $descParts[] = ($ing['name'] ?? 'Item') . ' (' . ($matchedPortion['weight'] ?? '') . ')';
            }

            $unitPrice = (int) round((float) ($boxDoc['basePrice'] ?? 0)) + $fillingsTotal;
            $lineSubtotal = $unitPrice * $qty;

            return [
                'lineSubtotal' => $lineSubtotal,
                'orderItem' => [
                    'productId' => 'custom-shahi-' . $boxId,
                    'productName' => 'Custom Shahi Mix (' . ($boxDoc['name'] ?? 'Gift Box') . ')',
                    'variantId' => RequestValidator::cleanString($rawItem['variantId'] ?? ('var-shahi-' . $boxId), 128),
                    'variantWeight' => $totalGrams . 'g Total (' . count($items) . ' Fillings) [' . implode(', ', $descParts) . ']',
                    'sku' => 'SHAHI-CUSTOM',
                    'price' => $unitPrice,
                    'quantity' => $qty,
                    'subtotal' => $lineSubtotal,
                    'imageUrl' => (string) ($boxDoc['image'] ?? ''),
                ],
            ];
        }

        if ($kind === 'custom-mix') {
            $title = RequestValidator::cleanString($customBuild['title'] ?? 'Bespoke Pantry Mix', 100);
            $mixPrice = 0;
            $totalGrams = 0;
            $descParts = [];
            $firstImage = '';

            foreach ($items as $entry) {
                $ingId = RequestValidator::cleanString($entry['ingredientId'] ?? '', 128);
                $weightLabel = RequestValidator::cleanString($entry['weightLabel'] ?? '', 20);
                $multiplier = max(1, min(50, (int) ($entry['multiplier'] ?? 1)));

                $ing = $this->firestore->getDocument('shahi_ingredients', $ingId, $tx);
                if (!is_array($ing) || empty($ing['inStock'])) {
                    throw new RuntimeException('VALIDATION:One or more selected mix ingredients are unavailable.');
                }
                if ($firstImage === '' && !empty($ing['image'])) {
                    $firstImage = (string) $ing['image'];
                }

                [$portionPrice, $gramsPerUnit] = $this->computeIngredientWeightPrice($ing, $weightLabel);
                $mixPrice += $portionPrice * $multiplier;
                $totalGrams += $gramsPerUnit * $multiplier;
                $descParts[] = ($ing['name'] ?? 'Item') . ' (' . ($gramsPerUnit * $multiplier) . 'g)';
            }

            $lineSubtotal = $mixPrice * $qty;
            return [
                'lineSubtotal' => $lineSubtotal,
                'orderItem' => [
                    'productId' => 'custom-mix',
                    'productName' => $title !== '' ? $title : 'Bespoke Pantry Mix',
                    'variantId' => RequestValidator::cleanString($rawItem['variantId'] ?? 'var-custom-mix', 128),
                    'variantWeight' => $totalGrams . 'g [' . implode(' + ', $descParts) . ']',
                    'sku' => 'ZDS-CUSTOM-MIX',
                    'price' => $mixPrice,
                    'quantity' => $qty,
                    'subtotal' => $lineSubtotal,
                    'imageUrl' => $firstImage,
                ],
            ];
        }

        throw new RuntimeException('VALIDATION:Unsupported custom build item type.');
    }

    private function computeIngredientWeightPrice(array $ing, string $weightLabel): array
    {
        $portionMap = [];
        foreach ((array) ($ing['portions'] ?? []) as $p) {
            if (is_array($p) && !empty($p['weight'])) {
                $portionMap[(string) $p['weight']] = $p;
            }
        }

        $gramsMap = [
            '10g' => 10,
            '50g' => 50,
            '100g' => 100,
            '250g' => 250,
            '500g' => 500,
            '1kg' => 1000,
        ];

        if (!isset($gramsMap[$weightLabel])) {
            throw new RuntimeException('VALIDATION:Unsupported custom ingredient portion weight.');
        }

        if (isset($portionMap[$weightLabel])) {
            return [
                (int) round((float) $portionMap[$weightLabel]['price']),
                (int) ($portionMap[$weightLabel]['weightGrams'] ?? $gramsMap[$weightLabel]),
            ];
        }

        $p1k = isset($portionMap['1kg']) ? (float) $portionMap['1kg']['price'] : null;
        $p500 = isset($portionMap['500g']) ? (float) $portionMap['500g']['price'] : null;
        $p250 = isset($portionMap['250g']) ? (float) $portionMap['250g']['price'] : null;
        $p100 = isset($portionMap['100g']) ? (float) $portionMap['100g']['price'] : null;
        $p50 = isset($portionMap['50g']) ? (float) $portionMap['50g']['price'] : null;
        $p10 = isset($portionMap['10g']) ? (float) $portionMap['10g']['price'] : null;

        $base100g = $p100
            ?? ($p250 !== null ? round($p250 / 2.5)
            : ($p500 !== null ? round($p500 / 5)
            : ($p1k !== null ? round($p1k / 10) : 150)));
        $base1kg = $p1k ?? ($p500 !== null ? $p500 * 2 : ($p250 !== null ? $p250 * 4 : $base100g * 10));

        $price = match ($weightLabel) {
            '10g' => $p10 ?? max(15, round($base100g / 10)),
            '50g' => $p50 ?? max(50, round($base100g / 2)),
            '100g' => $base100g,
            '250g' => $p250 ?? round($base100g * 2.375),
            '500g' => $p500 ?? round($base100g * 4.625),
            '1kg' => $base1kg,
            default => $base100g,
        };

        return [(int) round($price), $gramsMap[$weightLabel]];
    }

    private function isCouponExpired(string $expiryDate): bool
    {
        $ts = strtotime($expiryDate . ' 23:59:59');
        if ($ts === false) {
            return false;
        }
        return time() > $ts;
    }

    private function sanitizeOrderForCustomer(array $order): array
    {
        unset($order['trackingTokenHash'], $order['idempotencyKey'], $order['normalizedPhone'], $order['_docId'], $order['_updateTime']);
        return $order;
    }

    private function sanitizeOrderForAdmin(array $order): array
    {
        unset($order['trackingTokenHash'], $order['idempotencyKey'], $order['normalizedPhone'], $order['_docId'], $order['_updateTime']);
        return $order;
    }
}
