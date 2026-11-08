import React, { useState, useMemo, lazy, Suspense } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { CategoryGrid } from './components/CategoryGrid';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { WhatsAppButton } from './components/WhatsAppButton';

// Lazy-loaded secondary components for code-splitting & reduced initial JS bundle size
const GiftBoxBuilder = lazy(() => import('./components/GiftBoxBuilder').then(m => ({ default: m.GiftBoxBuilder })));
const AiImageStudio = lazy(() => import('./components/AiImageStudio').then(m => ({ default: m.AiImageStudio })));
const AiSommelierChat = lazy(() => import('./components/AiSommelierChat').then(m => ({ default: m.AiSommelierChat })));
const CheckoutView = lazy(() => import('./components/CheckoutView').then(m => ({ default: m.CheckoutView })));
const OrderTrackingView = lazy(() => import('./components/OrderTrackingView').then(m => ({ default: m.OrderTrackingView })));
const BlogView = lazy(() => import('./components/BlogView').then(m => ({ default: m.BlogView })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import {
  Sparkles,
  ShoppingBag,
  Gift,
  ArrowRight,
  ChevronDown,
  Star,
  CheckCircle2,
  Calendar,
  Clock,
  Feather,
  Compass,
} from 'lucide-react';

const MainContent: React.FC = () => {
  const {
    products,
    categories,
    activeView,
    setActiveView,
    selectedCategory,
    setSelectedCategory,
    setIsAiSommelierOpen,
    setIsAiStudioOpen,
    blogs,
  } = useStore();

  // Shop filter and sort state
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(18000);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Filtered and sorted products for shop
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory =
          selectedCategory === 'all' || p.category === selectedCategory;
        const matchesPrice = (p.variants[0].salePrice || p.variants[0].price) <= maxPriceFilter;
        return matchesCategory && matchesPrice;
      })
      .sort((a, b) => {
        const priceA = a.variants[0].salePrice || a.variants[0].price;
        const priceB = b.variants[0].salePrice || b.variants[0].price;
        if (sortBy === 'price-low') return priceA - priceB;
        if (sortBy === 'price-high') return priceB - priceA;
        if (sortBy === 'rating') return b.rating - a.rating;
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [products, selectedCategory, maxPriceFilter, sortBy]);

  const bestSellers = products.filter((p) => p.bestSeller);

  const faqs = [
    {
      q: 'How do you guarantee freshness during nationwide shipment?',
      a: 'All our nuts and powders are packaged in vacuum-sealed food-grade tins or airtight amber glass jars with oxygen and moisture absorbers. Even during peak summer temperatures across Karachi, Multan, or Sukkur, the nuts arrive with optimum natural oil retention and crispness.',
    },
    {
      q: 'What is the delivery timeline for Pakistani cities?',
      a: 'Orders within Lahore and Islamabad/Rawalpindi are delivered within 24 to 48 hours. Shipments to Karachi, Peshawar, Quetta, Multan, Faisalabad, and other nationwide destinations are dispatched via express courier (TCS / Leopard) and typically arrive in 2 to 4 business days.',
    },
    {
      q: 'What payment options are available?',
      a: 'We offer Cash on Delivery (COD) nationwide without any extra surcharge. You can also settle your order via Direct Bank Transfer (Meezan Bank, HBL, Bank Alfalah) or through the State Bank of Pakistan Raast instant mobile payment service.',
    },
    {
      q: 'Can I customize gift boxes for weddings or corporate events?',
      a: 'Yes! Use our interactive "Artisan Gift Box Builder" to select keepsake wooden boxes or olive linen gift hampers, choose 4 to 6 dry fruit jars, select satin ribbon colors, and add personalized calligraphy greeting notes. For large corporate bulk orders, reach out via WhatsApp at +92 317 6369458.',
    },
    {
      q: 'How are Kashmiri Mamra almonds different from regular almonds?',
      a: 'Kashmiri Mamra almonds are 100% non-GMO mountain almonds hand-cracked in Kashmir. They contain over 52% natural almond oil—more than double that of commercial Californian varieties—making them the premier choice for brain health, memory, and traditional morning vitality.',
    },
    {
      q: 'What is your return policy?',
      a: 'We stand firmly behind our mountain harvests with a 7-day hassle-free freshness guarantee. If any dry fruit is sour, bitter, or damaged in transit, our customer care concierge will dispatch a free replacement or issue a full refund immediately.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EC] w-full max-w-full overflow-x-hidden">
      <Navbar />

      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {/* VIEW 1: HOME */}
        {activeView === 'home' && (
          <div className="space-y-24 sm:space-y-32 w-full max-w-full overflow-x-hidden">
            {/* Section 1 & 2: Hero & Trust Strip */}
            <HeroSection />

            {/* Section 3: Shop by Collection */}
            <CategoryGrid />

            {/* Section 4: Bestsellers / Customer Favourites */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E7DDCA] gap-4">
                <div>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#B69A62] block mb-1.5">
                    Customer Favourites
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl text-[#302A25]">
                    Most Cherished Winter Harvests
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setActiveView('shop');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-xs font-mono uppercase tracking-wider text-[#344B36] hover:text-[#B96F50] flex items-center space-x-1.5 transition-colors cursor-pointer group"
                >
                  <span>Explore Full Collection</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {bestSellers.slice(0, 4).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>

            {/* Section 5: Editorial Brand Story ("A Little Closer to Nature") */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                <div className="lg:col-span-6 relative">
                  <div className="aspect-4/3 sm:aspect-5/4 overflow-hidden border border-[#E7DDCA] shadow-lg bg-white">
                    <img
                      src="/assets/images/editorial_brand_story_1794054052483.webp"
                      alt="Artisanal hands selecting sun-cured nuts and dates on olive wood"
                      className="w-full h-full object-cover hover:scale-102 transition-transform duration-700"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="absolute bottom-2 right-2 sm:bottom-0 sm:right-0 lg:-bottom-5 lg:-right-5 hidden sm:block bg-[#344B36] text-[#F7F4EC] p-5 max-w-xs shadow-xl border border-[#2C3E2E]">
                    <span className="font-serif text-sm tracking-wide block italic">
                      &quot;Nature does not hurry, yet everything is accomplished.&quot;
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#B69A62] block mt-1">
                      — Sourcing Credo
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-6">
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono tracking-widest uppercase text-[#B69A62] block">
                      Our Sourcing Philosophy
                    </span>
                    <h2 className="font-serif text-3xl sm:text-5xl text-[#302A25] leading-tight">
                      A Little Closer to Nature.
                    </h2>
                  </div>

                  <p className="text-sm sm:text-base text-[#302A25]/75 leading-relaxed font-light">
                    From the sun-drenched terraced groves of Gilgit and Swat to the ancient orchards of Kashmir and the arid palm oases of Madinah, our harvests are gathered with patience and reverence.
                  </p>

                  <p className="text-xs sm:text-sm text-[#302A25]/70 leading-relaxed font-light">
                    We believe in letting pure mountain earth, glacial streams, and unhurried sunshine speak for themselves—free from chemical bleaching, sulfur sprays, or synthetic glosses.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E7DDCA]">
                    <div>
                      <h3 className="font-serif text-base text-[#344B36]">100% Single-Origin</h3>
                      <p className="text-[11px] text-[#302A25]/60 mt-1 font-light">
                        Harvested from verified mountain micro-groves.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-serif text-base text-[#344B36]">Zero Bleach</h3>
                      <p className="text-[11px] text-[#302A25]/60 mt-1 font-light">
                        Raw natural shell color and intact essential oils.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-serif text-base text-[#344B36]">Cold Milled</h3>
                      <p className="text-[11px] text-[#302A25]/60 mt-1 font-light">
                        Stone-ground Panjiri kept below 35°C to preserve enzymes.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setActiveView('blog');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#344B36] hover:text-[#B96F50] transition-colors cursor-pointer group"
                    >
                      <span>Read The Sourcing Chronicles</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6: Dry Fruit Powders Feature ("Goodness, Made Versatile") */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-[#FFFFFF] border border-[#E7DDCA] p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono tracking-widest uppercase text-[#B69A62] block">
                      Ancient Kitchen Craft
                    </span>
                    <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#302A25] leading-tight">
                      Goodness, Made Versatile.
                    </h2>
                  </div>

                  <p className="text-sm sm:text-base text-[#302A25]/75 leading-relaxed font-light">
                    Stone-ground dry fruit powders offer a gentle, nutrient-dense way to enrich daily nourishment. Effortlessly blended into warm morning cardamom milk, folded into wholewheat doughs, or whisked for growing toddlers and nursing mothers.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-3">
                    <div className="p-4 bg-[#F7F4EC] border border-[#E7DDCA]/70">
                      <h3 className="font-serif text-base text-[#344B36]">Morning Vitality</h3>
                      <p className="text-[11px] text-[#302A25]/70 mt-1.5 leading-relaxed font-light">
                        One warm spoon stirred into saffron almond milk for daylong cognitive focus.
                      </p>
                    </div>

                    <div className="p-4 bg-[#F7F4EC] border border-[#E7DDCA]/70">
                      <h3 className="font-serif text-base text-[#344B36]">Toddler Nutrition</h3>
                      <p className="text-[11px] text-[#302A25]/70 mt-1.5 leading-relaxed font-light">
                        Gentle protein and healthy fats without refined sugar or grain fillers.
                      </p>
                    </div>

                    <div className="p-4 bg-[#F7F4EC] border border-[#E7DDCA]/70">
                      <h3 className="font-serif text-base text-[#344B36]">Culinary Dusting</h3>
                      <p className="text-[11px] text-[#302A25]/70 mt-1.5 leading-relaxed font-light">
                        Artisan pistachio and cashew powder over traditional halwas and yogurts.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setSelectedCategory('powders');
                        setActiveView('shop');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-7 py-3.5 bg-[#344B36] hover:bg-[#2C3E2E] text-[#F7F4EC] text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-xs inline-flex items-center space-x-2"
                    >
                      <span>Explore Stone-Ground Powders</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="aspect-4/3 sm:aspect-square overflow-hidden border border-[#E7DDCA] shadow-md bg-[#F7F4EC]">
                    <img
                      src="/assets/images/dry_fruit_powders_culinary_1794054053020.webp"
                      alt="Golden stone-ground dry fruit powder dusting a wooden spoon over cardamom almond milk"
                      className="w-full h-full object-cover hover:scale-102 transition-transform duration-700"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 7: Ingredient Stories / Botanical Provenance */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#B69A62] block mb-2">
                  Botanical Provenance
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#302A25]">
                  Purity Rooted in Altitude &amp; Sunlight
                </h2>
                <p className="text-xs sm:text-sm text-[#302A25]/70 mt-2 font-light">
                  Each harvest reflects the distinctive microclimate of its terroir, harvested by family farmers across generations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-white border border-[#E7DDCA] space-y-3 hover:border-[#344B36]/60 transition-colors">
                  <div className="w-9 h-9 bg-[#F7F4EC] border border-[#E7DDCA] flex items-center justify-center font-mono text-xs text-[#344B36]">
                    01
                  </div>
                  <h3 className="font-serif text-lg text-[#302A25]">Kashmiri Mamra Almonds</h3>
                  <p className="text-xs font-mono text-[#B69A62]">Kashmir Valley · Hand-Cracked</p>
                  <p className="text-xs text-[#302A25]/70 leading-relaxed font-light">
                    Renowned for over 52% essential almond oil, delivering natural warmth and sharp mental clarity.
                  </p>
                </div>

                <div className="p-6 bg-white border border-[#E7DDCA] space-y-3 hover:border-[#344B36]/60 transition-colors">
                  <div className="w-9 h-9 bg-[#F7F4EC] border border-[#E7DDCA] flex items-center justify-center font-mono text-xs text-[#344B36]">
                    02
                  </div>
                  <h3 className="font-serif text-lg text-[#302A25]">Gilgit Snow Walnuts</h3>
                  <p className="text-xs font-mono text-[#B69A62]">Gilgit-Baltistan · Glacial Streams</p>
                  <p className="text-xs text-[#302A25]/70 leading-relaxed font-light">
                    Sourced from high-altitude Himalayan groves, yielding pale butter-soft kernels rich in plant Omega-3 ALA.
                  </p>
                </div>

                <div className="p-6 bg-white border border-[#E7DDCA] space-y-3 hover:border-[#344B36]/60 transition-colors">
                  <div className="w-9 h-9 bg-[#F7F4EC] border border-[#E7DDCA] flex items-center justify-center font-mono text-xs text-[#344B36]">
                    03
                  </div>
                  <h3 className="font-serif text-lg text-[#302A25]">Balochistan Chilgoza</h3>
                  <p className="text-xs font-mono text-[#B69A62]">Sulaiman Mountains · Wild Harvest</p>
                  <p className="text-xs text-[#302A25]/70 leading-relaxed font-light">
                    Wild-foraged pine nuts toasted in fine river sand, providing deep resinous sweetness and vital dietary zinc.
                  </p>
                </div>

                <div className="p-6 bg-white border border-[#E7DDCA] space-y-3 hover:border-[#344B36]/60 transition-colors">
                  <div className="w-9 h-9 bg-[#F7F4EC] border border-[#E7DDCA] flex items-center justify-center font-mono text-xs text-[#344B36]">
                    04
                  </div>
                  <h3 className="font-serif text-lg text-[#302A25]">Madinah Sacred Ajwa</h3>
                  <p className="text-xs font-mono text-[#B69A62]">Madinah Al-Munawwarah · Sun-Cured</p>
                  <p className="text-xs text-[#302A25]/70 leading-relaxed font-light">
                    Soft, velvety black dates revered for digestive balance, heart vitality, and ancient sun-cured sweetness.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 8: Premium Gift Collections ("Thoughtful Gifts, Beautifully Presented") */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-[#344B36] text-[#F7F4EC] border border-[#2C3E2E] grid grid-cols-1 lg:grid-cols-12 items-center">
                <div className="p-8 sm:p-12 lg:p-16 lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center space-x-2 text-[11px] font-mono tracking-widest uppercase text-[#B69A62]">
                    <Gift className="w-3.5 h-3.5" />
                    <span>Bespoke Pantry Gifting</span>
                  </div>

                  <h2 className="font-serif text-3xl sm:text-5xl text-[#F7F4EC] leading-tight">
                    Thoughtful Gifts, Beautifully Presented.
                  </h2>

                  <p className="text-sm sm:text-base text-[#E7DDCA]/85 leading-relaxed font-light max-w-xl">
                    Celebrations, wedding tokens, and corporate gestures deserve presentation as extraordinary as the harvests within. Choose handcrafted keepsake boxes upholstered in deep olive linen, sealed with antique brass clasps, and personalized with handwritten calligraphy cards.
                  </p>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <button
                      onClick={() => {
                        setActiveView('gift-builder');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-7 py-3.5 bg-[#B69A62] hover:bg-[#A38955] text-[#344B36] font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-xs inline-flex items-center space-x-2"
                    >
                      <span>Build Custom Gift Box</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setIsAiStudioOpen(true)}
                      className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-[#F7F4EC] border border-white/20 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center space-x-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#B69A62]" />
                      <span>AI 4K Box Visualizer</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 h-full min-h-[320px] lg:min-h-[460px] relative overflow-hidden">
                  <img
                    src="/assets/images/luxury_olive_gift_box_1794054054136.webp"
                    alt="Luxury deep olive green matte gift box with cream label and brass ribbon"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </section>

            {/* Section 9: Customer Testimonials / Revered Pantry Reviews */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#B69A62] block mb-2">
                  Patron Reflections
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#302A25]">
                  Words from Our Table to Yours
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-white border border-[#E7DDCA] space-y-4">
                  <div className="flex text-[#B69A62] space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-[#302A25]/80 leading-relaxed font-light italic">
                    &quot;The Kashmiri Mamra almonds are visibly oil-rich with a sweet crunch unlike any commercial store almond. The vacuum seal kept them as crisp as harvest day.&quot;
                  </p>
                  <div className="pt-2 border-t border-[#E7DDCA]/60">
                    <h3 className="font-serif text-sm text-[#302A25] font-semibold">Dr. Zainab K.</h3>
                    <p className="text-[11px] font-mono text-[#302A25]/50">Model Town, Lahore</p>
                  </div>
                </div>

                <div className="p-8 bg-white border border-[#E7DDCA] space-y-4">
                  <div className="flex text-[#B69A62] space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-[#302A25]/80 leading-relaxed font-light italic">
                    &quot;We ordered 45 bespoke olive keepsake boxes for our corporate Eid gifts. The brass fittings and single-origin walnuts were praised by every single recipient.&quot;
                  </p>
                  <div className="pt-2 border-t border-[#E7DDCA]/60">
                    <h3 className="font-serif text-sm text-[#302A25] font-semibold">Hamza Farooq</h3>
                    <p className="text-[11px] font-mono text-[#302A25]/50">Blue Area, Islamabad</p>
                  </div>
                </div>

                <div className="p-8 bg-white border border-[#E7DDCA] space-y-4">
                  <div className="flex text-[#B69A62] space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-[#302A25]/80 leading-relaxed font-light italic">
                    &quot;The stone-ground Shahi Panjiri is a staple in our home now. Completely sugar-free, fragrant with cardamom, and pure restorative nourishment.&quot;
                  </p>
                  <div className="pt-2 border-t border-[#E7DDCA]/60">
                    <h3 className="font-serif text-sm text-[#302A25] font-semibold">Mariam Tariq</h3>
                    <p className="text-[11px] font-mono text-[#302A25]/50">Clifton, Karachi</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 10: Educational Journal Preview */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E7DDCA] gap-4">
                <div>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#B69A62] block mb-1.5">
                    The Pantry Journal
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl text-[#302A25]">
                    Readings in Nutrition &amp; Seasonality
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setActiveView('blog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-xs font-mono uppercase tracking-wider text-[#344B36] hover:text-[#B96F50] flex items-center space-x-1.5 transition-colors cursor-pointer group"
                >
                  <span>Visit The Journal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {blogs.slice(0, 3).map((post) => (
                  <article
                    key={post.id}
                    onClick={() => {
                      setActiveView('blog');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white border border-[#E7DDCA] overflow-hidden hover:border-[#344B36]/60 transition-all flex flex-col cursor-pointer group"
                  >
                    <div className="aspect-16/10 overflow-hidden bg-[#F7F4EC]">
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-3 text-[10px] font-mono text-[#302A25]/50 mb-2">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-[#B69A62]" />
                            <span>{post.date}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-[#B69A62]" />
                            <span>{post.readTime}</span>
                          </span>
                        </div>
                        <h3 className="font-serif text-lg text-[#302A25] group-hover:text-[#344B36] transition-colors leading-snug mb-2">
                          {post.title}
                        </h3>
                        <p className="text-xs text-[#302A25]/70 line-clamp-2 leading-relaxed font-light">
                          {post.excerpt}
                        </p>
                      </div>
                      <div className="pt-4 mt-4 border-t border-[#E7DDCA]/60 flex items-center justify-between text-xs font-mono text-[#344B36]">
                        <span className="text-[11px] text-[#302A25]/50">By {post.author}</span>
                        <span className="inline-flex items-center space-x-1 group-hover:text-[#B96F50] transition-colors">
                          <span>Read</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Section 11: Frequently Asked Questions */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#B69A62] block mb-1.5">
                  Guidance &amp; Clarifications
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#302A25]">
                  Frequently Asked Questions
                </h2>
                <p className="text-xs sm:text-sm text-[#302A25]/70 mt-2 font-light">
                  Essential details regarding our sourcing origins, cold milling, packaging, and delivery in Pakistan.
                </p>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="bg-white border border-[#E7DDCA] overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full text-left p-5 flex items-center justify-between font-serif text-base text-[#302A25] hover:text-[#344B36] transition-colors cursor-pointer"
                      >
                        <span className="pr-4">{faq.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#B69A62] shrink-0 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 text-xs text-[#302A25]/75 leading-relaxed border-t border-[#E7DDCA]/50 pt-3 font-light">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 12: Final Conversion Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-[#E7DDCA] p-10 sm:p-16 text-center border border-[#D5C9B3] space-y-5">
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#344B36]">
                  The Mediterranean Pantry Experience
                </span>
                <h2 className="font-serif text-3xl sm:text-5xl text-[#302A25] max-w-2xl mx-auto leading-tight">
                  Stock Your Kitchen with Pure Mountain Harvests
                </h2>
                <p className="text-xs sm:text-sm text-[#302A25]/70 max-w-xl mx-auto leading-relaxed font-light">
                  From cold winter evenings by the hearth to everyday morning rituals, enjoy single-origin dry fruits, fresh Panjiri, and artisan gift hampers delivered nationwide.
                </p>
                <div className="pt-3">
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setActiveView('shop');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-8 py-4 bg-[#344B36] hover:bg-[#2C3E2E] text-[#F7F4EC] font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                  >
                    Explore The Full Collection
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: FULL SHOP CATALOG */}
        {activeView === 'shop' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Shop Breadcrumbs & Header */}
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#B69A62] block mb-2">
                Pantry Catalogue
              </span>
              <h1 className="font-serif text-3xl sm:text-5xl text-[#302A25]">
                The Complete Dry Fruits Pantry
              </h1>
              <p className="text-xs sm:text-sm text-[#302A25]/70 mt-3 leading-relaxed font-light">
                Single-origin nuts, restorative trail medleys, stone-ground Panjiri powders, and keepsake gift boxes with nationwide Cash on Delivery.
              </p>
            </div>

            {/* Zero-Pill Category Tabs */}
            <div className="flex border-b border-[#E7DDCA] space-x-6 overflow-x-auto pb-3 mb-10 text-xs font-mono uppercase tracking-wider w-full max-w-full">
              {categories.map((cat) => {
                const isSel = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`pb-3 transition-all cursor-pointer whitespace-nowrap shrink-0 relative ${
                      isSel
                        ? 'text-[#344B36] font-bold border-b-2 border-[#344B36]'
                        : 'text-[#302A25]/60 hover:text-[#302A25]'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="ml-1.5 text-[10px] text-[#B69A62]">({cat.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Sorting & Price Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E7DDCA] mb-10 gap-4 text-xs font-mono">
              <div className="flex items-center space-x-6">
                <span className="text-[#302A25]/60">
                  Showing <strong className="text-[#302A25]">{filteredProducts.length}</strong> items
                </span>

                <div className="hidden sm:flex items-center space-x-3">
                  <span className="text-[#302A25]/50">Max Price:</span>
                  <input
                    type="range"
                    min="1000"
                    max="18000"
                    step="500"
                    value={maxPriceFilter}
                    onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                    className="accent-[#344B36] cursor-pointer"
                  />
                  <span className="font-bold text-[#344B36]">
                    Rs. {maxPriceFilter.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-[#302A25]/50">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-[#E7DDCA] bg-white text-xs font-mono text-[#302A25] focus:outline-hidden focus:border-[#344B36]"
                >
                  <option value="featured">Featured Collection</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white border border-[#E7DDCA] p-8 space-y-4">
                <ShoppingBag className="w-12 h-12 text-[#B69A62] mx-auto stroke-1" />
                <h3 className="font-serif text-xl text-[#302A25]">
                  No products match this selection
                </h3>
                <p className="text-xs text-[#302A25]/60 font-light">
                  Try adjusting the maximum price filter or switching to another category.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setMaxPriceFilter(18000);
                  }}
                  className="px-6 py-2.5 bg-[#344B36] text-[#F7F4EC] text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: CUSTOM GIFT BUILDER */}
        {activeView === 'gift-builder' && (
          <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center font-sans text-xs text-[#0A3D62] font-semibold">Loading Gift Builder...</div>}>
            <GiftBoxBuilder />
          </Suspense>
        )}

        {/* VIEW 4: HEALTH GUIDES / BLOG */}
        {activeView === 'blog' && (
          <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center font-sans text-xs text-[#0A3D62] font-semibold">Loading Health & Culinary Journal...</div>}>
            <BlogView />
          </Suspense>
        )}

        {/* VIEW 5: ORDER TRACKING */}
        {activeView === 'track' && (
          <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center font-sans text-xs text-[#0A3D62] font-semibold">Loading Order Tracker...</div>}>
            <OrderTrackingView />
          </Suspense>
        )}

        {/* VIEW 6: CHECKOUT */}
        {activeView === 'checkout' && (
          <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center font-sans text-xs text-[#0A3D62] font-semibold">Preparing Secure Checkout...</div>}>
            <CheckoutView />
          </Suspense>
        )}

        {/* VIEW 7: ADMIN DASHBOARD */}
        {activeView === 'admin' && (
          <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center font-sans text-xs text-[#0A3D62] font-semibold">Loading Admin Portal...</div>}>
            <AdminDashboard />
          </Suspense>
        )}
      </main>

      {/* Global Modals & Overlays */}
      <ProductDetailModal />
      <CartDrawer />
      <Suspense fallback={null}>
        <AiImageStudio />
        <AiSommelierChat />
      </Suspense>
      <WhatsAppButton />

      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainContent />
    </StoreProvider>
  );
}

