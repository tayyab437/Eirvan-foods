<?php
declare(strict_types=1);

namespace Eirvan\Middleware;

use Eirvan\Services\LoggerService;

/**
 * File-locked sliding-window IP rate limiter compatible with IONOS shared hosting.
 */
final class RateLimitMiddleware
{
    private string $rateDir;
    private LoggerService $logger;
    private array $trustedProxies;

    public function __construct(string $cacheDir, LoggerService $logger, array $trustedProxies = [])
    {
        $this->rateDir = rtrim($cacheDir, '/') . '/ratelimit';
        $this->logger = $logger;
        $this->trustedProxies = $trustedProxies;

        if (!is_dir($this->rateDir)) {
            @mkdir($this->rateDir, 0750, true);
        }
    }

    public function enforce(string $bucket, int $maxRequests, int $windowSeconds): void
    {
        $ip = $this->resolveClientIp();
        $key = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $bucket) . '_' . hash('sha256', $ip . '|' . $bucket);
        $file = $this->rateDir . '/' . $key . '.json';

        $now = time();
        $cutoff = $now - $windowSeconds;
        $timestamps = [];

        $fp = @fopen($file, 'c+');
        if ($fp === false) {
            return;
        }

        try {
            if (!flock($fp, LOCK_EX)) {
                fclose($fp);
                return;
            }

            $raw = stream_get_contents($fp);
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    foreach ($decoded as $ts) {
                        if (is_int($ts) && $ts > $cutoff) {
                            $timestamps[] = $ts;
                        }
                    }
                }
            }

            if (count($timestamps) >= $maxRequests) {
                $oldest = min($timestamps);
                $retryAfter = max(1, ($oldest + $windowSeconds) - $now);
                flock($fp, LOCK_UN);
                fclose($fp);

                $this->logger->warning('rate_limit_exceeded', [
                    'bucket' => $bucket,
                    'retryAfter' => $retryAfter,
                ]);

                header('Retry-After: ' . $retryAfter);
                http_response_code(429);
                echo json_encode([
                    'success' => false,
                    'error' => 'Too many requests. Please wait ' . $retryAfter . ' seconds and try again.',
                ]);
                exit;
            }

            $timestamps[] = $now;
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($timestamps) ?: '[]');
            fflush($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
        } catch (\Throwable) {
            @flock($fp, LOCK_UN);
            @fclose($fp);
        }
    }

    private function resolveClientIp(): string
    {
        $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        if (in_array($remote, $this->trustedProxies, true) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']);
            $candidate = trim($parts[0]);
            if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                return $candidate;
            }
        }
        return $remote;
    }
}
