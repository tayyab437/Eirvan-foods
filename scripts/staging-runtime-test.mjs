#!/usr/bin/env node
/**
 * Eirvan Foods — Isolated Staging Runtime Test Runner
 *
 * Repeatable synthetic test suite for verifying an isolated IONOS + Firebase
 * staging deployment. Never runs against production targets.
 *
 * Usage:
 *   # Show clean NOT RUN checklist & verify local generated public_html/sw.js:
 *   node scripts/staging-runtime-test.mjs --checklist
 *
 *   # Execute full live staging verification suite:
 *   STAGING_BASE_URL="https://staging.YOUR-DOMAIN.com" \
 *   STAGING_FIREBASE_PROJECT_ID="your-staging-project-id" \
 *   STAGING_FIRESTORE_DB_ID="(default)" \
 *   STAGING_ADMIN_ID_TOKEN="<verified-active-admin-id-token>" \
 *   STAGING_CUSTOMER_ID_TOKEN="<verified-ordinary-customer-id-token>" \
 *   node scripts/staging-runtime-test.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const PRODUCTION_FIREBASE_PROJECT_ID = 'gen-lang-client-0351129330';
const PRODUCTION_FIRESTORE_DB_ID = 'ai-studio-zauqesehatpremiu-a42b0907-2253-405b-8d7e-9cfd4b314afc';
const BLOCKED_PRODUCTION_HOSTS = new Set([
  'eirvan.netlify.app',
  'eirvanfoods.com',
  'www.eirvanfoods.com',
]);

const SUITE_NAMES = [
  '01_anonymous_access',
  '02_ordinary_customer_access',
  '03_verified_active_admin_access',
  '04_invalid_expired_tampered_tokens',
  '05_public_private_settings_isolation',
  '06_legacy_settings_migration',
  '07_order_creation_and_tracking',
  '08_duplicate_order_idempotency',
  '09_coupon_limits',
  '10_inventory_concurrency',
  '11_cancellation_and_returns',
  '12_api_response_caching_and_sw',
  '13_logging_and_redaction',
];

const results = new Map(SUITE_NAMES.map((name) => [name, { status: 'NOT RUN', details: 'Not executed yet.' }]));

function record(name, status, details) {
  results.set(name, { status, details });
}

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

async function httpJson(url, options = {}) {
  const res = await fetch(url, {
    redirect: 'manual',
    ...options,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, text, json };
}

function checkLocalServiceWorker() {
  const swPath = path.join(ROOT_DIR, 'public_html', 'sw.js');
  if (!fs.existsSync(swPath)) {
    throw new Error('public_html/sw.js not found. Run npm run build:ionos first.');
  }
  const sw = fs.readFileSync(swPath, 'utf8');
  assert(/denylist:\s*\[\s*\/\\\/api\\\/\/\s*\]/.test(sw), 'NavigationRoute denylist missing /\\/api\\//.');
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    const pattern = new RegExp(`registerRoute\\(/\\\\/api\\\\//i,\\s*new workbox\\.NetworkOnly\\(\\),\\s*'${method}'\\)`);
    assert(pattern.test(sw), `Service worker missing explicit NetworkOnly route for ${method} /api/*.`);
  }
  assert(/google-fonts-stylesheets/.test(sw) && /google-fonts-webfonts/.test(sw), 'Font caching rules unexpectedly altered.');
  assert(/firebase-auth-cache/.test(sw), 'Firebase Auth iframe caching rule unexpectedly altered.');
}

function printSummary() {
  console.log('\n=== Eirvan Foods Staging Runtime Verification Matrix ===');
  for (const name of SUITE_NAMES) {
    const entry = results.get(name);
    console.log(`[${entry.status.padEnd(7)}] ${name} — ${entry.details}`);
  }
  const values = [...results.values()];
  const failed = values.filter((v) => v.status === 'FAIL').length;
  const notRun = values.filter((v) => v.status === 'NOT RUN').length;
  console.log(`\nSummary: ${values.length - failed - notRun} PASS, ${failed} FAIL, ${notRun} NOT RUN`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function runChecklistMode() {
  try {
    checkLocalServiceWorker();
    record('12_api_response_caching_and_sw', 'PASS', 'Offline SW check passed: GET/POST/PUT/PATCH/DELETE /api/* use NetworkOnly + NavigationRoute denylist (live HTTP cache-control still requires live host).');
  } catch (err) {
    record('12_api_response_caching_and_sw', 'FAIL', err.message);
  }
  printSummary();
}

function validateStagingSafetyOrExit() {
  const baseUrl = String(process.env.STAGING_BASE_URL || '').trim().replace(/\/+$/, '');
  const projectId = String(process.env.STAGING_FIREBASE_PROJECT_ID || '').trim();
  const dbId = String(process.env.STAGING_FIRESTORE_DB_ID || '').trim();
  const adminToken = String(process.env.STAGING_ADMIN_ID_TOKEN || '').trim();
  const customerToken = String(process.env.STAGING_CUSTOMER_ID_TOKEN || '').trim();

  if (!baseUrl || !projectId || !dbId || !adminToken || !customerToken) {
    console.log('Missing one or more required STAGING_* environment variables.');
    console.log('Required: STAGING_BASE_URL, STAGING_FIREBASE_PROJECT_ID, STAGING_FIRESTORE_DB_ID, STAGING_ADMIN_ID_TOKEN, STAGING_CUSTOMER_ID_TOKEN');
    printSummary();
    process.exit(0);
  }

  const parsed = new URL(baseUrl);
  if (BLOCKED_PRODUCTION_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error(`SAFETY ABORT: Refusing to run against production host ${parsed.hostname}`);
  }
  if (projectId === PRODUCTION_FIREBASE_PROJECT_ID && dbId === PRODUCTION_FIRESTORE_DB_ID) {
    throw new Error('SAFETY ABORT: Staging project/database matches production constants.');
  }
  if (dbId === PRODUCTION_FIRESTORE_DB_ID) {
    throw new Error('SAFETY ABORT: Refusing to target production Firestore database ID.');
  }

  return { baseUrl, projectId, dbId, adminToken, customerToken };
}

async function runLiveSuite() {
  const cfg = validateStagingSafetyOrExit();
  const firestoreBase = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/${encodeURIComponent(cfg.dbId)}/documents`;
  const runId = `SYNTH${Date.now()}`;
  const productId = `synth-prod-${Date.now()}`;
  const couponCode = `SYNTH${Date.now().toString().slice(-6)}`;
  const createdOrderIds = [];

  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.adminToken}`,
  };
  const custHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.customerToken}`,
  };

  try {
    // 01. Anonymous access
    try {
      const h = await httpJson(`${cfg.baseUrl}/api/health`);
      assert(h.status === 200 && h.json?.status === 'ok' && h.json?.extensions === undefined, 'Anonymous /api/health leaked diagnostics or failed.');
      const pubSet = await httpJson(`${cfg.baseUrl}/api/settings`);
      assert(pubSet.status === 200 && pubSet.json?.success === true, 'Anonymous /api/settings failed.');
      for (const forbidden of ['internalNotificationEmail', 'internalOpsPhone', 'financeSettlementNotes', 'legacyPreservedFields']) {
        assert(!(forbidden in (pubSet.json?.settings || {})), `Anonymous /api/settings exposed private field ${forbidden}`);
      }
      const priv = await httpJson(`${cfg.baseUrl}/api/settings/private`);
      assert(priv.status === 401, `Anonymous /api/settings/private expected 401, got ${priv.status}`);
      const ord = await httpJson(`${cfg.baseUrl}/api/orders`);
      assert(ord.status === 401, `Anonymous /api/orders expected 401, got ${ord.status}`);
      const fsOrders = await httpJson(`${firestoreBase}/orders`);
      assert(fsOrders.status === 401 || fsOrders.status === 403, `Anonymous Firestore /orders expected 401/403, got ${fsOrders.status}`);
      const fsLegacy = await httpJson(`${firestoreBase}/settings/main`);
      assert(fsLegacy.status === 401 || fsLegacy.status === 403, `Anonymous Firestore /settings/main expected 401/403, got ${fsLegacy.status}`);
      record('01_anonymous_access', 'PASS', 'Minimal health, allowlisted public settings, and 401/403 on private routes verified.');
    } catch (err) {
      record('01_anonymous_access', 'FAIL', err.message);
    }

    // 02. Ordinary customer access
    try {
      const priv = await httpJson(`${cfg.baseUrl}/api/settings/private`, { headers: custHeaders });
      assert(priv.status === 403, `Customer GET /api/settings/private expected 403, got ${priv.status}`);
      const putPub = await httpJson(`${cfg.baseUrl}/api/settings`, {
        method: 'PUT',
        headers: custHeaders,
        body: JSON.stringify({ storeName: 'Unauthorized Edit' }),
      });
      assert(putPub.status === 403, `Customer PUT /api/settings expected 403, got ${putPub.status}`);
      const ord = await httpJson(`${cfg.baseUrl}/api/orders`, { headers: custHeaders });
      assert(ord.status === 403, `Customer GET /api/orders expected 403, got ${ord.status}`);
      const mig = await httpJson(`${cfg.baseUrl}/api/settings/migrate`, {
        method: 'POST',
        headers: custHeaders,
        body: JSON.stringify({ dryRun: true }),
      });
      assert(mig.status === 403, `Customer POST /api/settings/migrate expected 403, got ${mig.status}`);
      const fsPriv = await httpJson(`${firestoreBase}/private_settings/main`, {
        headers: { Authorization: `Bearer ${cfg.customerToken}` },
      });
      assert(fsPriv.status === 403, `Customer direct Firestore read on private_settings/main expected 403, got ${fsPriv.status}`);
      record('02_ordinary_customer_access', 'PASS', 'Ordinary verified customer denied admin APIs and restricted Firestore collections (403).');
    } catch (err) {
      record('02_ordinary_customer_access', 'FAIL', err.message);
    }

    // 03. Verified active admin access
    try {
      const h = await httpJson(`${cfg.baseUrl}/api/health`, { headers: adminHeaders });
      assert(h.status === 200 && h.json?.env === 'staging' && h.json?.firestoreConnected === true, `Admin /api/health invalid: ${h.text}`);
      const priv = await httpJson(`${cfg.baseUrl}/api/settings/private`, { headers: adminHeaders });
      assert(priv.status === 200 && priv.json?.success === true, `Admin GET /api/settings/private expected 200, got ${priv.status}`);
      record('03_verified_active_admin_access', 'PASS', 'Admin /api/health confirmed env=staging and firestoreConnected=true.');
    } catch (err) {
      record('03_verified_active_admin_access', 'FAIL', err.message);
    }

    // 04. Invalid, expired, tampered tokens
    try {
      const tampered = `${cfg.adminToken.slice(0, -4)}AAAA`;
      const rTamper = await httpJson(`${cfg.baseUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${tampered}` },
      });
      assert(rTamper.status === 401, `Tampered token expected 401, got ${rTamper.status}`);
      const rMalformed = await httpJson(`${cfg.baseUrl}/api/orders`, {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });
      assert(rMalformed.status === 401, `Malformed scheme expected 401, got ${rMalformed.status}`);
      if (process.env.STAGING_EXPIRED_ID_TOKEN) {
        const rExp = await httpJson(`${cfg.baseUrl}/api/orders`, {
          headers: { Authorization: `Bearer ${process.env.STAGING_EXPIRED_ID_TOKEN}` },
        });
        assert(rExp.status === 401, `Expired token expected 401, got ${rExp.status}`);
      }
      if (process.env.STAGING_DISABLED_ADMIN_ID_TOKEN) {
        const rDis = await httpJson(`${cfg.baseUrl}/api/orders`, {
          headers: { Authorization: `Bearer ${process.env.STAGING_DISABLED_ADMIN_ID_TOKEN}` },
        });
        assert(rDis.status === 403, `Disabled admin token expected 403, got ${rDis.status}`);
      }
      record('04_invalid_expired_tampered_tokens', 'PASS', 'Tampered and malformed Bearer tokens rejected with 401.');
    } catch (err) {
      record('04_invalid_expired_tampered_tokens', 'FAIL', err.message);
    }

    // 05. Public/private settings isolation
    try {
      const badTop = await httpJson(`${cfg.baseUrl}/api/settings`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ unexpectedShadowKey: 'x' }),
      });
      assert(badTop.status === 422, `Unexpected top-level public key expected 422, got ${badTop.status}`);
      const badBank = await httpJson(`${cfg.baseUrl}/api/settings`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ bankDetails: { internalRoutingSecret: 'x' } }),
      });
      assert(badBank.status === 422, `Unexpected nested bankDetails key expected 422, got ${badBank.status}`);
      const privBad = await httpJson(`${cfg.baseUrl}/api/settings/private`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ unknownPrivateKey: 'x' }),
      });
      assert(privBad.status === 422, `Unexpected private settings key expected 422, got ${privBad.status}`);
      record('05_public_private_settings_isolation', 'PASS', 'Strict 422 rejection verified for unexpected public, bankDetails, and private fields.');
    } catch (err) {
      record('05_public_private_settings_isolation', 'FAIL', err.message);
    }

    // 06. Legacy settings migration
    try {
      const noConfirm = await httpJson(`${cfg.baseUrl}/api/settings/migrate`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ dryRun: false }),
      });
      assert(noConfirm.status === 400, `Migration without confirm expected 400, got ${noConfirm.status}`);
      const dryRun = await httpJson(`${cfg.baseUrl}/api/settings/migrate`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ dryRun: true }),
      });
      assert(dryRun.status === 200 && dryRun.json?.dryRun === true, `Migration dryRun failed: ${dryRun.text}`);
      if (process.env.STAGING_ALLOW_MIGRATION_EXEC === 'true') {
        const execMig = await httpJson(`${cfg.baseUrl}/api/settings/migrate`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ dryRun: false, confirm: true }),
        });
        assert(execMig.status === 200 && execMig.json?.legacyDocumentPreserved === true, 'Migration execution check failed.');
      }
      record('06_legacy_settings_migration', 'PASS', 'Confirm guard (400) and dryRun verification passed cleanly.');
    } catch (err) {
      record('06_legacy_settings_migration', 'FAIL', err.message);
    }

    // Seed synthetic product & coupon for 07-11
    const seedProd = await httpJson(`${cfg.baseUrl}/api/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        id: productId,
        name: `Synthetic Test Almonds ${runId}`,
        slug: productId,
        category: 'almonds',
        categoryLabel: 'Almonds',
        variants: [{ id: 'synth-v1', weight: '250g', sku: 'SYNTH-250', price: 1200, stock: 3 }],
        inStock: true,
      }),
    });
    assert(seedProd.status === 200, `Failed seeding synthetic product: ${seedProd.text}`);

    const seedCoupon = await httpJson(`${cfg.baseUrl}/api/coupons`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: couponCode,
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 500,
        isActive: true,
        expiryDate: '2027-12-31',
        usageLimit: 1,
      }),
    });
    assert(seedCoupon.status === 200, `Failed seeding synthetic coupon: ${seedCoupon.text}`);

    // 07 & 08. Order creation, tracking masking & duplicate idempotency
    let firstOrder = null;
    try {
      const idemKey = `IDEM-${runId}-1`;
      const baseOrderPayload = {
        idempotencyKey: idemKey,
        customerName: 'Synthetic Staging Buyer',
        customerPhone: '03001234567',
        customerEmail: 'staging-synthetic@example.invalid',
        city: 'Lahore',
        province: 'Punjab',
        address: 'House 1 Synthetic Test Avenue, Staging Sector',
        paymentMethod: 'COD',
        couponCode,
        items: [{ productId, variantId: 'synth-v1', quantity: 1 }],
      };

      const badBankOrder = await httpJson(`${cfg.baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseOrderPayload, idempotencyKey: `IDEM-${runId}-BANKBAD`, paymentMethod: 'BankTransfer' }),
      });
      assert(badBankOrder.status === 422, `BankTransfer without reference expected 422, got ${badBankOrder.status}`);

      const o1 = await httpJson(`${cfg.baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseOrderPayload),
      });
      assert(o1.status === 201 && o1.json?.order?.id, `Order creation expected 201, got ${o1.status}: ${o1.text}`);
      firstOrder = o1.json.order;
      createdOrderIds.push(firstOrder.id);
      assert(firstOrder.discountAmount === 120, `Expected 10% synthetic coupon discount 120, got ${firstOrder.discountAmount}`);

      const trackMasked = await httpJson(`${cfg.baseUrl}/api/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: firstOrder.orderNumber, phone: '03001234567' }),
      });
      assert(trackMasked.status === 200 && trackMasked.json?.privacyLevel === 'masked', 'Phone tracking did not return masked privacyLevel.');

      const trackFull = await httpJson(`${cfg.baseUrl}/api/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: firstOrder.orderNumber, trackingToken: firstOrder.trackingToken }),
      });
      assert(trackFull.status === 200 && trackFull.json?.privacyLevel === 'full', 'Token tracking did not return full privacyLevel.');

      record('07_order_creation_and_tracking', 'PASS', 'Synthetic order created, shipping/discount calculated server-side, masked vs token tracking verified.');

      const replay = await httpJson(`${cfg.baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseOrderPayload),
      });
      assert(replay.status === 200 && replay.json?.idempotentReplay === true && replay.json?.order?.id === firstOrder.id, 'Duplicate idempotency replay failed.');

      const conflict = await httpJson(`${cfg.baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseOrderPayload, address: 'Modified Address Triggers 409 Conflict' }),
      });
      assert(conflict.status === 409, `Modified payload with same idempotencyKey expected 409, got ${conflict.status}`);
      record('08_duplicate_order_idempotency', 'PASS', 'Identical replay returned 200 idempotentReplay and modified payload returned 409.');
    } catch (err) {
      if (results.get('07_order_creation_and_tracking').status === 'NOT RUN') {
        record('07_order_creation_and_tracking', 'FAIL', err.message);
      }
      record('08_duplicate_order_idempotency', 'FAIL', err.message);
    }

    // 09. Coupon limits
    try {
      const valOverLimit = await httpJson(`${cfg.baseUrl}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal: 1200 }),
      });
      assert(valOverLimit.status === 200 && valOverLimit.json?.success === false, `Exhausted coupon still validated true: ${valOverLimit.text}`);
      record('09_coupon_limits', 'PASS', 'Single-use synthetic coupon blocked on second validation after order consumption.');
    } catch (err) {
      record('09_coupon_limits', 'FAIL', err.message);
    }

    // 10. Inventory concurrency (remaining stock = 2, try 2 concurrent orders of qty 2 each -> only 1 succeeds)
    try {
      const [c1, c2] = await Promise.all([
        httpJson(`${cfg.baseUrl}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotencyKey: `IDEM-${runId}-RACE1`,
            customerName: 'Race Buyer One',
            customerPhone: '03001234568',
            city: 'Islamabad',
            province: 'ICT',
            address: 'House 2 Race Test Avenue, Islamabad',
            paymentMethod: 'Raast',
            items: [{ productId, variantId: 'synth-v1', quantity: 2 }],
          }),
        }),
        httpJson(`${cfg.baseUrl}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotencyKey: `IDEM-${runId}-RACE2`,
            customerName: 'Race Buyer Two',
            customerPhone: '03001234569',
            city: 'Karachi',
            province: 'Sindh',
            address: 'House 3 Race Test Avenue, Karachi',
            paymentMethod: 'Raast',
            items: [{ productId, variantId: 'synth-v1', quantity: 2 }],
          }),
        }),
      ]);
      const statuses = [c1.status, c2.status].sort((a, b) => a - b);
      if (c1.json?.order?.id) createdOrderIds.push(c1.json.order.id);
      if (c2.json?.order?.id) createdOrderIds.push(c2.json.order.id);
      assert(statuses[0] === 201 && statuses[1] >= 400, `Expected exactly one 201 and one rejection, got [${statuses.join(', ')}]`);
      record('10_inventory_concurrency', 'PASS', `Concurrent stock race serialized cleanly (statuses: ${statuses.join(', ')}).`);
    } catch (err) {
      record('10_inventory_concurrency', 'FAIL', err.message);
    }

    // 11. Cancellation & returns
    try {
      assert(firstOrder?.id, 'Prerequisite firstOrder unavailable.');
      const cancel = await httpJson(`${cfg.baseUrl}/api/orders/${encodeURIComponent(firstOrder.id)}/status`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ orderStatus: 'Cancelled' }),
      });
      assert(cancel.status === 200 && cancel.json?.order?.stockRestored === true, `Cancel stock restore failed: ${cancel.text}`);
      const invalidTrans = await httpJson(`${cfg.baseUrl}/api/orders/${encodeURIComponent(firstOrder.id)}/status`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ orderStatus: 'Delivered' }),
      });
      assert(invalidTrans.status === 422, `Cancelled -> Delivered expected 422, got ${invalidTrans.status}`);
      record('11_cancellation_and_returns', 'PASS', 'Order cancellation set stockRestored=true and terminal transition lock returned 422.');
    } catch (err) {
      record('11_cancellation_and_returns', 'FAIL', err.message);
    }

    // 12. API caching & SW
    try {
      checkLocalServiceWorker();
      const apiSet = await httpJson(`${cfg.baseUrl}/api/settings`);
      const cc = (apiSet.headers.get('cache-control') || '').toLowerCase();
      assert(cc.includes('no-store'), `Expected Cache-Control containing no-store on /api/settings, got "${cc}"`);
      record('12_api_response_caching_and_sw', 'PASS', 'Live /api/* returned no-store and generated public_html/sw.js enforces NetworkOnly for all HTTP methods.');
    } catch (err) {
      record('12_api_response_caching_and_sw', 'FAIL', err.message);
    }

    // 13. Logging & sensitive data redaction (requires STAGING_LOG_FILE path if run on host)
    if (process.env.STAGING_LOG_FILE) {
      try {
        const logContent = fs.readFileSync(process.env.STAGING_LOG_FILE, 'utf8');
        for (const forbidden of ['03001234567', cfg.adminToken.slice(-20), 'Synthetic Staging Buyer']) {
          assert(!logContent.includes(forbidden), `Sensitive marker detected unredacted in log file.`);
        }
        record('13_logging_and_redaction', 'PASS', 'Inspected STAGING_LOG_FILE confirmed sensitive fields redacted.');
      } catch (err) {
        record('13_logging_and_redaction', 'FAIL', err.message);
      }
    } else {
      record('13_logging_and_redaction', 'NOT RUN', 'Run with STAGING_LOG_FILE=/path/to/staging_private/logs/app-YYYY-MM-DD.log on IONOS SSH to inspect logs.');
    }
  } finally {
    // Best-effort cleanup of synthetic catalog/coupon records in staging
    await httpJson(`${cfg.baseUrl}/api/products/${encodeURIComponent(productId)}`, { method: 'DELETE', headers: adminHeaders }).catch(() => {});
    await httpJson(`${cfg.baseUrl}/api/coupons/${encodeURIComponent(couponCode)}`, { method: 'DELETE', headers: adminHeaders }).catch(() => {});
    if (createdOrderIds.length > 0) {
      console.log(`Note: Created synthetic staging order ID(s) for audit trail cleanup if desired: ${createdOrderIds.join(', ')}`);
    }
  }

  printSummary();
}

const args = process.argv.slice(2);
if (args.includes('--checklist')) {
  await runChecklistMode();
} else {
  await runLiveSuite();
}
