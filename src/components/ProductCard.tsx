import React, { useState } from 'react';
import { Product, ProductVariant } from '../types';
import { useStore } from '../context/StoreContext';
import { Heart, Star, ShoppingBag, Eye, Check } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const navigate = useNavigate();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product.variants[0]
  );
  const [addedAnimation, setAddedAnimation] = useState(false);

  const isWishlisted = wishlist.includes(product.id);
  const currentPrice = selectedVariant.salePrice || selectedVariant.price;
  const originalPrice = selectedVariant.salePrice ? selectedVariant.price : null;
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : null;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedVariant.stock <= 0) return;
    addToCart(product, selectedVariant, 1);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  return (
    <div
      onClick={() => navigate(`/product/${product.slug}`)}
      className="group bg-white rounded-3xl border border-[#E7DDCA] overflow-hidden hover:shadow-xl hover:border-[#344B36]/30 transition-all duration-300 flex flex-col justify-between cursor-pointer relative"
    >
      {/* Top Image Container (65% of card visual) */}
      <div className="relative aspect-4/3 w-full bg-[#F7F4EC] overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          width="400"
          height="300"
          decoding="async"
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
        />

        {/* Minimalist Top Badges (Restrained) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {discountPercent && (
            <span className="bg-[#B96F50] text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md shadow-2xs">
              {discountPercent}% Off
            </span>
          )}
          {product.bestSeller && (
            <span className="bg-[#344B36] text-[#F7F4EC] text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md shadow-2xs">
              Curator’s Choice
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-2xs z-10 ${
            isWishlisted
              ? 'bg-red-50 text-red-600'
              : 'bg-white/80 text-[#302A25] hover:bg-white hover:text-red-500'
          }`}
          aria-label="Save to wishlist"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Subtle Quick View Overlay */}
        <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/95 text-[#344B36] text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-md flex items-center space-x-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <Eye className="w-3.5 h-3.5" />
            <span>View Harvest</span>
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Origin Line */}
          <div className="flex items-center justify-between text-[11px] text-[#A5AD91] uppercase tracking-wider font-medium mb-1.5">
            <span>{product.categoryLabel}</span>
            {product.origin && (
              <span className="truncate max-w-[140px] text-[#5E5750]">
                {product.origin.split(',')[0]}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-serif text-lg font-bold text-[#15222E] group-hover:text-[#0A3D62] transition-colors line-clamp-1 leading-snug">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center space-x-1.5 my-2">
            <div className="flex text-[#C6842D]">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(product.rating)
                      ? 'fill-current'
                      : 'text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-[#15222E]">
              {product.rating}
            </span>
            <span className="text-[11px] text-gray-400">
              ({product.reviewCount})
            </span>
          </div>

          {/* Short Description */}
          <p className="text-xs text-[#15222E]/70 line-clamp-2 mb-3.5 leading-relaxed font-sans">
            {product.shortDescription}
          </p>

          {/* Weight Variant Selector Chips */}
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Available Sizes:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((v) => {
                const isSelected = selectedVariant.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVariant(v);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-[#0A3D62] text-white shadow-2xs font-semibold'
                        : 'bg-[#FBF9F4] text-[#15222E]/80 hover:bg-[#EEF5FA] border border-gray-200'
                    }`}
                  >
                    {v.weight}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pricing & Add to Cart */}
        <div className="pt-3.5 border-t border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="font-serif text-lg font-bold text-[#0A3D62] tabular-nums">
                Rs. {currentPrice.toLocaleString()}
              </span>
              {originalPrice && (
                <span className="text-xs text-gray-400 line-through tabular-nums">
                  Rs. {originalPrice.toLocaleString()}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 block font-mono">
              SKU: {selectedVariant.sku} ·{' '}
              {selectedVariant.stock > 0 ? (
                <span className="text-[#4E9B36] font-medium font-sans">Available</span>
              ) : (
                <span className="text-amber-600 font-medium font-sans">Restocking</span>
              )}
            </span>
          </div>

          <button
            type="button"
            disabled={selectedVariant.stock <= 0}
            onClick={handleQuickAdd}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer ${
              addedAnimation
                ? 'bg-[#4E9B36] text-white'
                : selectedVariant.stock <= 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#0A3D62] hover:bg-[#072B47] text-white'
            }`}
          >
            {addedAnimation ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
