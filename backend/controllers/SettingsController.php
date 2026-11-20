<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\AuthMiddleware;
use Eirvan\Services\FirestoreService;
use Eirvan\Validators\RequestValidator;

/**
 * Manages Public Storefront Settings (public_settings/main),
 * Private Operational Settings (private_settings/main),
 * Explicit Non-Destructive Legacy Migration (settings/main -> split docs),
 * and Admin-gated Non-Destructive Catalog Backfill.
 */
final class SettingsController
{
    public const PUBLIC_FIELDS = [
        'storeName',
        'tagline',
        'contactPhone',
        'whatsappNumber',
        'contactEmail',
        'freeShippingThreshold',
        'standardShippingRate',
        'codEnabled',
        'bankDetails',
        'announcementBarMessage',
        'announcementActive',
    ];

    public const BANK_DETAIL_FIELDS = [
        'bankName',
        'accountTitle',
        'accountNumber',
        'iban',
        'raastId',
    ];

    public const PRIVATE_FIELDS = [
        'internalNotificationEmail',
        'internalOpsPhone',
        'financeSettlementNotes',
        'lowStockAlertThreshold',
        'taxRegistrationNumber',
        'maintenanceMode',
    ];

    public function __construct(
        private FirestoreService $firestore,
        private AuthMiddleware $auth
    ) {}

    /**
     * Public Storefront Settings Read:
     * Reads strictly from public_settings/main (non-destructive read-only fallback
     * to settings/main if migration hasn't run yet) and enforces strict field allowlisting.
     */
    public function getPublic(): array
    {
        $doc = $this->firestore->getDocument('public_settings', 'main');
        if (!is_array($doc)) {
            $doc = $this->firestore->getDocument('settings', 'main');
        }

        $filtered = is_array($doc) ? $this->filterPublicSettings($doc) : null;
        return ['status' => 200, 'body' => ['success' => true, 'settings' => $filtered]];
    }

