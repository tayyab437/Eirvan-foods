/**
 * IONOS Shared Hosting PHP 8.2 + MySQL Production Deployment Generator
 * Generates ready-to-deploy source code, .htaccess, and 26-table MySQL schema
 * optimized for standard Apache/cPanel shared hosting environments.
 */

export const IONOS_MYSQL_SCHEMA = `-- ==============================================================================
-- ZAUQ-E-SEHAT (ذوقِ صحت) E-COMMERCE PLATFORM
-- PRODUCTION DATABASE SCHEMA FOR MYSQL 8 / MARIADB (IONOS SHARED HOSTING)
-- Contains 26 Normalized Tables with Foreign Keys, Cascades & Performance Indexes
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS newsletter_subscribers;
DROP TABLE IF EXISTS banners;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS blog_tags;
DROP TABLE IF EXISTS blog_categories;
DROP TABLE IF EXISTS blog_posts;
DROP TABLE IF EXISTS wishlist_items;
DROP TABLE IF EXISTS wishlists;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS coupon_usages;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS inventory_movements;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS settings;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. General Users Table
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    phone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    reset_token VARCHAR(100) NULL,
    reset_token_expires_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Admin Users Table
CREATE TABLE admin_users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'store_manager', 'inventory_manager', 'support') DEFAULT 'store_manager',
    is_active TINYINT(1) DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Customers Profile Table
CREATE TABLE customers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(191) NULL,
    default_address_id INT UNSIGNED NULL,
    total_orders INT UNSIGNED DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_customer_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Customer Addresses Table
CREATE TABLE addresses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL DEFAULT 'Punjab',
    postal_code VARCHAR(20) NULL,
    is_default TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Categories Table
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_urdu VARCHAR(150) NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT NULL,
    image_url VARCHAR(255) NULL,
    display_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Products Table
CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_urdu VARCHAR(200) NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    short_description TEXT NULL,
    description LONGTEXT NOT NULL,
    origin VARCHAR(150) NULL,
    packaging_type VARCHAR(150) NULL,
    shelf_life VARCHAR(100) NULL,
    image_url VARCHAR(255) NOT NULL,
    is_featured TINYINT(1) DEFAULT 0,
    is_best_seller TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    rating_cache DECIMAL(3, 2) DEFAULT 5.00,
    review_count_cache INT UNSIGNED DEFAULT 0,
    view_count INT UNSIGNED DEFAULT 0,
    meta_title VARCHAR(200) NULL,
    meta_description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_product_featured (is_featured),
    INDEX idx_product_active (is_active),
    INDEX idx_product_views (view_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Product Images Table
CREATE TABLE product_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    alt_text VARCHAR(200) NULL,
    sort_order INT DEFAULT 0,
    is_primary TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Product Variants Table (Weights: 250g, 500g, 1kg)
CREATE TABLE product_variants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    sku VARCHAR(64) NOT NULL UNIQUE,
    weight_label VARCHAR(50) NOT NULL,
    weight_grams INT UNSIGNED NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2) NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_variant_stock (stock_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Inventory Movements Log
CREATE TABLE inventory_movements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id INT UNSIGNED NOT NULL,
    change_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    movement_type ENUM('purchase', 'order_deduction', 'cancellation_restock', 'manual_adjustment', 'damage') NOT NULL,
    reference_id VARCHAR(100) NULL,
    notes TEXT NULL,
    created_by_admin_id INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Orders Table
CREATE TABLE orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(60) NOT NULL UNIQUE,
    customer_id INT UNSIGNED NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_email VARCHAR(191) NULL,
    delivery_city VARCHAR(100) NOT NULL,
    delivery_province VARCHAR(100) NOT NULL,
    delivery_address TEXT NOT NULL,
    special_instructions TEXT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    shipping_fee DECIMAL(10, 2) NOT NULL DEFAULT 250.00,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    coupon_code VARCHAR(50) NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('COD', 'BankTransfer', 'Raast') NOT NULL DEFAULT 'COD',
    payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
    order_status ENUM('Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned') NOT NULL DEFAULT 'Pending',
    courier_name VARCHAR(100) NULL,
    tracking_number VARCHAR(100) NULL,
    admin_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_status (order_status),
    INDEX idx_order_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Order Items (Historical Snapshot)
CREATE TABLE order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NULL,
    variant_id INT UNSIGNED NULL,
    product_name VARCHAR(200) NOT NULL,
    variant_weight VARCHAR(50) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Payments Log
CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(120) NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'verified', 'rejected', 'refunded') DEFAULT 'pending',
    verified_by_admin_id INT UNSIGNED NULL,
    verified_at DATETIME NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Coupons Table
CREATE TABLE coupons (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    max_discount_amount DECIMAL(10, 2) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    usage_limit INT UNSIGNED NULL,
    times_used INT UNSIGNED DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Coupon Usages Table
CREATE TABLE coupon_usages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coupon_id INT UNSIGNED NOT NULL,
    order_id INT UNSIGNED NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    discount_granted DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Reviews Table
CREATE TABLE reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    order_id INT UNSIGNED NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_city VARCHAR(100) NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT NOT NULL,
    is_verified_purchase TINYINT(1) DEFAULT 0,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Wishlists Table
CREATE TABLE wishlists (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    session_token VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Wishlist Items
CREATE TABLE wishlist_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    wishlist_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uq_wishlist_product (wishlist_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Blog Posts Table
CREATE TABLE blog_posts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT NOT NULL,
    content LONGTEXT NOT NULL,
    featured_image VARCHAR(255) NULL,
    author_name VARCHAR(100) NOT NULL DEFAULT 'Hakim Daniyal',
    read_time VARCHAR(50) DEFAULT '4 min read',
    is_published TINYINT(1) DEFAULT 1,
    meta_title VARCHAR(255) NULL,
    meta_description VARCHAR(255) NULL,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Blog Categories
CREATE TABLE blog_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Blog Tags
CREATE TABLE blog_tags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    blog_id INT UNSIGNED NOT NULL,
    tag VARCHAR(60) NOT NULL,
    FOREIGN KEY (blog_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    INDEX idx_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. FAQs Table
CREATE TABLE faqs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(255) NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(80) DEFAULT 'General',
    display_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Promotional Banners Table
CREATE TABLE banners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    subtitle VARCHAR(255) NULL,
    button_text VARCHAR(60) NULL,
    button_url VARCHAR(255) NULL,
    image_url VARCHAR(255) NOT NULL,
    position ENUM('home_hero', 'middle_promo', 'category_top') DEFAULT 'home_hero',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Newsletter Subscribers Table
CREATE TABLE newsletter_subscribers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    is_subscribed TINYINT(1) DEFAULT 1,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Store Settings (Key-Value Store)
CREATE TABLE settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value LONGTEXT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Order Status History (Audit Trail)
CREATE TABLE order_status_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    notes TEXT NULL,
    changed_by_admin_id INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Admin Audit Logs
CREATE TABLE audit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id INT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(60) NOT NULL,
    target_id INT UNSIGNED NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export const IONOS_SEED_DATA = `-- ==============================================================================
