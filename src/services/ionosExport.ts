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
    'FIREBASE_PROJECT_ID' => 'gen-lang-client-0351129330',
    'FIRESTORE_DATABASE_ID' => 'ai-studio-zauqesehatpremiu-a42b0907-2253-405b-8d7e-9cfd4b314afc',
    'FIREBASE_SERVICE_ACCOUNT_PATH' => dirname(__DIR__) . '/service-account.json',
    'GEMINI_API_KEY' => '', // Optional: set only if AI Sommelier / Image Studio endpoints are enabled
    'ALLOWED_ORIGINS' => [
        'https://yourdomain.com',
        'https://www.yourdomain.com',
    ],
    'ENVIRONMENT' => 'production',
    'ADMIN_ROLES' => ['admin', 'super_admin', 'superadmin'],
    'RATE_LIMIT_DIR' => dirname(__DIR__) . '/storage/rate_limits',
    'LOG_DIR' => dirname(__DIR__) . '/storage/logs',
];
`;

export const IONOS_DEPLOYMENT_CHECKLIST = [
  'Upload public_html/ contents (compiled React SPA, .htaccess, and api/index.php) to IONOS Webspace document root.',
  'Upload backend/ and private/ directories one level above public_html/ (never inside public_html/).',
  'Configure private/config/secrets.php and private/service-account.json (IAM role: roles/datastore.user, perms 0600).',
  'Ensure private/storage/logs and private/storage/rate_limits are writable by the PHP process (0750).',
  'Create /admins/{uid} documents in Firestore with { uid, email, role: "super_admin", active: true } for authorized Google accounts.',
  'Verify GET /api/health passes cleanly before deploying staged DRAFT_firestore.rules in Firebase Console.',
];
