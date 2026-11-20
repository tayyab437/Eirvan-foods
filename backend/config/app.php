<?php
declare(strict_types=1);

/**
 * Core Application Configuration Loader
 * Reads protected server-side configuration from private/config/secrets.php
 */

const EIRVAN_PRODUCTION_FIREBASE_PROJECT_ID = 'gen-lang-client-0351129330';
const EIRVAN_PRODUCTION_FIRESTORE_DB_ID = 'ai-studio-zauqesehatpremiu-a42b0907-2253-405b-8d7e-9cfd4b314afc';

$readEnvVar = static function (string $name): string {
    $candidates = [
        getenv($name),
        $_SERVER[$name] ?? null,
        $_SERVER['REDIRECT_' . $name] ?? null,
    ];
    foreach ($candidates as $val) {
        if (is_string($val) && trim($val) !== '') {
            return trim($val);
        }
    }
    return '';
};

$defaultPrivateDir = dirname(__DIR__, 2) . '/private';
$privateDir = $readEnvVar('EIRVAN_PRIVATE_DIR') ?: $defaultPrivateDir;

if (!is_dir($privateDir) && is_dir(__DIR__ . '/../../private')) {
    $privateDir = realpath(__DIR__ . '/../../private') ?: $defaultPrivateDir;
}

$envFromServer = $readEnvVar('EIRVAN_ENV');
$appEnvFromServer = $readEnvVar('APP_ENV');
$requestedEnv = strtolower($envFromServer !== '' ? $envFromServer : $appEnvFromServer);
$privateConfigDir = rtrim($privateDir, '/') . '/config';
$stagingSecretsFile = $privateConfigDir . '/secrets.staging.php';
$defaultSecretsFile = $privateConfigDir . '/secrets.php';

$secretsFile = ($requestedEnv === 'staging' && is_file($stagingSecretsFile))
    ? $stagingSecretsFile
    : $defaultSecretsFile;

$secrets = [];
if (is_file($secretsFile) && is_readable($secretsFile)) {
    $loaded = require $secretsFile;
    if (is_array($loaded)) {
        $secrets = $loaded;
    }
}

$appEnv = strtolower(trim((string) (
    $secrets['app_env']
    ?? $secrets['ENVIRONMENT']
    ?? ($requestedEnv !== '' ? $requestedEnv : 'production')
)));

$projectId = trim((string) (
    $secrets['firebase_project_id']
    ?? $secrets['FIREBASE_PROJECT_ID']
    ?? $readEnvVar('FIREBASE_PROJECT_ID')
    ?: ($appEnv === 'staging' ? '' : EIRVAN_PRODUCTION_FIREBASE_PROJECT_ID)
));

$firestoreDbId = trim((string) (
    $secrets['firestore_database_id']
    ?? $secrets['FIRESTORE_DATABASE_ID']
    ?? $readEnvVar('FIRESTORE_DATABASE_ID')
    ?: ($appEnv === 'staging' ? '' : EIRVAN_PRODUCTION_FIRESTORE_DB_ID)
));

if ($appEnv === 'staging') {
    if ($projectId === '' || str_starts_with($projectId, 'REPLACE_WITH_')) {
        throw new RuntimeException('Staging isolation error: staging environment must configure an explicit staging firebase_project_id.');
    }
    if ($firestoreDbId === '' || $firestoreDbId === EIRVAN_PRODUCTION_FIRESTORE_DB_ID || str_starts_with($firestoreDbId, 'REPLACE_WITH_')) {
        throw new RuntimeException('Staging isolation error: staging environment must configure an isolated non-production firestore_database_id.');
    }
    if ($projectId === EIRVAN_PRODUCTION_FIREBASE_PROJECT_ID && $firestoreDbId === EIRVAN_PRODUCTION_FIRESTORE_DB_ID) {
        throw new RuntimeException('Staging isolation error: staging cannot point at the production Firebase project and database.');
    }
}

return [
    'env' => $appEnv !== '' ? $appEnv : 'production',
    'debug' => (bool) ($secrets['app_debug'] ?? false),
    'timezone' => 'Asia/Karachi',
    'private_dir' => rtrim($privateDir, '/'),
    'logs_dir' => rtrim($privateDir, '/') . '/logs',
    'cache_dir' => rtrim($privateDir, '/') . '/cache',
    'service_account_path' => (string) (
        $secrets['service_account_path']
        ?? $secrets['FIREBASE_SERVICE_ACCOUNT_PATH']
        ?? $readEnvVar('FIREBASE_SERVICE_ACCOUNT_PATH')
        ?: rtrim($privateDir, '/') . '/credentials/service-account.json'
    ),
    'firebase_project_id' => $projectId,
    'firestore_database_id' => $firestoreDbId,
    'gemini_api_key' => (string) (
        $secrets['gemini_api_key']
        ?? $secrets['GEMINI_API_KEY']
        ?? $readEnvVar('GEMINI_API_KEY')
        ?: ''
    ),
    'allowed_origins' => (array) ($secrets['allowed_origins'] ?? $secrets['ALLOWED_ORIGINS'] ?? []),
    'trusted_proxies' => (array) ($secrets['trusted_proxies'] ?? $secrets['TRUSTED_PROXIES'] ?? []),
];
