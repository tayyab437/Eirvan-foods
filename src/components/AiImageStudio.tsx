import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/apiClient';
import {
  X,
  Sparkles,
  Download,
  Layers,
  Wand2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export const AiImageStudio: React.FC = () => {
  const { isAiStudioOpen, setIsAiStudioOpen, isAdminUser, signInWithGoogle } = useStore();

  const [prompt, setPrompt] = useState(
    'Artisanal handcrafted olive wood dry fruit tray, overflowing with sun-cured Kashmiri Mamra almonds, jumbo cashews, green pistachios, and fresh Ajwa dates, bathed in warm Mediterranean morning sunlight'
  );
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:3' | '16:9'>('1:1');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAiStudioOpen) return null;

  const samplePrompts = [
    'Artisanal handcrafted olive wood dry fruit tray, overflowing with sun-cured Kashmiri Mamra almonds, jumbo cashews, and Ajwa dates dressed in linen cloth',
    'Deep olive green six-compartment keepsake box with brass hardware, filled with roasted Balochistan chilgoza, snow-white walnuts, and golden raisins',
    'Modern gourmet pantry amber glass canisters with stone-ground Shahi Panjiri powder and blanched almond flour in warm natural raking sunlight',
    'Festive Eid dry fruit banquet table on antique engraved brass tray with ceramic tea vessels and sliced fresh dates',
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
    if (!isAdminUser) {
      setErrorMsg('Administrator sign-in is required to generate AI images.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await apiRequest<{ imageUrl: string }>('/api/ai/generate-image', {
        method: 'POST',
        requireAuth: true,
        body: {
          prompt,
          imageSize,
          aspectRatio,
        },
      });

      setGeneratedImage(data.imageUrl);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : 'Image generation failed. Please try again or adjust your prompt.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `eirvan_pantry_visualizer_${imageSize.toLowerCase()}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#072B47]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white border border-[#0A3D62]/20 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#0A3D62] text-[#FBF9F4] flex items-center justify-between border-b border-[#072B47]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#C6842D]" />
            </div>
            <div>
              <h3 className="font-serif text-lg tracking-wide text-white">
                Eirvan Studio Visualizer (4K Ultra Quality)
              </h3>
              <p className="text-xs text-[#EEF5FA]/80 font-sans font-light">
                Photorealistic botanical rendering &amp; hamper styling in 1K, 2K, or 4K resolution
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiStudioOpen(false)}
            className="p-1.5 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
          {/* Controls Form */}
          <div className="space-y-5">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#15222E]/70 block mb-1.5">
                Visual Concept Prompt:
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your desired botanical arrangement, wooden keepsake hamper, lighting, travertine stone surfaces..."
                className="w-full text-xs p-3.5 border border-[#0A3D62]/20 rounded-xl bg-[#FBF9F4] text-[#15222E] focus:outline-hidden focus:border-[#0A3D62] leading-relaxed font-sans"
              />
            </div>

            {/* Quick Inspiration Chips */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#15222E]/50 block mb-2">
                Curated Concept Presets:
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(p)}
                    className="w-full text-left text-[11px] p-2.5 bg-[#EEF5FA] hover:bg-[#0A3D62]/10 rounded-xl text-[#15222E]/80 transition-colors line-clamp-2 cursor-pointer border border-[#0A3D62]/10 font-light"
                  >
                    &quot;{p}&quot;
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Affordance (1K, 2K, 4K) */}
            <div className="p-4 bg-[#FBF9F4] border border-[#0A3D62]/15 rounded-xl">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-serif text-[#0A3D62] flex items-center space-x-1.5 font-bold">
                  <Layers className="w-3.5 h-3.5 text-[#C6842D]" />
                  <span>Resolution Affordance (High Quality Output):</span>
                </label>
                <span className="text-[10px] font-mono text-[#15222E]/50">Gemini 2.5 Flash Image</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['1K', '2K', '4K'] as const).map((size) => {
                  const isSel = imageSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setImageSize(size)}
                      className={`py-2 px-3 border rounded-xl text-center transition-all cursor-pointer font-mono ${
                        isSel
                          ? 'border-[#0A3D62] bg-[#0A3D62] text-white shadow-xs'
                          : 'border-gray-200 bg-white text-[#15222E] hover:border-[#0A3D62]'
                      }`}
                    >
                      <div className="text-sm font-bold">{size}</div>
                      <div className={`text-[10px] ${isSel ? 'text-[#4E9B36]' : 'text-[#15222E]/50'}`}>
                        {size === '1K' ? '1024 px' : size === '2K' ? '2048 px' : '4096 px'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#15222E]/70 block mb-1.5">
                Aspect Ratio:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['1:1', '4:3', '16:9'] as const).map((ratio) => {
                  const isSel = aspectRatio === ratio;
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 px-3 border rounded-xl text-xs font-mono text-center transition-all cursor-pointer ${
                        isSel
                          ? 'border-[#0A3D62] bg-[#0A3D62] text-white shadow-xs font-bold'
                          : 'border-gray-200 bg-white text-[#15222E] hover:border-[#0A3D62]'
                      }`}
                    >
                      {ratio === '1:1' ? 'Square (1:1)' : ratio === '4:3' ? 'Classic (4:3)' : 'Wide (16:9)'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit button / Admin Guard */}
            {!isAdminUser ? (
              <div className="p-4 bg-[#EEF5FA] border border-[#0A3D62]/20 rounded-xl space-y-3 text-xs text-[#15222E]">
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-[#0A3D62] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#0A3D62]">Staff Administrator Required</p>
                    <p className="text-[11px] text-[#15222E]/70 mt-0.5 leading-relaxed">
                      Custom AI rendering is restricted to verified store administrators. You may preview or download curated 4K studio scenes on the right at any time.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signInWithGoogle()}
                  className="w-full py-2.5 bg-[#0A3D62] hover:bg-[#072B47] text-white rounded-xl font-mono text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Admin Sign-In with Google
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={loading || !prompt.trim()}
                onClick={() => handleGenerate()}
                className="w-full py-3.5 bg-[#0A3D62] hover:bg-[#072B47] text-white rounded-xl font-mono text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#4E9B36]" />
                    <span>Synthesizing {imageSize} Dry Fruit Asset...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-[#C6842D]" />
                    <span>Generate {imageSize} High-Res Visual</span>
                  </>
                )}
              </button>
            )}

            {errorMsg && (
              <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs space-y-2 font-sans">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
                <div className="pt-1 text-[11px] text-amber-800">
                  <p className="font-semibold">💡 Instant Studio Fallback Active:</p>
                  <p className="mt-0.5">You can select any of our high-res 4K Eirvan Foods studio photography presets on the right to preview, style, and download immediately.</p>
                </div>
              </div>
            )}
          </div>

          {/* Image Result Display */}
          <div className="flex flex-col items-center justify-center bg-[#FBF9F4] border border-[#0A3D62]/15 rounded-2xl p-5 relative overflow-hidden min-h-[340px]">
            {loading ? (
              <div className="text-center p-6 space-y-3">
                <div className="w-12 h-12 border-2 border-[#0A3D62] border-t-[#4E9B36] rounded-full animate-spin mx-auto" />
                <h4 className="font-serif text-lg text-[#0A3D62] font-bold">
                  Rendering {imageSize} Botanical Composition
                </h4>
                <p className="text-xs text-[#15222E]/70 max-w-xs leading-relaxed font-light">
                  Synthesizing photorealistic nutty textures, oil luster, warm wood grain, and Mediterranean light...
                </p>
              </div>
            ) : generatedImage ? (
              <div className="w-full h-full flex flex-col items-center justify-between space-y-3">
                <div className="w-full flex-1 overflow-hidden bg-white border border-[#0A3D62]/15 rounded-xl relative group">
                  <img
                    src={generatedImage}
                    alt="Generated dry fruits hamper"
                    className="w-full h-full object-contain max-h-[380px]"
                  />
                  <div className="absolute top-2 right-2 bg-[#0A3D62]/90 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs">
                    {imageSize} • {aspectRatio}
                  </div>
                </div>

                <div className="w-full flex items-center space-x-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 bg-[#0A3D62] hover:bg-[#072B47] text-white rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#4E9B36]" />
                    <span>Download {imageSize} File</span>
                  </button>
                  <button
                    onClick={() => handleGenerate()}
                    className="p-2.5 bg-white border border-[#0A3D62]/20 rounded-xl hover:bg-[#EEF5FA] text-[#0A3D62] transition-colors cursor-pointer"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full text-center space-y-4">
                <div className="p-4 bg-white rounded-xl border border-[#0A3D62]/15 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-[#C6842D]" />
                  <p className="text-xs font-mono uppercase tracking-wider text-[#0A3D62] font-bold">
                    Eirvan 4K Studio Presets
                  </p>
                  <p className="text-[11px] max-w-xs mx-auto leading-relaxed font-light text-[#15222E]/70">
                    Select a high-res studio scene below or generate custom compositions using Gemini AI.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <div
                    onClick={() => setGeneratedImage('/assets/images/luxury_olive_gift_box_1794054054136.webp')}
                    className="p-2 bg-white rounded-xl border border-[#0A3D62]/15 hover:border-[#0A3D62] cursor-pointer transition-colors group"
                  >
                    <div className="aspect-4/3 rounded-lg overflow-hidden mb-1.5 bg-gray-100">
                      <img src="/assets/images/luxury_olive_gift_box_1794054054136.webp" alt="Artisan Olive Gift Chest" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <span className="text-[11px] font-bold text-[#0A3D62] block truncate">Olive Keepsake Chest</span>
                    <span className="text-[10px] text-[#4E9B36] font-mono">4K Studio Capture</span>
                  </div>

                  <div
                    onClick={() => setGeneratedImage('/assets/images/hero_mediterranean_pantry_1794054052086.webp')}
                    className="p-2 bg-white rounded-xl border border-[#0A3D62]/15 hover:border-[#0A3D62] cursor-pointer transition-colors group"
                  >
                    <div className="aspect-4/3 rounded-lg overflow-hidden mb-1.5 bg-gray-100">
                      <img src="/assets/images/hero_mediterranean_pantry_1794054052086.webp" alt="Mediterranean Pantry Table" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <span className="text-[11px] font-bold text-[#0A3D62] block truncate">Mediterranean Table</span>
                    <span className="text-[10px] text-[#4E9B36] font-mono">4K Studio Capture</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

