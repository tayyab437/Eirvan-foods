<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\AuthMiddleware;
use Eirvan\Services\FirestoreService;
use Eirvan\Validators\RequestValidator;

/**
 * Manages Store Settings & Admin-gated Non-Destructive Catalog Backfill.
 */
final class SettingsController
{
    public function __construct(
        private FirestoreService $firestore,
        private AuthMiddleware $auth
    ) {}

    public function getPublic(): array
    {
        $doc = $this->firestore->getDocument('settings', 'main');
        if (is_array($doc)) {
            unset($doc['_docId'], $doc['_updateTime']);
        }
        return ['status' => 200, 'body' => ['success' => true, 'settings' => $doc]];
    }

    public function updateAdmin(array $input): array
    {
        $this->auth->requireAdmin();

        $existing = $this->firestore->getDocument('settings', 'main') ?? [];
        unset($existing['_docId'], $existing['_updateTime']);

        $patch = [];
        if (isset($input['storeName'])) {
            $patch['storeName'] = RequestValidator::cleanString($input['storeName'], 100);
        }
        if (isset($input['tagline'])) {
            $patch['tagline'] = RequestValidator::cleanString($input['tagline'], 200);
        }
        if (isset($input['contactPhone'])) {
            $patch['contactPhone'] = RequestValidator::cleanString($input['contactPhone'], 30);
        }
        if (isset($input['whatsappNumber'])) {
            $patch['whatsappNumber'] = RequestValidator::cleanString($input['whatsappNumber'], 30);
        }
        if (isset($input['contactEmail'])) {
            $patch['contactEmail'] = RequestValidator::cleanString($input['contactEmail'], 100);
        }
        if (isset($input['freeShippingThreshold'])) {
            $patch['freeShippingThreshold'] = max(0, (int) $input['freeShippingThreshold']);
        }
        if (isset($input['standardShippingRate'])) {
            $patch['standardShippingRate'] = max(0, (int) $input['standardShippingRate']);
        }
        if (isset($input['codEnabled'])) {
            $patch['codEnabled'] = (bool) $input['codEnabled'];
        }
        if (isset($input['announcementBarMessage'])) {
            $patch['announcementBarMessage'] = RequestValidator::cleanString($input['announcementBarMessage'], 300);
        }
        if (isset($input['announcementActive'])) {
            $patch['announcementActive'] = (bool) $input['announcementActive'];
        }
        if (isset($input['bankDetails']) && is_array($input['bankDetails'])) {
            $patch['bankDetails'] = [
                'bankName' => RequestValidator::cleanString($input['bankDetails']['bankName'] ?? '', 100),
                'accountTitle' => RequestValidator::cleanString($input['bankDetails']['accountTitle'] ?? '', 100),
                'accountNumber' => RequestValidator::cleanString($input['bankDetails']['accountNumber'] ?? '', 60),
                'iban' => RequestValidator::cleanString($input['bankDetails']['iban'] ?? '', 60),
                'raastId' => RequestValidator::cleanString($input['bankDetails']['raastId'] ?? '', 60),
            ];
        }

        if (empty($patch)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'No valid settings fields supplied.']];
        }

        $merged = array_merge($existing, $patch);
        $this->firestore->setDocument('settings', 'main', $merged);

        return ['status' => 200, 'body' => ['success' => true, 'settings' => $merged]];
    }

    /**
     * Non-destructive admin backfill: creates only missing documents in target collections.
     * Never overwrites existing live records.
     */
    public function backfillMissingCatalogAdmin(array $input): array
    {
        $this->auth->requireAdmin();

        $collections = [
            'categories' => (array) ($input['categories'] ?? []),
            'shahi_boxes' => (array) ($input['shahiBoxes'] ?? []),
            'shahi_ingredients' => (array) ($input['shahiIngredients'] ?? []),
            'products' => (array) ($input['products'] ?? []),
        ];

        $created = 0;
        foreach ($collections as $col => $docs) {
            foreach ($docs as $doc) {
                if (!is_array($doc) || empty($doc['id'])) {
                    continue;
                }
                $docId = RequestValidator::cleanString($doc['id'], 128);
                if (!RequestValidator::isValidDocId($docId)) {
                    continue;
                }
                try {
                    $this->firestore->createDocument($col, $docId, $doc);
                    $created++;
                } catch (\Throwable) {
                    // Already exists — preserve existing live data
                }
            }
        }

        return [
            'status' => 200,
            'body' => ['success' => true, 'createdMissingDocs' => $created],
        ];
    }
}
