<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\AuthMiddleware;
use Eirvan\Middleware\RateLimitMiddleware;
use Eirvan\Services\FirestoreService;
use Eirvan\Validators\RequestValidator;

/**
 * Validates single coupons publicly (without exposing list) and secures admin CRUD.
 */
final class CouponController
{
    public function __construct(
        private FirestoreService $firestore,
        private AuthMiddleware $auth,
        private RateLimitMiddleware $rateLimit
    ) {}

    public function validatePublic(array $input): array
    {
        $this->rateLimit->enforce('coupon_validate', 20, 600);

        $code = strtoupper(preg_replace('/[^A-Z0-9_\-]/', '', trim((string) ($input['code'] ?? ''))) ?? '');
        $subtotal = (float) ($input['subtotal'] ?? 0);

        if ($code === '' || !RequestValidator::isValidDocId($code)) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Please enter a valid promo code.']];
        }

        $coupon = $this->firestore->getDocument('coupons', $code);
        if (!is_array($coupon) || empty($coupon['isActive'])) {
            return ['status' => 200, 'body' => ['success' => false, 'message' => 'Invalid or inactive coupon code.']];
        }

        if (!empty($coupon['expiryDate']) && $this->isCouponExpired((string) $coupon['expiryDate'])) {
            return ['status' => 200, 'body' => ['success' => false, 'message' => 'This coupon code has expired.']];
        }

        $usageLimit = isset($coupon['usageLimit']) ? (int) $coupon['usageLimit'] : 0;
        $usageCount = (int) ($coupon['usageCount'] ?? 0);
        if ($usageLimit > 0 && $usageCount >= $usageLimit) {
            return ['status' => 200, 'body' => ['success' => false, 'message' => 'This coupon code has reached its redemption limit.']];
        }

        $minOrder = (float) ($coupon['minOrderAmount'] ?? 0);
        if ($subtotal < $minOrder) {
            return [
                'status' => 200,
                'body' => [
                    'success' => false,
                    'message' => 'This coupon requires a minimum cart order of Rs. ' . number_format($minOrder) . '.',
                ],
            ];
        }

        $discountVal = (float) ($coupon['discountValue'] ?? 0);
        $savings = ($coupon['discountType'] ?? '') === 'percentage'
            ? (int) round(($subtotal * $discountVal) / 100)
            : (int) min($subtotal, round($discountVal));

        unset($coupon['_docId'], $coupon['_updateTime']);

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'message' => sprintf('Coupon "%s" applied successfully! You saved Rs. %s.', $coupon['code'], number_format($savings)),
                'coupon' => $coupon,
                'discountAmount' => $savings,
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

        $res = $this->firestore->listCollection('coupons', $limit, $pageToken);
        $items = array_map(static function (array $c): array {
            unset($c['_docId'], $c['_updateTime']);
            return $c;
        }, $res['documents']);

        $nextPageToken = $res['nextPageToken'] ?? null;

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'coupons' => $items,
                'nextPageToken' => $nextPageToken,
                'hasMore' => $nextPageToken !== null && $nextPageToken !== '',
            ],
        ];
    }

    public function upsertAdmin(array $input): array
    {
        $this->auth->requireAdmin();
        $errors = RequestValidator::validateCouponPayload($input);
        if (!empty($errors)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => implode(' ', $errors)]];
        }

        $code = strtoupper(preg_replace('/[^A-Z0-9_\-]/', '', trim((string) $input['code'])) ?? '');
        $existing = $this->firestore->getDocument('coupons', $code);

        $coupon = [
            'code' => $code,
            'discountType' => (string) $input['discountType'],
            'discountValue' => (float) $input['discountValue'],
            'minOrderAmount' => (float) $input['minOrderAmount'],
            'isActive' => (bool) ($input['isActive'] ?? true),
            'expiryDate' => RequestValidator::cleanString($input['expiryDate'] ?? '2026-12-31', 32),
            'usageCount' => is_array($existing) ? max(0, (int) ($existing['usageCount'] ?? 0)) : 0,
        ];
        if (isset($input['usageLimit']) && $input['usageLimit'] !== null && $input['usageLimit'] !== '') {
            $coupon['usageLimit'] = max(1, (int) $input['usageLimit']);
        }

        $this->firestore->setDocument('coupons', $code, $coupon);
        return ['status' => 200, 'body' => ['success' => true, 'coupon' => $coupon]];
    }

    public function toggleAdmin(string $code): array
    {
        $this->auth->requireAdmin();
        $cleanCode = strtoupper(RequestValidator::cleanString($code, 30));
        $coupon = $this->firestore->getDocument('coupons', $cleanCode);
        if (!is_array($coupon)) {
            return ['status' => 404, 'body' => ['success' => false, 'error' => 'Coupon not found.']];
        }

        $next = !((bool) ($coupon['isActive'] ?? false));
        $this->firestore->patchDocument('coupons', $cleanCode, ['isActive' => $next]);

        return ['status' => 200, 'body' => ['success' => true, 'isActive' => $next]];
    }

    public function deleteAdmin(string $code): array
    {
        $this->auth->requireAdmin();
        $cleanCode = strtoupper(RequestValidator::cleanString($code, 30));
        if (!RequestValidator::isValidDocId($cleanCode)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid coupon code.']];
        }
        $this->firestore->deleteDocument('coupons', $cleanCode);
        return ['status' => 200, 'body' => ['success' => true]];
    }

    private function isCouponExpired(string $expiryDate): bool
    {
        $trimmed = trim($expiryDate);
        if ($trimmed === '') {
            return false;
        }
        $tz = new \DateTimeZone('Asia/Karachi');
        $dt = \DateTimeImmutable::createFromFormat('!Y-m-d', $trimmed, $tz);
        if ($dt !== false && $dt->format('Y-m-d') === $trimmed) {
            $endOfDay = $dt->setTime(23, 59, 59);
            return time() > $endOfDay->getTimestamp();
        }
        $ts = strtotime($trimmed);
        if ($ts === false) {
            return true;
        }
        return time() > $ts;
    }
}
