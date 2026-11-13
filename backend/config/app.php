<?php
declare(strict_types=1);

/**
 * Core Application Configuration Loader
 * Reads protected server-side configuration from private/config/secrets.php
 */

$defaultPrivateDir = dirname(__DIR__, 2) . '/private';
$privateDir = getenv('EIRVAN_PRIVATE_DIR') ?: $defaultPrivateDir;

if (!is_dir($privateDir) && is_dir(__DIR__ . '/../../private')) {
    $privateDir = realpath(__DIR__ . '/../../private') ?: $defaultPrivateDir;
}

$secretsFile = rtrim($privateDir, '/') . '/config/secrets.php';
$secrets = [];
if (is_file($secretsFile) && is_readable($secretsFile)) {
    $loaded = require $secretsFile;
    if (is_array($loaded)) {
        $secrets = $loaded;
    }
}

$projectId = (string) ($secrets['firebase_project_id'] ?? getenv('FIREBASE_PROJECT_ID') ?: 'gen-lang-client-0351129330');
$firestoreDbId = (string) ($secrets['firestore_database_id'] ?? getenv('FIRESTORE_DATABASE_ID') ?: 'ai-studio-zauqesehatpremiu-a42b0907-2253-405b-8d7e-9cfd4b314afc');

return [
    'env' => (string) ($secrets['app_env'] ?? getenv('APP_ENV') ?: 'production'),
    'debug' => (bool) ($secrets['app_debug'] ?? false),
    'timezone' => 'Asia/Karachi',
    'private_dir' => rtrim($privateDir, '/'),
    'logs_dir' => rtrim($privateDir, '/') . '/logs',
    'cache_dir' => rtrim($privateDir, '/') . '/cache',
    'service_account_path' => (string) ($secrets['service_account_path'] ?? getenv('FIREBASE_SERVICE_ACCOUNT_PATH') ?: rtrim($privateDir, '/') . '/credentials/service-account.json'),
    'firebase_project_id' => $projectId,
    'firestore_database_id' => $firestoreDbId,
    'gemini_api_key' => (string) ($secrets['gemini_api_key'] ?? getenv('GEMINI_API_KEY') ?: ''),
    'allowed_origins' => (array) ($secrets['allowed_origins'] ?? []),
    'trusted_proxies' => (array) ($secrets['trusted_proxies'] ?? []),
];
