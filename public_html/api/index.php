<?php
declare(strict_types=1);

/**
 * IONOS Public API Front Controller
 * Locates backend/ safely outside public_html (or one level up in root deploy).
 */
$backendDir = null;
$candidates = [
    dirname(__DIR__, 2) . '/backend',
    dirname(__DIR__) . '/backend',
];

foreach ($candidates as $dir) {
    if (is_file($dir . '/bootstrap.php')) {
        $backendDir = $dir;
        break;
    }
}

if ($backendDir === null) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Backend service directory could not be resolved.']);
    exit;
}

$container = require $backendDir . '/bootstrap.php';
$router = require $backendDir . '/routes/api.php';
$router($container);
