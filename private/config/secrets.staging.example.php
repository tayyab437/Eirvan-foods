<?php
declare(strict_types=1);

/**
 * Isolated IONOS Staging PHP Configuration Template.
 * Deploy OUTSIDE public_html (e.g., staging_private/config/secrets.staging.php
 * or staging_private/config/secrets.php alongside SetEnv EIRVAN_ENV staging).
 *
 * RECOMMENDED PRODUCTION-SAFE ISOLATION:
 *   Use a COMPLETELY SEPARATE Firebase staging project (independent Firebase Auth,
 *   Firestore database, /admins/{uid} docs, rules, and staging service account JSON)
 *   so staging credentials have ZERO IAM permissions on production project
 *   'gen-lang-client-0351129330'.
 *
 * ALTERNATIVE NAMED DATABASE ISOLATION (if sharing one GCP project):
 *   Grant the staging service account ONLY a conditional IAM binding restricted to
 *   resource.name.startsWith("projects/<project-id>/databases/<staging-db-id>")
 *   and deploy staging rules strictly to the staging database only. Never reuse the
 *   production service-account.json on staging.
 */
return [
    'app_env' => 'staging',
    'app_debug' => false,

    // Strongly preferred: dedicated separate Firebase staging project ID
    'firebase_project_id' => 'REPLACE_WITH_STAGING_FIREBASE_PROJECT_ID',
    // Standard '(default)' in a separate staging project, or an isolated named staging DB ID
    'firestore_database_id' => 'REPLACE_WITH_ISOLATED_STAGING_FIRESTORE_DB_ID',

    // Dedicated staging-only service account JSON (chmod 600, stored outside public_html)
    'service_account_path' => __DIR__ . '/../credentials/staging-service-account.json',

    // Optional separate server-side Gemini API key for staging validation
    'gemini_api_key' => '',

    // Exact IONOS staging subdomain origin
    'allowed_origins' => [
        'https://staging.YOUR-IONOS-DOMAIN.com',
    ],

    'trusted_proxies' => [],
];
