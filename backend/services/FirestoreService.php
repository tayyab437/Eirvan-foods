<?php
declare(strict_types=1);

namespace Eirvan\Services;

use RuntimeException;

/**
 * Firestore REST API v1 Client for IONOS PHP Webspaces.
 * Supports CRUD, structuredQuery, pagination, atomic increments,
 * and read-write transactions with optimistic concurrency locking.
 */
final class FirestoreService
{
    private string $projectId;
    private string $databaseId;
    private GoogleJwtService $jwtService;
    private LoggerService $logger;

    public function __construct(
        string $projectId,
        string $databaseId,
        GoogleJwtService $jwtService,
        LoggerService $logger
    ) {
        $this->projectId = $projectId;
        $this->databaseId = $databaseId;
        $this->jwtService = $jwtService;
        $this->logger = $logger;
    }

    public function docName(string $collection, string $docId): string
    {
        return sprintf(
            'projects/%s/databases/%s/documents/%s/%s',
            $this->projectId,
            $this->databaseId,
            trim($collection, '/'),
            trim($docId, '/')
        );
    }

    private function baseUrl(): string
    {
        return sprintf(
            'https://firestore.googleapis.com/v1/projects/%s/databases/%s/documents',
            rawurlencode($this->projectId),
            rawurlencode($this->databaseId)
        );
    }

    public function getDocument(string $collection, string $docId, ?string $transaction = null): ?array
    {
        $url = $this->baseUrl() . '/' . rawurlencode($collection) . '/' . rawurlencode($docId);
        if ($transaction !== null) {
            $url .= '?transaction=' . rawurlencode($transaction);
        }

        $res = $this->request('GET', $url);
        if ($res['status'] === 404) {
            return null;
        }
        if ($res['status'] >= 400) {
            throw new RuntimeException('Firestore read error: HTTP ' . $res['status']);
        }

        return $this->decodeDocument($res['body']);
    }

    public function listCollection(string $collection, int $pageSize = 100, ?string $pageToken = null): array
    {
        $query = ['pageSize' => max(1, min(300, $pageSize))];
        if ($pageToken !== null && $pageToken !== '') {
            $query['pageToken'] = $pageToken;
        }

        $url = $this->baseUrl() . '/' . rawurlencode($collection) . '?' . http_build_query($query);
        $res = $this->request('GET', $url);
        if ($res['status'] >= 400) {
            throw new RuntimeException('Firestore list error: HTTP ' . $res['status']);
        }

        $docs = [];
        foreach ((array) ($res['body']['documents'] ?? []) as $rawDoc) {
            $docs[] = $this->decodeDocument($rawDoc);
        }

        return [
            'documents' => $docs,
            'nextPageToken' => $res['body']['nextPageToken'] ?? null,
        ];
    }

    public function createDocument(string $collection, string $docId, array $data): array
    {
        $url = $this->baseUrl() . '/' . rawurlencode($collection) . '?documentId=' . rawurlencode($docId);
        $payload = ['fields' => $this->encodeFields($data)];
        $res = $this->request('POST', $url, $payload);

        if ($res['status'] === 409) {
            throw new RuntimeException('ALREADY_EXISTS');
        }
        if ($res['status'] >= 400) {
            throw new RuntimeException('Firestore create error: HTTP ' . $res['status']);
        }

        return $this->decodeDocument($res['body']);
    }

    public function setDocument(string $collection, string $docId, array $data): array
    {
        $url = $this->baseUrl() . '/' . rawurlencode($collection) . '/' . rawurlencode($docId);
        $payload = ['fields' => $this->encodeFields($data)];
        $res = $this->request('PATCH', $url, $payload);

        if ($res['status'] >= 400) {
            throw new RuntimeException('Firestore set error: HTTP ' . $res['status']);
        }

        return $this->decodeDocument($res['body']);
    }

    public function patchDocument(string $collection, string $docId, array $data): array
    {
        $fieldPaths = array_keys($data);
        if (empty($fieldPaths)) {
            throw new RuntimeException('Empty patch payload.');
        }

        $maskParams = implode('&', array_map(
            static fn(string $path): string => 'updateMask.fieldPaths=' . rawurlencode($path),
            $fieldPaths
        ));

        $url = $this->baseUrl() . '/' . rawurlencode($collection) . '/' . rawurlencode($docId) . '?' . $maskParams;
        $payload = ['fields' => $this->encodeFields($data)];
        $res = $this->request('PATCH', $url, $payload);

        if ($res['status'] >= 400) {
            throw new RuntimeException('Firestore patch error: HTTP ' . $res['status']);
        }

        return $this->decodeDocument($res['body']);
    }

    public function deleteDocument(string $collection, string $docId): void
    {
        $url = $this->baseUrl() . '/' . rawurlencode($collection) . '/' . rawurlencode($docId);
        $res = $this->request('DELETE', $url);

        if ($res['status'] >= 400 && $res['status'] !== 404) {
            throw new RuntimeException('Firestore delete error: HTTP ' . $res['status']);
        }
    }