    /**
     * Admin Public Settings Update:
     * Validates and writes strictly allowlisted public fields to public_settings/main.
     * Never writes private fields into public_settings/main and never mutates legacy settings/main.
     */
    public function updateAdmin(array $input): array
    {
        $this->auth->requireAdmin();

        if (empty($input)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'No public settings fields supplied.']];
        }

        $unknownTopLevel = array_diff(array_keys($input), self::PUBLIC_FIELDS);
        if (!empty($unknownTopLevel)) {
            return [
                'status' => 422,
                'body' => [
                    'success' => false,
                    'error' => 'Unexpected public settings field(s): ' . implode(', ', array_map('strval', $unknownTopLevel)),
                ],
            ];
        }

        $validationError = $this->validatePublicPatch($input);
        if ($validationError !== null) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => $validationError]];
        }

        $existingPublic = $this->firestore->getDocument('public_settings', 'main');
        if (!is_array($existingPublic)) {
            $legacyDoc = $this->firestore->getDocument('settings', 'main');
            $existingPublic = is_array($legacyDoc) ? $this->filterPublicSettings($legacyDoc) : [];
        } else {
            $existingPublic = $this->filterPublicSettings($existingPublic);
        }

        $patch = $this->sanitizePublicPatch($input, $existingPublic['bankDetails'] ?? []);
        if (empty($patch)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'No valid public settings fields supplied.']];
        }

        $merged = $this->filterPublicSettings(array_merge($existingPublic, $patch));
        $this->firestore->setDocument('public_settings', 'main', $merged);

        return ['status' => 200, 'body' => ['success' => true, 'settings' => $merged]];
    }

    /**
     * Admin-Only Private Operational Settings Read:
     * Never reachable without a verified Admin Firebase token + active /admins/{uid} record.
     */
    public function getPrivateAdmin(): array
    {
        $this->auth->requireAdmin();

        $privateDoc = $this->firestore->getDocument('private_settings', 'main');
        $publicDoc = $this->firestore->getDocument('public_settings', 'main');
        $legacyDoc = $this->firestore->getDocument('settings', 'main');

        $filteredPrivate = is_array($privateDoc)
            ? $this->filterPrivateSettings($privateDoc)
            : $this->defaultPrivateSettings();

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'privateSettings' => $filteredPrivate,
                'migrationStatus' => [
                    'hasPublicSettings' => is_array($publicDoc),
                    'hasPrivateSettings' => is_array($privateDoc),
                    'hasLegacySettings' => is_array($legacyDoc),
                ],
            ],
        ];
    }

    /**
     * Admin-Only Private Operational Settings Update:
     * Writes strictly to private_settings/main via Service Account.
     */
    public function updatePrivateAdmin(array $input): array
    {
        $admin = $this->auth->requireAdmin();

        $allowedInputKeys = array_merge(self::PRIVATE_FIELDS, [
            'migratedFromLegacyAt',
            'legacyPreservedFields',
            'updatedAt',
            'updatedByUid',
        ]);
        $unknownPrivate = array_diff(array_keys($input), $allowedInputKeys);
        if (!empty($unknownPrivate)) {
            return [
                'status' => 422,
                'body' => [
                    'success' => false,
                    'error' => 'Unexpected private settings field(s): ' . implode(', ', array_map('strval', $unknownPrivate)),
                ],
            ];
        }

        $existing = $this->firestore->getDocument('private_settings', 'main');
        $base = is_array($existing) ? $this->filterPrivateSettings($existing) : $this->defaultPrivateSettings();

        $patch = [];
        if (array_key_exists('internalNotificationEmail', $input)) {
            if (!is_string($input['internalNotificationEmail'])) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'internalNotificationEmail must be a string.']];
            }
            $email = RequestValidator::cleanString($input['internalNotificationEmail'], 120);
            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'Invalid internal notification email address.']];
            }
            $patch['internalNotificationEmail'] = $email;
        }
        if (array_key_exists('internalOpsPhone', $input)) {
            if (!is_string($input['internalOpsPhone'])) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'internalOpsPhone must be a string.']];
            }
            $patch['internalOpsPhone'] = RequestValidator::cleanString($input['internalOpsPhone'], 30);
        }
        if (array_key_exists('financeSettlementNotes', $input)) {
            if (!is_string($input['financeSettlementNotes'])) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'financeSettlementNotes must be a string.']];
            }
            $patch['financeSettlementNotes'] = RequestValidator::cleanString($input['financeSettlementNotes'], 1000);
        }
        if (array_key_exists('lowStockAlertThreshold', $input)) {
            $threshold = $input['lowStockAlertThreshold'];
            if (is_bool($threshold) || (!is_int($threshold) && !is_float($threshold) && !(is_string($threshold) && is_numeric(trim($threshold))))) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'lowStockAlertThreshold must be a non-negative number.']];
            }
            if ((float) $threshold < 0) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'lowStockAlertThreshold cannot be negative.']];
            }
            $patch['lowStockAlertThreshold'] = max(0, min(10000, (int) $threshold));
        }
        if (array_key_exists('taxRegistrationNumber', $input)) {
            if (!is_string($input['taxRegistrationNumber'])) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'taxRegistrationNumber must be a string.']];
            }
            $patch['taxRegistrationNumber'] = RequestValidator::cleanString($input['taxRegistrationNumber'], 60);
        }
        if (array_key_exists('maintenanceMode', $input)) {
            if (!is_bool($input['maintenanceMode'])) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'maintenanceMode must be a boolean.']];
            }
            $patch['maintenanceMode'] = $input['maintenanceMode'];
        }

        if (empty($patch)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'No valid private settings fields supplied.']];
        }

        $merged = array_merge($base, $patch, [
            'updatedAt' => gmdate('c'),
            'updatedByUid' => (string) ($admin['uid'] ?? ''),
        ]);

        $this->firestore->setDocument('private_settings', 'main', $merged);

        return ['status' => 200, 'body' => ['success' => true, 'privateSettings' => $merged]];
    }

    /**
     * Explicit Admin-Controlled Non-Destructive Legacy Migration:
     * Reads legacy settings/main read-only (never deletes or overwrites settings/main),
     * copies ONLY allowlisted public fields missing in public_settings/main,
     * and routes any private/non-public legacy fields into private_settings/main
     * without overwriting existing target values.
     *
     * Supports `dryRun: true` for verification without writes.
     * Execution (`dryRun !== true`) requires explicit `confirm: true`.
     */
    public function migrateLegacySettingsAdmin(array $input): array
    {
        $admin = $this->auth->requireAdmin();
        $dryRun = (bool) ($input['dryRun'] ?? false);
        $confirm = (bool) ($input['confirm'] ?? false);

        if (!$dryRun && !$confirm) {
            return [
                'status' => 400,
                'body' => [
                    'success' => false,
                    'error' => 'Explicit confirmation (confirm: true) is required to execute settings migration, or pass dryRun: true to verify first.',
                ],
            ];
        }

        $legacyDoc = $this->firestore->getDocument('settings', 'main');
        $existingPublicDoc = $this->firestore->getDocument('public_settings', 'main');
        $existingPrivateDoc = $this->firestore->getDocument('private_settings', 'main');

        if (!is_array($legacyDoc)) {
            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'dryRun' => $dryRun,
                    'legacyFound' => false,
                    'message' => 'No legacy settings/main document exists; nothing to migrate.',
                    'publicKeysCopied' => [],
                    'publicKeysSkippedExisting' => [],
                    'privateKeysCopied' => [],
                    'privateKeysSkippedExisting' => [],
                    'legacyPreservedKeysCopied' => [],
                ],
            ];
        }

        $cleanLegacy = $legacyDoc;
        unset($cleanLegacy['_docId'], $cleanLegacy['_updateTime']);

        // Prepare sanitized public projection from legacy doc
        $legacyPublicCandidate = $this->filterPublicSettings($cleanLegacy);
        $currentPublic = is_array($existingPublicDoc) ? $this->filterPublicSettings($existingPublicDoc) : [];

        $publicKeysCopied = [];
        $publicKeysSkipped = [];
        $targetPublic = $currentPublic;

        foreach ($legacyPublicCandidate as $key => $value) {
            if (!array_key_exists($key, $targetPublic)) {
                $targetPublic[$key] = $value;
                $publicKeysCopied[] = $key;
            } else {
                $publicKeysSkipped[] = $key;
            }
        }

        // Partition non-public fields strictly into private_settings/main
        $currentPrivate = is_array($existingPrivateDoc)
            ? $this->filterPrivateSettings($existingPrivateDoc)
            : $this->defaultPrivateSettings();
        $existingPreserved = is_array($currentPrivate['legacyPreservedFields'] ?? null)
            ? $currentPrivate['legacyPreservedFields']
            : [];

        $privateKeysCopied = [];
        $privateKeysSkipped = [];
        $legacyPreservedKeysCopied = [];
        $targetPrivate = $currentPrivate;
        $targetPreserved = $existingPreserved;

        foreach ($cleanLegacy as $key => $value) {
            if ($key === 'bankDetails' && is_array($value)) {
                $extraBankKeys = [];
                foreach ($value as $bankSubKey => $bankSubVal) {
                    if (!in_array((string) $bankSubKey, self::BANK_DETAIL_FIELDS, true)) {
                        $extraBankKeys[(string) $bankSubKey] = $bankSubVal;
                    }
                }
                if (!empty($extraBankKeys)) {
                    $existingBankExtra = is_array($targetPreserved['bankDetailsExtra'] ?? null)
                        ? $targetPreserved['bankDetailsExtra']
                        : [];
                    foreach ($extraBankKeys as $subKey => $subVal) {
                        if (!array_key_exists($subKey, $existingBankExtra)) {
                            $existingBankExtra[$subKey] = $subVal;
                            $legacyPreservedKeysCopied[] = 'bankDetailsExtra.' . $subKey;
                        } else {
                            $privateKeysSkipped[] = 'bankDetailsExtra.' . $subKey;
                        }
                    }
                    $targetPreserved['bankDetailsExtra'] = $existingBankExtra;
                }
                continue;
            }
            if (in_array($key, self::PUBLIC_FIELDS, true)) {
                continue;
            }
            if (in_array($key, self::PRIVATE_FIELDS, true)) {
                if (!array_key_exists($key, $existingPrivateDoc ?? [])) {
                    $targetPrivate[$key] = $value;
                    $privateKeysCopied[] = $key;
                } else {
                    $privateKeysSkipped[] = $key;
                }
            } else {
                if (!array_key_exists($key, $targetPreserved)) {
                    $targetPreserved[$key] = $value;
                    $legacyPreservedKeysCopied[] = (string) $key;
                } else {
                    $privateKeysSkipped[] = (string) $key;
                }
            }
        }

        $targetPrivate['legacyPreservedFields'] = $targetPreserved;

        if (!$dryRun) {
            $now = gmdate('c');
            if (!is_array($existingPublicDoc) || !empty($publicKeysCopied)) {
                $this->firestore->setDocument('public_settings', 'main', $targetPublic);
            }

            if (!is_array($existingPrivateDoc) || !empty($privateKeysCopied) || !empty($legacyPreservedKeysCopied)) {
                if (empty($targetPrivate['migratedFromLegacyAt'])) {
                    $targetPrivate['migratedFromLegacyAt'] = $now;
                }
                $targetPrivate['updatedAt'] = $now;
                $targetPrivate['updatedByUid'] = (string) ($admin['uid'] ?? '');
                $this->firestore->setDocument('private_settings', 'main', $targetPrivate);
            }
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'dryRun' => $dryRun,
                'legacyFound' => true,
                'legacyDocumentPreserved' => true,
                'publicTargetExisted' => is_array($existingPublicDoc),
                'privateTargetExisted' => is_array($existingPrivateDoc),
                'publicKeysCopied' => $publicKeysCopied,
                'publicKeysSkippedExisting' => $publicKeysSkipped,
                'privateKeysCopied' => $privateKeysCopied,
                'privateKeysSkippedExisting' => $privateKeysSkipped,
                'legacyPreservedKeysCopied' => $legacyPreservedKeysCopied,
            ],
        ];
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

    /**
     * Strictly filter any document down to public storefront fields + allowlisted bankDetails.
     */
    private function filterPublicSettings(array $doc): array
    {
        $filtered = [];
        foreach (self::PUBLIC_FIELDS as $field) {
            if (!array_key_exists($field, $doc)) {
                continue;
            }
            if ($field === 'bankDetails') {
                if (!is_array($doc['bankDetails'])) {
                    continue;
                }
                $filteredBank = [];
                foreach (self::BANK_DETAIL_FIELDS as $subKey) {
                    if (array_key_exists($subKey, $doc['bankDetails'])) {
                        $filteredBank[$subKey] = RequestValidator::cleanString((string) $doc['bankDetails'][$subKey], 100);
                    }
                }
                $filtered['bankDetails'] = $filteredBank;
                continue;
            }
            $filtered[$field] = $doc[$field];
        }
        return $filtered;
    }

    private function validatePublicPatch(array $input): ?string
    {
        $stringMaxLengths = [
            'storeName' => 100,
            'tagline' => 200,
            'contactPhone' => 30,
            'whatsappNumber' => 30,
            'contactEmail' => 100,
            'announcementBarMessage' => 300,
        ];
        $requiredNonEmpty = ['storeName', 'contactPhone', 'whatsappNumber'];

        foreach ($stringMaxLengths as $field => $maxLen) {
            if (!array_key_exists($field, $input)) {
                continue;
            }
            if (!is_string($input[$field])) {
                return sprintf('%s must be a string.', $field);
            }
            $cleaned = RequestValidator::cleanString($input[$field], $maxLen);
            if (in_array($field, $requiredNonEmpty, true) && $cleaned === '') {
                return sprintf('%s cannot be empty.', $field);
            }
            if ($field === 'contactEmail' && $cleaned !== '' && !filter_var($cleaned, FILTER_VALIDATE_EMAIL)) {
                return 'contactEmail must be a valid email address.';
            }
        }

        foreach (['freeShippingThreshold', 'standardShippingRate'] as $numField) {
            if (!array_key_exists($numField, $input)) {
                continue;
            }
            $val = $input[$numField];
            $isNumeric = (is_int($val) || is_float($val) || (is_string($val) && is_numeric(trim($val)))) && !is_bool($val);
            if (!$isNumeric) {
                return sprintf('%s must be a valid number.', $numField);
            }
            $floatVal = (float) $val;
            if (!is_finite($floatVal) || $floatVal < 0 || $floatVal > 1000000) {
                return sprintf('%s must be between 0 and 1,000,000.', $numField);
            }
        }

        foreach (['codEnabled', 'announcementActive'] as $boolField) {
            if (array_key_exists($boolField, $input) && !is_bool($input[$boolField])) {
                return sprintf('%s must be a boolean.', $boolField);
            }
        }

        if (array_key_exists('bankDetails', $input)) {
            $bd = $input['bankDetails'];
            if (!is_array($bd) || (!empty($bd) && array_is_list($bd))) {
                return 'bankDetails must be a structured key-value object.';
            }
            $unknownBank = array_diff(array_keys($bd), self::BANK_DETAIL_FIELDS);
            if (!empty($unknownBank)) {
                return 'Unexpected bankDetails field(s): ' . implode(', ', array_map('strval', $unknownBank));
            }
            foreach ($bd as $subKey => $subVal) {
                if (!is_string($subVal)) {
                    return sprintf('bankDetails.%s must be a string.', (string) $subKey);
                }
            }
        }

        return null;
    }

    private function sanitizePublicPatch(array $input, array $existingBank = []): array
    {
        $patch = [];
        if (array_key_exists('storeName', $input)) {
            $patch['storeName'] = RequestValidator::cleanString((string) $input['storeName'], 100);
        }
        if (array_key_exists('tagline', $input)) {
            $patch['tagline'] = RequestValidator::cleanString((string) $input['tagline'], 200);
        }
        if (array_key_exists('contactPhone', $input)) {
            $patch['contactPhone'] = RequestValidator::cleanString((string) $input['contactPhone'], 30);
        }
        if (array_key_exists('whatsappNumber', $input)) {
            $patch['whatsappNumber'] = RequestValidator::cleanString((string) $input['whatsappNumber'], 30);
        }
        if (array_key_exists('contactEmail', $input)) {
            $patch['contactEmail'] = RequestValidator::cleanString((string) $input['contactEmail'], 100);
        }
        if (array_key_exists('freeShippingThreshold', $input)) {
            $patch['freeShippingThreshold'] = max(0, (int) $input['freeShippingThreshold']);
        }
        if (array_key_exists('standardShippingRate', $input)) {
            $patch['standardShippingRate'] = max(0, (int) $input['standardShippingRate']);
        }
        if (array_key_exists('codEnabled', $input)) {
            $patch['codEnabled'] = (bool) $input['codEnabled'];
        }
        if (array_key_exists('announcementBarMessage', $input)) {
            $patch['announcementBarMessage'] = RequestValidator::cleanString((string) $input['announcementBarMessage'], 300);
        }
        if (array_key_exists('announcementActive', $input)) {
            $patch['announcementActive'] = (bool) $input['announcementActive'];
        }
        if (array_key_exists('bankDetails', $input) && is_array($input['bankDetails'])) {
            $bankMax = [
                'bankName' => 100,
                'accountTitle' => 100,
                'accountNumber' => 60,
                'iban' => 60,
                'raastId' => 60,
            ];
            $nextBank = [];
            foreach (self::BANK_DETAIL_FIELDS as $subKey) {
                if (array_key_exists($subKey, $input['bankDetails'])) {
                    $nextBank[$subKey] = RequestValidator::cleanString((string) $input['bankDetails'][$subKey], $bankMax[$subKey]);
                } else {
                    $nextBank[$subKey] = RequestValidator::cleanString((string) ($existingBank[$subKey] ?? ''), $bankMax[$subKey]);
                }
            }
            $patch['bankDetails'] = $nextBank;
        }
        return $patch;
    }

    private function defaultPrivateSettings(): array
    {
        return [
            'internalNotificationEmail' => '',
            'internalOpsPhone' => '',
            'financeSettlementNotes' => '',
            'lowStockAlertThreshold' => 10,
            'taxRegistrationNumber' => '',
            'maintenanceMode' => false,
            'migratedFromLegacyAt' => '',
            'legacyPreservedFields' => [],
            'updatedAt' => '',
            'updatedByUid' => '',
        ];
    }

    private function filterPrivateSettings(array $doc): array
    {
        $defaults = $this->defaultPrivateSettings();
        $out = [];
        foreach (array_keys($defaults) as $key) {
            $out[$key] = array_key_exists($key, $doc) ? $doc[$key] : $defaults[$key];
        }
        $out['lowStockAlertThreshold'] = max(0, (int) ($out['lowStockAlertThreshold'] ?? 10));
        $out['maintenanceMode'] = (bool) ($out['maintenanceMode'] ?? false);
        $out['legacyPreservedFields'] = is_array($out['legacyPreservedFields'] ?? null) ? $out['legacyPreservedFields'] : [];
        return $out;
    }
}
