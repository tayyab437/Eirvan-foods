<?php
declare(strict_types=1);

use Eirvan\Controllers\AiController;
use Eirvan\Controllers\AuthController;
use Eirvan\Controllers\CouponController;
use Eirvan\Controllers\HealthController;
use Eirvan\Controllers\OrderController;
use Eirvan\Controllers\ProductController;
use Eirvan\Controllers\ReviewController;
use Eirvan\Controllers\SettingsController;
use Eirvan\Controllers\TrackingController;
use Eirvan\Controllers\WholesaleController;
use Eirvan\Middleware\AuthMiddleware;
use Eirvan\Middleware\RateLimitMiddleware;
use Eirvan\Middleware\SecurityHeadersMiddleware;
use Eirvan\Services\FirebaseAuthVerifier;
use Eirvan\Services\FirestoreService;
use Eirvan\Services\GeminiService;
use Eirvan\Services\GoogleJwtService;
use Eirvan\Services\LoggerService;

if (!defined('EIRVAN_REQUEST_ID')) {
    try {
        define('EIRVAN_REQUEST_ID', bin2hex(random_bytes(8)));
    } catch (\Throwable) {
        define('EIRVAN_REQUEST_ID', uniqid('req_', true));
    }
}

$config = require __DIR__ . '/config/app.php';
date_default_timezone_set((string) ($config['timezone'] ?? 'Asia/Karachi'));

// Suppress raw PHP error output in HTTP responses
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Zero-dependency PSR-4 style autoloader for Eirvan\*
spl_autoload_register(static function (string $class): void {
    $prefix = 'Eirvan\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $parts = explode('\\', $relative);
    if (count($parts) < 2) {
        return;
    }
    $parts[0] = strtolower($parts[0]);
    $file = __DIR__ . '/' . implode('/', $parts) . '.php';
    if (is_file($file)) {
        require_once $file;
    }
});

SecurityHeadersMiddleware::apply($config);

$logger = new LoggerService((string) $config['logs_dir']);

set_exception_handler(static function (\Throwable $e) use ($logger): void {
    $logger->error('unhandled_exception', [
        'type' => get_class($e),
        'message' => $e->getMessage(),
    ]);
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'success' => false,
        'error' => 'An internal server error occurred. Please try again later.',
    ]);
    exit;
});

$jwtService = new GoogleJwtService(
    (string) $config['service_account_path'],
    (string) $config['cache_dir'],
    $logger
);

$firestore = new FirestoreService(
    (string) $config['firebase_project_id'],
    (string) $config['firestore_database_id'],
    $jwtService,
    $logger
);

$authVerifier = new FirebaseAuthVerifier(
    (string) $config['firebase_project_id'],
    (string) $config['cache_dir'],
    $logger
);

$rateLimit = new RateLimitMiddleware(
    (string) $config['cache_dir'],
    $logger,
    (array) $config['trusted_proxies']
);

$auth = new AuthMiddleware($authVerifier, $firestore, $logger);
$gemini = new GeminiService((string) $config['gemini_api_key'], $logger);

return [
    'config' => $config,
    'logger' => $logger,
    'health' => new HealthController($config, $jwtService, $firestore),
    'auth' => new AuthController($auth),
    'orders' => new OrderController($firestore, $auth, $rateLimit, $logger),
    'tracking' => new TrackingController($firestore, $rateLimit),
    'products' => new ProductController($firestore, $auth, $rateLimit),
    'coupons' => new CouponController($firestore, $auth, $rateLimit),
    'reviews' => new ReviewController($firestore, $auth, $rateLimit),
    'settings' => new SettingsController($firestore, $auth),
    'wholesale' => new WholesaleController($firestore, $auth, $rateLimit),
    'ai' => new AiController($gemini, $auth, $rateLimit),
];
