import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

process.env.EIRVAN_TEST_NO_LISTEN = '1';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const { app, verifyAdminBearerToken, handleAuthSessionRequest } = await import('../server.ts');
const {
  evaluateAdminDocument,
  classifyFirestoreAdminError,
  getAdminAuthDiagnosticMessage,
  isBackendUnmountedError,
} = await import('../src/utils/adminAuth.ts');

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'firebase-applet-config.json'), 'utf8')
);
const PROJECT_ID = firebaseConfig.projectId;
const DB_ID = firebaseConfig.firestoreDatabaseId;

// Generate an ephemeral RS256 test keypair to exercise real cryptographic JWT verification
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const TEST_KID = 'test-key-1';
const TEST_CERTS = { [TEST_KID]: publicKey };

function base64Url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signFirebaseJwt(payloadOverrides = {}, headerOverrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', kid: TEST_KID, ...headerOverrides };
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    sub: 'dnGPBg5HOhblcRqi1mCKUU4OlnJ3',
    email: 'ac.repair.in.dubai3@gmail.com',
    email_verified: true,
    iat: now - 30,
    auth_time: now - 30,
    exp: now + 3600,
    ...payloadOverrides,
  };
  const h = base64Url(JSON.stringify(header));
  const p = base64Url(JSON.stringify(payload));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${h}.${p}`);
  signer.end();
  const sig = signer.sign(privateKey);
  return `${h}.${p}.${base64Url(sig)}`;
}

function mockFirestoreResponse(status, body = {}) {
  return async (url) => {
    assert.ok(
      url.includes(`/projects/${PROJECT_ID}/databases/${DB_ID}/documents/admins/`),
      `Unexpected Firestore URL: ${url}`
    );
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
}

function createMockRes() {
  const state = { statusCode: 200, body: null };
  const res = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(payload) {
      state.body = payload;
      return res;
    },
  };
  return { res, state };
}

test('1. Valid super_admin grants access with authorized session', async () => {
  const token = signFirebaseJwt();
  const req = { headers: { authorization: `Bearer ${token}` } };
  const { res, state } = createMockRes();

  await handleAuthSessionRequest(req, res, (hdr) =>
    verifyAdminBearerToken(hdr, {
      certsOverride: TEST_CERTS,
      fetchImpl: mockFirestoreResponse(200, {
        fields: {
          uid: { stringValue: 'dnGPBg5HOhblcRqi1mCKUU4OlnJ3' },
          email: { stringValue: 'ac.repair.in.dubai3@gmail.com' },
          role: { stringValue: 'super_admin' },
          active: { booleanValue: true },
        },
      }),
    })
  );

  assert.equal(state.statusCode, 200);
  assert.equal(state.body.success, true);
  assert.equal(state.body.authenticated, true);
  assert.equal(state.body.isAdmin, true);
  assert.equal(state.body.authStatus, 'authorized');
  assert.equal(state.body.user.uid, 'dnGPBg5HOhblcRqi1mCKUU4OlnJ3');
});

test('2. Normal Google user without admin document is denied with missing_admin_doc', async () => {
  const token = signFirebaseJwt({ sub: 'regularUserUid123', email: 'shopper@example.com' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const { res, state } = createMockRes();

  await handleAuthSessionRequest(req, res, (hdr) =>
    verifyAdminBearerToken(hdr, {
      certsOverride: TEST_CERTS,
      fetchImpl: mockFirestoreResponse(404, { error: { status: 'NOT_FOUND' } }),
    })
  );

  assert.equal(state.statusCode, 403);
  assert.equal(state.body.authenticated, true);
  assert.equal(state.body.isAdmin, false);
  assert.equal(state.body.authStatus, 'missing_admin_doc');
});

test('3. Admin with active=false is denied with inactive_admin', async () => {
  const token = signFirebaseJwt();
  const req = { headers: { authorization: `Bearer ${token}` } };
  const { res, state } = createMockRes();

  await handleAuthSessionRequest(req, res, (hdr) =>
    verifyAdminBearerToken(hdr, {
      certsOverride: TEST_CERTS,
      fetchImpl: mockFirestoreResponse(200, {
        fields: {
          role: { stringValue: 'super_admin' },
          active: { booleanValue: false },
        },
      }),
    })
  );

  assert.equal(state.statusCode, 403);
  assert.equal(state.body.authenticated, true);
  assert.equal(state.body.isAdmin, false);
  assert.equal(state.body.authStatus, 'inactive_admin');
});

test('4. Admin with invalid role is denied with invalid_role', async () => {
  const token = signFirebaseJwt();
  const req = { headers: { authorization: `Bearer ${token}` } };
  const { res, state } = createMockRes();

  await handleAuthSessionRequest(req, res, (hdr) =>
    verifyAdminBearerToken(hdr, {
      certsOverride: TEST_CERTS,
      fetchImpl: mockFirestoreResponse(200, {
        fields: {
          role: { stringValue: 'viewer' },
          active: { booleanValue: true },
        },
      }),
    })
  );

  assert.equal(state.statusCode, 403);
  assert.equal(state.body.authenticated, true);
  assert.equal(state.body.isAdmin, false);
  assert.equal(state.body.authStatus, 'invalid_role');
});

test('5. Unverified email is denied with email_unverified before Firestore read', async () => {
  const token = signFirebaseJwt({ email_verified: false });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const { res, state } = createMockRes();
  let fetchedFirestore = false;

  await handleAuthSessionRequest(req, res, (hdr) =>
    verifyAdminBearerToken(hdr, {
      certsOverride: TEST_CERTS,
      fetchImpl: async () => {
        fetchedFirestore = true;
        return new Response('{}', { status: 200 });
      },
    })
  );

  assert.equal(fetchedFirestore, false);
  assert.equal(state.statusCode, 403);
  assert.equal(state.body.isAdmin, false);
  assert.equal(state.body.authStatus, 'email_unverified');
});

test('6. Invalid, expired, wrong-aud, and malformed Firebase tokens are rejected with 401', async () => {
  const expiredToken = signFirebaseJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
  const wrongAudToken = signFirebaseJwt({ aud: 'wrong-project-id' });
  const wrongSigToken = `${signFirebaseJwt().slice(0, -4)}AAAA`;

  for (const badHeader of [
    'Bearer not-a-jwt',
    'Basic dXNlcjpwYXNz',
    `Bearer ${expiredToken}`,
    `Bearer ${wrongAudToken}`,
    `Bearer ${wrongSigToken}`,
  ]) {
    const req = { headers: { authorization: badHeader } };
    const { res, state } = createMockRes();

    await handleAuthSessionRequest(req, res, (hdr) =>
      verifyAdminBearerToken(hdr, { certsOverride: TEST_CERTS })
    );

    assert.equal(state.statusCode, 401, `Expected 401 for ${badHeader.slice(0, 24)}`);
    assert.equal(state.body.success, false);
    assert.equal(state.body.authenticated, false);
    assert.equal(state.body.isAdmin, false);
    assert.equal(state.body.authStatus, 'invalid_token');
  }
});

test('7. Unauthenticated anonymous request to GET /api/auth/session returns safe 200 unauthenticated state', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const resp = await fetch(`http://127.0.0.1:${port}/api/auth/session`);
    const body = await resp.json();
    assert.equal(resp.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.authenticated, false);
    assert.equal(body.isAdmin, false);
    assert.equal(body.authStatus, 'unauthenticated');

    const badResp = await fetch(`http://127.0.0.1:${port}/api/auth/session`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    const badBody = await badResp.json();
    assert.equal(badResp.status, 401);
    assert.equal(badBody.success, false);
    assert.equal(badBody.isAdmin, false);
    assert.equal(badBody.authStatus, 'invalid_token');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('8. Firestore permission error returns diagnostic permission_denied and never grants access', async () => {
  const token = signFirebaseJwt();
  const req = { headers: { authorization: `Bearer ${token}` } };
  const { res, state } = createMockRes();

  await handleAuthSessionRequest(req, res, (hdr) =>
    verifyAdminBearerToken(hdr, {
      certsOverride: TEST_CERTS,
      fetchImpl: mockFirestoreResponse(403, { error: { status: 'PERMISSION_DENIED' } }),
    })
  );

  assert.equal(state.statusCode, 403);
  assert.equal(state.body.isAdmin, false);
  assert.equal(state.body.authStatus, 'permission_denied');

  const clientClassified = classifyFirestoreAdminError({
    code: 'permission-denied',
    message: 'Missing or insufficient permissions.',
  });
  assert.equal(clientClassified, 'permission_denied');

  const diag = getAdminAuthDiagnosticMessage(clientClassified, 'ac.repair.in.dubai3@gmail.com');
  assert.notEqual(diag.title, 'Unauthorized Account');
  assert.match(diag.title, /Access Verification Blocked/i);
  assert.match(diag.description, /Firestore security rules/i);
});

test('9. Frontend adminAuth helpers distinguish Categories A, B, C, D, E cleanly', () => {
  // A: missing admin doc
  assert.deepEqual(
    evaluateAdminDocument({ emailVerified: true, exists: false, data: null }),
    { isAdmin: false, status: 'missing_admin_doc' }
  );

  // B: active=false, string "true", invalid role
  assert.deepEqual(
    evaluateAdminDocument({ emailVerified: true, exists: true, data: { active: false, role: 'super_admin' } }),
    { isAdmin: false, status: 'inactive_admin' }
  );
  assert.deepEqual(
    evaluateAdminDocument({ emailVerified: true, exists: true, data: { active: 'true', role: 'super_admin' } }),
    { isAdmin: false, status: 'inactive_admin' }
  );
  assert.deepEqual(
    evaluateAdminDocument({ emailVerified: true, exists: true, data: { active: true, role: 'customer' } }),
    { isAdmin: false, status: 'invalid_role' }
  );
  assert.deepEqual(
    evaluateAdminDocument({ emailVerified: false, exists: true, data: { active: true, role: 'super_admin' } }),
    { isAdmin: false, status: 'email_unverified' }
  );

  // D: backend/server error & invalid token diagnostics
  assert.notEqual(getAdminAuthDiagnosticMessage('backend_error', 'a@b.com').title, 'Unauthorized Account');
  assert.notEqual(getAdminAuthDiagnosticMessage('invalid_token', 'a@b.com').title, 'Unauthorized Account');
  assert.equal(isBackendUnmountedError(Object.assign(new Error('Not mounted'), { status: 501 })), true);
  assert.equal(isBackendUnmountedError(Object.assign(new Error('Forbidden'), { status: 403 })), false);

  // E: valid super_admin
  assert.deepEqual(
    evaluateAdminDocument({ emailVerified: true, exists: true, data: { active: true, role: 'super_admin' } }),
    { isAdmin: true, status: 'authorized' }
  );
});

test('10. firestore.rules narrows /admins/{uid} to owner-only get and preserves default-deny & existing rules', () => {
  const rules = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf8');

  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
  assert.match(
    rules,
    /match \/admins\/\{uid\} \{\s*allow get: if isSignedIn\(\) && request\.auth\.uid == uid;\s*allow list, create, update, delete: if false;\s*\}/
  );

  // Ensure existing collections were preserved and rules were NOT replaced by DRAFT_firestore.rules
  for (const coll of ['products', 'orders', 'reviews', 'coupons', 'settings', 'wholesale_inquiries', 'categories']) {
    assert.match(rules, new RegExp(`match /${coll}/`), `Missing collection rule: ${coll}`);
  }
  assert.doesNotMatch(rules, /STAGED PRODUCTION RULES/);
});

test('11. PHP backend auth files enforce strict Bearer, verified email, named DB, strict boolean active, and role allowlist', () => {
  const authCtrl = fs.readFileSync(path.join(rootDir, 'backend/controllers/AuthController.php'), 'utf8');
  const authMw = fs.readFileSync(path.join(rootDir, 'backend/middleware/AuthMiddleware.php'), 'utf8');
  const appCfg = fs.readFileSync(path.join(rootDir, 'backend/config/app.php'), 'utf8');
  const fsService = fs.readFileSync(path.join(rootDir, 'backend/services/FirestoreService.php'), 'utf8');

  assert.match(appCfg, /EIRVAN_PRODUCTION_FIREBASE_PROJECT_ID = 'gen-lang-client-0351129330'/);
  assert.match(
    appCfg,
    /EIRVAN_PRODUCTION_FIRESTORE_DB_ID = 'ai-studio-zauqesehatpremiu-a42b0907-2253-405b-8d7e-9cfd4b314afc'/
  );
  assert.match(fsService, /https:\/\/firestore\.googleapis\.com\/v1\/projects\/%s\/databases\/%s\/documents/);
  assert.match(authMw, /\$user\['emailVerified'\] !== true/);
  assert.match(authMw, /\(\$adminDoc\['active'\] \?\? null\) !== true/);
  assert.match(authMw, /in_array\(\$role, \['admin', 'super_admin', 'superadmin'\], true\)/);
  assert.match(authMw, /public function authenticateOptional\(\): \?array/);
  assert.match(authCtrl, /'authStatus' => 'invalid_token'/);
  assert.match(authCtrl, /'status' => 401/);
  assert.match(authCtrl, /'status' => 503/);
  assert.match(authCtrl, /'authStatus' => 'unauthenticated'/);
});
