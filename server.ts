import express, { Request, Response } from 'express';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { registerPreviewApiRoutes } from './previewApi';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseAppletConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8')
) as { projectId: string; firestoreDatabaseId?: string };

const FIREBASE_PROJECT_ID = firebaseAppletConfig.projectId;
const FIRESTORE_DATABASE_ID = firebaseAppletConfig.firestoreDatabaseId || '(default)';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(compression());

// Allow iframe embedding within Google AI Studio and preview environments
app.use((_req, res, next) => {
  res.removeHeader('X-Frame-Options');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// LLM & Crawler Discovery endpoints (llmstxt.org specification)
app.get('/llms.txt', (_req, res) => {
  res.type('text/plain; charset=utf-8');
  res.sendFile(path.resolve(__dirname, 'public', 'llms.txt'));
});

app.get('/llms-full.txt', (_req, res) => {
  res.type('text/plain; charset=utf-8');
  res.sendFile(path.resolve(__dirname, 'public', 'llms-full.txt'));
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain; charset=utf-8');
  res.sendFile(path.resolve(__dirname, 'public', 'robots.txt'));
});

// Agentic Resource Discovery (ARD) endpoint
app.get('/.well-known/ard.json', (_req, res) => {
  res.type('application/json; charset=utf-8');
  res.sendFile(path.resolve(__dirname, 'public', '.well-known', 'ard.json'));
});

// Initialize GoogleGenAI SDK (Local Dev Preview AI Endpoints Only)
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Cached Google x509 public certs for Firebase ID token verification in local Node dev preview
let cachedCerts: { keys: Record<string, string>; expiresAt: number } | null = null;

export type ServerAuthStatus =
  | 'authorized'
  | 'unauthenticated'
  | 'invalid_token'
  | 'email_unverified'
  | 'missing_admin_doc'
  | 'inactive_admin'
  | 'invalid_role'
  | 'permission_denied'
  | 'backend_error';

interface ServerAuthError extends Error {
  statusCode: number;
  authStatus: ServerAuthStatus;
  authenticated: boolean;
}

function createAuthError(
  message: string,
  statusCode: number,
  authStatus: ServerAuthStatus,
  authenticated = false
): ServerAuthError {
  const err = new Error(message) as ServerAuthError;
  err.statusCode = statusCode;
  err.authStatus = authStatus;
  err.authenticated = authenticated;
  return err;
}

async function getFirebasePublicCerts(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && cachedCerts && cachedCerts.expiresAt > now) {
    return cachedCerts.keys;
  }

  let resp: globalThis.Response;
  try {
    resp = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
  } catch {
    throw createAuthError(
      'Unable to reach Firebase certificate verification service.',
      503,
      'backend_error',
      false
    );
  }
  if (!resp.ok) {
    throw createAuthError(
      `Unable to fetch Firebase verification certificates (${resp.status}).`,
      503,
      'backend_error',
      false
    );
  }

  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const ttlSeconds = maxAgeMatch ? Math.max(300, Number(maxAgeMatch[1])) : 3600;
  const keys = (await resp.json()) as Record<string, string>;

  cachedCerts = {
    keys,
    expiresAt: now + ttlSeconds * 1000,
  };
  return keys;
}

function base64UrlDecode(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

export async function verifyAdminBearerToken(
  authHeader?: string,
  options?: {
    certsOverride?: Record<string, string>;
    fetchImpl?: typeof fetch;
  }
): Promise<{ uid: string; email?: string }> {
  const match = authHeader?.match(/^\s*Bearer\s+([A-Za-z0-9\-_\.]+)\s*$/);
  if (!match) {
    throw createAuthError('Authentication required.', 401, 'invalid_token', false);
  }

  const token = match[1];
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw createAuthError('Malformed bearer token.', 401, 'invalid_token', false);
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  let header: { alg?: string; kid?: string };
  let payload: {
    iss?: string;
    aud?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean;
  };

  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));
  } catch {
    throw createAuthError('Invalid token encoding.', 401, 'invalid_token', false);
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw createAuthError(
      'Unsupported token algorithm or missing key ID.',
      401,
      'invalid_token',
      false
    );
  }

  let certs = options?.certsOverride ?? (await getFirebasePublicCerts());
  let certPem = certs[header.kid];
  if (!certPem && !options?.certsOverride) {
    certs = await getFirebasePublicCerts(true);
    certPem = certs[header.kid];
  }
  if (!certPem) {
    throw createAuthError('Unknown signing key ID.', 401, 'invalid_token', false);
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const sigBuf = base64UrlDecode(signatureB64);
  if (!verifier.verify(certPem, sigBuf)) {
    throw createAuthError('Invalid token signature.', 401, 'invalid_token', false);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
  if (
    payload.iss !== expectedIssuer ||
    payload.aud !== FIREBASE_PROJECT_ID ||
    !payload.sub ||
    typeof payload.exp !== 'number' ||
    payload.exp <= nowSec ||
    typeof payload.iat !== 'number' ||
    payload.iat > nowSec + 300
  ) {
    throw createAuthError('Token claims invalid or expired.', 401, 'invalid_token', false);
  }

  if (payload.email_verified !== true) {
    throw createAuthError(
      'Verified email required for administrator access.',
      403,
      'email_unverified',
      true
    );
  }

  // Verify /admins/{uid} role and active flag in Firestore using caller's verified ID token
  const adminUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    FIREBASE_PROJECT_ID
  )}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents/admins/${encodeURIComponent(
    payload.sub
  )}`;
  const fetchFn = options?.fetchImpl ?? fetch;
  let adminResp: globalThis.Response;
  try {
    adminResp = await fetchFn(adminUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw createAuthError(
      'Unable to reach Firestore to verify administrator privileges.',
      503,
      'backend_error',
      true
    );
  }

  if (!adminResp.ok) {
    if (adminResp.status === 404) {
      throw createAuthError(
        'Administrator profile not found for this account.',
        403,
        'missing_admin_doc',
        true
      );
    }
    if (adminResp.status === 403) {
      throw createAuthError(
        'Firestore security rules denied access while verifying administrator permissions.',
        403,
        'permission_denied',
        true
      );
    }
    if (adminResp.status === 401) {
      throw createAuthError('Authentication token rejected by Firestore.', 401, 'invalid_token', false);
    }
    throw createAuthError(
      'Unable to verify administrator privileges right now.',
      503,
      'backend_error',
      true
    );
  }

  const adminDoc = (await adminResp.json()) as {
    fields?: {
      active?: { booleanValue?: boolean };
      role?: { stringValue?: string };
    };
  };

  const isActive = adminDoc.fields?.active?.booleanValue === true;
  if (!isActive) {
    throw createAuthError(
      'Administrator account is inactive.',
      403,
      'inactive_admin',
      true
    );
  }

  const role = adminDoc.fields?.role?.stringValue || '';
  if (!['admin', 'super_admin', 'superadmin'].includes(role)) {
    throw createAuthError(
      'Administrator role is invalid or insufficient.',
      403,
      'invalid_role',
      true
    );
  }

  return { uid: payload.sub, email: payload.email };
}

// System instructions for specialized roles
const SYSTEM_INSTRUCTIONS = {
  nutritionist: `You are "Hakim Daniyal" & the Chief Nutritionist & Sommelier at Eirvan Foods® (Natural Goodness • Better Tomorrow), Pakistan's premier dry fruits and organic superfoods brand.
