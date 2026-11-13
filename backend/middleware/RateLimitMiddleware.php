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

    private bool $storageReady = false;

    public function __construct(string $cacheDir, LoggerService $logger, array $trustedProxies = [])
    {
        $this->rateDir = rtrim($cacheDir, '/') . '/ratelimit';
        $this->logger = $logger;
        $this->trustedProxies = $trustedProxies;

        if (!is_dir($this->rateDir)) {
            @mkdir($this->rateDir, 0750, true);
        }

        $this->storageReady = is_dir($this->rateDir) && is_writable($this->rateDir);
        if (!$this->storageReady) {
            $this->logger->error('rate_limiter_dir_unwritable', [
                'dirExists' => is_dir($this->rateDir),
            ]);
        }
    }

    public function enforce(string $bucket, int $maxRequests, int $windowSeconds, bool $failClosed = true): void
    {
        if (!$this->storageReady) {
            $this->handleStorageFailure($bucket, 'directory_unwritable', $failClosed);
            return;
        }

        $ip = $this->resolveClientIp();
        $key = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $bucket) . '_' . hash('sha256', $ip . '|' . $bucket);
        $file = $this->rateDir . '/' . $key . '.json';

        $now = time();
        $cutoff = $now - $windowSeconds;
        $timestamps = [];

        $fp = @fopen($file, 'c+');
        if ($fp === false) {
            $this->handleStorageFailure($bucket, 'fopen_failed', $failClosed);
            return;
        }

        try {
            if (!flock($fp, LOCK_EX)) {
                @fclose($fp);
                $this->handleStorageFailure($bucket, 'flock_failed', $failClosed);
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
            $written = fwrite($fp, json_encode($timestamps) ?: '[]');
            fflush($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
            @chmod($file, 0600);

            if ($written === false) {
                $this->handleStorageFailure($bucket, 'fwrite_failed', $failClosed);
                return;
            }

            $this->cleanupExpiredFiles($now, $windowSeconds, $file);
        } catch (\Throwable $e) {
            @flock($fp, LOCK_UN);
            @fclose($fp);
            $this->handleStorageFailure($bucket, $e->getMessage(), $failClosed);
        }
    }

    private function handleStorageFailure(string $bucket, string $reason, bool $failClosed): void
    {
        $this->logger->error('rate_limiter_storage_error', [
            'bucket' => $bucket,
            'reason' => $reason,
            'failClosed' => $failClosed,
        ]);

        if ($failClosed) {
            http_response_code(503);
            echo json_encode([
                'success' => false,
                'error' => 'Service temporarily unavailable. Please try again shortly.',
            ]);
            exit;
        }
    }

    private function cleanupExpiredFiles(int $now, int $windowSeconds, string $activeFile): void
    {
        try {
            if (random_int(1, 50) !== 1) {
                return;
            }
            $files = @glob($this->rateDir . '/*.json');
            if (!is_array($files)) {
                return;
            }
            $staleBefore = $now - max(3600, $windowSeconds * 2);
            $checked = 0;
            foreach ($files as $candidate) {
                if ($checked >= 100) {
                    break;
                }
                $checked++;
                if ($candidate === $activeFile) {
                    continue;
                }
                $mtime = @filemtime($candidate);
                if (is_int($mtime) && $mtime < $staleBefore) {
                    @unlink($candidate);
                }
            }
        } catch (\Throwable) {
            // Best-effort opportunistic cleanup
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