-- INITIAL SEED DATA FOR ZAUQ-E-SEHAT (IONOS SHARED HOSTING)
-- Default Admin: eirvanfoods@gmail.com / Admin@Zauq2026!
-- ==============================================================================

-- Admin User (Password is hashed with PHP password_hash PASSWORD_BCRYPT)
INSERT INTO admin_users (name, email, password_hash, role)
VALUES ('Store Administrator', 'eirvanfoods@gmail.com', '$2y$10$wE47k4a0d9k7n1Jz7yQGbe7nKxH6t4O5P1oJ4gS0aL.kHqF0K9.b2', 'super_admin');

-- Store Categories
INSERT INTO categories (name, name_urdu, slug, description, display_order) VALUES
('Mixed Dry Fruits', NULL, 'mixed-dry-fruits', 'Carefully balanced superfood blends of nuts, seeds and fruits for daily vigor.', 1),
('Premium Nuts', NULL, 'premium-nuts', 'Single-origin hand-cracked Kashmiri almonds, Hunza walnuts, and jumbo cashews.', 2),
('Dry Fruit Powders', NULL, 'dry-fruit-powders', 'Nutrient-rich stone-ground powders for infants, mothers, and elderly recovery.', 3),
('Dates & Raisins', NULL, 'dates-and-raisins', 'Sacred Madinah Ajwa, jumbo Medjool, and sundried Kandahari long raisins.', 4),
('Luxury Gift Boxes', NULL, 'luxury-gift-boxes', 'Handcrafted pinewood and emerald velvet gift hampers for weddings and Eid.', 5);

-- Core Settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('store_name', 'Eirvan Foods', 'Official store brand name'),
('contact_phone', '+92 317 6369458', 'Customer support telephone line'),
('whatsapp_number', '+92 317 6369458', 'WhatsApp inquiry channel'),
('currency_code', 'PKR', 'Base store currency'),
('free_shipping_threshold', '3500', 'Minimum order amount in PKR for free delivery'),
('standard_shipping_rate', '250', 'Flat standard nationwide shipping rate in PKR'),
('bank_name', 'Meezan Bank Limited', 'Primary bank for direct transfer'),
('bank_account_title', 'Eirvan Foods (Pvt) Ltd', 'Account Title'),
('bank_account_number', '02310104829101', 'Account Number'),
('bank_iban', 'PK45MEZN0002310104829101', 'International Bank Account Number'),
('raast_id', '03176369458', 'State Bank of Pakistan Raast ID');

