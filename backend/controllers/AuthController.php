<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\AuthMiddleware;

/**
 * Returns cryptographically verified Firebase user + admin role status.
 */
final class AuthController
{
    public function __construct(private AuthMiddleware $auth) {}

    public function session(): array
    {
        $rawHeader = $this->auth->extractRawAuthorizationHeader();
        if ($rawHeader === '') {
            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'authenticated' => false,
                    'isAdmin' => false,
                    'authStatus' => 'unauthenticated',
                    'user' => null,
                ],
            ];
        }

        $token = $this->auth->extractBearerToken();
        if ($token === null) {
            return [
                'status' => 401,
                'body' => [
                    'success' => false,
                    'authenticated' => false,
                    'isAdmin' => false,
                    'authStatus' => 'invalid_token',
                    'error' => 'Malformed authorization header.',
                    'user' => null,
                ],
            ];
        }

        try {
            $user = $this->auth->verifyBearerToken($token);
        } catch (\Throwable) {
            return [
                'status' => 401,
                'body' => [
                    'success' => false,
                    'authenticated' => false,
                    'isAdmin' => false,
                    'authStatus' => 'invalid_token',
                    'error' => 'Invalid or expired authentication token.',
                    'user' => null,
                ],
            ];
        }

        try {
            $evaluation = $this->auth->evaluateAdminAccess($user);
        } catch (\Throwable) {
            return [
                'status' => 503,
                'body' => [
                    'success' => false,
                    'authenticated' => true,
                    'isAdmin' => false,
                    'authStatus' => 'backend_error',
                    'error' => 'Unable to verify administrator privileges right now.',
                    'user' => [
                        'uid' => $user['uid'],
                        'email' => $user['email'],
                        'emailVerified' => $user['emailVerified'],
                        'name' => $user['name'],
                    ],
                ],
            ];
        }

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'authenticated' => true,
                'isAdmin' => $evaluation['isAdmin'],
                'authStatus' => $evaluation['authStatus'],
                'user' => [
                    'uid' => $user['uid'],
                    'email' => $user['email'],
                    'emailVerified' => $user['emailVerified'],
                    'name' => $user['name'],
                ],
            ],
        ];
    }
}
