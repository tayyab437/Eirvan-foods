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
        $existing = $this->firestore->getDocument('products', $productId);

        $variants = [];
        $anyVariantInStock = false;
        foreach ((array) $input['variants'] as $v) {
            $stock = max(0, (int) ($v['stock'] ?? 0));
            if ($stock > 0) {
                $anyVariantInStock = true;
            }
            $variant = [
                'id' => RequestValidator::cleanString($v['id'] ?? '', 64),
                'weight' => RequestValidator::cleanString($v['weight'] ?? '', 40),
                'sku' => RequestValidator::cleanString($v['sku'] ?? '', 64),
                'price' => round((float) $v['price'], 2),
                'stock' => $stock,
            ];
            if (isset($v['salePrice']) && $v['salePrice'] !== '' && (float) $v['salePrice'] > 0) {
                $variant['salePrice'] = round((float) $v['salePrice'], 2);
            }
            $variants[] = $variant;
        }

        $galleryImages = [];
        foreach (array_slice((array) ($input['galleryImages'] ?? []), 0, 10) as $img) {
            $cleanUrl = RequestValidator::cleanString($img, 500);
            if ($cleanUrl !== '') {
                $galleryImages[] = $cleanUrl;
            }
        }

        $healthBenefits = [];
        foreach (array_slice((array) ($input['healthBenefits'] ?? []), 0, 20) as $benefit) {
            $cleanBenefit = RequestValidator::cleanString($benefit, 150);
            if ($cleanBenefit !== '') {
                $healthBenefits[] = $cleanBenefit;
            }
        }

        $rawNutrition = is_array($input['nutritionFacts'] ?? null) ? $input['nutritionFacts'] : [];
        $nutritionFacts = [
            'servingSize' => RequestValidator::cleanString($rawNutrition['servingSize'] ?? '30g', 40),
            'calories' => max(0, (int) ($rawNutrition['calories'] ?? 0)),
            'protein' => RequestValidator::cleanString($rawNutrition['protein'] ?? '0g', 30),
            'healthyFats' => RequestValidator::cleanString($rawNutrition['healthyFats'] ?? '0g', 30),
            'carbs' => RequestValidator::cleanString($rawNutrition['carbs'] ?? '0g', 30),
            'fiber' => RequestValidator::cleanString($rawNutrition['fiber'] ?? '0g', 30),
            'minerals' => RequestValidator::cleanString($rawNutrition['minerals'] ?? '', 200),
        ];

        $doc = [
            'id' => $productId,
            'name' => RequestValidator::cleanString($input['name'], 200),
            'urduName' => RequestValidator::cleanString($input['urduName'] ?? '', 120),
            'slug' => RequestValidator::cleanString($input['slug'], 150),
            'category' => RequestValidator::cleanString($input['category'], 100),
            'categoryLabel' => RequestValidator::cleanString($input['categoryLabel'] ?? $input['category'], 100),
            'shortDescription' => RequestValidator::cleanString($input['shortDescription'] ?? '', 300),
            'description' => RequestValidator::cleanString($input['description'] ?? '', 2500),
            'origin' => RequestValidator::cleanString($input['origin'] ?? '', 150),
            'packaging' => RequestValidator::cleanString($input['packaging'] ?? '', 150),
            'shelfLife' => RequestValidator::cleanString($input['shelfLife'] ?? '', 100),
            'imageUrl' => RequestValidator::cleanString($input['imageUrl'] ?? '', 500),
            'galleryImages' => $galleryImages,
            'variants' => $variants,
            'featured' => (bool) ($input['featured'] ?? false),
            'bestSeller' => (bool) ($input['bestSeller'] ?? false),
            'nutritionFacts' => $nutritionFacts,
            'healthBenefits' => $healthBenefits,
            'inStock' => $anyVariantInStock && (bool) ($input['inStock'] ?? true),
            // Server-owned analytics & rating aggregates (never overwritable by client payload)
            'rating' => is_array($existing) ? (float) ($existing['rating'] ?? 5.0) : 5.0,
            'reviewCount' => is_array($existing) ? max(0, (int) ($existing['reviewCount'] ?? 0)) : 0,
            'viewCount' => is_array($existing) ? max(0, (int) ($existing['viewCount'] ?? 0)) : 0,
        ];

        $this->firestore->setDocument('products', $productId, $doc);
        return ['status' => 200, 'body' => ['success' => true, 'product' => $doc]];
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
        $this->rateLimit->enforce('product_view', 60, 600, false);
        if (!RequestValidator::isValidDocId($productId)) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'Invalid product ID.']];
        }

        $existing = $this->firestore->getDocument('products', $productId);
        if (!is_array($existing)) {
            return ['status' => 404, 'body' => ['success' => false, 'error' => 'Product not found.']];
        }

        try {
            $this->firestore->incrementField('products', $productId, 'viewCount', 1, true);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'DOCUMENT_NOT_FOUND') {
                return ['status' => 404, 'body' => ['success' => false, 'error' => 'Product not found.']];
            }
            // Non-blocking analytics failure on transient error
        } catch (\Throwable) {
            // Non-blocking analytics failure
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
        $capacity = (int) ($input['capacity'] ?? 0);
        $basePrice = (float) ($input['basePrice'] ?? -1);
        $policy = (string) ($input['inventoryPolicy'] ?? 'tracked');

        if (!RequestValidator::isValidDocId($id) || $name === '' || $capacity < 2 || $capacity > 12 || $basePrice < 0) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'Invalid Shahi Mix Box payload.']];
        }
        if (!in_array($policy, ['tracked', 'unlimited'], true)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'inventoryPolicy must be tracked or unlimited.']];
        }

        $doc = [
            'id' => $id,
            'name' => $name,
            'urduName' => RequestValidator::cleanString($input['urduName'] ?? $name, 120),
            'capacity' => $capacity,
            'basePrice' => round($basePrice, 2),
            'image' => RequestValidator::cleanString($input['image'] ?? '', 500),
            'description' => RequestValidator::cleanString($input['description'] ?? '', 500),
            'inventoryPolicy' => $policy,
        ];

        if ($policy === 'tracked') {
            $stock = isset($input['stock']) ? (int) $input['stock'] : -1;
            if ($stock < 0) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'Tracked Shahi Mix Box requires a non-negative integer stock.']];
            }
            $doc['stock'] = $stock;
            $doc['inStock'] = $stock > 0 && (bool) ($input['inStock'] ?? true);
        } else {
            $doc['inStock'] = (bool) ($input['inStock'] ?? true);
        }

        $this->firestore->setDocument('shahi_boxes', $id, $doc);
        return ['status' => 200, 'body' => ['success' => true, 'box' => $doc]];
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
        $policy = (string) ($input['inventoryPolicy'] ?? 'tracked');
        if (!RequestValidator::isValidDocId($id) || $name === '' || empty($input['portions']) || !is_array($input['portions'])) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'Invalid Shahi ingredient payload.']];
        }
        if (!in_array($policy, ['tracked', 'unlimited'], true)) {
            return ['status' => 422, 'body' => ['success' => false, 'error' => 'inventoryPolicy must be tracked or unlimited.']];
        }

        $portions = [];
        foreach (array_slice($input['portions'], 0, 12) as $p) {
            if (!is_array($p) || empty($p['id']) || empty($p['weight']) || (int) ($p['weightGrams'] ?? 0) <= 0 || (float) ($p['price'] ?? 0) <= 0) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'Each portion requires id, weight, positive weightGrams, and positive price.']];
            }
            $portions[] = [
                'id' => RequestValidator::cleanString($p['id'], 64),
                'weight' => RequestValidator::cleanString($p['weight'], 30),
                'weightGrams' => (int) $p['weightGrams'],
                'price' => round((float) $p['price'], 2),
            ];
        }

        $doc = [
            'id' => $id,
            'name' => $name,
            'urduName' => RequestValidator::cleanString($input['urduName'] ?? '', 120),
            'image' => RequestValidator::cleanString($input['image'] ?? '', 500),
            'inventoryPolicy' => $policy,
            'portions' => $portions,
        ];

        if (isset($input['nutritionFacts']) && is_array($input['nutritionFacts'])) {
            $doc['nutritionFacts'] = [
                'calories' => max(0, (float) ($input['nutritionFacts']['calories'] ?? 0)),
                'protein' => max(0, (float) ($input['nutritionFacts']['protein'] ?? 0)),
                'fat' => max(0, (float) ($input['nutritionFacts']['fat'] ?? 0)),
                'carbs' => max(0, (float) ($input['nutritionFacts']['carbs'] ?? 0)),
            ];
        }

        if ($policy === 'tracked') {
            $stockGrams = isset($input['stockGrams']) ? (int) $input['stockGrams'] : -1;
            if ($stockGrams < 0) {
                return ['status' => 422, 'body' => ['success' => false, 'error' => 'Tracked Shahi ingredient requires non-negative integer stockGrams.']];
            }
            $doc['stockGrams'] = $stockGrams;
            $doc['inStock'] = $stockGrams > 0 && (bool) ($input['inStock'] ?? true);
        } else {
            $doc['inStock'] = (bool) ($input['inStock'] ?? true);
        }

        $this->firestore->setDocument('shahi_ingredients', $id, $doc);
        return ['status' => 200, 'body' => ['success' => true, 'ingredient' => $doc]];
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
