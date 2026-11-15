/**
 * IONOS Plus Webspace PHP 8.x + Firebase Firestore Deployment Reference Templates
 * Contains strictly non-secret configuration templates for the single-host IONOS architecture.
 */

export const IONOS_PHP_SECRETS_TEMPLATE = `<?php
declare(strict_types=1);

/**
 * Copy to /private/config/secrets.php on IONOS Plus Webspace (above public_html/).
 * Never commit real service-account credentials or Gemini API keys into version control.
 */
return [
    'app_env' => 'production',
    'app_debug' => false,
    'firebase_project_id' => 'gen-lang-client-0351129330',
    'firestore_database_id' => 'ai-studio-zauqesehatpremiu-a42b0907-2253-405b-8d7e-9cfd4b314afc',
    'service_account_path' => __DIR__ . '/../credentials/service-account.json',
    'gemini_api_key' => '', // Optional: set only if AI Sommelier / Image Studio endpoints are enabled
    'allowed_origins' => [
        'https://yourdomain.com',
        'https://www.yourdomain.com',
    ],
    'trusted_proxies' => [],
];
`;

export const IONOS_DEPLOYMENT_CHECKLIST = [
  'Upload public_html/ contents (compiled React SPA, .htaccess, and api/index.php) to IONOS Webspace document root.',
  'Upload backend/ and private/ directories one level above public_html/ (never inside public_html/).',
  'Configure private/config/secrets.php and private/credentials/service-account.json (IAM role: roles/datastore.user, perms 0600).',
  'Ensure private/logs and private/cache directories are writable by the PHP process (0750).',
  'Create /admins/{uid} documents in Firestore with { uid, email, role: "super_admin", active: true } for authorized Google accounts.',
  'Verify GET /api/health passes cleanly before deploying staged DRAFT_firestore.rules in Firebase Console.',
];
