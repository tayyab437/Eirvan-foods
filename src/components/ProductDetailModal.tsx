import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ProductVariant } from '../types';
import { ImageMagnifier } from './ImageMagnifier';
import {
  X,
  Star,
  ShoppingBag,
  Truck,
  ShieldCheck,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Zap,
  MapPin,
  Package,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    products,
    selectedProduct,
    setSelectedProduct,
    addToCart,
    reviews,
    setIsCartOpen,
    recordProductView,
  } = useStore();

  React.useEffect(() => {
    if (slug && selectedProduct?.slug !== slug) {
      const prod = products.find((p) => p.slug === slug);
      if (prod) {
        setSelectedProduct(prod);
      }
    }
  }, [slug, products, selectedProduct?.slug, setSelectedProduct]);

  React.useEffect(() => {
    if (selectedProduct?.id) {
      recordProductView(selectedProduct.id);
    }
  }, [selectedProduct?.id, recordProductView]);

  const handleClose = () => {
    setSelectedProduct(null);
    if (slug) {
      navigate('/shop', { replace: true });
    }
  };

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    selectedProduct?.variants?.[0] || null
  );
  const [addedToast, setAddedToast] = useState(false);
  const [quantity, setQuantity] = useState(1);

  React.useEffect(() => {
    if (selectedProduct) {
      setSelectedVariant(selectedProduct.variants[0]);
      setQuantity(1);
      setActiveImageIndex(0);
      setAddedToast(false);
    }
  }, [selectedProduct]);

  if (!selectedProduct || !selectedVariant) return null;

  const images =
    selectedProduct.galleryImages && selectedProduct.galleryImages.length > 0
      ? selectedProduct.galleryImages
      : [selectedProduct.imageUrl];

  const currentPrice = selectedVariant.salePrice || selectedVariant.price;
  const originalPrice = selectedVariant.salePrice ? selectedVariant.price : null;
  const productReviews = reviews.filter((r) => r.productId === selectedProduct.id);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addToCart(selectedProduct, selectedVariant, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const handleBuyNow = () => {
    if (!selectedVariant) return;
    addToCart(selectedProduct, selectedVariant, quantity);
    setSelectedProduct(null);
    navigate('/checkout');
    setIsCartOpen(false);
  };

  const handleViewDetails = () => {
    const targetSlug = selectedProduct.slug;
    setSelectedProduct(null);
    navigate(`/product/${targetSlug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E7DDCA] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/90 text-gray-700 hover:text-black hover:bg-white shadow-md transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {/* Gallery Column with Magnifier Hover Zoom */}
            <div>
              <div className="aspect-square rounded-2xl overflow-hidden bg-[#F7F4EC] border border-[#E7DDCA] relative">
                <ImageMagnifier
                  src={images[activeImageIndex] || selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full"
                  zoomLevel={2.5}
                />

                {selectedProduct.origin && (
                  <span className="absolute bottom-3 left-3 bg-[#344B36]/90 text-[#F7F4EC] text-xs px-3 py-1 rounded-full backdrop-blur-xs flex items-center space-x-1.5 font-medium pointer-events-none">
                    <MapPin className="w-3.5 h-3.5 text-[#B69A62]" />
                    <span>{selectedProduct.origin}</span>
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-[#344B36] shadow-sm scale-102'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust markers */}
              <div className="grid grid-cols-3 gap-2 mt-5 p-3 bg-[#F7F4EC] rounded-2xl border border-[#E7DDCA] text-[11px] text-[#5E5750]">
                <div className="flex items-center space-x-1.5">
                  <Truck className="w-4 h-4 text-[#344B36] shrink-0" />
                  <span>24-48h Delivery</span>
                </div>
                <div className="flex items-center space-x-1.5 border-x border-[#E7DDCA] px-1">
                  <ShieldCheck className="w-4 h-4 text-[#344B36] shrink-0" />
                  <span>Pure Harvest</span>
                </div>
                <div className="flex items-center space-x-1.5 pl-0.5">
                  <RotateCcw className="w-4 h-4 text-[#344B36] shrink-0" />
                  <span>7-Day Guarantee</span>
                </div>
              </div>
            </div>

            {/* Info Column */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#A5AD91]">
                    {selectedProduct.categoryLabel}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400 font-mono">
                    SKU: {selectedVariant.sku}
                  </span>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl text-[#302A25] mb-3">
                  {selectedProduct.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex text-[#B69A62]">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.floor(selectedProduct.rating)
                            ? 'fill-current'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-[#302A25]">
                    {selectedProduct.rating}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({productReviews.length} verified reviews)
                  </span>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline space-x-3 mb-4 p-3 bg-[#F7F4EC] rounded-2xl border border-[#E7DDCA]">
                  <span className="font-serif text-2xl font-bold text-[#344B36] tabular-nums">
                    Rs. {currentPrice.toLocaleString()}
                  </span>
                  {originalPrice && (
                    <span className="text-xs text-gray-400 line-through tabular-nums">
                      Rs. {originalPrice.toLocaleString()}
                    </span>
                  )}
                  {originalPrice && (
                    <span className="bg-[#B96F50] text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md">
                      Save Rs. {(originalPrice - currentPrice).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Size / Weight Selection */}
                <div className="mb-4">
                  <div className="flex justify-between items-center text-xs font-semibold text-[#302A25] mb-2">
                    <span>Select Size / Weight:</span>
                    <span className="text-[#344B36] font-mono text-[11px]">
                      {selectedVariant.stock > 0
                        ? `${selectedVariant.stock} available`
                        : 'Restocking'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProduct.variants.map((v) => {
                      const isSel = selectedVariant.id === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSel
                              ? 'border-[#244C37] bg-[#244C37] text-white shadow-xs font-bold'
                              : 'border-[#E8DDCA] bg-[#F8F5ED]/80 text-gray-700 hover:border-[#244C37] hover:bg-white'
                          }`}
                        >
                          <div className="text-xs font-bold font-mono">{v.weight}</div>
                          <div
                            className={`text-[10px] font-semibold tabular-nums mt-0.5 ${
                              isSel ? 'text-[#B69A62]' : 'text-gray-500'
                            }`}
                          >
                            Rs. {(v.salePrice || v.price).toLocaleString()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity Controls & Subtotal */}
                <div className="flex items-center space-x-4 mb-5">
                  <div className="flex items-center border border-[#E8DDCA] rounded-xl bg-white overflow-hidden shadow-2xs">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="p-2 hover:bg-[#F8F5ED] text-gray-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center text-xs font-bold text-[#15222E] tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity(Math.min(selectedVariant.stock, quantity + 1))
                      }
                      disabled={quantity >= selectedVariant.stock}
                      className="p-2 hover:bg-[#F8F5ED] text-gray-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs text-gray-500">
                    Subtotal:{' '}
                    <span className="font-serif font-bold text-[#244C37] text-base tabular-nums">
                      Rs. {(currentPrice * quantity).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions: Add to Cart, Buy Now, View Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    disabled={selectedVariant.stock <= 0}
                    onClick={handleAddToCart}
                    className={`w-full py-2.5 px-2 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 shadow-xs disabled:opacity-50 ${
                      addedToast
                        ? 'bg-emerald-700 text-white'
                        : 'bg-[#244C37] hover:bg-[#1A3828] text-white'
                    }`}
                  >
                    {addedToast ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Added!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5 text-[#B69A62]" />
                        <span>Add To Cart</span>
                      </>
                    )}
                  </button>

                  <button
                    disabled={selectedVariant.stock <= 0}
                    onClick={handleBuyNow}
                    className="w-full py-2.5 px-2 rounded-xl font-bold text-[11px] uppercase tracking-wider bg-[#B69A62] hover:bg-[#A38955] text-[#244C37] flex items-center justify-center space-x-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#244C37]" />
                    <span>Buy Now</span>
                  </button>

                  <button
                    onClick={handleViewDetails}
                    className="w-full py-2.5 px-2 rounded-xl font-bold text-[11px] uppercase tracking-wider bg-[#F8F5ED] hover:bg-[#E8DDCA] border border-[#E8DDCA] text-[#244C37] flex items-center justify-center space-x-1 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#B69A62]" />
                  </button>
                </div>
              </div>

              {/* Specs */}
              <div className="border-t border-[#E7DDCA] pt-4 mt-4 grid grid-cols-2 gap-3 text-xs text-[#5E5750]">
                <div className="flex items-center space-x-2">
                  <Package className="w-3.5 h-3.5 text-[#344B36] shrink-0" />
                  <span>Packaging: {selectedProduct.packaging}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-[#344B36] shrink-0" />
                  <span>Shelf Life: {selectedProduct.shelfLife}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
