<?php
declare(strict_types=1);

/**
 * Copy this template to `private/config/secrets.php` on IONOS (never commit real secrets).
 * Permissions on IONOS: chmod 600 private/config/secrets.php
 */
return [
    'app_env' => 'production',
    'app_debug' => false,

    // Firebase project & Firestore database ID
    'firebase_project_id' => 'gen-lang-client-0351129330',
    'firestore_database_id' => 'ai-studio-zauqesehatpremiu-a42b0907-2253-405b-8d7e-9cfd4b314afc',

    // Path to downloaded Google Cloud / Firebase Service Account JSON key (outside public_html)
    'service_account_path' => __DIR__ . '/../credentials/service-account.json',

    // Server-side Gemini API Key (never exposed in React/Vite frontend)
    'gemini_api_key' => 'REPLACE_WITH_YOUR_SERVER_SIDE_GEMINI_API_KEY',

    // Exact production origins allowed to call the API (comma/array)
    'allowed_origins' => [
        'https://YOUR-IONOS-DOMAIN.com',
        'https://www.YOUR-IONOS-DOMAIN.com',
    ],

    // Optional trusted reverse proxy IPs if IONOS sits behind a CDN
    'trusted_proxies' => [],
];