-- Coupons
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, is_active) VALUES
('WELCOME10', 'percentage', 10.00, 2000.00, 1),
('SEHAT500', 'fixed', 500.00, 5000.00, 1),
('EIDGIFT15', 'percentage', 15.00, 6500.00, 1);
`;

export const IONOS_HTACCESS = `# ==============================================================================
# IONOS SHARED HOSTING - APACHE .HTACCESS FOR ZAUQ-E-SEHAT
# Enforces HTTPS, Clean MVC Routing, Browser Caching, and Security Headers
# ==============================================================================

RewriteEngine On

# 1. Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# 2. Prevent Directory Browsing
Options -Indexes

# 3. Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# 4. Gzip Compression for Fast Loading
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# 5. Leverage Browser Caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>

# 6. Protect Sensitive Files & Folders
RewriteRule ^config/ - [F,L]
RewriteRule ^app/ - [F,L]
RewriteRule ^storage/ - [F,L]
RewriteRule \.(sql|env|log)$ - [F,L]

# 7. Front Controller Routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
`;

export const IONOS_PHP_DATABASE_CONFIG = `<?php
/**
 * Zauq-e-Sehat - PDO Database Connection Configuration
 * Secure PDO Singleton with UTF-8mb4 and Prepared Statements
 */

declare(strict_types=1);

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            // IONOS Shared Hosting MySQL Credentials
            $host = getenv('DB_HOST') ?: 'db5012345678.hosting-data.io'; // IONOS DB Host
            $dbname = getenv('DB_NAME') ?: 'dbs12345678';               // IONOS DB Name
            $username = getenv('DB_USER') ?: 'dbu12345678';           // IONOS DB User
            $password = getenv('DB_PASS') ?: 'YourSecurePasswordHere'; // IONOS DB Pass
            $port = (int)(getenv('DB_PORT') ?: 3306);

            $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];

            try {
                self::$instance = new PDO($dsn, $username, $password, $options);
            } catch (PDOException $e) {
                // In production, log to secure file and show user-friendly message
                error_log("Database Connection Failed: " . $e->getMessage());
                http_response_code(500);
                die("A secure database connection could not be established. Please check IONOS credentials.");
            }
        }

        return self::$instance;
    }
}
`;

export const IONOS_PHP_INDEX = `<?php
/**
 * Zauq-e-Sehat (ذوقِ صحت) - Front Controller for PHP 8.2+
 * Runs seamlessly on IONOS Shared Hosting without Node.js or Docker.
 */

declare(strict_types=1);

session_start();

// Security Headers
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("X-XSS-Protection: 1; mode=block");

require_once __DIR__ . '/config/database.php';

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Simple REST / MVC Router
switch ($requestUri) {
    case '/':
    case '/index.php':
    case '/home':
        require_once __DIR__ . '/app/Views/pages/home.php';
        break;

    case '/shop':
        require_once __DIR__ . '/app/Views/pages/shop.php';
        break;

    case '/cart':
        require_once __DIR__ . '/app/Views/pages/cart.php';
        break;

    case '/checkout':
        require_once __DIR__ . '/app/Views/pages/checkout.php';
        break;

    case '/track-order':
        require_once __DIR__ . '/app/Views/pages/track.php';
        break;

    case '/admin':
    case '/admin/dashboard':
        require_once __DIR__ . '/app/Views/admin/dashboard.php';
        break;

    // AJAX API Endpoints
    case '/api/orders/create':
        if ($method === 'POST') {
            require_once __DIR__ . '/app/Controllers/OrderController.php';
            (new OrderController())->placeOrder();
            exit;
        }
        break;

    case '/api/coupon/validate':
        if ($method === 'POST') {
            require_once __DIR__ . '/app/Controllers/CartController.php';
            (new CartController())->validateCoupon();
            exit;
        }
        break;

    default:
        // Handle product detail /slug
        if (str_starts_with($requestUri, '/product/')) {
            $slug = substr($requestUri, 9);
            $_GET['slug'] = $slug;
            require_once __DIR__ . '/app/Views/pages/product-detail.php';
            break;
        }

        http_response_code(404);
        echo "<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style='font-family:sans-serif;text-align:center;padding:50px;'><h1>404 - Page Not Found</h1><p>The dry fruits page you are looking for does not exist.</p><a href='/'>Return to Home</a></body></html>";
        break;
}
`;
