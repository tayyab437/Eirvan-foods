import type { Express, Request, Response } from 'express';
import crypto from 'node:crypto';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_SETTINGS,
  INITIAL_PRIVATE_SETTINGS,
} from './src/data/mockData';

export interface PreviewApiDeps {
  projectId: string;
  databaseId: string;
  verifyAdminBearerToken: (authHeader?: string) => Promise<{ uid: string; email?: string }>;
}

const VALID_DOC_ID = /^[a-zA-Z0-9_\-]+$/;
const ALLOWED_ORDER_STATUSES = new Set([
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Returned',
]);
const PUBLIC_SETTINGS_FIELDS = [
  'storeName',
  'tagline',
  'contactPhone',
  'whatsappNumber',
  'contactEmail',
  'freeShippingThreshold',
  'standardShippingRate',
  'codEnabled',
  'bankDetails',
  'announcementBarMessage',
  'announcementActive',
] as const;

function cleanStr(val: unknown, maxLen: number): string {
  if (typeof val !== 'string' && typeof val !== 'number') return '';
  return String(val).trim().slice(0, maxLen);
}

function normalizePakistaniPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('923') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('00923') && digits.length === 14) return `0${digits.slice(4)}`;
  if (digits.startsWith('3') && digits.length === 10) return `0${digits}`;
  return digits;
}

function isValidPakistaniMobile(normalized: string): boolean {
  return /^03\d{9}$/.test(normalized);
}

function encodeFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { integerValue: '0' };
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((v) => v !== undefined).map((v) => encodeFirestoreValue(v)),
      },
    };
  }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: encodeFirestoreFields(val as Record<string, unknown>),
      },
    };
  }
  return { stringValue: String(val) };
}

function encodeFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    fields[key] = encodeFirestoreValue(val);
  }
  return fields;
}

function decodeFirestoreValue(typed: Record<string, any>): unknown {
  if ('nullValue' in typed) return null;
  if ('booleanValue' in typed) return Boolean(typed.booleanValue);
  if ('integerValue' in typed) return Number(typed.integerValue);
  if ('doubleValue' in typed) return Number(typed.doubleValue);
  if ('stringValue' in typed) return String(typed.stringValue);
  if ('timestampValue' in typed) return String(typed.timestampValue);
  if ('arrayValue' in typed) {
    const values = Array.isArray(typed.arrayValue?.values) ? typed.arrayValue.values : [];
    return values.map((v: Record<string, any>) => decodeFirestoreValue(v));
  }
  if ('mapValue' in typed) {
    const out: Record<string, unknown> = {};
    const fields = typed.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v as Record<string, any>);
    }
    return out;
  }
  return null;
}

function decodeFirestoreDocument(rawDoc: { name?: string; fields?: Record<string, any> }): Record<string, any> {
  const out: Record<string, any> = {};
  const fields = rawDoc?.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = decodeFirestoreValue(v);
  }
  return out;
}

function extractBearerToken(authHeader?: string): string | null {
  const match = authHeader?.match(/^\s*Bearer\s+([A-Za-z0-9\-_\.]+)\s*$/);
  return match ? match[1] : null;
}

