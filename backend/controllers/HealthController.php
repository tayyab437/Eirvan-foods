<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Services\FirestoreService;
use Eirvan\Services\GoogleJwtService;

/**
 * Read-only system health and IONOS compatibility check endpoint.
 */
final class HealthController
{
    public function __construct(
        private array $config,
        private GoogleJwtService $jwtService,
        private FirestoreService $firestore
    ) {}

    public function status(): array
    {
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
                // Non-destructive read-only ping on settings/main
                $doc = $this->firestore->getDocument('settings', 'main');
                $firestoreConnected = true;
                $firestoreNote = $doc !== null ? 'Connected and settings document readable.' : 'Connected (settings/main not yet initialized).';
            } catch (\Throwable) {
                $firestoreNote = 'Firestore connectivity failed.';
            }
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'phpVersion' => PHP_VERSION,
                'extensions' => $extensions,
                'credentialsConfigured' => $credentialsPresent,
                'geminiConfigured' => $this->config['gemini_api_key'] !== '',
                'firestoreConnected' => $firestoreConnected,
                'firestoreNote' => $firestoreNote,
                'timestamp' => gmdate('c'),
            ],
        ];
    }
}
