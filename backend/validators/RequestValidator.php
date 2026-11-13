<?php
declare(strict_types=1);

namespace Eirvan\Validators;

/**
 * Shared server-side input validation and sanitization rules.
 */
final class RequestValidator
{
    public static function isValidDocId(string $id): bool
    {
        return $id !== '' && strlen($id) <= 128 && preg_match('/^[a-zA-Z0-9_\-]+$/', $id) === 1;
    }

    public static function normalizePhone(string $phone): string
    {
        return preg_replace('/[^0-9]/', '', trim($phone)) ?? '';
    }

    public static function isValidPakistaniMobile(string $phone): bool
    {
        $digits = self::normalizePhone($phone);
        return strlen($digits) === 11 && str_starts_with($digits, '03');
    }

    public static function cleanString(mixed $val, int $maxLen): string
    {
        $str = trim((string) ($val ?? ''));
        $str = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $str) ?? '';
        if (mb_strlen($str, 'UTF-8') > $maxLen) {
            return mb_substr($str, 0, $maxLen, 'UTF-8');
        }
        return $str;
    }

    public static function validateOrderPayload(array $data): array
    {
        $errors = [];

        $idempotencyKey = self::cleanString($data['idempotencyKey'] ?? '', 128);
        if (!self::isValidDocId($idempotencyKey) || strlen($idempotencyKey) < 8) {
            $errors[] = 'Valid idempotencyKey is required.';
        }

        $name = self::cleanString($data['customerName'] ?? '', 100);
        if (mb_strlen($name, 'UTF-8') < 2) {
            $errors[] = 'Recipient name must be at least 2 characters.';
        }

        $phone = self::cleanString($data['customerPhone'] ?? '', 30);
        if (!self::isValidPakistaniMobile($phone)) {
            $errors[] = 'Valid 11-digit Pakistani mobile number starting with 03 is required.';
        }

        $email = self::cleanString($data['customerEmail'] ?? '', 100);
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Provided email address is invalid.';
        }

        $city = self::cleanString($data['city'] ?? '', 50);
        $province = self::cleanString($data['province'] ?? '', 50);
        $address = self::cleanString($data['address'] ?? '', 300);
        if ($city === '' || $province === '' || mb_strlen($address, 'UTF-8') < 8) {
            $errors[] = 'Complete delivery city, province, and street address (min 8 chars) are required.';
        }

        $paymentMethod = (string) ($data['paymentMethod'] ?? '');
        if (!in_array($paymentMethod, ['COD', 'BankTransfer', 'Raast'], true)) {
            $errors[] = 'Invalid payment method selected.';
        }

        $bankReference = self::cleanString($data['bankReference'] ?? '', 120);
        if ($paymentMethod === 'BankTransfer' && $bankReference === '') {
            $errors[] = 'Bank transfer transaction reference ID or sender account title is required.';
        }

        $items = $data['items'] ?? null;
        if (!is_array($items) || count($items) === 0 || count($items) > 50) {
            $errors[] = 'Order must contain between 1 and 50 items.';
        }

        return $errors;
    }

    public static function validateProductPayload(array $data): array
    {
        $errors = [];
        $id = self::cleanString($data['id'] ?? '', 128);
        $name = self::cleanString($data['name'] ?? '', 200);
        $slug = self::cleanString($data['slug'] ?? '', 150);
        $category = self::cleanString($data['category'] ?? '', 100);
        $variants = $data['variants'] ?? null;

        if (!self::isValidDocId($id)) {
            $errors[] = 'Invalid product ID.';
        }
        if ($name === '' || $slug === '' || $category === '') {
            $errors[] = 'Product name, slug, and category are required.';
        }
        if (!is_array($variants) || count($variants) === 0 || count($variants) > 30) {
            $errors[] = 'At least 1 valid weight variant (max 30) is required.';
        } else {
            foreach ($variants as $v) {
                if (!is_array($v) || empty($v['id']) || empty($v['weight']) || !isset($v['price']) || (float) $v['price'] <= 0 || (int) ($v['stock'] ?? -1) < 0) {
                    $errors[] = 'Each variant must have id, weight, positive price, and non-negative stock.';
                    break;
                }
            }
        }
        return $errors;
    }

    public static function validateCouponPayload(array $data): array
    {
        $errors = [];
        $code = strtoupper(preg_replace('/[^A-Z0-9_\-]/', '', trim((string) ($data['code'] ?? ''))) ?? '');
        if ($code === '' || strlen($code) > 30) {
            $errors[] = 'Coupon code must be 1-30 alphanumeric/hyphen characters.';
        }
        if (!in_array((string) ($data['discountType'] ?? ''), ['percentage', 'fixed'], true)) {
            $errors[] = 'Invalid discountType.';
        }
        $val = (float) ($data['discountValue'] ?? 0);
        if ($val <= 0 || (($data['discountType'] ?? '') === 'percentage' && $val > 100)) {
            $errors[] = 'Invalid discountValue.';
        }
        if ((float) ($data['minOrderAmount'] ?? -1) < 0) {
            $errors[] = 'minOrderAmount must be non-negative.';
        }
        return $errors;
    }

    public static function validateWholesalePayload(array $data): array
    {
        $errors = [];
        if (self::cleanString($data['companyName'] ?? '', 100) === '') {
            $errors[] = 'Company name is required.';
        }
        if (self::cleanString($data['contactName'] ?? '', 100) === '') {
            $errors[] = 'Contact name is required.';
        }
        if (strlen(self::cleanString($data['phone'] ?? '', 30)) < 7) {
            $errors[] = 'Valid phone number is required.';
        }
        $email = self::cleanString($data['email'] ?? '', 100);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Valid email address is required.';
        }
        $type = (string) ($data['inquiryType'] ?? '');
        if (!in_array($type, ['Corporate Gifting', 'Wholesale Purchase', 'Wedding Favors', 'Other'], true)) {
            $errors[] = 'Invalid inquiry type.';
        }
        if (self::cleanString($data['estimatedQuantity'] ?? '', 100) === '') {
            $errors[] = 'Estimated quantity is required.';
        }
        return $errors;
    }
}