You provide warm, authentic, highly knowledgeable advice on dry fruit health benefits (e.g. Kashmiri Mamra Almonds for brain & memory, Gilgit Walnuts for omega-3, Irani Pistachios for heart & hemoglobin, Ajwa & Medjool Dates for stamina, Golden Raisins, and bespoke Dry Fruit Powders for infants and elderly recovery).
Always quote Pakistani context where relevant (e.g., consumption with warm milk in winter, Sehri/Iftar benefits, daily recommended portion of 25-30g).
Be courteous, professional, encouraging, and scientifically sound. If recommending a product from Eirvan Foods, mention our 250g, 500g, and 1kg options or custom gift hampers.`,

  dietary_analyst: `You are Dr. Ayesha, Clinical Dietary & Biochemical Specialist for Eirvan Foods®.
You provide advanced clinical, macronutrient, and biochemical dietary consultations regarding dry fruits and nuts.
Provide detailed breakdowns (glycemic index, potassium/phosphorus for renal health, arginine for cardiovascular endothelium, phytosterols, fatty acid profiles, allergen warnings).
Address specific concerns such as gestational diabetes, hypertension, PCOS, athletic recovery, and high cholesterol. Maintain medical professionalism with clear, actionable dietary guidance.`,

  quick_assistant: `You are the Fast Shopping & Delivery Support Agent at Eirvan Foods® Pakistan.
