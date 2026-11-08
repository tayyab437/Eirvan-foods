import express, { Request, Response } from 'express';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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


// Initialize GoogleGenAI SDK
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

// Chat endpoint supporting multi-turn conversation and model selection
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, role = 'nutritionist' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getAiClient();

    // Model selection based on requirements:
    // - Complex tasks: gemini-4-argon
    // - General tasks: gemini-3.8-flash
    // - Fast tasks: gemini-3.1-flash-lite
    let model = 'gemini-3.8-flash';
    if (role === 'dietary_analyst') {
      model = 'gemini-4-argon';
    } else if (role === 'quick_assistant') {
      model = 'gemini-3.1-flash-lite';
    } else {
      model = 'gemini-3.8-flash';
    }

    const systemInstruction = SYSTEM_INSTRUCTIONS[role as keyof typeof SYSTEM_INSTRUCTIONS] || SYSTEM_INSTRUCTIONS.nutritionist;

    // Format message history for generateContent
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
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate response from Gemini.',
    });
  }
});

// Image generation endpoint with resolution affordance (1K, 2K, 4K)
app.post('/api/generate-image', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      imageSize = '1K', // 1K, 2K, or 4K
      aspectRatio = '1:1',
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const ai = getAiClient();

    const validSizes = ['1K', '2K', '4K'];
    const chosenSize = validSizes.includes(imageSize) ? imageSize : '1K';

    const enhancedPrompt = `Ultra-premium commercial product photography of artisanal luxury dry fruits and nuts packaging for Pakistani brand 'Eirvan Foods'. ${prompt}. Photorealistic, 8k resolution, elegant studio lighting, natural wooden trays, brass accents, vibrant natural colors, appetizing texture, no artificial look.`;

    const candidateModels = ['gemini-3-pro-image', 'gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];
    let lastError: any = null;
    let imageUrl: string | null = null;
    let descriptionText = '';

    for (const modelName of candidateModels) {
      try {
        const config: any = {
          imageConfig: {
            aspectRatio: aspectRatio as any,
          },
        };

        if (modelName !== 'gemini-3.1-flash-lite-image') {
          config.imageConfig.imageSize = chosenSize;
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                text: enhancedPrompt,
              },
            ],
          },
          config,
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          } else if (part.text) {
            descriptionText += part.text;
          }
        }

        if (imageUrl) {
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} image generation failed:`, err?.message);
        lastError = err;
      }
    }

    if (!imageUrl) {
      const isQuota = lastError?.message?.includes('429') || lastError?.message?.includes('RESOURCE_EXHAUSTED') || lastError?.message?.includes('Quota exceeded');
      return res.status(isQuota ? 429 : 500).json({
        error: isQuota
          ? 'Free Tier Image Quota Exceeded. Image models require a paid billing API key or selection of curated studio presets.'
          : lastError?.message || 'No image was returned by Gemini.',
        isQuotaExceeded: isQuota,
        details: descriptionText,
      });
    }

    return res.json({
      imageUrl,
      imageSize: chosenSize,
      aspectRatio,
      description: descriptionText,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-image:', error);
    const isQuota = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('Quota exceeded');
    return res.status(isQuota ? 429 : 500).json({
      error: isQuota
        ? 'Free Tier Image Quota Exceeded. Image models require a paid billing API key or selection of curated studio presets.'
        : error?.message || 'Failed to generate image.',
      isQuotaExceeded: isQuota,
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Optimized caching for immutable hashed assets
    app.use('/assets', express.static(path.resolve(__dirname, 'dist/assets'), {
      maxAge: '1y',
      immutable: true,
      index: false
    }));

    // Standard static serving for other files (index.html, manifest, icons, robots)
    app.use(express.static(path.resolve(__dirname, 'dist'), {
      maxAge: '1h', // Short cache for root files to allow updates
      index: false
    }));

    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Eirvan Foods platform running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
