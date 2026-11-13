<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\AuthMiddleware;
use Eirvan\Middleware\RateLimitMiddleware;
use Eirvan\Services\GeminiService;
use Eirvan\Validators\RequestValidator;
use RuntimeException;

/**
 * Protects Gemini Chat (public rate-limited + bounded) and Image Studio (Admin-only).
 */
final class AiController
{
    public function __construct(
        private GeminiService $gemini,
        private AuthMiddleware $auth,
        private RateLimitMiddleware $rateLimit
    ) {}

    public function chat(array $input): array
    {
        $this->rateLimit->enforce('ai_chat', 15, 600);

        $messages = $input['messages'] ?? null;
        if (!is_array($messages) || count($messages) === 0 || count($messages) > 15) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Between 1 and 15 messages are allowed per request.']];
        }

        $role = RequestValidator::cleanString($input['role'] ?? 'nutritionist', 30);
        if (!in_array($role, ['nutritionist', 'dietary_analyst', 'quick_assistant'], true)) {
            $role = 'nutritionist';
        }

        $sanitizedMessages = [];
        foreach ($messages as $m) {
            if (!is_array($m)) {
                return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid message entry.']];
            }
            $msgRole = (string) ($m['role'] ?? 'user');
            if (!in_array($msgRole, ['user', 'assistant', 'model'], true)) {
                $msgRole = 'user';
            }
            $content = RequestValidator::cleanString($m['content'] ?? '', 1000);
            if ($content === '') {
                return ['status' => 400, 'body' => ['success' => false, 'error' => 'Empty message content is not allowed.']];
            }
            $sanitizedMessages[] = ['role' => $msgRole, 'content' => $content];
        }

        try {
            $result = $this->gemini->chat($sanitizedMessages, $role);
            return ['status' => 200, 'body' => array_merge(['success' => true], $result)];
        } catch (RuntimeException $e) {
            $status = $e->getMessage() === 'QUOTA_EXCEEDED' ? 429 : 503;
            return [
                'status' => $status,
                'body' => ['success' => false, 'error' => 'The AI Sommelier is temporarily busy. Please try again shortly.'],
            ];
        }
    }

    public function generateImage(array $input): array
    {
        // Restrict expensive image synthesis to verified staff admins
        $this->auth->requireAdmin();
        $this->rateLimit->enforce('ai_image', 10, 3600);

        $prompt = RequestValidator::cleanString($input['prompt'] ?? '', 600);
        if ($prompt === '') {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Prompt is required.']];
        }

        $imageSize = RequestValidator::cleanString($input['imageSize'] ?? '1K', 8);
        $aspectRatio = RequestValidator::cleanString($input['aspectRatio'] ?? '1:1', 8);

        try {
            $result = $this->gemini->generateImage($prompt, $imageSize, $aspectRatio);
            return ['status' => 200, 'body' => array_merge(['success' => true], $result)];
        } catch (RuntimeException $e) {
            $isQuota = $e->getMessage() === 'QUOTA_EXCEEDED';
            return [
                'status' => $isQuota ? 429 : 500,
                'body' => [
                    'success' => false,
                    'isQuotaExceeded' => $isQuota,
                    'error' => $isQuota
                        ? 'Image generation quota exceeded. Please try again later.'
                        : 'Failed to generate studio visual.',
                ],
            ];
        }
    }
}
