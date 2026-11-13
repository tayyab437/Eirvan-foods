<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\AuthMiddleware;
use Eirvan\Middleware\RateLimitMiddleware;
use Eirvan\Services\FirestoreService;
use Eirvan\Validators\RequestValidator;

/**
 * Handles public wholesale inquiry creation (rate-limited) and admin CRM management.
 */
final class WholesaleController
{
    public function __construct(
        private FirestoreService $firestore,
        private AuthMiddleware $auth,
        private RateLimitMiddleware $rateLimit
    ) {}

    public function submitPublic(array $input): array
    {
        $this->rateLimit->enforce('wholesale_submit', 5, 1800);

        $errors = RequestValidator::validateWholesalePayload($input);
        if (!empty($errors)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => implode(' ', $errors)]];
        }

        $id = 'whl-' . gmdate('YmdHis') . '-' . bin2hex(random_bytes(3));
        $nowUtc = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.u\Z');
        $doc = [
            'id' => $id,
            'createdAt' => $nowUtc,
            'companyName' => RequestValidator::cleanString($input['companyName'], 100),
            'contactName' => RequestValidator::cleanString($input['contactName'], 100),
            'phone' => RequestValidator::cleanString($input['phone'], 30),
            'email' => RequestValidator::cleanString($input['email'], 100),
            'inquiryType' => (string) $input['inquiryType'],
            'estimatedQuantity' => RequestValidator::cleanString($input['estimatedQuantity'], 100),
            'message' => RequestValidator::cleanString($input['message'] ?? '', 2000),
            'status' => 'New',
        ];
        if (!empty($input['eventDate'])) {
            $doc['eventDate'] = RequestValidator::cleanString($input['eventDate'], 32);
        }

        $this->firestore->createDocument('wholesale_inquiries', $id, $doc);
        return ['status' => 201, 'body' => ['success' => true, 'id' => $id]];
    }

    public function listAdmin(array $query = []): array
    {
        $this->auth->requireAdmin();
        $limit = max(1, min(300, (int) ($query['limit'] ?? 150)));
        $pageToken = isset($query['pageToken']) ? trim((string) $query['pageToken']) : null;
        if ($pageToken === '') {
            $pageToken = null;
        }

        $page = $this->firestore->runQueryPaginated('wholesale_inquiries', [], 'createdAt', 'DESCENDING', $limit, $pageToken);
        $cleaned = array_map(static function (array $d): array {
            unset($d['_docId'], $d['_updateTime']);
            return $d;
        }, $page['documents']);

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'inquiries' => $cleaned,
                'nextPageToken' => $page['nextPageToken'],
                'hasMore' => $page['hasMore'],
            ],
        ];
    }

    public function updateStatusAdmin(string $id, array $input): array
    {
        $this->auth->requireAdmin();
        if (!RequestValidator::isValidDocId($id)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid inquiry ID.']];
        }
        $status = (string) ($input['status'] ?? '');
        if (!in_array($status, ['New', 'Contacted', 'Quoted', 'Converted', 'Closed'], true)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'Invalid inquiry status.']];
        }
        $this->firestore->patchDocument('wholesale_inquiries', $id, ['status' => $status]);
        return ['status' => 200, 'body' => ['success' => true, 'status' => $status]];
    }

    public function deleteAdmin(string $id): array
    {
        $this->auth->requireAdmin();
        if (!RequestValidator::isValidDocId($id)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid inquiry ID.']];
        }
        $this->firestore->deleteDocument('wholesale_inquiries', $id);
        return ['status' => 200, 'body' => ['success' => true]];
    }
}
