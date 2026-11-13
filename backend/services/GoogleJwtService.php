<?php
declare(strict_types=1);

namespace Eirvan\Services;

use RuntimeException;

/**
 * Generates short-lived Google OAuth 2.0 Access Tokens from a Firebase
 * Service Account JSON using pure PHP OpenSSL + cURL (zero Composer deps).
 */
final class GoogleJwtService
{
    private string $serviceAccountPath;
    private string $cacheFile;
    private LoggerService $logger;
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private const SCOPE = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform';

    public function __construct(string $serviceAccountPath, string $cacheDir, LoggerService $logger)
    {
        $this->serviceAccountPath = $serviceAccountPath;
        $this->cacheFile = rtrim($cacheDir, '/') . '/firestore_oauth_token.json';
        $this->logger = $logger;

        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0750, true);
        }
    }

    public function getAccessToken(bool $forceRefresh = false): string
    {
        if (!$forceRefresh && is_file($this->cacheFile)) {
            $raw = @file_get_contents($this->cacheFile);
            if (is_string($raw) && $raw !== '') {
                $cached = json_decode($raw, true);
                if (
                    is_array($cached)
                    && isset($cached['access_token'], $cached['expires_at'])
                    && is_string($cached['access_token'])
                    && (int) $cached['expires_at'] > (time() + 120)
                ) {
                    return $cached['access_token'];
                }
            }
        }

        return $this->mintFreshToken();
    }

    public function isConfigured(): bool
    {
        return is_file($this->serviceAccountPath) && is_readable($this->serviceAccountPath);
    }

    private function mintFreshToken(): string
    {
        if (!extension_loaded('openssl') || !extension_loaded('curl')) {
            throw new RuntimeException('Required PHP extensions (openssl, curl) are not loaded.');
        }

        if (!$this->isConfigured()) {
            throw new RuntimeException('Firebase service account credentials file is missing or unreadable.');
        }

        $saRaw = file_get_contents($this->serviceAccountPath);
        if (!is_string($saRaw)) {
            throw new RuntimeException('Unable to read Firebase service account credentials.');
        }

        $sa = json_decode($saRaw, true);
        if (!is_array($sa) || empty($sa['client_email']) || empty($sa['private_key'])) {
            throw new RuntimeException('Invalid Firebase service account JSON structure.');
        }

        $now = time();
        $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']) ?: '');
        $claims = $this->base64UrlEncode(json_encode([
            'iss' => $sa['client_email'],
            'sub' => $sa['client_email'],
            'scope' => self::SCOPE,
            'aud' => self::TOKEN_URL,
            'iat' => $now,
            'exp' => $now + 3600,
        ]) ?: '');

        $signingInput = $header . '.' . $claims;
        $privateKey = openssl_pkey_get_private($sa['private_key']);
        if ($privateKey === false) {
            throw new RuntimeException('Failed to parse Firebase service account private key.');
        }

        $signature = '';
        if (!openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Failed to sign JWT assertion with OpenSSL.');
        }

        $jwt = $signingInput . '.' . $this->base64UrlEncode($signature);

        $ch = curl_init(self::TOKEN_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]),
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($response === false || $httpCode >= 400) {
            $this->logger->error('google_oauth_token_failed', [
                'httpCode' => $httpCode,
                'curlError' => $curlErr,
            ]);
            throw new RuntimeException('Failed to obtain Google OAuth 2.0 access token.');
        }

        $data = json_decode((string) $response, true);
        if (!is_array($data) || empty($data['access_token'])) {
            throw new RuntimeException('Malformed Google OAuth 2.0 token response.');
        }

        $expiresIn = max(300, (int) ($data['expires_in'] ?? 3600));
        $payload = json_encode([
            'access_token' => $data['access_token'],
            'expires_at' => $now + $expiresIn,
        ]);

        if (is_string($payload)) {
            @file_put_contents($this->cacheFile, $payload, LOCK_EX);
            @chmod($this->cacheFile, 0600);
        }

        return (string) $data['access_token'];
    }

    private function base64UrlEncode(string $input): string
    {
        return rtrim(strtr(base64_encode($input), '+/', '-_'), '=');
    }
}