export function registerPreviewApiRoutes(app: Express, deps: PreviewApiDeps): void {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    deps.projectId
  )}/databases/${encodeURIComponent(deps.databaseId)}/documents`;

  const fsHeaders = (token?: string | null, withJson = false): Record<string, string> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (withJson) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  async function fsGet(collection: string, docId: string, token?: string | null) {
    const resp = await fetch(`${baseUrl}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`, {
      headers: fsHeaders(token),
    });
    if (resp.status === 404) return null;
    if (!resp.ok) {
      const err = new Error(`Firestore read failed (${resp.status}).`) as Error & { statusCode?: number };
      err.statusCode = resp.status;
      throw err;
    }
    const raw = (await resp.json()) as { fields?: Record<string, any> };
    return decodeFirestoreDocument(raw);
  }

  async function fsList(collection: string, pageSize = 100, pageToken?: string | null, token?: string | null) {
    const params = new URLSearchParams({ pageSize: String(Math.max(1, Math.min(300, pageSize))) });
    if (pageToken) params.set('pageToken', pageToken);
    const resp = await fetch(`${baseUrl}/${encodeURIComponent(collection)}?${params.toString()}`, {
      headers: fsHeaders(token),
    });
    if (!resp.ok) {
      const err = new Error(`Firestore list failed (${resp.status}).`) as Error & { statusCode?: number };
      err.statusCode = resp.status;
      throw err;
    }
    const raw = (await resp.json()) as { documents?: Array<{ fields?: Record<string, any> }>; nextPageToken?: string };
    return {
      documents: (raw.documents || []).map((d) => decodeFirestoreDocument(d)),
      nextPageToken: raw.nextPageToken || null,
    };
  }

  async function fsSet(collection: string, docId: string, data: Record<string, unknown>, token?: string | null) {
    const resp = await fetch(`${baseUrl}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`, {
      method: 'PATCH',
      headers: fsHeaders(token, true),
      body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      const err = new Error(`Firestore write failed (${resp.status}): ${text}`) as Error & { statusCode?: number };
      err.statusCode = resp.status;
      throw err;
    }
    const raw = (await resp.json()) as { fields?: Record<string, any> };
    return decodeFirestoreDocument(raw);
  }

  async function fsCreate(collection: string, docId: string, data: Record<string, unknown>, token?: string | null) {
    const resp = await fetch(
      `${baseUrl}/${encodeURIComponent(collection)}?documentId=${encodeURIComponent(docId)}`,
      {
        method: 'POST',
        headers: fsHeaders(token, true),
        body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
      }
    );
    if (!resp.ok) {
      const text = await resp.text();
      const err = new Error(`Firestore create failed (${resp.status}): ${text}`) as Error & { statusCode?: number };
      err.statusCode = resp.status;
      throw err;
    }
    const raw = (await resp.json()) as { fields?: Record<string, any> };
    return decodeFirestoreDocument(raw);
  }

  async function fsPatch(collection: string, docId: string, data: Record<string, unknown>, token?: string | null) {
    const mask = Object.keys(data)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&');
    const resp = await fetch(
      `${baseUrl}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}?${mask}`,
      {
        method: 'PATCH',
        headers: fsHeaders(token, true),
        body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
      }
    );
    if (!resp.ok) {
      const text = await resp.text();
      const err = new Error(`Firestore patch failed (${resp.status}): ${text}`) as Error & { statusCode?: number };
      err.statusCode = resp.status;
      throw err;
    }
    const raw = (await resp.json()) as { fields?: Record<string, any> };
    return decodeFirestoreDocument(raw);
  }

  async function fsDelete(collection: string, docId: string, token?: string | null) {
    const resp = await fetch(`${baseUrl}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
      headers: fsHeaders(token),
    });
    if (resp.status === 404) return;
    if (!resp.ok) {
      const err = new Error(`Firestore delete failed (${resp.status}).`) as Error & { statusCode?: number };
      err.statusCode = resp.status;
      throw err;
    }
  }

  async function requireAdmin(req: Request, res: Response): Promise<{ uid: string; email?: string; token: string } | null> {
    try {
      const verified = await deps.verifyAdminBearerToken(req.headers.authorization);
      const token = extractBearerToken(req.headers.authorization) || '';
      return { ...verified, token };
    } catch (authErr: any) {
      const status = typeof authErr?.statusCode === 'number' ? authErr.statusCode : 401;
      res.status(status).json({
        success: false,
        error: authErr?.message || 'Administrator authorization required.',
      });
      return null;
    }
  }

  function filterPublicSettings(raw: Record<string, any> | null) {
    if (!raw) return null;
    const out: Record<string, any> = {};
    for (const key of PUBLIC_SETTINGS_FIELDS) {
      if (key in raw && raw[key] !== undefined) {
        out[key] = raw[key];
      }
    }
    return out;
  }

  // Health Check
  app.get('/api/health', async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    let isAdmin = false;
    if (token) {
      try {
        await deps.verifyAdminBearerToken(req.headers.authorization);
        isAdmin = true;
      } catch {
        isAdmin = false;
      }
    }

    if (!isAdmin) {
      return res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
    }

    let firestoreConnected = false;
    let firestoreNote = 'Checking Firestore...';
    try {
      const doc = await fsGet('settings', 'main', token);
      firestoreConnected = true;
      firestoreNote = doc
        ? 'Connected via AI Studio preview server (settings/main readable).'
        : 'Connected via AI Studio preview server.';
    } catch (err: any) {
      firestoreNote = err?.message || 'Firestore connectivity check failed.';
    }

    return res.json({
      success: true,
      status: 'ok',
      env: 'ai-studio-preview',
      phpCompatible: true,
      phpSeries: 'preview-node-parity',
      extensions: { curl: true, openssl: true, json: true, mbstring: true },
      credentialsConfigured: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      firestoreConnected,
      firestoreNote,
      timestamp: new Date().toISOString(),
    });
  });

  // Public & Admin Settings
  app.get('/api/settings', async (_req: Request, res: Response) => {
    try {
      let doc: Record<string, any> | null = null;
      try {
        doc = await fsGet('public_settings', 'main');
      } catch {
        // Fallback cleanly to settings/main if public_settings isn't readable under current rules
      }
      if (!doc) {
        doc = await fsGet('settings', 'main');
      }
      return res.json({ success: true, settings: filterPublicSettings(doc) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Unable to load settings.' });
    }
  });

  app.put('/api/settings', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const input = (req.body || {}) as Record<string, any>;
    const patch = filterPublicSettings(input) || {};
    if (Object.keys(patch).length === 0) {
      return res.status(422).json({ success: false, error: 'No valid public settings fields supplied.' });
    }

    try {
      const existing = (await fsGet('settings', 'main', admin.token)) || { ...INITIAL_SETTINGS };
      const merged = { ...existing, ...patch };
      await fsSet('settings', 'main', merged, admin.token);
      return res.json({ success: true, settings: filterPublicSettings(merged) });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({
        success: false,
        error: err?.message || 'Failed to update settings.',
      });
    }
  });

  app.get('/api/settings/private', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    let hasPublic = false;
    let hasPrivate = false;
    let hasLegacy = false;
    let privData: Record<string, any> = { ...INITIAL_PRIVATE_SETTINGS };

    try {
      const pub = await fsGet('public_settings', 'main', admin.token);
      hasPublic = Boolean(pub);
    } catch {
      hasPublic = false;
    }
    try {
      const priv = await fsGet('private_settings', 'main', admin.token);
      if (priv) {
        hasPrivate = true;
        privData = { ...INITIAL_PRIVATE_SETTINGS, ...priv };
      }
    } catch {
      hasPrivate = false;
    }
    try {
      const leg = await fsGet('settings', 'main', admin.token);
      hasLegacy = Boolean(leg);
    } catch {
      hasLegacy = false;
    }

    return res.json({
      success: true,
      privateSettings: privData,
      migrationStatus: {
        hasPublicSettings: hasPublic,
        hasPrivateSettings: hasPrivate,
        hasLegacySettings: hasLegacy,
      },
    });
  });

  app.put('/api/settings/private', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const existing = (await fsGet('private_settings', 'main', admin.token)) || { ...INITIAL_PRIVATE_SETTINGS };
      const merged = { ...existing, ...(req.body || {}), updatedAt: new Date().toISOString(), updatedByUid: admin.uid };
      await fsSet('private_settings', 'main', merged, admin.token);
      return res.json({ success: true, privateSettings: merged });
    } catch (err: any) {
      return res.status(err?.statusCode === 403 ? 403 : 500).json({
        success: false,
        error: 'Private settings collection requires IONOS PHP backend or staged rules deployment.',
      });
    }
  });

  app.post('/api/settings/backfill', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      let createdMissingDocs = 0;
      for (const prod of INITIAL_PRODUCTS) {
        const existing = await fsGet('products', prod.id, admin.token);
        if (!existing) {
          await fsSet('products', prod.id, prod as unknown as Record<string, unknown>, admin.token);
          createdMissingDocs++;
        }
      }
      for (const cat of INITIAL_CATEGORIES) {
        if (cat.id === 'all') continue;
        const existing = await fsGet('categories', cat.id, admin.token);
        if (!existing) {
          await fsSet('categories', cat.id, cat as unknown as Record<string, unknown>, admin.token);
          createdMissingDocs++;
        }
      }
      return res.json({ success: true, createdMissingDocs });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({
        success: false,
        error: err?.message || 'Catalog backfill failed.',
      });
    }
  });

  // Products CRUD
  const upsertProductHandler = async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const input = (req.body || {}) as Record<string, any>;
    const productId = cleanStr(req.params.id || input.id || '', 128);
    const name = cleanStr(input.name || '', 200);
    const slug = cleanStr(input.slug || '', 150);
    const category = cleanStr(input.category || '', 100);
    const variants = Array.isArray(input.variants) ? input.variants : [];

    if (!VALID_DOC_ID.test(productId) || !name || !slug || !category || variants.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Valid product id, name, slug, category, and at least one variant are required.',
      });
    }

    try {
      const existing = await fsGet('products', productId, admin.token);
      const normalizedVariants = variants.map((v: any) => {
        const stock = Math.max(0, Math.round(Number(v?.stock ?? 0)));
        const out: Record<string, unknown> = {
          id: cleanStr(v?.id || `var-${Date.now()}`, 64),
          weight: cleanStr(v?.weight || '250g', 40),
          sku: cleanStr(v?.sku || '', 64),
          price: Math.max(0, Number(v?.price ?? 0)),
          stock,
        };
        if (v?.salePrice !== undefined && v?.salePrice !== '' && Number(v.salePrice) > 0) {
          out.salePrice = Number(v.salePrice);
        }
        return out;
      });
      const anyInStock = normalizedVariants.some((v) => Number(v.stock) > 0);
      const doc: Record<string, unknown> = {
        ...input,
        id: productId,
        name,
        slug,
        category,
        variants: normalizedVariants,
        inStock: anyInStock && Boolean(input.inStock ?? true),
        rating: existing && typeof existing.rating === 'number' ? existing.rating : Number(input.rating ?? 5.0),
        reviewCount:
          existing && typeof existing.reviewCount === 'number'
            ? existing.reviewCount
            : Number(input.reviewCount ?? 0),
        viewCount:
          existing && typeof existing.viewCount === 'number'
            ? existing.viewCount
            : Number(input.viewCount ?? 0),
      };

      await fsSet('products', productId, doc, admin.token);
      return res.json({ success: true, product: doc });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({
        success: false,
        error: err?.message || 'Failed to save product.',
      });
    }
  };

  app.post('/api/products', upsertProductHandler);
  app.put('/api/products/:id', upsertProductHandler);

  app.delete('/api/products/:id', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const productId = cleanStr(req.params.id, 128);
    if (!VALID_DOC_ID.test(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product ID.' });
    }
    try {
      await fsDelete('products', productId, admin.token);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Delete failed.' });
    }
  });

  app.post('/api/products/:id/view', async (_req: Request, res: Response) => {
    return res.json({ success: true });
  });

  // Categories CRUD
  app.post('/api/categories', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const input = (req.body || {}) as Record<string, any>;
    const id = cleanStr(input.id || '', 128);
    const name = cleanStr(input.name || '', 100);
    if (!VALID_DOC_ID.test(id) || !name) {
      return res.status(422).json({ success: false, error: 'Valid category id and name are required.' });
    }
    const doc: Record<string, unknown> = {
      id,
      name,
      image: cleanStr(input.image || '', 500),
      description: cleanStr(input.description || '', 300),
      isSystem: Boolean(input.isSystem ?? false),
    };
    try {
      await fsSet('categories', id, doc, admin.token);
      return res.json({ success: true, category: doc });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Category save failed.' });
    }
  });

  app.delete('/api/categories/:id', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = cleanStr(req.params.id, 128);
    if (!VALID_DOC_ID.test(id)) {
      return res.status(400).json({ success: false, error: 'Invalid category ID.' });
    }
    try {
      await fsDelete('categories', id, admin.token);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Category delete failed.' });
    }
  });

  // Orders & Tracking
  app.get('/api/orders', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const limit = Math.max(1, Math.min(300, Number(req.query.limit || 100)));
    const pageToken = typeof req.query.pageToken === 'string' && req.query.pageToken ? req.query.pageToken : null;
    try {
      const page = await fsList('orders', limit, pageToken, admin.token);
      return res.json({
        success: true,
        orders: page.documents,
        nextPageToken: page.nextPageToken,
        hasMore: Boolean(page.nextPageToken),
      });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Failed to load orders.' });
    }
  });

  app.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const orderId = cleanStr(req.params.id, 128);
    const nextStatus = cleanStr(req.body?.orderStatus || '', 40);
    if (!VALID_DOC_ID.test(orderId) || !ALLOWED_ORDER_STATUSES.has(nextStatus)) {
      return res.status(422).json({ success: false, error: 'Valid order ID and status required.' });
    }
    try {
      const patch: Record<string, unknown> = {
        orderStatus: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      if (typeof req.body?.adminNote === 'string') {
        patch.internalNotes = cleanStr(req.body.adminNote, 1000);
      }
      const updated = await fsPatch('orders', orderId, patch, admin.token);
      return res.json({ success: true, order: updated });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Failed to update order.' });
    }
  });

  app.post('/api/orders', async (req: Request, res: Response) => {
    const input = (req.body || {}) as Record<string, any>;
    const customerName = cleanStr(input.customerName, 100);
    const customerPhone = cleanStr(input.customerPhone, 30);
    const city = cleanStr(input.city, 50);
    const address = cleanStr(input.address, 300);
    const paymentMethod = cleanStr(input.paymentMethod, 30);
    const rawItems = Array.isArray(input.items) ? input.items : [];

    if (!customerName || !customerPhone || !city || !address || rawItems.length === 0) {
      return res.status(422).json({ success: false, error: 'Complete shipping details and at least one item are required.' });
    }
    if (!['COD', 'BankTransfer', 'Raast'].includes(paymentMethod)) {
      return res.status(422).json({ success: false, error: 'Unsupported payment method.' });
    }

    try {
      const settingsDoc = (await fsGet('settings', 'main')) || INITIAL_SETTINGS;
      let subtotal = 0;
      const verifiedItems: Array<Record<string, unknown>> = [];
      for (const item of rawItems) {
        const qty = Math.max(1, Math.min(100, Math.round(Number(item?.quantity ?? 1))));
        const prod = item?.productId ? await fsGet('products', String(item.productId)) : null;
        const variant = Array.isArray(prod?.variants)
          ? prod.variants.find((v: any) => v.id === item.variantId) || prod.variants[0]
          : null;
        const unitPrice = variant ? Number(variant.salePrice || variant.price || 0) : Number(item?.price || 0);
        subtotal += unitPrice * qty;
        verifiedItems.push({
          ...item,
          price: unitPrice,
          quantity: qty,
        });
      }

      const threshold = Number(settingsDoc.freeShippingThreshold ?? 3500);
      const stdShipping = Number(settingsDoc.standardShippingRate ?? 250);
      const shippingFee = subtotal >= threshold ? 0 : stdShipping;
      const totalAmount = Math.max(0, subtotal + shippingFee);
      const orderId = `ord-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const orderNumber = `ZDS-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const trackingToken = crypto.randomBytes(16).toString('hex');
      const trackingTokenHash = crypto.createHash('sha256').update(trackingToken).digest('hex');

      const orderDoc: Record<string, unknown> = {
        id: orderId,
        orderNumber,
        customerName,
        customerPhone,
        normalizedPhone: normalizePakistaniPhone(customerPhone),
        city,
        address,
        items: verifiedItems,
        subtotal,
        shippingFee,
        couponDiscount: 0,
        totalAmount,
        paymentMethod,
        paymentStatus: 'Pending',
        orderStatus: 'Pending',
        createdAt: new Date().toISOString(),
        trackingTokenHash,
      };

      await fsCreate('orders', orderId, orderDoc);
      const { trackingTokenHash: _hidden, ...publicOrder } = orderDoc;
      return res.status(201).json({ success: true, order: publicOrder, trackingToken });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Order creation failed.' });
    }
  });

  app.post('/api/tracking', async (req: Request, res: Response) => {
    const orderNumber = cleanStr(req.body?.orderNumber, 32).toUpperCase();
    const rawPhone = cleanStr(req.body?.phone, 30);
    const phone = rawPhone ? normalizePakistaniPhone(rawPhone) : '';
    const token = cleanStr(req.body?.trackingToken, 128);

    if (!orderNumber || (!phone && !token)) {
      return res.status(422).json({ success: false, error: 'Order reference and phone or tracking token required.' });
    }
    if (!token && !isValidPakistaniMobile(phone)) {
      return res.status(422).json({ success: false, error: 'Valid Pakistani mobile number required.' });
    }

    try {
      const page = await fsList('orders', 250);
      const match = page.documents.find((o) => String(o.orderNumber || '').toUpperCase() === orderNumber);
      if (!match) {
        return res.status(404).json({ success: false, error: 'No matching order found.' });
      }
      const tokenHash = token ? crypto.createHash('sha256').update(token).digest('hex') : '';
      const validToken = Boolean(tokenHash && match.trackingTokenHash && tokenHash === match.trackingTokenHash);
      const storedPhone = normalizePakistaniPhone(String(match.normalizedPhone || match.customerPhone || ''));
      const validPhone = Boolean(phone && storedPhone && phone === storedPhone);

      if (!validToken && !validPhone) {
        return res.status(404).json({ success: false, error: 'No matching order found.' });
      }

      const { trackingTokenHash: _h, normalizedPhone: _p, ...cleanOrder } = match;
      if (validToken) {
        return res.json({ success: true, privacyLevel: 'full', order: cleanOrder });
      }
      return res.json({
        success: true,
        privacyLevel: 'masked',
        order: {
          ...cleanOrder,
          customerPhone: storedPhone.slice(0, 4) + '*****' + storedPhone.slice(-2),
          address: `Verified delivery in ${cleanOrder.city || 'Pakistan'}`,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Tracking lookup failed.' });
    }
  });

  // Coupons
  app.post('/api/coupons/validate', async (req: Request, res: Response) => {
    const code = cleanStr(req.body?.code || '', 30)
      .toUpperCase()
      .replace(/[^A-Z0-9_\-]/g, '');
    const subtotal = Number(req.body?.subtotal || 0);
    if (!code || !VALID_DOC_ID.test(code)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid promo code.' });
    }
    try {
      const coupon = await fsGet('coupons', code);
      if (!coupon || !coupon.isActive) {
        return res.json({ success: false, message: 'Invalid or inactive coupon code.' });
      }
      if (subtotal < Number(coupon.minOrderAmount || 0)) {
        return res.json({
          success: false,
          message: `This coupon requires a minimum cart order of Rs. ${Number(coupon.minOrderAmount).toLocaleString()}.`,
        });
      }
      const val = Number(coupon.discountValue || 0);
      const discountAmount =
        coupon.discountType === 'percentage' ? Math.round((subtotal * val) / 100) : Math.min(subtotal, Math.round(val));
      return res.json({
        success: true,
        message: `Coupon "${coupon.code}" applied successfully! You saved Rs. ${discountAmount.toLocaleString()}.`,
        coupon,
        discountAmount,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Unable to validate coupon.' });
    }
  });

  app.get('/api/coupons', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const limit = Math.max(1, Math.min(300, Number(req.query.limit || 100)));
    const pageToken = typeof req.query.pageToken === 'string' && req.query.pageToken ? req.query.pageToken : null;
    try {
      const page = await fsList('coupons', limit, pageToken, admin.token);
      return res.json({
        success: true,
        coupons: page.documents,
        nextPageToken: page.nextPageToken,
        hasMore: Boolean(page.nextPageToken),
      });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Failed to load coupons.' });
    }
  });

  app.post('/api/coupons', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const input = (req.body || {}) as Record<string, any>;
    const code = cleanStr(input.code || '', 30)
      .toUpperCase()
      .replace(/[^A-Z0-9_\-]/g, '');
    if (!code || !VALID_DOC_ID.test(code)) {
      return res.status(422).json({ success: false, error: 'Valid coupon code required.' });
    }
    const doc: Record<string, unknown> = {
      code,
      discountType: input.discountType === 'fixed' ? 'fixed' : 'percentage',
      discountValue: Math.max(1, Number(input.discountValue || 0)),
      minOrderAmount: Math.max(0, Number(input.minOrderAmount || 0)),
      isActive: Boolean(input.isActive ?? true),
      expiryDate: cleanStr(input.expiryDate || '2026-12-31', 32),
      usageCount: Math.max(0, Number(input.usageCount || 0)),
    };
    if (input.usageLimit) doc.usageLimit = Math.max(1, Number(input.usageLimit));
    try {
      await fsSet('coupons', code, doc, admin.token);
      return res.json({ success: true, coupon: doc });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Coupon save failed.' });
    }
  });

  app.patch('/api/coupons/:code/toggle', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const code = cleanStr(req.params.code, 30).toUpperCase();
    try {
      const coupon = await fsGet('coupons', code, admin.token);
      if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found.' });
      const isActive = !Boolean(coupon.isActive);
      await fsPatch('coupons', code, { isActive }, admin.token);
      return res.json({ success: true, isActive });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Coupon toggle failed.' });
    }
  });

  app.delete('/api/coupons/:code', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const code = cleanStr(req.params.code, 30).toUpperCase();
    if (!VALID_DOC_ID.test(code)) return res.status(400).json({ success: false, error: 'Invalid coupon code.' });
    try {
      await fsDelete('coupons', code, admin.token);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Coupon delete failed.' });
    }
  });

  // Reviews
  app.post('/api/reviews', async (req: Request, res: Response) => {
    const input = (req.body || {}) as Record<string, any>;
    const productId = cleanStr(input.productId, 64);
    const customerName = cleanStr(input.customerName, 100);
    const comment = cleanStr(input.comment, 1000);
    const rating = Math.round(Number(input.rating || 0));
    if (!VALID_DOC_ID.test(productId) || !customerName || !comment || rating < 1 || rating > 5) {
      return res.status(422).json({ success: false, error: 'Valid productId, name, rating, and comment required.' });
    }
    const id = `rev-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const doc = {
      id,
      productId,
      customerName,
      city: cleanStr(input.city || 'Pakistan', 50) || 'Pakistan',
      rating,
      date: new Date().toISOString().slice(0, 10),
      comment,
      verifiedPurchase: false,
      status: 'pending',
    };
    try {
      await fsCreate('reviews', id, doc);
      return res.status(201).json({ success: true, message: 'Thank you! Your review has been submitted for moderation.', review: doc });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Review submit failed.' });
    }
  });

  app.get('/api/reviews', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const limit = Math.max(1, Math.min(300, Number(req.query.limit || 100)));
    const pageToken = typeof req.query.pageToken === 'string' && req.query.pageToken ? req.query.pageToken : null;
    try {
      const page = await fsList('reviews', limit, pageToken, admin.token);
      return res.json({
        success: true,
        reviews: page.documents,
        nextPageToken: page.nextPageToken,
        hasMore: Boolean(page.nextPageToken),
      });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Failed to load reviews.' });
    }
  });

  app.patch('/api/reviews/:id', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = cleanStr(req.params.id, 128);
    const status = cleanStr(req.body?.status, 20);
    if (!VALID_DOC_ID.test(id) || !['approved', 'pending', 'rejected'].includes(status)) {
      return res.status(422).json({ success: false, error: 'Valid review ID and moderation status required.' });
    }
    try {
      await fsPatch('reviews', id, { status }, admin.token);
      return res.json({ success: true, status });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Review update failed.' });
    }
  });

  app.delete('/api/reviews/:id', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = cleanStr(req.params.id, 128);
    if (!VALID_DOC_ID.test(id)) return res.status(400).json({ success: false, error: 'Invalid review ID.' });
    try {
      await fsDelete('reviews', id, admin.token);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Review delete failed.' });
    }
  });

  // Wholesale
  app.post('/api/wholesale', async (req: Request, res: Response) => {
    const input = (req.body || {}) as Record<string, any>;
    const id = `whl-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const doc: Record<string, unknown> = {
      id,
      createdAt: new Date().toISOString(),
      companyName: cleanStr(input.companyName, 100),
      contactName: cleanStr(input.contactName, 100),
      phone: cleanStr(input.phone, 30),
      email: cleanStr(input.email, 100),
      inquiryType: cleanStr(input.inquiryType || 'Wholesale Purchase', 40),
      estimatedQuantity: cleanStr(input.estimatedQuantity, 100),
      message: cleanStr(input.message || '', 2000),
      status: 'New',
    };
    if (input.eventDate) doc.eventDate = cleanStr(input.eventDate, 32);
    try {
      await fsCreate('wholesale_inquiries', id, doc);
      return res.status(201).json({ success: true, id });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Wholesale submit failed.' });
    }
  });

  app.get('/api/wholesale', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const limit = Math.max(1, Math.min(300, Number(req.query.limit || 100)));
    const pageToken = typeof req.query.pageToken === 'string' && req.query.pageToken ? req.query.pageToken : null;
    try {
      const page = await fsList('wholesale_inquiries', limit, pageToken, admin.token);
      return res.json({
        success: true,
        inquiries: page.documents,
        nextPageToken: page.nextPageToken,
        hasMore: Boolean(page.nextPageToken),
      });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Failed to load inquiries.' });
    }
  });

  app.patch('/api/wholesale/:id', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = cleanStr(req.params.id, 128);
    const status = cleanStr(req.body?.status, 30);
    if (!VALID_DOC_ID.test(id) || !['New', 'Contacted', 'Quoted', 'Converted', 'Closed'].includes(status)) {
      return res.status(422).json({ success: false, error: 'Valid inquiry ID and status required.' });
    }
    try {
      await fsPatch('wholesale_inquiries', id, { status }, admin.token);
      return res.json({ success: true, status });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Wholesale update failed.' });
    }
  });

  app.delete('/api/wholesale/:id', async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = cleanStr(req.params.id, 128);
    if (!VALID_DOC_ID.test(id)) return res.status(400).json({ success: false, error: 'Invalid inquiry ID.' });
    try {
      await fsDelete('wholesale_inquiries', id, admin.token);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Wholesale delete failed.' });
    }
  });
}
