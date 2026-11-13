<?php
declare(strict_types=1);

namespace Eirvan\Controllers;

use Eirvan\Middleware\AuthMiddleware;
use Eirvan\Middleware\RateLimitMiddleware;
use Eirvan\Services\FirestoreService;
use Eirvan\Validators\RequestValidator;

/**
 * Manages catalog products, view counters, categories, and Shahi Mix builders.
 */
final class ProductController
{
    public function __construct(
        private FirestoreService $firestore,
        private AuthMiddleware $auth,
        private RateLimitMiddleware $rateLimit
    ) {}

    public function upsertAdmin(array $input): array
    {
        $this->auth->requireAdmin();
        $errors = RequestValidator::validateProductPayload($input);
        if (!empty($errors)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => implode(' ', $errors)]];
        }

        $productId = RequestValidator::cleanString($input['id'], 128);
        unset($input['_docId'], $input['_updateTime']);

        $this->firestore->setDocument('products', $productId, $input);
        return ['status' => 200, 'body' => ['success' => true, 'product' => $input]];
    }

    public function deleteAdmin(string $productId): array
    {
        $this->auth->requireAdmin();
        if (!RequestValidator::isValidDocId($productId)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid product ID.']];
        }

        $this->firestore->deleteDocument('products', $productId);
        return ['status' => 200, 'body' => ['success' => true]];
    }

    public function incrementView(string $productId): array
    {
        $this->rateLimit->enforce('product_view', 60, 600);
        if (!RequestValidator::isValidDocId($productId)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid product ID.']];
        }

        try {
            $this->firestore->incrementField('products', $productId, 'viewCount', 1);
        } catch (\Throwable) {
            // Non-blocking analytics counter
        }

        return ['status' => 200, 'body' => ['success' => true]];
    }

    public function upsertCategoryAdmin(array $input): array
    {
        $this->auth->requireAdmin();
        $id = RequestValidator::cleanString($input['id'] ?? '', 128);
        $name = RequestValidator::cleanString($input['name'] ?? '', 100);
        if (!RequestValidator::isValidDocId($id) || $name === '') {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'Valid category id and name required.']];
        }

        $doc = [
            'id' => $id,
            'name' => $name,
            'image' => RequestValidator::cleanString($input['image'] ?? '', 500),
            'description' => RequestValidator::cleanString($input['description'] ?? '', 300),
            'isSystem' => (bool) ($input['isSystem'] ?? false),
        ];

        $this->firestore->setDocument('categories', $id, $doc);
        return ['status' => 200, 'body' => ['success' => true, 'category' => $doc]];
    }

    public function deleteCategoryAdmin(string $categoryId): array
    {
        $this->auth->requireAdmin();
        if (!RequestValidator::isValidDocId($categoryId)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid category ID.']];
        }

        $this->firestore->deleteDocument('categories', $categoryId);
        return ['status' => 200, 'body' => ['success' => true]];
    }

    public function upsertShahiBoxAdmin(array $input): array
    {
        $this->auth->requireAdmin();
        $id = RequestValidator::cleanString($input['id'] ?? '', 128);
        $name = RequestValidator::cleanString($input['name'] ?? '', 120);
        if (!RequestValidator::isValidDocId($id) || $name === '' || (float) ($input['basePrice'] ?? -1) < 0) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'Invalid Shahi Mix Box payload.']];
        }
        unset($input['_docId'], $input['_updateTime']);
        $this->firestore->setDocument('shahi_boxes', $id, $input);
        return ['status' => 200, 'body' => ['success' => true, 'box' => $input]];
    }

    public function deleteShahiBoxAdmin(string $boxId): array
    {
        $this->auth->requireAdmin();
        if (!RequestValidator::isValidDocId($boxId)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid box ID.']];
        }
        $this->firestore->deleteDocument('shahi_boxes', $boxId);
        return ['status' => 200, 'body' => ['success' => true]];
    }

    public function upsertShahiIngredientAdmin(array $input): array
    {
        $this->auth->requireAdmin();
        $id = RequestValidator::cleanString($input['id'] ?? '', 128);
        $name = RequestValidator::cleanString($input['name'] ?? '', 120);
        if (!RequestValidator::isValidDocId($id) || $name === '' || empty($input['portions']) || !is_array($input['portions'])) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'Invalid Shahi ingredient payload.']];
        }
        unset($input['_docId'], $input['_updateTime']);
        $this->firestore->setDocument('shahi_ingredients', $id, $input);
        return ['status' => 200, 'body' => ['success' => true, 'ingredient' => $input]];
    }

    public function deleteShahiIngredientAdmin(string $ingId): array
    {
        $this->auth->requireAdmin();
        if (!RequestValidator::isValidDocId($ingId)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid ingredient ID.']];
        }
        $this->firestore->deleteDocument('shahi_ingredients', $ingId);
        return ['status' => 200, 'body' => ['success' => true]];
    }
}
