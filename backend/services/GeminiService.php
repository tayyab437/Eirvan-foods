<?php
declare(strict_types=1);

namespace Eirvan\Services;

use RuntimeException;

/**
 * Proxies Gemini API REST calls securely from the IONOS PHP backend.
 */
final class GeminiService
{
    private string $apiKey;
    private LoggerService $logger;

    private const SYSTEM_INSTRUCTIONS = [
        'nutritionist' => "You are \"Hakim Daniyal\" & the Chief Nutritionist & Sommelier at Eirvan Foods® (Natural Goodness • Better Tomorrow), Pakistan's premier dry fruits and organic superfoods brand.\nYou provide warm, authentic, highly knowledgeable advice on dry fruit health benefits (e.g. Kashmiri Mamra Almonds for brain & memory, Gilgit Walnuts for omega-3, Irani Pistachios for heart & hemoglobin, Ajwa & Medjool Dates for stamina, Golden Raisins, and bespoke Dry Fruit Powders for infants and elderly recovery).\nAlways quote Pakistani context where relevant (e.g., consumption with warm milk in winter, Sehri/Iftar benefits, daily recommended portion of 25-30g).\nBe courteous, professional, encouraging, and scientifically sound. If recommending a product from Eirvan Foods, mention our 250g, 500g, and 1kg options or custom gift hampers.",
        'dietary_analyst' => "You are Dr. Ayesha, Clinical Dietary & Biochemical Specialist for Eirvan Foods®.\nYou provide advanced clinical, macronutrient, and biochemical dietary consultations regarding dry fruits and nuts.\nProvide detailed breakdowns (glycemic index, potassium/phosphorus for renal health, arginine for cardiovascular endothelium, phytosterols, fatty acid profiles, allergen warnings).\nAddress specific concerns such as gestational diabetes, hypertension, PCOS, athletic recovery, and high cholesterol. Maintain medical professionalism with clear, actionable dietary guidance.",
        'quick_assistant' => "You are the Fast Shopping & Delivery Support Agent at Eirvan Foods® Pakistan.\nYou provide rapid, crisp, direct answers regarding:\n- Delivery times: Lahore & Islamabad 24-48 hours; Karachi, Peshawar, Quetta, Multan, Faisalabad 2-4 business days.\n- Shipping fees: Flat PKR 250 nationwide; FREE shipping on orders above PKR 3,500.\n- Payment methods: Cash on Delivery (COD) nationwide, Direct Bank Transfer (Meezan Bank, HBL, Bank Alfalah), and Raast ID.\n- Gift box packaging: Velvet boxes with custom calligraphy cards and satin ribbons.\n- Freshness guarantee: Vacuum-sealed food-grade jars with moisture-absorbers.\nKeep answers under 3 concise sentences with clear bullet points when needed.",
    ];

    public function __construct(string $apiKey, LoggerService $logger)
    {
        $this->apiKey = trim($apiKey);
        $this->logger = $logger;
    }

    public function chat(array $messages, string $role = 'nutritionist'): array
    {
        if ($this->apiKey === '') {
            throw new RuntimeException('AI service is not configured on the server.');
        }

        $model = match ($role) {
            'dietary_analyst' => 'gemini-2.5-pro',
            'quick_assistant' => 'gemini-2.5-flash-lite',
            default => 'gemini-2.5-flash',
        };

        $instruction = self::SYSTEM_INSTRUCTIONS[$role] ?? self::SYSTEM_INSTRUCTIONS['nutritionist'];

        $contents = [];
        foreach ($messages as $m) {
            $contents[] = [
                'role' => ($m['role'] === 'assistant' || $m['role'] === 'model') ? 'model' : 'user',
                'parts' => [['text' => (string) $m['content']]],
            ];
        }

        $payload = [
            'systemInstruction' => [
                'parts' => [['text' => $instruction]],
            ],
            'contents' => $contents,
        ];

        $res = $this->callGemini($model, $payload);
        $reply = '';
        foreach ((array) ($res['candidates'][0]['content']['parts'] ?? []) as $part) {
            if (!empty($part['text'])) {
                $reply .= (string) $part['text'];
            }
        }

        return [
            'reply' => $reply !== '' ? $reply : 'I apologize, but I could not formulate a response at this moment.',
            'modelUsed' => $model,
        ];
    }

