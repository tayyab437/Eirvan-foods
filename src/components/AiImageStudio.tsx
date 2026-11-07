import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  Sparkles,
  Download,
  Layers,
  Wand2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const AiImageStudio: React.FC = () => {
  const { isAiStudioOpen, setIsAiStudioOpen } = useStore();

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

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageSize, // Affordance for 1K, 2K, 4K
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image from Gemini.');
      }

      setGeneratedImage(data.imageUrl);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || 'Image generation failed. Please try again or adjust your prompt.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `zauq_pantry_visualizer_${imageSize.toLowerCase()}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#302A25]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#FFFFFF] border border-[#E7DDCA] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#344B36] text-[#F7F4EC] flex items-center justify-between border-b border-[#2C3E2E]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#B69A62]/20 border border-[#B69A62]/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#B69A62]" />
            </div>
            <div>
              <h3 className="font-serif text-lg tracking-wide text-[#F7F4EC]">
                Studio Visualizer (gemini-3-pro-image-preview)
              </h3>
              <p className="text-xs text-[#E7DDCA]/80 font-light">
                Photorealistic botanical rendering & hamper styling in 1K, 2K, or 4K resolution
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiStudioOpen(false)}
            className="p-1.5 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#FFFFFF]">
          {/* Controls Form */}
          <div className="space-y-5">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#302A25]/70 block mb-1.5">
                Visual Concept Prompt:
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your desired botanical arrangement, wooden keepsake hamper, lighting, travertine stone surfaces..."
                className="w-full text-xs p-3.5 border border-[#E7DDCA] bg-[#F7F4EC] text-[#302A25] focus:outline-hidden focus:border-[#344B36] leading-relaxed font-sans"
              />
            </div>

            {/* Quick Inspiration Chips */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#302A25]/50 block mb-2">
                Curated Concept Presets:
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(p)}
                    className="w-full text-left text-[11px] p-2.5 bg-[#F7F4EC] hover:bg-[#E7DDCA]/60 text-[#302A25]/80 transition-colors line-clamp-2 cursor-pointer border border-[#E7DDCA]/70 font-light"
                  >
                    &quot;{p}&quot;
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Affordance (1K, 2K, 4K) */}
            <div className="p-4 bg-[#F7F4EC] border border-[#E7DDCA]">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-serif text-[#344B36] flex items-center space-x-1.5 font-bold">
                  <Layers className="w-3.5 h-3.5 text-[#B69A62]" />
                  <span>Resolution Affordance (High Quality Output):</span>
                </label>
                <span className="text-[10px] font-mono text-[#302A25]/50">gemini-3-pro-image-preview</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['1K', '2K', '4K'] as const).map((size) => {
                  const isSel = imageSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setImageSize(size)}
                      className={`py-2 px-3 border text-center transition-all cursor-pointer font-mono ${
                        isSel
                          ? 'border-[#344B36] bg-[#344B36] text-[#F7F4EC]'
                          : 'border-[#E7DDCA] bg-white text-[#302A25] hover:border-[#344B36]'
                      }`}
                    >
                      <div className="text-sm font-bold">{size}</div>
                      <div className={`text-[10px] ${isSel ? 'text-[#B69A62]' : 'text-[#302A25]/50'}`}>
                        {size === '1K' ? '1024 px' : size === '2K' ? '2048 px' : '4096 px'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#302A25]/70 block mb-1.5">
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
                      className={`py-2 px-3 border text-xs font-mono text-center transition-all cursor-pointer ${
                        isSel
                          ? 'border-[#344B36] bg-[#344B36] text-[#F7F4EC]'
                          : 'border-[#E7DDCA] bg-white text-[#302A25] hover:border-[#344B36]'
                      }`}
                    >
                      {ratio === '1:1' ? 'Square (1:1)' : ratio === '4:3' ? 'Classic (4:3)' : 'Wide (16:9)'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="button"
              disabled={loading || !prompt.trim()}
              onClick={() => handleGenerate()}
              className="w-full py-3.5 bg-[#344B36] hover:bg-[#2C3E2E] text-[#F7F4EC] font-mono text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#B69A62]" />
                  <span>Synthesizing {imageSize} Dry Fruit Asset...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-[#B69A62]" />
                  <span>Generate {imageSize} High-Res Visual</span>
                </>
              )}
            </button>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Image Result Display */}
          <div className="flex flex-col items-center justify-center bg-[#F7F4EC] border border-[#E7DDCA] p-5 relative overflow-hidden min-h-[340px]">
            {loading ? (
              <div className="text-center p-6 space-y-3">
                <div className="w-12 h-12 border-2 border-[#344B36] border-t-[#B69A62] rounded-full animate-spin mx-auto" />
                <h4 className="font-serif text-lg text-[#302A25]">
                  Rendering {imageSize} Botanical Composition
                </h4>
                <p className="text-xs text-[#302A25]/60 max-w-xs leading-relaxed font-light">
                  Synthesizing photorealistic nutty textures, oil luster, warm wood grain, and Mediterranean light...
                </p>
              </div>
            ) : generatedImage ? (
              <div className="w-full h-full flex flex-col items-center justify-between space-y-3">
                <div className="w-full flex-1 overflow-hidden bg-white border border-[#E7DDCA] relative group">
                  <img
                    src={generatedImage}
                    alt="Generated dry fruits hamper"
                    className="w-full h-full object-contain max-h-[380px]"
                  />
                  <div className="absolute top-2 right-2 bg-[#302A25]/85 text-[#F7F4EC] text-[10px] font-mono px-2 py-0.5 backdrop-blur-xs">
                    {imageSize} • {aspectRatio}
                  </div>
                </div>

                <div className="w-full flex items-center space-x-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 bg-[#344B36] hover:bg-[#2C3E2E] text-[#F7F4EC] text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#B69A62]" />
                    <span>Download {imageSize} File</span>
                  </button>
                  <button
                    onClick={() => handleGenerate()}
                    className="p-2.5 bg-white border border-[#E7DDCA] hover:bg-[#F7F4EC] text-[#302A25] transition-colors cursor-pointer"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 space-y-2 text-[#302A25]/40">
                <Sparkles className="w-10 h-10 mx-auto text-[#B69A62]/50 stroke-1" />
                <p className="text-xs font-mono uppercase tracking-wider text-[#302A25]">
                  Ready for synthesis
                </p>
                <p className="text-[11px] max-w-xs leading-relaxed font-light text-[#302A25]/60">
                  Select your resolution tier (1K, 2K, or 4K) and generate studio-grade visuals for packaging and gift inspirations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

