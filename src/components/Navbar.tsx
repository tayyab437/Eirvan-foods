import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  ShoppingBag,
  Heart,
  Search,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Menu,
  X,
  Phone,
  Package,
  Gift,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    cart,
    wishlist,
    products,
    settings,
    activeView,
    setActiveView,
    selectedCategory,
    setSelectedCategory,
    setSelectedProduct,
    setIsCartOpen,
    setIsAiSommelierOpen,
    setIsAiStudioOpen,
  } = useStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Search filtered suggestions
  const searchResults = searchInput.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchInput.toLowerCase()) ||
            p.shortDescription.toLowerCase().includes(searchInput.toLowerCase()) ||
            p.categoryLabel.toLowerCase().includes(searchInput.toLowerCase()) ||
            (p.urduName && p.urduName.includes(searchInput))
        )
        .slice(0, 5)
    : [];

  const handleNavClick = (view: any, category = 'all') => {
    setActiveView(view);
    setSelectedCategory(category);
    setMobileMenuOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F4]/95 backdrop-blur-md border-b border-[#D8E6F0] transition-colors shadow-2xs w-full max-w-full">
      {/* 3.1 Announcement Bar */}
      {settings.announcementActive && (
        <div className="bg-[#0A3D62] text-[#FBF9F4] py-2 px-4 text-xs font-medium tracking-wide border-b border-[#072B47]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              <span className="text-[10px] uppercase tracking-widest text-[#58A838] font-bold font-sans">
                Eirvan Dispatch:
              </span>
              <span className="truncate text-[#FBF9F4]/95 font-sans">
                {settings.announcementBarMessage}
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-xs text-[#EDF4F9]">
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 hover:text-[#58A838] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#58A838]" />
                <span>Concierge: {settings.whatsappNumber}</span>
              </a>
              <button
                onClick={() => handleNavClick('track')}
                className="hover:text-[#58A838] transition-colors cursor-pointer"
              >
                Track Consignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.2 Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4 lg:gap-6 w-full">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg text-[#0A3D62] hover:bg-[#EEF5FA] transition-colors shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Logo & Brand Identity (Zone 1) with Official Eirvan Foods Logo Asset */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center space-x-1.5 sm:space-x-2.5 cursor-pointer group shrink-0"
          >
            <div className="h-9 sm:h-12 flex items-center justify-center shrink-0">
              <img
                src="/assets/aistudio/Eirvan_Foods_Natural_Goodness_Logo_8d5cce5b.png"
                alt="Eirvan Foods - Natural Goodness • Better Tomorrow"
                width="240"
                height="56"
                decoding="async"
                className="h-9 sm:h-12 w-auto object-contain drop-shadow-xs group-hover:scale-102 transition-transform"
              />
            </div>
            <div className="flex items-baseline space-x-1">
              <span
                className="text-lg sm:text-2xl font-bold text-[#0A3D62] tracking-wide group-hover:text-[#4E9B36] transition-colors"
                style={{ fontFamily: 'Cinzel, Georgia, serif' }}
              >
                EIRVAN
              </span>
              <span className="text-[10px] sm:text-xs font-sans font-extrabold text-[#0A3D62] tracking-wider uppercase">
                FOODS
              </span>
              <span className="text-[10px] text-[#0A3D62] font-mono">®</span>
            </div>
          </div>

          {/* Desktop Navigation Links (Zone 2) */}
          <nav className="hidden lg:flex items-center gap-2.5 xl:gap-6 text-xs xl:text-sm font-medium text-[#15222E]">
            <button
              onClick={() => handleNavClick('home')}
              className={`hover:text-[#0A3D62] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'home'
                  ? 'text-[#0A3D62] font-bold underline underline-offset-8 decoration-[#4E9B36] decoration-2'
                  : ''
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('shop', 'all')}
              className={`hover:text-[#0A3D62] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'shop' && selectedCategory === 'all'
                  ? 'text-[#0A3D62] font-bold underline underline-offset-8 decoration-[#4E9B36] decoration-2'
                  : ''
              }`}
            >
              Shop
            </button>
            <button
              onClick={() => handleNavClick('shop', 'nuts')}
              className={`hover:text-[#0A3D62] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'shop' && selectedCategory === 'nuts'
                  ? 'text-[#0A3D62] font-bold underline underline-offset-8 decoration-[#4E9B36] decoration-2'
                  : ''
              }`}
            >
              Dry Fruits
            </button>
            <button
              onClick={() => handleNavClick('shop', 'powders')}
              className={`hover:text-[#0A3D62] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'shop' && selectedCategory === 'powders'
                  ? 'text-[#0A3D62] font-bold underline underline-offset-8 decoration-[#4E9B36] decoration-2'
                  : ''
              }`}
            >
              Dry Fruit Powders
            </button>
            <button
              onClick={() => handleNavClick('gift-builder')}
              className={`hover:text-[#0A3D62] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'gift-builder'
                  ? 'text-[#0A3D62] font-bold underline underline-offset-8 decoration-[#4E9B36] decoration-2'
                  : ''
              }`}
            >
              Gift Collections
            </button>
            <button
              onClick={() => handleNavClick('blog')}
              className={`hover:text-[#0A3D62] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'blog'
                  ? 'text-[#0A3D62] font-bold underline underline-offset-8 decoration-[#4E9B36] decoration-2'
                  : ''
              }`}
            >
              Our Story & Journal
            </button>
          </nav>

          {/* Right Action Controls (Zone 3) */}
          <div className="flex items-center gap-1 sm:gap-2.5 lg:gap-3 shrink-0">
            {/* Search Button */}
            <div className="relative">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-[#302A25] hover:text-[#344B36] hover:bg-[#E7DDCA]/50 rounded-full transition-colors cursor-pointer"
                title="Search pantry"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Search dropdown */}
              {searchOpen && (
                <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#0A3D62]/15 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search Mamra, Walnuts, Panjiri, Dates..."
                      className="w-full pl-9 pr-4 py-2 text-xs bg-[#F7F4EC] rounded-xl border border-[#E7DDCA] focus:outline-hidden focus:border-[#344B36] focus:ring-1 focus:ring-[#344B36]"
                      autoFocus
                    />
                  </div>

                  {/* Suggestions */}
                  {searchResults.length > 0 && (
                    <div className="mt-2.5 divide-y divide-gray-100 max-h-64 overflow-y-auto">
                      {searchResults.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedProduct(item);
                            setSearchOpen(false);
                            setSearchInput('');
                          }}
                          className="flex items-center space-x-3 p-2 hover:bg-[#F7F4EC] rounded-xl cursor-pointer transition-colors"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#302A25] truncate">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-[#B96F50] font-medium">
                              From Rs. {item.variants[0].price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchInput && searchResults.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4">
                      No dry fruits found matching &quot;{searchInput}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* AI Image Studio Button */}
            <button
              onClick={() => setIsAiStudioOpen(true)}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-[#4E9B36]/10 text-[#0A3D62] hover:bg-[#4E9B36]/20 rounded-full text-xs font-semibold border border-[#4E9B36]/30 transition-all cursor-pointer whitespace-nowrap"
              title="AI 4K Dry Fruit Visualizer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C6842D]" />
              <span>Visualizer</span>
            </button>

            {/* AI Sommelier Button */}
            <button
              onClick={() => setIsAiSommelierOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0A3D62] text-[#FBF9F4] hover:bg-[#072B47] rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Ask AI Nutritionist"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#4E9B36]" />
              <span className="hidden sm:inline">Advisor</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={() => handleNavClick('shop')}
              className="relative p-2 text-[#15222E] hover:text-[#0A3D62] hover:bg-[#EEF5FA] rounded-full transition-colors cursor-pointer"
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#C6842D] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center space-x-2 bg-white border border-[#0A3D62]/30 hover:border-[#0A3D62] text-[#0A3D62] px-3.5 py-1.5 rounded-full shadow-2xs transition-all cursor-pointer"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 text-[#0A3D62]" />
              <span className="text-xs font-bold bg-[#4E9B36] text-white w-5 h-5 rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            </button>

            {/* Admin Switcher */}
            <button
              onClick={() => handleNavClick('admin')}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                activeView === 'admin'
                  ? 'bg-[#0A3D62] text-[#4E9B36] border-[#0A3D62]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#0A3D62] hover:text-[#0A3D62]'
              }`}
              title="Store Admin Panel & IONOS Shared Hosting Center"
              aria-label="Admin Panel"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FBF9F4] border-b border-[#0A3D62]/10 px-4 pt-2 pb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 pb-2">
            <button
              onClick={() => handleNavClick('home')}
              className="text-left px-3 py-2 text-sm font-semibold text-[#0A3D62] hover:bg-[#EEF5FA] rounded-xl"
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('shop', 'all')}
              className="text-left px-3 py-2 text-sm font-semibold text-[#0A3D62] hover:bg-[#EEF5FA] rounded-xl"
            >
              All Harvests
            </button>
            <button
              onClick={() => handleNavClick('shop', 'mixed')}
              className="text-left px-3 py-2 text-sm text-[#15222E] hover:bg-[#EEF5FA] rounded-xl"
            >
              Mixed Fruits
            </button>
            <button
              onClick={() => handleNavClick('shop', 'nuts')}
              className="text-left px-3 py-2 text-sm text-[#15222E] hover:bg-[#EEF5FA] rounded-xl"
            >
              Single-Origin Nuts
            </button>
            <button
              onClick={() => handleNavClick('shop', 'powders')}
              className="text-left px-3 py-2 text-sm text-[#15222E] hover:bg-[#EEF5FA] rounded-xl"
            >
              Fruit Powders
            </button>
            <button
              onClick={() => handleNavClick('shop', 'dates-raisins')}
              className="text-left px-3 py-2 text-sm text-[#15222E] hover:bg-[#EEF5FA] rounded-xl"
            >
              Dates & Raisins
            </button>
          </div>

          <div className="pt-2 border-t border-[#0A3D62]/10 space-y-2">
            <button
              onClick={() => handleNavClick('gift-builder')}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-[#4E9B36]/10 text-[#0A3D62] font-semibold text-sm rounded-xl"
            >
              <span className="flex items-center space-x-2">
                <Gift className="w-4 h-4 text-[#C6842D]" />
                <span>Custom Gift Collections</span>
              </span>
              <ArrowRight className="w-4 h-4 text-[#0A3D62]" />
            </button>

            <button
              onClick={() => {
                setIsAiStudioOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-[#0A3D62] hover:bg-[#EEF5FA] rounded-xl"
            >
              <span className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#C6842D]" />
                <span>AI 4K Image Visualizer</span>
              </span>
            </button>

            <button
              onClick={() => handleNavClick('track')}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-[#15222E] hover:bg-[#EEF5FA] rounded-xl"
            >
              <Package className="w-4 h-4 text-gray-500" />
              <span>Track Pakistani Order</span>
            </button>

            <button
              onClick={() => handleNavClick('blog')}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-[#15222E] hover:bg-[#EEF5FA] rounded-xl"
            >
              <BookOpen className="w-4 h-4 text-gray-500" />
              <span>Our Story & Journal</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
