<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\AuthMiddleware;
use Eirvan\Middleware\RateLimitMiddleware;
use Eirvan\Services\FirestoreService;
use Eirvan\Validators\RequestValidator;

/**
 * Secures customer review submission (pending moderation + real purchase verification)
 * and admin moderation workflows.
 */
final class ReviewController
{
    public function __construct(
        private FirestoreService $firestore,
        private AuthMiddleware $auth,
        private RateLimitMiddleware $rateLimit
    ) {}

    public function submitPublic(array $input): array
    {
        $this->rateLimit->enforce('review_submit', 5, 1800);

        $productId = RequestValidator::cleanString($input['productId'] ?? '', 64);
        $customerName = RequestValidator::cleanString($input['customerName'] ?? '', 100);
        $city = RequestValidator::cleanString($input['city'] ?? 'Pakistan', 50);
        $comment = RequestValidator::cleanString($input['comment'] ?? '', 1000);
        $rating = (int) ($input['rating'] ?? 0);

        if (!RequestValidator::isValidDocId($productId) || $customerName === '' || $comment === '' || $rating < 1 || $rating > 5) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'Valid productId, name, rating (1-5), and comment are required.']];
        }

        $product = $this->firestore->getDocument('products', $productId);
        if (!is_array($product)) {
            return ['status' => 404, 'body' => ['success' => false, 'error' => 'Referenced product not found.']];
        }

        // Verify purchase strictly against Delivered real order records (never trust client flag or pending/cancelled orders)
        $verifiedPurchase = false;
        $orderNumber = strtoupper(RequestValidator::cleanString($input['orderNumber'] ?? '', 32));
        $phone = RequestValidator::normalizePhone((string) ($input['phone'] ?? ''));

        if ($orderNumber !== '' && RequestValidator::isValidPakistaniMobile($phone)) {
            $orders = $this->firestore->runQuery('orders', ['orderNumber' => $orderNumber], null, 'DESCENDING', 1);
            if (!empty($orders)) {
                $ord = $orders[0];
                $ordPhone = (string) ($ord['normalizedPhone'] ?? '');
                if ($ordPhone === '') {
                    $ordPhone = RequestValidator::normalizePhone((string) ($ord['customerPhone'] ?? ''));
                } else {
                    $ordPhone = RequestValidator::normalizePhone($ordPhone);
                }
                $isDelivered = ((string) ($ord['orderStatus'] ?? '')) === 'Delivered';
                if ($isDelivered && $ordPhone !== '' && hash_equals($ordPhone, $phone)) {
                    foreach ((array) ($ord['items'] ?? []) as $item) {
                        if (is_array($item) && (string) ($item['productId'] ?? '') === $productId) {
                            $verifiedPurchase = true;
                            break;
                        }
                    }
                }
            }
        }

        $reviewId = 'rev-' . gmdate('YmdHis') . '-' . bin2hex(random_bytes(3));
        $reviewDoc = [
            'id' => $reviewId,
            'productId' => $productId,
            'productName' => (string) ($product['name'] ?? ''),
            'customerName' => $customerName,
            'city' => $city !== '' ? $city : 'Pakistan',
            'rating' => $rating,
            'date' => gmdate('Y-m-d'),
            'comment' => $comment,
            'verifiedPurchase' => $verifiedPurchase,
            'status' => 'pending', // Always starts pending until admin approves!
        ];

        $this->firestore->createDocument('reviews', $reviewId, $reviewDoc);

        return [
            'status' => 201,
            'body' => [
                'success' => true,
                'message' => 'Thank you! Your review has been submitted for moderation.',
                'review' => $reviewDoc,
            ],
        ];
    }

    public function listAdmin(array $query = []): array
    {
        $this->auth->requireAdmin();
        $limit = max(1, min(300, (int) ($query['limit'] ?? 150)));
        $pageToken = isset($query['pageToken']) ? trim((string) $query['pageToken']) : null;
        if ($pageToken === '') {
            $pageToken = null;
        }

        $res = $this->firestore->listCollection('reviews', $limit, $pageToken);
        $items = array_map(static function (array $r): array {
            unset($r['_docId'], $r['_updateTime']);
            return $r;
        }, $res['documents']);

        $nextPageToken = $res['nextPageToken'] ?? null;

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'reviews' => $items,
                'nextPageToken' => $nextPageToken,
                'hasMore' => $nextPageToken !== null && $nextPageToken !== '',
            ],
        ];
    }

    public function moderateAdmin(string $reviewId, array $input): array
    {
        $this->auth->requireAdmin();
        if (!RequestValidator::isValidDocId($reviewId)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid review ID.']];
        }

        $status = (string) ($input['status'] ?? '');
        if (!in_array($status, ['approved', 'pending', 'rejected'], true)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'Status must be approved, pending, or rejected.']];
        }

        $review = $this->firestore->getDocument('reviews', $reviewId);
        if (!is_array($review)) {
            return ['status' => 404, 'body' => ['success' => false, 'error' => 'Review not found.']];
        }

        $this->firestore->patchDocument('reviews', $reviewId, ['status' => $status]);
        $this->recalculateProductRating((string) ($review['productId'] ?? ''));

        return ['status' => 200, 'body' => ['success' => true, 'status' => $status]];
    }

    public function deleteAdmin(string $reviewId): array
    {
        $this->auth->requireAdmin();
        if (!RequestValidator::isValidDocId($reviewId)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid review ID.']];
        }
        $review = $this->firestore->getDocument('reviews', $reviewId);
        $this->firestore->deleteDocument('reviews', $reviewId);
        if (is_array($review) && !empty($review['productId'])) {
            $this->recalculateProductRating((string) $review['productId']);
        }
        return ['status' => 200, 'body' => ['success' => true]];
    }

    private function recalculateProductRating(string $productId): void
    {
        if (!RequestValidator::isValidDocId($productId)) {
            return;
        }

        $batchSize = 200;
        $afterDocId = null;
        $count = 0;
        $sum = 0.0;

        // Iterate across all approved review batches without capping at 300 records
        for ($page = 0; $page < 50; $page++) {
            $batch = $this->firestore->runQueryByDocIdBatch('reviews', [
                'productId' => $productId,
                'status' => 'approved',
            ], $batchSize, $afterDocId);

            if (empty($batch)) {
                break;
            }

            foreach ($batch as $r) {
                $count++;
                $sum += (float) ($r['rating'] ?? 5);
            }

            if (count($batch) < $batchSize) {
                break;
            }

            $last = $batch[count($batch) - 1];
            $afterDocId = (string) ($last['_docId'] ?? $last['id'] ?? '');
            if ($afterDocId === '') {
                break;
            }
        }

        $avg = $count > 0 ? round($sum / $count, 1) : 5.0;

        try {
            $this->firestore->patchDocument('products', $productId, [
                'rating' => $avg,
                'reviewCount' => $count,
            ]);
        } catch (\Throwable) {
            // Non-fatal if product was deleted
        }
    }
}
