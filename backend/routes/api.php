<?php
declare(strict_types=1);

/**
 * Unified REST API Router for IONOS PHP Webspace
 * Handles /api/* endpoints cleanly with bounded JSON body parsing.
 */
return static function (array $container): void {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $uriPath = (string) (parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/');

    // Normalize path relative to /api
    $apiPos = strpos($uriPath, '/api');
    $route = $apiPos !== false ? substr($uriPath, $apiPos + 4) : $uriPath;
    $route = '/' . trim($route, '/');

    // Parse JSON input for write requests (bounded to 512KB)
    $input = [];
    if (in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 524288) {
            http_response_code(413);
            echo json_encode(['success' => false, 'error' => 'Request payload too large.']);
            return;
        }
        $rawBody = file_get_contents('php://input', false, null, 0, 524289);
        if (is_string($rawBody) && strlen($rawBody) > 524288) {
            http_response_code(413);
            echo json_encode(['success' => false, 'error' => 'Request payload too large.']);
            return;
        }
        if (is_string($rawBody) && trim($rawBody) !== '') {
            $decoded = json_decode($rawBody, true);
            if (!is_array($decoded)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON request body.']);
                return;
            }
            $input = $decoded;
        }
    }

    $send = static function (array $result): void {
        http_response_code((int) ($result['status'] ?? 200));
        echo json_encode($result['body'] ?? ['success' => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    };

    // Route matching
    if ($method === 'GET' && $route === '/health') {
        $send($container['health']->status());
        return;
    }

    if ($method === 'GET' && $route === '/auth/session') {
        $send($container['auth']->session());
        return;
    }

    // Orders & Tracking
    if ($method === 'POST' && $route === '/orders') {
        $send($container['orders']->create($input));
        return;
    }
    if ($method === 'GET' && $route === '/orders') {
        $send($container['orders']->listAdmin($_GET));
        return;
    }
    if ($method === 'PATCH' && preg_match('#^/orders/([a-zA-Z0-9_\-]+)/status$#', $route, $m)) {
        $send($container['orders']->updateStatus($m[1], $input));
        return;
    }
    if ($method === 'POST' && $route === '/tracking') {
        $send($container['tracking']->lookup($input));
        return;
    }

    // Products, Categories & Shahi Mix Catalog
    if ($method === 'POST' && $route === '/products') {
        $send($container['products']->upsertAdmin($input));
        return;
    }
    if ($method === 'PUT' && preg_match('#^/products/([a-zA-Z0-9_\-]+)$#', $route, $m)) {
        $input['id'] = $m[1];
        $send($container['products']->upsertAdmin($input));
        return;
    }
    if ($method === 'DELETE' && preg_match('#^/products/([a-zA-Z0-9_\-]+)$#', $route, $m)) {
        $send($container['products']->deleteAdmin($m[1]));
        return;
    }
    if ($method === 'POST' && preg_match('#^/products/([a-zA-Z0-9_\-]+)/view$#', $route, $m)) {
        $send($container['products']->incrementView($m[1]));
        return;
    }

    if ($method === 'POST' && $route === '/categories') {
        $send($container['products']->upsertCategoryAdmin($input));
        return;
    }
    if ($method === 'DELETE' && preg_match('#^/categories/([a-zA-Z0-9_\-]+)$#', $route, $m)) {
        $send($container['products']->deleteCategoryAdmin($m[1]));
        return;
    }

    if ($method === 'POST' && $route === '/shahi-mix/boxes') {
        $send($container['products']->upsertShahiBoxAdmin($input));
        return;
    }
    if ($method === 'DELETE' && preg_match('#^/shahi-mix/boxes/([a-zA-Z0-9_\-]+)$#', $route, $m)) {
        $send($container['products']->deleteShahiBoxAdmin($m[1]));
        return;
    }
    if ($method === 'POST' && $route === '/shahi-mix/ingredients') {
        $send($container['products']->upsertShahiIngredientAdmin($input));
        return;
    }
    if ($method === 'DELETE' && preg_match('#^/shahi-mix/ingredients/([a-zA-Z0-9_\-]+)$#', $route, $m)) {
        $send($container['products']->deleteShahiIngredientAdmin($m[1]));
        return;
    }

    // Coupons
    if ($method === 'POST' && $route === '/coupons/validate') {
        $send($container['coupons']->validatePublic($input));
        return;
    }
    if ($method === 'GET' && $route === '/coupons') {
        $send($container['coupons']->listAdmin($_GET));
        return;
    }
    if ($method === 'POST' && $route === '/coupons') {
        $send($container['coupons']->upsertAdmin($input));
        return;
    }
    if ($method === 'PATCH' && preg_match('#^/coupons/([a-zA-Z0-9_\-]+)/toggle$#', $route, $m)) {
        $send($container['coupons']->toggleAdmin($m[1]));
        return;
    }
    if ($method === 'DELETE' && preg_match('#^/coupons/([a-zA-Z0-9_\-]+)$#', $route, $m)) {
        $send($container['coupons']->deleteAdmin($m[1]));
        return;
    }

    // Reviews
    if ($method === 'POST' && $route === '/reviews') {
        $send($container['reviews']->submitPublic($input));
        return;
    }
    if ($method === 'GET' && $route === '/reviews') {
        $send($container['reviews']->listAdmin($_GET));
        return;
    }
    if ($method === 'PATCH' && preg_match('#^/reviews/([a-zA-Z0-9_\-]+)$#', $route, $m)) {
        $send($container['reviews']->moderateAdmin($m[1], $input));
        return;
    }
    if ($method === 'DELETE' && preg_match('#^/reviews/([a-zA-Z0-9_\-]+)$#', $route, $m)) {
        $send($container['reviews']->deleteAdmin($m[1]));
        return;
    }

    // Settings & Admin Non-Destructive Backfill
    if ($method === 'GET' && $route === '/settings') {
        $send($container['settings']->getPublic());
        return;
    }
    if ($method === 'PUT' && $route === '/settings') {
        $send($container['settings']->updateAdmin($input));
        return;
    }
    if ($method === 'POST' && $route === '/settings/backfill') {
        $send($container['settings']->backfillMissingCatalogAdmin($input));
        return;
    }

    // Wholesale Inquiries
    if ($method === 'POST' && $route === '/wholesale') {
        $send($container['wholesale']->submitPublic($input));
        return;
    }
    if ($method === 'GET' && $route === '/wholesale') {
        $send($container['wholesale']->listAdmin($_GET));
        return;
    }
    if ($method === 'PATCH' && preg_match('#^/wholesale/([a-zA-Z0-9_\-]+)$#', $route, $m)) {
        $send($container['wholesale']->updateStatusAdmin($m[1], $input));
        return;
    }
    if ($method === 'DELETE' && preg_match('#^/wholesale/([a-zA-Z0-9_\-]+)$#', $route, $m)) {
        $send($container['wholesale']->deleteAdmin($m[1]));
        return;
    }

    // AI Endpoints (plus backwards-compatible aliases /api/chat and /api/generate-image)
    if ($method === 'POST' && ($route === '/ai/chat' || $route === '/chat')) {
        $send($container['ai']->chat($input));
        return;
    }
    if ($method === 'POST' && ($route === '/ai/generate-image' || $route === '/generate-image')) {
        $send($container['ai']->generateImage($input));
        return;
    }

    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'API endpoint not found.']);
};