    public function incrementField(string $collection, string $docId, string $fieldPath, int $delta = 1): void
    {
        $url = $this->baseUrl() . ':commit';
        $payload = [
            'writes' => [
                [
                    'transform' => [
                        'document' => $this->docName($collection, $docId),
                        'fieldTransforms' => [
                            [
                                'fieldPath' => $fieldPath,
                                'increment' => ['integerValue' => (string) $delta],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $res = $this->request('POST', $url, $payload);
        if ($res['status'] >= 400) {
            throw new RuntimeException('Firestore increment error: HTTP ' . $res['status']);
        }
    }

    /**
     * Execute a structured query with optional equality filters, orderBy, limit, and offset.
     */
    public function runQuery(
        string $collection,
        array $whereEqual = [],
        ?string $orderByField = null,
        string $direction = 'DESCENDING',
        int $limit = 100,
        int $offset = 0
    ): array {
        $structuredQuery = [
            'from' => [['collectionId' => $collection]],
            'limit' => max(1, min(500, $limit)),
        ];

        if ($offset > 0) {
            $structuredQuery['offset'] = $offset;
        }

        if (!empty($whereEqual)) {
            $filters = [];
            foreach ($whereEqual as $field => $val) {
                $filters[] = [
                    'fieldFilter' => [
                        'field' => ['fieldPath' => $field],
                        'op' => 'EQUAL',
                        'value' => $this->encodeValue($val),
                    ],
                ];
            }

            $structuredQuery['where'] = count($filters) === 1
                ? $filters[0]
                : ['compositeFilter' => ['op' => 'AND', 'filters' => $filters]];
        }

        if ($orderByField !== null && $orderByField !== '') {
            $structuredQuery['orderBy'] = [
                [
                    'field' => ['fieldPath' => $orderByField],
                    'direction' => strtoupper($direction) === 'ASCENDING' ? 'ASCENDING' : 'DESCENDING',
                ],
            ];
        }

        $url = $this->baseUrl() . ':runQuery';
        $res = $this->request('POST', $url, ['structuredQuery' => $structuredQuery]);

        if ($res['status'] >= 400) {
            throw new RuntimeException('Firestore query error: HTTP ' . $res['status']);
        }

        $results = [];
        foreach ((array) $res['body'] as $row) {
            if (isset($row['document'])) {
                $results[] = $this->decodeDocument($row['document']);
            }
        }

        return $results;
    }

    public function beginTransaction(): string
    {
        $url = $this->baseUrl() . ':beginTransaction';
        $res = $this->request('POST', $url, ['options' => ['readWrite' => new \stdClass()]]);
        if ($res['status'] >= 400 || empty($res['body']['transaction'])) {
            throw new RuntimeException('Failed to begin Firestore transaction.');
        }

        return (string) $res['body']['transaction'];
    }

    public function rollbackTransaction(string $transaction): void
    {
        $url = $this->baseUrl() . ':rollback';
        @$this->request('POST', $url, ['transaction' => $transaction]);
    }

    public function commitTransaction(string $transaction, array $writes): array
    {
        $url = $this->baseUrl() . ':commit';
        $res = $this->request('POST', $url, [
            'transaction' => $transaction,
            'writes' => $writes,
        ]);

        if ($res['status'] === 409) {
            throw new RuntimeException('TRANSACTION_CONFLICT');
        }
        if ($res['status'] >= 400) {
            throw new RuntimeException('Firestore commit failed: HTTP ' . $res['status']);
        }

        return $res['body'];
    }

    /**
     * Runs a read-write transaction with automatic optimistic retry on contention.
     * Callable receives ($txId) and must return ['writes' => [...], 'result' => mixed].
     */
    public function runTransaction(callable $fn, int $maxAttempts = 3): mixed
    {
        $lastErr = null;
        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            $tx = $this->beginTransaction();
            try {
                $plan = $fn($tx);
                $writes = $plan['writes'] ?? [];
                if (!empty($writes)) {
                    $this->commitTransaction($tx, $writes);
                } else {
                    $this->rollbackTransaction($tx);
                }
                return $plan['result'] ?? null;
            } catch (RuntimeException $e) {
                $this->rollbackTransaction($tx);
                if ($e->getMessage() === 'TRANSACTION_CONFLICT' && $attempt < $maxAttempts) {
                    $lastErr = $e;
                    usleep(100000 * $attempt);
                    continue;
                }
                throw $e;
            } catch (\Throwable $e) {
                $this->rollbackTransaction($tx);
                throw $e;
            }
        }

        throw $lastErr ?? new RuntimeException('Firestore transaction aborted after retries.');
    }

    public function buildCreateWrite(string $collection, string $docId, array $data): array
    {
        return [
            'update' => [
                'name' => $this->docName($collection, $docId),
                'fields' => $this->encodeFields($data),
            ],
            'currentDocument' => ['exists' => false],
        ];
    }

    public function buildUpdateWithPrecondition(
        string $collection,
        string $docId,
        array $data,
        string $expectedUpdateTime,
        ?array $updateMaskFields = null
    ): array {
        $write = [
            'update' => [
                'name' => $this->docName($collection, $docId),
                'fields' => $this->encodeFields($data),
            ],
            'currentDocument' => ['updateTime' => $expectedUpdateTime],
        ];

        if ($updateMaskFields !== null) {
            $write['updateMask'] = ['fieldPaths' => $updateMaskFields];
        }

        return $write;
    }

    public function buildIncrementWrite(string $collection, string $docId, string $fieldPath, int $delta = 1): array
    {
        return [
            'transform' => [
                'document' => $this->docName($collection, $docId),
                'fieldTransforms' => [
                    [
                        'fieldPath' => $fieldPath,
                        'increment' => ['integerValue' => (string) $delta],
                    ],
                ],
            ],
        ];
    }

    public function encodeFields(array $data): array
    {
        $fields = [];
        foreach ($data as $key => $val) {
            if ($val === null && is_string($key) && str_starts_with($key, '_')) {
                continue;
            }
            $fields[(string) $key] = $this->encodeValue($val);
        }
        return $fields;
    }

    public function encodeValue(mixed $val): array
    {
        if ($val === null) {
            return ['nullValue' => null];
        }
        if (is_bool($val)) {
            return ['booleanValue' => $val];
        }
        if (is_int($val)) {
            return ['integerValue' => (string) $val];
        }
        if (is_float($val)) {
            return ['doubleValue' => $val];
        }
        if (is_string($val)) {
            return ['stringValue' => $val];
        }
        if (is_array($val)) {
            if (array_is_list($val)) {
                return [
                    'arrayValue' => [
                        'values' => array_map(fn($item) => $this->encodeValue($item), $val),
                    ],
                ];
            }
            return [
                'mapValue' => [
                    'fields' => $this->encodeFields($val),
                ],
            ];
        }

        return ['stringValue' => (string) $val];
    }

    private function decodeDocument(array $doc): array
    {
        $data = [];
        foreach ((array) ($doc['fields'] ?? []) as $key => $typed) {
            $data[$key] = $this->decodeValue($typed);
        }
        if (!empty($doc['name'])) {
            $parts = explode('/', (string) $doc['name']);
            $data['_docId'] = end($parts);
        }
        if (!empty($doc['updateTime'])) {
            $data['_updateTime'] = (string) $doc['updateTime'];
        }
        return $data;
    }

    private function decodeValue(array $typed): mixed
    {
        if (array_key_exists('nullValue', $typed)) {
            return null;
        }
        if (array_key_exists('booleanValue', $typed)) {
            return (bool) $typed['booleanValue'];
        }
        if (array_key_exists('integerValue', $typed)) {
            return (int) $typed['integerValue'];
        }
        if (array_key_exists('doubleValue', $typed)) {
            return (float) $typed['doubleValue'];
        }
        if (array_key_exists('stringValue', $typed)) {
            return (string) $typed['stringValue'];
        }
        if (array_key_exists('timestampValue', $typed)) {
            return (string) $typed['timestampValue'];
        }
        if (array_key_exists('arrayValue', $typed)) {
            $items = [];
            foreach ((array) ($typed['arrayValue']['values'] ?? []) as $item) {
                $items[] = $this->decodeValue($item);
            }
            return $items;
        }
        if (array_key_exists('mapValue', $typed)) {
            $map = [];
            foreach ((array) ($typed['mapValue']['fields'] ?? []) as $k => $v) {
                $map[$k] = $this->decodeValue($v);
            }
            return $map;
        }
        return null;
    }

    private function request(string $method, string $url, ?array $body = null, bool $retriedAuth = false): array
    {
        $token = $this->jwtService->getAccessToken($retriedAuth);

        $ch = curl_init($url);
        $headers = [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
        ];

        $opts = [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ];

        if ($body !== null) {
            $json = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $headers[] = 'Content-Type: application/json';
            $opts[CURLOPT_POSTFIELDS] = $json ?: '{}';
        }

        $opts[CURLOPT_HTTPHEADER] = $headers;
        curl_setopt_array($ch, $opts);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            $this->logger->error('firestore_curl_failure', ['error' => $curlError, 'method' => $method]);
            throw new RuntimeException('Firestore network request failed.');
        }

        if ($status === 401 && !$retriedAuth) {
            return $this->request($method, $url, $body, true);
        }

        $decoded = json_decode((string) $raw, true);
        if ($status >= 400 && $status !== 404 && $status !== 409) {
            $this->logger->error('firestore_http_error', [
                'status' => $status,
                'method' => $method,
                'message' => $decoded['error']['message'] ?? 'unknown',
            ]);
        }

        return [
            'status' => $status,
            'body' => is_array($decoded) ? $decoded : [],
        ];
    }
}
