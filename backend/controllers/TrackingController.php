<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\RateLimitMiddleware;
use Eirvan\Services\FirestoreService;
use Eirvan\Validators\RequestValidator;

/**
 * Privacy-Preserving Order Tracking Endpoint.
 * Requires either (orderNumber + registered phone) or (orderNumber + secret trackingToken).
 */
final class TrackingController
{
    public function __construct(
        private FirestoreService $firestore,
        private RateLimitMiddleware $rateLimit
    ) {}

    public function lookup(array $input): array
    {
        $this->rateLimit->enforce('order_tracking', 10, 900);

        $orderNumber = strtoupper(RequestValidator::cleanString($input['orderNumber'] ?? '', 32));
        $rawPhone = RequestValidator::cleanString($input['phone'] ?? '', 30);
        $phone = $rawPhone !== '' ? RequestValidator::normalizePhone($rawPhone) : '';
        $token = RequestValidator::cleanString($input['trackingToken'] ?? '', 128);

        if ($orderNumber === '' || ($phone === '' && $token === '')) {
            return [
                'status' => 422,
                'body' => [
                    'success' => false,
                    'error' => 'Please enter both your Order Reference and registered Mobile Number.',
                ],
            ];
        }

        if ($token === '' && !RequestValidator::isValidPakistaniMobile($phone)) {
            return [
                'status' => 422,
                'body' => [
                    'success' => false,
                    'error' => 'Please enter a valid Pakistani mobile number (e.g. 0300-1234567 or +92 300 1234567).',
                ],
            ];
        }

        $matches = $this->firestore->runQuery('orders', ['orderNumber' => $orderNumber], null, 'DESCENDING', 1);
        if (empty($matches)) {
            return [
                'status' => 404,
                'body' => [
                    'success' => false,
                    'error' => 'No matching order found for those details.',
                ],
            ];
        }

        $order = $matches[0];
        $hasValidToken = $token !== ''
            && !empty($order['trackingTokenHash'])
            && hash_equals((string) $order['trackingTokenHash'], hash('sha256', $token));

        $storedNormalized = (string) ($order['normalizedPhone'] ?? '');
        $storedPhone = $storedNormalized !== ''
            ? RequestValidator::normalizePhone($storedNormalized)
            : RequestValidator::normalizePhone((string) ($order['customerPhone'] ?? ''));
        $hasValidPhone = $phone !== '' && $storedPhone !== '' && hash_equals($storedPhone, $phone);

        if (!$hasValidToken && !$hasValidPhone) {
            return [
                'status' => 404,
                'body' => [
                    'success' => false,
                    'error' => 'No matching order found for those details.',
                ],
            ];
        }

        // Mask sensitive street/contact PII unless caller holds the cryptographic receipt token
        if ($hasValidToken) {
            unset($order['trackingTokenHash'], $order['idempotencyKey'], $order['normalizedPhone'], $order['_docId'], $order['_updateTime']);
            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'privacyLevel' => 'full',
                    'order' => $order,
                ],
            ];
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'privacyLevel' => 'masked',
                'order' => [
                    'id' => (string) ($order['id'] ?? ''),
                    'orderNumber' => (string) ($order['orderNumber'] ?? ''),
                    'createdAt' => (string) ($order['createdAt'] ?? ''),
                    'customerName' => $this->maskName((string) ($order['customerName'] ?? '')),
                    'customerPhone' => $this->maskPhone((string) ($order['customerPhone'] ?? '')),
                    'city' => (string) ($order['city'] ?? ''),
                    'province' => (string) ($order['province'] ?? ''),
                    'address' => sprintf('%s, %s (Full street address hidden for privacy)', (string) ($order['city'] ?? ''), (string) ($order['province'] ?? '')),
                    'items' => (array) ($order['items'] ?? []),
                    'subtotal' => $order['subtotal'] ?? 0,
                    'shippingFee' => $order['shippingFee'] ?? 0,
                    'discountAmount' => $order['discountAmount'] ?? 0,
                    'couponCode' => $order['couponCode'] ?? null,
                    'totalAmount' => $order['totalAmount'] ?? 0,
                    'paymentMethod' => $order['paymentMethod'] ?? 'COD',
                    'paymentStatus' => $order['paymentStatus'] ?? 'Pending',
                    'orderStatus' => $order['orderStatus'] ?? 'Pending',
                    'courier' => $order['courier'] ?? 'TCS Express Pakistan',
                    'trackingNumber' => $order['trackingNumber'] ?? '',
                ],
            ],
        ];
    }

    private function maskName(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $masked = array_map(static function (string $part): string {
            $len = mb_strlen($part, 'UTF-8');
            if ($len <= 1) {
                return $part;
            }
            return mb_substr($part, 0, 1, 'UTF-8') . str_repeat('*', max(2, $len - 1));
        }, $parts);
        return implode(' ', $masked);
    }

    private function maskPhone(string $phone): string
    {
        $digits = RequestValidator::normalizePhone($phone);
        if (strlen($digits) < 6) {
            return '****';
        }
        return substr($digits, 0, 4) . '-****-' . substr($digits, -3);
    }
}