    public function generateImage(string $prompt, string $imageSize = '1K', string $aspectRatio = '1:1'): array
    {
        if ($this->apiKey === '') {
            throw new RuntimeException('AI image service is not configured on the server.');
        }

        $validSizes = ['1K', '2K', '4K'];
        $chosenSize = in_array($imageSize, $validSizes, true) ? $imageSize : '1K';
        $validRatios = ['1:1', '4:3', '16:9'];
        $chosenRatio = in_array($aspectRatio, $validRatios, true) ? $aspectRatio : '1:1';

        $enhancedPrompt = "Ultra-premium commercial product photography of artisanal luxury dry fruits and nuts packaging for Pakistani brand 'Eirvan Foods'. "
            . $prompt
            . '. Photorealistic, 8k resolution, elegant studio lighting, natural wooden trays, brass accents, vibrant natural colors, appetizing texture, no artificial look.';

        $candidateModels = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];
        $lastQuota = false;

        foreach ($candidateModels as $modelName) {
            try {
                $imageConfig = ['aspectRatio' => $chosenRatio];
                if ($modelName === 'gemini-3-pro-image-preview') {
                    $imageConfig['imageSize'] = $chosenSize;
                }

                $res = $this->callGemini($modelName, [
                    'contents' => [
                        ['parts' => [['text' => $enhancedPrompt]]],
                    ],
                    'generationConfig' => [
                        'responseModalities' => ['TEXT', 'IMAGE'],
                        'imageConfig' => $imageConfig,
                    ],
                ], 45);

                $imageUrl = null;
                $description = '';
                foreach ((array) ($res['candidates'][0]['content']['parts'] ?? []) as $part) {
                    if (!empty($part['inlineData']['data'])) {
                        $mime = (string) ($part['inlineData']['mimeType'] ?? 'image/png');
                        $imageUrl = 'data:' . $mime . ';base64,' . $part['inlineData']['data'];
                    } elseif (!empty($part['text'])) {
                        $description .= (string) $part['text'];
                    }
                }

                if ($imageUrl !== null) {
                    return [
                        'imageUrl' => $imageUrl,
                        'imageSize' => $chosenSize,
                        'aspectRatio' => $chosenRatio,
                        'description' => $description,
                    ];
                }
            } catch (RuntimeException $e) {
                if (str_contains($e->getMessage(), 'QUOTA_EXCEEDED')) {
                    $lastQuota = true;
                }
            }
        }

        if ($lastQuota) {
            throw new RuntimeException('QUOTA_EXCEEDED');
        }
        throw new RuntimeException('No image was returned by the studio service.');
    }

    private function callGemini(string $model, array $payload, int $timeout = 25): array
    {
        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent',
            rawurlencode($model)
        );

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-goog-api-key: ' . $this->apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}',
        ]);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false) {
            $this->logger->error('gemini_network_error', ['model' => $model]);
            throw new RuntimeException('Upstream AI service network error.');
        }

        $decoded = json_decode((string) $raw, true);
        if ($status === 429 || (isset($decoded['error']['status']) && $decoded['error']['status'] === 'RESOURCE_EXHAUSTED')) {
            throw new RuntimeException('QUOTA_EXCEEDED');
        }
        if ($status >= 400 || !is_array($decoded)) {
            $this->logger->warning('gemini_http_error', [
                'model' => $model,
                'status' => $status,
            ]);
            throw new RuntimeException('AI generation request failed.');
        }

        return $decoded;
    }
}
