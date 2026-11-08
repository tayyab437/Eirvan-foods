import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { settings, setActiveView, setSelectedCategory } = useStore();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim() && newsletterEmail.includes('@')) {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
    }
  };

  const navigateTo = (view: any, cat = 'all') => {
    setActiveView(view);
    setSelectedCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0A3D62] text-[#FBF9F4] border-t border-[#072B47] mt-24 w-full max-w-full overflow-x-hidden">
      {/* Refined Trust Bar */}
      <div className="border-b border-white/10 py-10 bg-[#072B47]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-full bg-[#4E9B36]/20 border border-[#4E9B36]/40 flex items-center justify-center shrink-0 mt-0.5">
              <Truck className="w-5 h-5 text-[#4E9B36]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-[#FBF9F4]">Nationwide Delivery</h2>
              <p className="text-xs text-[#EEF5FA]/80 mt-1 leading-relaxed">24–48h in Lahore & ICT • Cash on Delivery nationwide</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-full bg-[#4E9B36]/20 border border-[#4E9B36]/40 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-[#4E9B36]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-[#FBF9F4]">100% Single-Origin</h2>
              <p className="text-xs text-[#EEF5FA]/80 mt-1 leading-relaxed">Pristine harvests, zero bleaching or artificial glazes</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-full bg-[#4E9B36]/20 border border-[#4E9B36]/40 flex items-center justify-center shrink-0 mt-0.5">
              <RotateCcw className="w-5 h-5 text-[#4E9B36]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-[#FBF9F4]">Freshness Guarantee</h2>
              <p className="text-xs text-[#EEF5FA]/80 mt-1 leading-relaxed">Airtight canisters & nitrogen-flushed seal packaging</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-full bg-[#4E9B36]/20 border border-[#4E9B36]/40 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-[#4E9B36]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-[#FBF9F4]">Direct Farm Sourcing</h2>
              <p className="text-xs text-[#EEF5FA]/80 mt-1 leading-relaxed">Gilgit, Kashmir, Swat Valley & Balochistan groves</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0 border border-white/20">
                <img
                  src="/assets/aistudio/Eirvan_Foods_Natural_Goodness_Logo_8d5cce5b.png"
                  alt="Eirvan Foods - Natural Goodness • Better Tomorrow"
                  width="56"
                  height="56"
                  decoding="async"
                  loading="lazy"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-baseline space-x-1.5">
                  <span
                    className="text-2xl font-bold tracking-wide text-white"
                    style={{ fontFamily: 'Cinzel, Georgia, serif' }}
                  >
                    EIRVAN
                  </span>
                  <span className="text-sm font-sans font-extrabold text-[#EEF5FA] tracking-wider uppercase">
                    FOODS
                  </span>
                  <span className="text-xs text-[#4E9B36] font-mono">®</span>
                </div>
                <span className="block text-[10px] font-sans font-semibold text-[#4E9B36] tracking-[0.2em] uppercase">
                  Natural Goodness • Better Tomorrow
                </span>
              </div>
            </div>

            <p className="text-sm text-[#EEF5FA]/85 leading-relaxed pr-4 font-light">
              {settings.tagline}. Curating pure mountain harvests and sun-cured botanicals—from hand-cracked Kashmiri Mamra almonds and snow-white Gilgit walnuts to cold-stone dry fruit nutrition powders and sacred Madinah Ajwa dates.
            </p>

            <div className="space-y-2.5 pt-2 text-xs text-[#EEF5FA]/90">
              <div className="flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-[#4E9B36] shrink-0 mt-0.5" />
                <span className="text-xs text-[#EEF5FA]">Boutique Experience Center: Gulberg III & DHA Phase 5, Lahore, Pakistan</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Phone className="w-4 h-4 text-[#4E9B36] shrink-0" />
                <span className="text-xs text-[#EEF5FA]">Helpline: {settings.contactPhone} • WhatsApp: {settings.whatsappNumber}</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-[#4E9B36] shrink-0" />
                <span className="text-xs text-[#EEF5FA]">{settings.contactEmail}</span>
              </div>
            </div>
          </div>

          {/* Sourcing & Categories */}
          <div>
            <h2 className="font-serif text-base tracking-wide text-[#C6842D] mb-4">
              Pantry Collections
            </h2>
            <ul className="space-y-2.5 text-xs text-[#EEF5FA] tracking-wide">
              <li>
                <button
                  onClick={() => navigateTo('shop', 'mixed')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Mixed Trail Medleys
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop', 'nuts')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Mamra Almonds & Cashews
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop', 'powders')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Stone-Ground Nut Powders
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop', 'dates-raisins')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Ajwa Dates & Golden Raisins
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('gift-builder')}
                  className="hover:text-white transition-colors cursor-pointer text-[#4E9B36] font-semibold text-left flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-[#C6842D]" />
                  <span>Artisan Gift Boxes</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Service & Policies */}
          <div>
            <h2 className="font-serif text-base tracking-wide text-[#C6842D] mb-4">
              Care & Guidance
            </h2>
            <ul className="space-y-2.5 text-xs text-[#EEF5FA] tracking-wide">
              <li>
                <button
                  onClick={() => navigateTo('track')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Track Courier Order
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('blog')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  The Pantry Journal
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Cash on Delivery Protocol
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Freshness & Return Guarantee
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('admin')}
                  className="text-xs text-[#4E9B36] hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <span>Operations & Hosting Center</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h2 className="font-serif text-base tracking-wide text-[#C6842D] mb-4">
              Seasonal Harvest Alerts
            </h2>
            <p className="text-xs text-[#EEF5FA]/80 mb-3.5 leading-relaxed font-light">
              Receive notifications when fresh seasonal batches arrive—Chilgoza pine nuts, freshly stone-ground panjiri, and bespoke holiday collections.
            </p>

            {newsletterSubscribed ? (
              <div className="bg-[#072B47] p-3.5 border border-[#4E9B36]/40 text-xs text-[#4E9B36] flex items-center space-x-2 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-[#4E9B36] shrink-0" />
                <span>Shukriya! You are subscribed to harvest dispatches.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Your email address"
                    required
                    className="w-full bg-[#072B47] text-white text-xs px-3.5 py-2.5 border border-white/20 rounded-xl focus:outline-hidden focus:border-[#4E9B36] placeholder:text-[#EEF5FA]/50 font-sans"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bottom-1 bg-[#4E9B36] text-white px-2.5 rounded-lg flex items-center justify-center hover:bg-[#3d7c2a] transition-colors cursor-pointer"
                    aria-label="Subscribe"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] text-[#EEF5FA]/50 block">No promotional spam. Strictly harvest alerts.</span>
              </form>
            )}

            {/* Direct Bank Transfer & Raast */}
            <div className="mt-5 pt-4 border-t border-white/10 text-[11px] text-[#EEF5FA]/80 space-y-1">
              <p className="font-semibold text-[#C6842D] tracking-wider uppercase text-[10px]">Payment Channels Accepted</p>
              <p className="text-xs">Cash on Delivery (COD) • Raast Instant • Direct Bank Transfer</p>
              <p className="text-[10px] text-[#EEF5FA]/60 font-mono">{settings.bankDetails.bankName} (Raast ID: {settings.bankDetails.raastId})</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#EEF5FA]/60 space-y-4 sm:space-y-0">
          <p className="font-light">
            © {new Date().getFullYear()} Eirvan Foods (Pvt) Ltd. All rights reserved. Registered with Punjab Food Authority (PFA).
          </p>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>Currency: PKR (Pakistani Rupees)</span>
            <span>•</span>
            <span className="text-[#4E9B36] font-medium">Artisanal Sourcing Across Pakistan</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
