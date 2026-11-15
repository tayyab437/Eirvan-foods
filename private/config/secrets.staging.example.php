<?php
declare(strict_types=1);

/**
 * Isolated IONOS Staging PHP Configuration Template.
 * Deploy OUTSIDE public_html (e.g., staging_private/config/secrets.staging.php
 * or staging_private/config/secrets.php alongside SetEnv EIRVAN_ENV staging).
 *
 * CRITICAL STAGING ISOLATION RULE:
 *   Never point staging firestore_database_id at the live production database
 *   ('ai-studio-zauqesehatpremiu-a42b0907-2253-405b-8d7e-9cfd4b314afc').
 *   backend/config/app.php fails closed if app_env === 'staging' targets production DB.
 */
return [
    'app_env' => 'staging',
    'app_debug' => false,

    // Isolated staging Firebase project OR dedicated non-production named Firestore DB
    'firebase_project_id' => 'gen-lang-client-0351129330',
    'firestore_database_id' => 'REPLACE_WITH_ISOLATED_STAGING_FIRESTORE_DB_ID',

    // Dedicated staging service account JSON (chmod 600, stored outside public_html)
    'service_account_path' => __DIR__ . '/../credentials/staging-service-account.json',

    // Optional separate server-side Gemini API key for staging validation
    'gemini_api_key' => '',

    // Exact IONOS staging subdomain origin
    'allowed_origins' => [
        'https://staging.YOUR-IONOS-DOMAIN.com',
    ],

    'trusted_proxies' => [],
];
