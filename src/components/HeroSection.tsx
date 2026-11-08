import React from 'react';
import { useStore } from '../context/StoreContext';
import {
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  Truck,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  const { setActiveView, setSelectedCategory } = useStore();

  const handleShopNow = () => {
    setActiveView('shop');
    setSelectedCategory('all');
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleStory = () => {
    setActiveView('blog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative overflow-hidden bg-[#FBF9F4] border-b border-[#0A3D62]/10 w-full max-w-full">
      {/* Editorial Hero Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Editorial Text (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#4E9B36]/10 border border-[#4E9B36]/30 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-[#4E9B36]" />
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#0A3D62]">
                  EIRVAN FOODS · NATURAL GOODNESS
                </span>
              </div>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl text-[#0A3D62] tracking-tight leading-[1.08] font-bold"
                style={{ fontFamily: 'Cinzel, "Cormorant Garamond", Georgia, serif' }}
              >
                Nature’s Finest, Thoughtfully Gathered.
              </h1>
            </div>

            <p className="text-sm sm:text-base text-[#15222E]/80 leading-relaxed max-w-xl font-sans font-normal">
              Discover exquisitely selected dry fruits, cold stone-ground superfoods, and artisanal nutrition blends by <strong className="text-[#0A3D62]">Eirvan Foods®</strong>. From hand-cracked Kashmiri Mamra almonds to high-mountain Gilgit walnuts and authentic Madinah dates—pure wellness for a better tomorrow.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
              <button
                onClick={handleShopNow}
                className="px-7 py-4 bg-[#0A3D62] hover:bg-[#072B47] text-[#FBF9F4] font-sans text-xs uppercase tracking-widest font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              >
                <span>Explore the Collection</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#4E9B36]" />
              </button>

              <button
                onClick={handleStory}
                className="px-7 py-4 bg-white border border-[#0A3D62]/20 hover:border-[#0A3D62] text-[#0A3D62] font-sans text-xs uppercase tracking-widest font-bold rounded-xl flex items-center justify-center space-x-2 shadow-2xs transition-all cursor-pointer"
              >
                <span>Discover Our Story</span>
              </button>
            </div>

            {/* Subtle Origin Note */}
            <div className="pt-4 flex items-center space-x-2 text-xs text-[#15222E]/70">
              <span className="w-2 h-2 rounded-full bg-[#4E9B36]" />
              <span className="font-serif italic">Ethically gathered from Kashmir, Gilgit-Baltistan, Balochistan &amp; Al-Madinah</span>
            </div>
          </div>

          {/* Right Editorial Still Life (6 cols) */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Main Still Life with Clean Frame */}
              <div className="aspect-4/3 sm:aspect-5/4 rounded-3xl overflow-hidden border border-[#0A3D62]/15 shadow-xl bg-white relative">
                <picture className="w-full h-full">
                  <source srcSet="/assets/images/hero_mediterranean_pantry_mobile.webp" media="(max-width: 640px)" type="image/webp" />
                  <source srcSet="/assets/images/hero_mediterranean_pantry_1794054052086.webp" type="image/webp" />
                  <img
                    src="/assets/images/hero_mediterranean_pantry_1794054052086.jpg"
                    alt="Eirvan Foods Natural Goodness Dry Fruits Still Life"
                    width="600"
                    height="480"
                    fetchPriority="high"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </picture>

                {/* Brand emblem badge overlay */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#0A3D62]/15 text-[11px] text-[#0A3D62] shadow-sm flex items-center space-x-2">
                  <img
                    src="/assets/aistudio/Eirvan_Foods_Natural_Goodness_Logo_8d5cce5b.png"
                    alt="Eirvan Foods emblem"
                    width="24"
                    height="24"
                    decoding="async"
                    className="w-6 h-6 object-contain"
                  />
                  <span className="font-bold tracking-wider text-[10px] uppercase font-sans">100% Pure &amp; Natural</span>
                </div>

                {/* Quiet caption badge */}
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-[#FBF9F4]/95 backdrop-blur-md px-4 py-2 rounded-xl border border-[#0A3D62]/15 text-[11px] text-[#0A3D62] shadow-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#4E9B36]" />
                  <span className="font-sans font-semibold">Eirvan Foods Pantry · Natural Goodness Table</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TRUST STRIP (Max 4 items, refined line icons) */}
      <div className="border-t border-[#0A3D62]/10 bg-[#EEF5FA]/60 py-7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-white border border-[#4E9B36]/30 flex items-center justify-center shrink-0 text-[#4E9B36] shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs uppercase tracking-wider font-bold text-[#0A3D62]">
                  Carefully Selected
                </h2>
                <p className="text-[11px] text-[#15222E]/70 leading-snug">
                  Hand-inspected single-origin mountain harvests.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-white border border-[#4E9B36]/30 flex items-center justify-center shrink-0 text-[#4E9B36] shadow-xs">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs uppercase tracking-wider font-bold text-[#0A3D62]">
                  Thoughtful Packaging
                </h2>
                <p className="text-[11px] text-[#15222E]/70 leading-snug">
                  Airtight vacuum seals preserving delicate natural oils.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-white border border-[#4E9B36]/30 flex items-center justify-center shrink-0 text-[#4E9B36] shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs uppercase tracking-wider font-bold text-[#0A3D62]">
                  Convenient Ordering
                </h2>
                <p className="text-[11px] text-[#15222E]/70 leading-snug">
                  Nationwide Cash on Delivery &amp; Bank Transfer across Pakistan.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-white border border-[#4E9B36]/30 flex items-center justify-center shrink-0 text-[#4E9B36] shadow-xs">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs uppercase tracking-wider font-bold text-[#0A3D62]">
                  Customer Support
                </h2>
                <p className="text-[11px] text-[#15222E]/70 leading-snug">
                  Dedicated care helpline &amp; 7-day freshness guarantee.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
