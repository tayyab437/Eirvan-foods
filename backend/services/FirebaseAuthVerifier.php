<?php
declare(strict_types=1);

namespace Eirvan\Services;

use RuntimeException;

/**
 * Cryptographically verifies Firebase Auth ID Tokens (RS256 JWTs)
 * against Google's official X.509 certificates without external Composer packages.
 */
final class FirebaseAuthVerifier
{
    private string $projectId;
    private string $certsCacheFile;
    private LoggerService $logger;
    private const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

    public function __construct(string $projectId, string $cacheDir, LoggerService $logger)
    {
        $this->projectId = $projectId;
        $this->certsCacheFile = rtrim($cacheDir, '/') . '/firebase_x509_certs.json';
        $this->logger = $logger;

        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0750, true);
        }
    }

    /**
     * Verifies an ID token and returns decoded claims ['uid', 'email', 'emailVerified', 'name'].
     */
    public function verifyIdToken(string $idToken): array
    {
        $parts = explode('.', trim($idToken));
        if (count($parts) !== 3) {
            throw new RuntimeException('Malformed Firebase ID token.');
        }

        [$headerB64, $payloadB64, $sigB64] = $parts;
        $header = json_decode($this->base64UrlDecode($headerB64), true);
        $claims = json_decode($this->base64UrlDecode($payloadB64), true);
        $signature = $this->base64UrlDecode($sigB64);

        if (!is_array($header) || !is_array($claims) || $signature === '') {
            throw new RuntimeException('Invalid Firebase ID token encoding.');
        }

        if (($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) {
            throw new RuntimeException('Unsupported token signing algorithm.');
        }

        $now = time();
        $expectedIssuer = 'https://securetoken.google.com/' . $this->projectId;

        if (($claims['aud'] ?? '') !== $this->projectId) {
            throw new RuntimeException('Token audience mismatch.');
        }
        if (($claims['iss'] ?? '') !== $expectedIssuer) {
            throw new RuntimeException('Token issuer mismatch.');
        }
        $uid = (string) ($claims['sub'] ?? '');
        if ($uid === '' || strlen($uid) > 128) {
            throw new RuntimeException('Invalid token subject.');
        }
        if ((int) ($claims['exp'] ?? 0) <= $now) {
            throw new RuntimeException('Token has expired.');
        }
        if ((int) ($claims['iat'] ?? 0) > ($now + 300) || (int) ($claims['auth_time'] ?? 0) > ($now + 300)) {
            throw new RuntimeException('Token issued in the future.');
        }

        $certs = $this->getPublicCerts();
        $kid = (string) $header['kid'];
        if (empty($certs[$kid])) {
            // Force refresh once in case Google rotated keys
            $certs = $this->getPublicCerts(true);
        }
        if (empty($certs[$kid])) {
            throw new RuntimeException('Signing certificate not found.');
        }

        $pubKey = openssl_pkey_get_public((string) $certs[$kid]);
        if ($pubKey === false) {
            throw new RuntimeException('Unable to parse Google X.509 certificate.');
        }

        $verified = openssl_verify($headerB64 . '.' . $payloadB64, $signature, $pubKey, OPENSSL_ALGO_SHA256);
        if ($verified !== 1) {
            throw new RuntimeException('Invalid Firebase ID token signature.');
        }

        return [
            'uid' => $uid,
            'email' => isset($claims['email']) ? (string) $claims['email'] : null,
            'emailVerified' => (bool) ($claims['email_verified'] ?? false),
            'name' => isset($claims['name']) ? (string) $claims['name'] : null,
        ];
    }

    private function getPublicCerts(bool $forceRefresh = false): array
    {
        if (!$forceRefresh && is_file($this->certsCacheFile)) {
            $raw = @file_get_contents($this->certsCacheFile);
            if (is_string($raw)) {
                $cached = json_decode($raw, true);
                if (is_array($cached) && (int) ($cached['expires_at'] ?? 0) > time() && is_array($cached['certs'] ?? null)) {
                    return $cached['certs'];
                }
            }
        }

        $responseHeaders = [];
        $ch = curl_init(self::CERTS_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HEADERFUNCTION => static function ($ch, string $headerLine) use (&$responseHeaders): int {
                $len = strlen($headerLine);
                $parts = explode(':', $headerLine, 2);
                if (count($parts) === 2) {
                    $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                }
                return $len;
            },
        ]);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false || $status >= 400) {
            $this->logger->error('firebase_certs_fetch_failed', ['status' => $status]);
            throw new RuntimeException('Unable to fetch Firebase public certificates.');
        }

        $certs = json_decode((string) $raw, true);
        if (!is_array($certs) || empty($certs)) {
            throw new RuntimeException('Malformed Firebase certificates response.');
        }

        $maxAge = 3600;
        if (!empty($responseHeaders['cache-control']) && preg_match('/max-age=(\d+)/', $responseHeaders['cache-control'], $m)) {
            $maxAge = max(300, (int) $m[1]);
        }

        @file_put_contents(
            $this->certsCacheFile,
            json_encode(['expires_at' => time() + $maxAge, 'certs' => $certs]),
            LOCK_EX
        );
        @chmod($this->certsCacheFile, 0600);

        return $certs;
    }

    private function base64UrlDecode(string $input): string
    {
        $remainder = strlen($input) % 4;
        if ($remainder > 0) {
            $input .= str_repeat('=', 4 - $remainder);
        }
        $decoded = base64_decode(strtr($input, '-_', '+/'), true);
        return $decoded === false ? '' : $decoded;
    }
}
