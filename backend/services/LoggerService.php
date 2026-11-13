<?php
declare(strict_types=1);

namespace Eirvan\Services;

/**
 * Structured JSON logger with automatic redaction of credentials and PII.
 */
final class LoggerService
{
    private string $logsDir;

    private const SENSITIVE_KEYS = [
        'password',
        'token',
        'idtoken',
        'access_token',
        'private_key',
        'secret',
        'apikey',
        'api_key',
        'gemini_api_key',
        'authorization',
        'iban',
        'accountnumber',
        'trackingtoken',
        'trackingtokenhash',
        'phone',
        'customerphone',
        'email',
        'customeremail',
        'address',
    ];

    public function __construct(string $logsDir)
    {
        $this->logsDir = rtrim($logsDir, '/');
        if (!is_dir($this->logsDir)) {
            @mkdir($this->logsDir, 0750, true);
        }
    }

    public function info(string $event, array $context = []): void
    {
        $this->write('INFO', $event, $context);
    }

    public function warning(string $event, array $context = []): void
    {
        $this->write('WARNING', $event, $context);
    }

    public function error(string $event, array $context = []): void
    {
        $this->write('ERROR', $event, $context);
    }

    private function write(string $level, string $event, array $context): void
    {
        $entry = [
            'ts' => gmdate('c'),
            'level' => $level,
            'event' => $event,
            'requestId' => defined('EIRVAN_REQUEST_ID') ? EIRVAN_REQUEST_ID : null,
            'context' => $this->redact($context),
        ];

        $line = json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
        $file = $this->logsDir . '/app-' . gmdate('Y-m-d') . '.log';

        @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
    }

    private function redact(mixed $value, string $key = ''): mixed
    {
        $normalizedKey = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '', $key) ?? '');
        if ($normalizedKey !== '' && in_array($normalizedKey, self::SENSITIVE_KEYS, true)) {
            return '[REDACTED]';
        }

        if (is_array($value)) {
            $out = [];
            foreach ($value as $k => $v) {
                $out[$k] = $this->redact($v, (string) $k);
            }
            return $out;
        }

        if (is_string($value) && strlen($value) > 1000) {
            return substr($value, 0, 1000) . '...[TRUNCATED]';
        }

        return $value;
    }
}
