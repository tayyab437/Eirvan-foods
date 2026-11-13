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

        if (!empty($coupon['expiryDate'])) {
            $expTs = strtotime((string) $coupon['expiryDate'] . ' 23:59:59');
            if ($expTs !== false && time() > $expTs) {
                return ['status' => 200, 'body' => ['success' => false, 'message' => 'This coupon code has expired.']];
            }
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

    public function listAdmin(): array
    {
        $this->auth->requireAdmin();
        $res = $this->firestore->listCollection('coupons', 200);
        $items = array_map(static function (array $c): array {
            unset($c['_docId'], $c['_updateTime']);
            return $c;
        }, $res['documents']);

        return ['status' => 200, 'body' => ['success' => true, 'coupons' => $items]];
    }

    public function upsertAdmin(array $input): array
    {
        $this->auth->requireAdmin();
        $errors = RequestValidator::validateCouponPayload($input);
        if (!empty($errors)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => implode(' ', $errors)]];
        }

        $code = strtoupper(preg_replace('/[^A-Z0-9_\-]/', '', trim((string) $input['code'])) ?? '');
        $coupon = [
            'code' => $code,
            'discountType' => (string) $input['discountType'],
            'discountValue' => (float) $input['discountValue'],
            'minOrderAmount' => (float) $input['minOrderAmount'],
            'isActive' => (bool) ($input['isActive'] ?? true),
            'expiryDate' => RequestValidator::cleanString($input['expiryDate'] ?? '2026-12-31', 32),
            'usageCount' => max(0, (int) ($input['usageCount'] ?? 0)),
        ];

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
}
