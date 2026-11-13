<?php
declare(strict_types=1);

namespace Eirvan\Middleware;

use Eirvan\Services\FirebaseAuthVerifier;
use Eirvan\Services\FirestoreService;
use Eirvan\Services\LoggerService;
use RuntimeException;

/**
 * Verifies Firebase Auth ID tokens and Firestore /admins/{uid} role authorization.
 */
final class AuthMiddleware
{
    private FirebaseAuthVerifier $verifier;
    private FirestoreService $firestore;
    private LoggerService $logger;

    public function __construct(
        FirebaseAuthVerifier $verifier,
        FirestoreService $firestore,
        LoggerService $logger
    ) {
        $this->verifier = $verifier;
        $this->firestore = $firestore;
        $this->logger = $logger;
    }

    public function extractBearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if ($header === '' && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $k => $v) {
                if (strtolower((string) $k) === 'authorization') {
                    $header = (string) $v;
                    break;
                }
            }
        }

        if (preg_match('/^\s*Bearer\s+([A-Za-z0-9\-_\.]+)\s*$/', $header, $matches)) {
            return $matches[1];
        }
        return null;
    }

    public function authenticateOptional(): ?array
    {
        $token = $this->extractBearerToken();
        if ($token === null) {
            return null;
        }
        try {
            return $this->verifier->verifyIdToken($token);
        } catch (\Throwable $e) {
            $this->logger->warning('optional_auth_token_ignored', [
                'reason' => $e->getMessage(),
            ]);
            return null;
        }
    }

    public function requireAuthenticated(): array
    {
        $token = $this->extractBearerToken();
        if ($token === null) {
            $this->deny(401, 'Authentication required.');
        }

        try {
            return $this->verifier->verifyIdToken($token);
        } catch (RuntimeException $e) {
            $this->logger->warning('auth_token_rejected', ['reason' => $e->getMessage()]);
            $this->deny(401, 'Invalid or expired authentication token.');
        }
    }

    public function isUserAdmin(array $user): bool
    {
        if (empty($user['uid']) || empty($user['emailVerified']) || $user['emailVerified'] !== true) {
            return false;
        }

        $adminDoc = $this->firestore->getDocument('admins', (string) $user['uid']);
        if (!is_array($adminDoc)) {
            return false;
        }

        // Strict active flag requirement: missing or non-true active is denied
        if (($adminDoc['active'] ?? null) !== true) {
            return false;
        }

        // Canonical roles: 'admin', 'super_admin' (plus legacy 'superadmin' alias) — never default missing role
        $role = $adminDoc['role'] ?? null;
        return is_string($role) && in_array($role, ['admin', 'super_admin', 'superadmin'], true);
    }

    public function requireAdmin(): array
    {
        $user = $this->requireAuthenticated();
        if (!$this->isUserAdmin($user)) {
            $this->logger->warning('admin_authorization_denied', ['uid' => $user['uid'] ?? null]);
            $this->deny(403, 'Administrator authorization required.');
        }
        return $user;
    }

    private function deny(int $status, string $message): never
    {
        http_response_code($status);
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
}