You provide rapid, crisp, direct answers regarding:
- Delivery times: Lahore & Islamabad 24-48 hours; Karachi, Peshawar, Quetta, Multan, Faisalabad 2-4 business days.
- Shipping fees: Flat PKR 250 nationwide; FREE shipping on orders above PKR 3,500.
- Payment methods: Cash on Delivery (COD) nationwide, Direct Bank Transfer (Meezan Bank, HBL, Bank Alfalah), and Raast ID.
- Gift box packaging: Velvet boxes with custom calligraphy cards and satin ribbons.
- Freshness guarantee: Vacuum-sealed food-grade jars with moisture-absorbers.
Keep answers under 3 concise sentences with clear bullet points when needed.`,
};

// Local Dev Preview Only — in IONOS production, /api/* routes are handled by public_html/api/index.php -> backend/
export const handleAuthSessionRequest = async (
  req: Request,
  res: Response,
  verifierFn: typeof verifyAdminBearerToken = verifyAdminBearerToken
) => {
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
  if (!authHeader) {
    return res.status(200).json({
      success: true,
      authenticated: false,
      isAdmin: false,
      authStatus: 'unauthenticated',
      user: null,
    });
  }

  try {
    const verified = await verifierFn(authHeader);
    return res.status(200).json({
      success: true,
      authenticated: true,
      isAdmin: true,
      authStatus: 'authorized',
      user: {
        uid: verified.uid,
        email: verified.email ?? null,
        emailVerified: true,
      },
    });
  } catch (authErr: any) {
    const status = typeof authErr?.statusCode === 'number' ? authErr.statusCode : 401;
    const authStatus: ServerAuthStatus =
      typeof authErr?.authStatus === 'string' ? authErr.authStatus : 'invalid_token';
    return res.status(status).json({
      success: false,
      authenticated: Boolean(authErr?.authenticated),
      isAdmin: false,
      authStatus,
      error: authErr?.message || 'Administrator authorization required.',
      user: null,
    });
  }
};

app.get('/api/auth/session', (req, res) => handleAuthSessionRequest(req, res));

const handleChatRequest = async (req: Request, res: Response) => {
  try {
    const { messages, role = 'nutritionist' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getAiClient();

    let model = 'gemini-2.5-flash';
    if (role === 'dietary_analyst') {
      model = 'gemini-2.5-pro';
    } else if (role === 'quick_assistant') {
      model = 'gemini-2.5-flash-lite';
    }

    const systemInstruction =
      SYSTEM_INSTRUCTIONS[role as keyof typeof SYSTEM_INSTRUCTIONS] || SYSTEM_INSTRUCTIONS.nutritionist;

    const contents = messages.map((m: { role: 'user' | 'model' | 'assistant'; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || 'I apologize, but I could not formulate a response at this moment.';
    return res.json({ reply, modelUsed: model });
  } catch (error: any) {
    console.error('Error in dev /api/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate response from Gemini.',
    });
  }
};

app.post('/api/chat', handleChatRequest);
app.post('/api/ai/chat', handleChatRequest);

// Local Dev Preview Only — Admin-authenticated AI image generation endpoint
const handleGenerateImageRequest = async (req: Request, res: Response) => {
  try {
    await verifyAdminBearerToken(req.headers.authorization);
  } catch (authErr: any) {
    const status = typeof authErr?.statusCode === 'number' ? authErr.statusCode : 401;
    return res.status(status).json({
      success: false,
      error: authErr?.message || 'Administrator authorization required.',
    });
  }

  try {
    const {
      prompt,
      imageSize = '1K',
      aspectRatio = '1:1',
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }

    const ai = getAiClient();
    const validSizes = ['1K', '2K', '4K'];
    const chosenSize = validSizes.includes(imageSize) ? imageSize : '1K';
    const validRatios = ['1:1', '4:3', '16:9'];
    const chosenRatio = validRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    const enhancedPrompt = `Ultra-premium commercial product photography of artisanal luxury dry fruits and nuts packaging for Pakistani brand 'Eirvan Foods'. ${prompt.trim()}. Photorealistic, studio lighting, natural wooden trays, brass accents, vibrant natural colors, appetizing texture.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: enhancedPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: chosenRatio as '1:1' | '4:3' | '16:9',
        },
      },
    });

    let imageUrl: string | null = null;
    let descriptionText = '';

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        descriptionText += part.text;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        error: 'No image was returned by Gemini.',
        details: descriptionText,
      });
    }

    return res.json({
      success: true,
      imageUrl,
      imageSize: chosenSize,
      aspectRatio: chosenRatio,
      description: descriptionText,
    });
  } catch (error: any) {
    console.error('Error in dev /api/ai/generate-image:', error);
    const isQuota =
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('Quota exceeded');
    return res.status(isQuota ? 429 : 500).json({
      success: false,
      error: isQuota
        ? 'Free Tier Image Quota Exceeded. Image models require a paid billing API key or selection of curated studio presets.'
        : error?.message || 'Failed to generate image.',
      isQuotaExceeded: isQuota,
    });
  }
};

app.post('/api/generate-image', handleGenerateImageRequest);
app.post('/api/ai/generate-image', handleGenerateImageRequest);

// Local Dev Preview Only — Firestore-backed parity routes for admin & storefront workflows
registerPreviewApiRoutes(app, {
  projectId: FIREBASE_PROJECT_ID,
  databaseId: FIRESTORE_DATABASE_ID,
  verifyAdminBearerToken,
});

// Catch-all for any remaining unmounted routes during local Vite/Node dev preview
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'PHP backend endpoint is not mounted in Vite dev preview. Deploy to IONOS Apache/PHP or test via Apache+PHP for full /api/* routes.',
  });
});

// Setup Vite dev middleware or static serving (Node dev preview only)
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Eirvan Foods local preview server running at http://0.0.0.0:${PORT}`);
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use('/assets', express.static(path.resolve(__dirname, 'dist/assets'), {
      maxAge: '1y',
      immutable: true,
      index: false,
    }));

    app.use(express.static(path.resolve(__dirname, 'dist'), {
      maxAge: '1h',
      index: false,
    }));

    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }
}

if (process.env.EIRVAN_TEST_NO_LISTEN !== '1') {
  startServer();
}

export { app };
