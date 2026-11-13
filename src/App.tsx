import React, { useState, useMemo, lazy, Suspense } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { CategoryGrid } from './components/CategoryGrid';
import { ProductCard } from './components/ProductCard';
import { UnboxingGallery } from './components/UnboxingGallery';
import { Routes, Route, useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';

const ProductDetailModal = lazy(() => import('./components/ProductDetailModal').then(m => ({ default: m.ProductDetailModal })));
const CartDrawer = lazy(() => import('./components/CartDrawer').then(m => ({ default: m.CartDrawer })));
const WhatsAppButton = lazy(() => import('./components/WhatsAppButton').then(m => ({ default: m.WhatsAppButton })));
const GiftBoxBuilder = lazy(() => import('./components/GiftBoxBuilder').then(m => ({ default: m.GiftBoxBuilder })));
const AiImageStudio = lazy(() => import('./components/AiImageStudio').then(m => ({ default: m.AiImageStudio })));
const AiSommelierChat = lazy(() => import('./components/AiSommelierChat').then(m => ({ default: m.AiSommelierChat })));
const CheckoutView = lazy(() => import('./components/CheckoutView').then(m => ({ default: m.CheckoutView })));
const OrderTrackingView = lazy(() => import('./components/OrderTrackingView').then(m => ({ default: m.OrderTrackingView })));
const BlogView = lazy(() => import('./components/BlogView').then(m => ({ default: m.BlogView })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const CustomMixBuilder = lazy(() => import('./components/CustomMixBuilder').then(m => ({ default: m.CustomMixBuilder })));
const WholesaleForm = lazy(() => import('./components/WholesaleForm'));
const GiftWizard = lazy(() => import('./components/GiftWizard'));

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

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const HomeView: React.FC = () => {
  const { products, setIsGiftWizardOpen } = useStore();
  const bestSellers = products.filter((p) => p.bestSeller);
  const navigate = useNavigate();

  return (
    <div className="space-y-24 sm:space-y-32 w-full max-w-full overflow-x-hidden">
      <HeroSection />
      <CategoryGrid />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E7DDCA] gap-4">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#302A25]">
              Most Cherished Winter Harvests
            </h2>
          </div>
          <button
            onClick={() => navigate('/shop')}
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
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div>
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
                <p className="text-[11px] text-[#302A25]/60 mt-1 font-light">Harvested from verified mountain micro-groves.</p>
              </div>
              <div>
                <h3 className="font-serif text-base text-[#344B36]">Zero Bleach</h3>
                <p className="text-[11px] text-[#302A25]/60 mt-1 font-light">Raw natural shell color and intact essential oils.</p>
              </div>
              <div>
                <h3 className="font-serif text-base text-[#344B36]">Cold Milled</h3>
                <p className="text-[11px] text-[#302A25]/60 mt-1 font-light">Stone-ground Panjiri kept below 35°C to preserve enzymes.</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/blog')}
                className="inline-flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#344B36] hover:text-[#B96F50] transition-colors cursor-pointer group"
              >
                <span>Read The Sourcing Chronicles</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FFFFFF] border border-[#E7DDCA] p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div>
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
                <p className="text-[11px] text-[#302A25]/70 mt-1.5 leading-relaxed font-light">One warm spoon stirred into saffron almond milk for daylong cognitive focus.</p>
              </div>
              <div className="p-4 bg-[#F7F4EC] border border-[#E7DDCA]/70">
                <h3 className="font-serif text-base text-[#344B36]">Toddler Nutrition</h3>
                <p className="text-[11px] text-[#302A25]/70 mt-1.5 leading-relaxed font-light">Gentle protein and healthy fats without refined sugar or grain fillers.</p>
              </div>
              <div className="p-4 bg-[#F7F4EC] border border-[#E7DDCA]/70">
                <h3 className="font-serif text-base text-[#344B36]">Culinary Dusting</h3>
                <p className="text-[11px] text-[#302A25]/70 mt-1.5 leading-relaxed font-light">Artisan pistachio and cashew powder over traditional halwas and yogurts.</p>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/shop/powders')}
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

      {/* FAQs */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl sm:text-4xl text-[#302A25]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-[#302A25]/70 mt-2 font-light">
            Essential details regarding our sourcing origins, cold milling, packaging, and delivery in Pakistan.
          </p>
        </div>
        <div className="space-y-3">
          {[
            { q: 'How do you guarantee freshness during nationwide shipment?', a: 'All our nuts and powders are packaged in vacuum-sealed food-grade tins or airtight amber glass jars with oxygen and moisture absorbers.' },
            { q: 'What is the delivery timeline for Pakistani cities?', a: 'Orders within Lahore and Islamabad/Rawalpindi are delivered within 24 to 48 hours. Nationwide in 2 to 4 business days.' },
            { q: 'What payment options are available?', a: 'We offer Cash on Delivery (COD), Bank Transfer, and Raast ID.' },
          ].map((faq, idx) => (
            <div key={idx} className="bg-white border border-[#E7DDCA] overflow-hidden">
              <div className="p-5 font-serif text-base text-[#302A25] border-b border-[#E7DDCA]/50">{faq.q}</div>
              <div className="px-5 py-4 text-xs text-[#302A25]/75 leading-relaxed font-light">{faq.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Unboxing Reviews Gallery */}
      <UnboxingGallery />

      {/* Gift Wizard Trigger Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#244C37] rounded-[2.5rem] p-8 sm:p-16 overflow-hidden relative border border-[#B69A62]/30 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#B69A62]/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#B69A62]/5 rounded-full blur-2xl -ml-32 -mb-32"></div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-[10px] font-mono uppercase tracking-[0.2em]">
                <Sparkles className="w-3.5 h-3.5 text-[#B69A62]" />
                <span>Personalized Gifting</span>
              </div>
              
              <h2 className="text-4xl sm:text-6xl font-serif font-bold text-white leading-tight">
                Not sure what to <span className="text-[#B69A62]">gift?</span>
              </h2>
              
              <p className="text-lg text-white/70 max-w-md leading-relaxed">
                Whether it's a corporate event, a wedding favor, or a healthy gesture for a loved one, our AI-powered gift concierge will help you find the perfect match.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <button 
                  onClick={() => setIsGiftWizardOpen(true)}
                  className="px-10 py-5 bg-[#B69A62] hover:bg-[#D4AF37] text-[#244C37] rounded-2xl font-bold transition-all shadow-xl hover:shadow-[#B69A62]/20 flex items-center gap-3 active:scale-95 group"
                >
                  <Gift className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Help Me Choose
                </button>
                <button 
                  onClick={() => navigate('/wholesale')}
                  className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/20"
                >
                  Corporate Orders
                </button>
              </div>
            </div>
            
            <div className="hidden lg:block relative">
              <div className="aspect-square bg-[#F7F4EC]/5 rounded-full p-12 animate-pulse-slow">
                <img 
                  src="/assets/images/luxury_olive_gift_box_1794054054136.webp" 
                  alt="Premium Gift Hamper" 
                  className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] rotate-[-6deg]"
                />
              </div>
              <div className="absolute top-1/2 left-0 -translate-x-12 -translate-y-1/2 bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl">
                 <div className="flex gap-1 text-[#B69A62] mb-2">
                   <Star className="w-3 h-3 fill-current" />
                   <Star className="w-3 h-3 fill-current" />
                   <Star className="w-3 h-3 fill-current" />
                   <Star className="w-3 h-3 fill-current" />
                   <Star className="w-3 h-3 fill-current" />
                 </div>
                 <p className="text-white font-serif text-sm italic">"The perfect wedding gift!"</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="bg-[#E7DDCA] p-10 sm:p-16 text-center border border-[#D5C9B3] space-y-5">
          <h2 className="font-serif text-3xl sm:text-5xl text-[#302A25] max-w-2xl mx-auto leading-tight">
            Stock Your Kitchen with Pure Mountain Harvests
          </h2>
          <p className="text-xs sm:text-sm text-[#302A25]/70 max-w-xl mx-auto leading-relaxed font-light">
            From cold winter evenings by the hearth to everyday morning rituals, enjoy single-origin dry fruits delivered nationwide.
          </p>
          <div className="pt-3">
            <button
              onClick={() => navigate('/shop')}
              className="px-8 py-4 bg-[#344B36] hover:bg-[#2C3E2E] text-[#F7F4EC] font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              Explore The Full Collection
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const ShopView: React.FC = () => {
  const { categoryId = 'all' } = useParams<{ categoryId: string }>();
  const { products, categories } = useStore();
  const navigate = useNavigate();

  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(18000);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory = categoryId === 'all' || p.category === categoryId;
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
  }, [products, categoryId, maxPriceFilter, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="font-serif text-3xl sm:text-5xl text-[#302A25]">
          The Complete Dry Fruits Pantry
        </h1>
      </div>

      <div className="flex border-b border-[#E7DDCA] space-x-6 overflow-x-auto pb-3 mb-10 text-xs font-mono uppercase tracking-wider w-full max-w-full">
        {categories.map((cat) => {
          const isSel = categoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => navigate(`/shop/${cat.id}`)}
              className={`pb-3 transition-all cursor-pointer whitespace-nowrap shrink-0 relative ${
                isSel ? 'text-[#344B36] font-bold border-b-2 border-[#344B36]' : 'text-[#302A25]/60 hover:text-[#302A25]'
              }`}
            >
              <span>{cat.name}</span>
              <span className="ml-1.5 text-[10px] text-[#B69A62]">({cat.count})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E7DDCA] mb-10 gap-4 text-xs font-mono">
        <div className="flex items-center space-x-6">
          <span className="text-[#302A25]/60">Showing <strong className="text-[#302A25]">{filteredProducts.length}</strong> items</span>
          <div className="hidden sm:flex items-center space-x-3">
            <span className="text-[#302A25]/50">Max Price:</span>
            <input type="range" min="1000" max="18000" step="500" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(Number(e.target.value))} className="accent-[#344B36] cursor-pointer" />
            <span className="font-bold text-[#344B36]">Rs. {maxPriceFilter.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[#302A25]/50">Sort By:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2 border border-[#E7DDCA] bg-white text-xs font-mono text-[#302A25]">
            <option value="featured">Featured Collection</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-[#E7DDCA] p-8 space-y-4">
          <h3 className="font-serif text-xl text-[#302A25]">No products match this selection</h3>
          <button onClick={() => navigate('/shop/all')} className="px-6 py-2.5 bg-[#344B36] text-[#F7F4EC] text-xs font-mono uppercase tracking-wider cursor-pointer">Reset Filters</button>
        </div>
      )}
    </div>
  );
};

import { ProductPageView } from './components/ProductPageView';

const ProductPage: React.FC = () => {
  return <ProductPageView />;
};

const MainContent: React.FC = () => {
  const {
    isAiSommelierOpen,
    isAiStudioOpen,
    isGiftWizardOpen,
    setIsGiftWizardOpen,
  } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EC] w-full max-w-full overflow-x-hidden">
      <ScrollToTop />
      <Navbar />

      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/shop" element={<ShopView />} />
          <Route path="/shop/:categoryId" element={<ShopView />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/gift-builder" element={<Suspense fallback={<div className="p-20 text-center">Loading...</div>}><GiftBoxBuilder /></Suspense>} />
          <Route path="/select-ingredients" element={<Suspense fallback={<div className="p-20 text-center">Loading...</div>}><CustomMixBuilder /></Suspense>} />
          <Route path="/custom-mix" element={<Suspense fallback={<div className="p-20 text-center">Loading...</div>}><CustomMixBuilder /></Suspense>} />
          <Route path="/blog" element={<Suspense fallback={<div className="p-20 text-center">Loading...</div>}><BlogView /></Suspense>} />
          <Route path="/track" element={<Suspense fallback={<div className="p-20 text-center">Loading...</div>}><OrderTrackingView /></Suspense>} />
          <Route path="/checkout" element={<Suspense fallback={<div className="p-20 text-center">Loading...</div>}><CheckoutView /></Suspense>} />
          <Route path="/wholesale" element={<Suspense fallback={<div className="p-20 text-center">Loading...</div>}><WholesaleForm /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<div className="p-20 text-center">Loading...</div>}><AdminDashboard /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Modals & Overlays */}
      <Suspense fallback={null}>
        <ProductDetailModal />
        <CartDrawer />
        {isAiStudioOpen && <AiImageStudio />}
        {isAiSommelierOpen && <AiSommelierChat />}
        {isGiftWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="absolute inset-0" onClick={() => setIsGiftWizardOpen(false)}></div>
            <div className="relative z-10 w-full max-w-xl">
              <button 
                onClick={() => setIsGiftWizardOpen(false)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 font-bold"
              >
                Close <span className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">×</span>
              </button>
              <GiftWizard />
            </div>
          </div>
        )}
        <WhatsAppButton />
      </Suspense>

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

