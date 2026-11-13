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
        $user = $this->auth->authenticateOptional();
        if ($user === null) {
            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'authenticated' => false,
                    'isAdmin' => false,
                    'user' => null,
                ],
            ];
        }

        $isAdmin = $this->auth->isUserAdmin($user);
        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'authenticated' => true,
                'isAdmin' => $isAdmin,
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
