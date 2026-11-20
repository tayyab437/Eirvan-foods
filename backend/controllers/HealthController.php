<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\AuthMiddleware;
use Eirvan\Services\FirestoreService;
use Eirvan\Services\GoogleJwtService;

/**
 * Read-only system health and IONOS compatibility check endpoint.
 * Unauthenticated callers receive only minimal liveness status; verified admins receive runtime diagnostics.
 */
final class HealthController
{
    public function __construct(
        private array $config,
        private GoogleJwtService $jwtService,
        private FirestoreService $firestore,
        private AuthMiddleware $auth
    ) {}

    public function status(): array
    {
        $user = $this->auth->authenticateOptional();
        $isAdmin = is_array($user) && $this->auth->isUserAdmin($user);

        if (!$isAdmin) {
            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'status' => 'ok',
                    'timestamp' => gmdate('c'),
                ],
            ];
        }

        $extensions = [
            'curl' => extension_loaded('curl'),
            'openssl' => extension_loaded('openssl'),
            'json' => extension_loaded('json'),
            'mbstring' => extension_loaded('mbstring'),
        ];

        $credentialsPresent = $this->jwtService->isConfigured();
        $firestoreConnected = false;
        $firestoreNote = 'Service account JSON not configured.';

        if ($credentialsPresent) {
            try {
                $doc = $this->firestore->getDocument('public_settings', 'main');
                if ($doc !== null) {
                    $firestoreConnected = true;
                    $firestoreNote = 'Connected and public_settings/main readable.';
                } else {
                    $legacyDoc = $this->firestore->getDocument('settings', 'main');
                    $firestoreConnected = true;
                    $firestoreNote = $legacyDoc !== null
                        ? 'Connected (legacy settings/main present; public_settings/main awaiting explicit admin migration).'
                        : 'Connected (public_settings/main not yet initialized).';
                }
            } catch (\Throwable) {
                $firestoreNote = 'Firestore connectivity failed.';
            }
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'status' => 'ok',
                'env' => (string) ($this->config['env'] ?? 'production'),
                'phpCompatible' => version_compare(PHP_VERSION, '8.1.0', '>='),
                'phpSeries' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION,
                'extensions' => $extensions,
                'credentialsConfigured' => $credentialsPresent,
                'geminiConfigured' => ($this->config['gemini_api_key'] ?? '') !== '',
                'firestoreConnected' => $firestoreConnected,
                'firestoreNote' => $firestoreNote,
                'timestamp' => gmdate('c'),
            ],
        ];
    }
}
