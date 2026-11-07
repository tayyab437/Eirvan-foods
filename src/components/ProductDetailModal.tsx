import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductVariant } from '../types';
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
  Sparkles,
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    reviews,
    addReview,
    products,
    setActiveView,
    setIsCartOpen,
  } = useStore();

  if (!selectedProduct) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    selectedProduct.variants[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'nutrition' | 'reviews'>('details');

  // Review submission state
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerCity, setReviewerCity] = useState('');
  const [reviewerRating, setReviewerRating] = useState(5);
  const [reviewerComment, setReviewerComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const images = selectedProduct.galleryImages && selectedProduct.galleryImages.length > 0
    ? selectedProduct.galleryImages
    : [selectedProduct.imageUrl];

  const currentPrice = selectedVariant.salePrice || selectedVariant.price;
  const originalPrice = selectedVariant.salePrice ? selectedVariant.price : null;
  const productReviews = reviews.filter((r) => r.productId === selectedProduct.id);

  const handleAddToCart = () => {
    addToCart(selectedProduct, selectedVariant, quantity);
  };

  const handleBuyNow = () => {
    addToCart(selectedProduct, selectedVariant, quantity);
    setSelectedProduct(null);
    setActiveView('checkout');
    setIsCartOpen(false);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName || !reviewerComment) return;

    addReview({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      customerName: reviewerName,
      city: reviewerCity || 'Pakistan',
      rating: reviewerRating,
      comment: reviewerComment,
      verifiedPurchase: true,
    });

    setReviewSubmitted(true);
    setReviewerName('');
    setReviewerCity('');
    setReviewerComment('');
    setTimeout(() => setReviewSubmitted(false), 3000);
  };

  const related = products
    .filter((p) => p.category === selectedProduct.category && p.id !== selectedProduct.id)
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E7DDCA] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={() => setSelectedProduct(null)}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/90 text-gray-700 hover:text-black hover:bg-white shadow-md transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {/* Gallery Column */}
            <div>
              <div className="aspect-square rounded-2xl overflow-hidden bg-[#F7F4EC] border border-[#E7DDCA] relative">
                <img
                  src={images[activeImageIndex] || selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                {selectedProduct.origin && (
                  <span className="absolute bottom-3 left-3 bg-[#344B36]/90 text-[#F7F4EC] text-xs px-3 py-1 rounded-full backdrop-blur-xs flex items-center space-x-1.5 font-medium">
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
              <div className="grid grid-cols-3 gap-2 mt-6 p-3 bg-[#F7F4EC] rounded-2xl border border-[#E7DDCA] text-[11px] text-[#5E5750]">
                <div className="flex items-center space-x-1.5">
                  <Truck className="w-4 h-4 text-[#344B36] shrink-0" />
                  <span>24-48h Delivery</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#344B36] shrink-0" />
                  <span>Pure Harvest</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RotateCcw className="w-4 h-4 text-[#344B36] shrink-0" />
                  <span>7-Day Freshness</span>
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

                <h1 className="font-serif text-2xl sm:text-3xl text-[#302A25] mb-1">
                  {selectedProduct.name}
                </h1>
                {selectedProduct.urduName && (
                  <p className="font-serif text-sm text-[#B69A62] font-medium mb-3">
                    {selectedProduct.urduName}
                  </p>
                )}

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
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="text-xs text-gray-500 hover:text-[#344B36] underline cursor-pointer"
                  >
                    ({productReviews.length} verified reviews)
                  </button>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline space-x-3 mb-5 p-3.5 bg-[#F7F4EC] rounded-2xl border border-[#E7DDCA]">
                  <span className="font-serif text-3xl font-bold text-[#344B36] tabular-nums">
                    Rs. {currentPrice.toLocaleString()}
                  </span>
                  {originalPrice && (
                    <span className="text-sm text-gray-400 line-through tabular-nums">
                      Rs. {originalPrice.toLocaleString()}
                    </span>
                  )}
                  {originalPrice && (
                    <span className="bg-[#B96F50] text-white text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md">
                      Save Rs. {(originalPrice - currentPrice).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Size / Weight Selection */}
                <div className="mb-5">
                  <div className="flex justify-between items-center text-xs font-semibold text-[#302A25] mb-2">
                    <span>Select Portion:</span>
                    <span className="text-[#344B36]">
                      {selectedVariant.stock > 0
                        ? `${selectedVariant.stock} available in hub`
                        : 'Currently Restocking'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProduct.variants.map((v) => {
                      const isSel = selectedVariant.id === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                            isSel
                              ? 'border-[#0A3D62] bg-[#0A3D62] text-white shadow-xs font-bold'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-[#0A3D62]'
                          }`}
                        >
                          <div className="text-xs font-semibold">{v.weight}</div>
                          <div
                            className={`text-[11px] tabular-nums ${
                              isSel ? 'text-blue-100' : 'text-gray-400'
                            }`}
                          >
                            Rs. {(v.salePrice || v.price).toLocaleString()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="p-2.5 hover:bg-[#EEF5FA] text-gray-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-12 text-center text-xs font-bold text-[#15222E] tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity(Math.min(selectedVariant.stock, quantity + 1))
                      }
                      disabled={quantity >= selectedVariant.stock}
                      className="p-2.5 hover:bg-[#EEF5FA] text-gray-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs text-gray-500">
                    Subtotal:{' '}
                    <span className="font-bold text-[#0A3D62] text-sm tabular-nums">
                      Rs. {(currentPrice * quantity).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <button
                    disabled={selectedVariant.stock <= 0}
                    onClick={handleAddToCart}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#0A3D62] hover:bg-[#072B47] text-white flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#4E9B36]" />
                    <span>Add To Cart</span>
                  </button>

                  <button
                    disabled={selectedVariant.stock <= 0}
                    onClick={handleBuyNow}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#4E9B36] hover:bg-[#3d7c2a] text-white flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 text-[#C6842D]" />
                    <span>Buy Now</span>
                  </button>
                </div>
              </div>

              {/* Specs */}
              <div className="border-t border-[#E7DDCA] pt-4 grid grid-cols-2 gap-3 text-xs text-[#5E5750]">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-[#344B36] shrink-0" />
                  <span>Packaging: {selectedProduct.packaging}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#344B36] shrink-0" />
                  <span>Shelf Life: {selectedProduct.shelfLife}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Deep Tabs */}
          <div className="mt-10 border-t border-[#E7DDCA] pt-6">
            <div className="flex border-b border-[#E7DDCA] space-x-6 text-xs uppercase tracking-wider font-bold mb-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'details'
                    ? 'border-[#344B36] text-[#344B36]'
                    : 'border-transparent text-gray-400 hover:text-gray-900'
                }`}
              >
                Description &amp; Origin
              </button>
              <button
                onClick={() => setActiveTab('nutrition')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'nutrition'
                    ? 'border-[#344B36] text-[#344B36]'
                    : 'border-transparent text-gray-400 hover:text-gray-900'
                }`}
              >
                Nutritional Facts
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'reviews'
                    ? 'border-[#344B36] text-[#344B36]'
                    : 'border-transparent text-gray-400 hover:text-gray-900'
                }`}
              >
                Customer Reviews ({productReviews.length})
              </button>
            </div>

            {/* Tab 1: Details */}
            {activeTab === 'details' && (
              <div className="space-y-4 text-xs sm:text-sm text-[#5E5750] leading-relaxed">
                <p>{selectedProduct.description}</p>
                <h4 className="font-serif text-base font-bold text-[#302A25] pt-2">
                  Key Health Advantages:
                </h4>
                <ul className="space-y-2">
                  {selectedProduct.healthBenefits.map((b, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <Sparkles className="w-4 h-4 text-[#B69A62] shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tab 2: Nutrition */}
            {activeTab === 'nutrition' && (
              <div className="bg-[#F7F4EC] p-5 rounded-2xl border border-[#E7DDCA]">
                <h4 className="font-serif text-base font-bold text-[#344B36] mb-3">
                  Nutritional Breakdown per {selectedProduct.nutritionFacts.servingSize}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-[#E7DDCA]">
                    <span className="text-gray-400 block mb-0.5">Energy</span>
                    <span className="font-bold text-sm text-[#302A25] tabular-nums">
                      {selectedProduct.nutritionFacts.calories} kcal
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#E7DDCA]">
                    <span className="text-gray-400 block mb-0.5">Natural Protein</span>
                    <span className="font-bold text-sm text-[#302A25]">
                      {selectedProduct.nutritionFacts.protein}
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#E7DDCA]">
                    <span className="text-gray-400 block mb-0.5">Healthy Lipids</span>
                    <span className="font-bold text-sm text-[#302A25]">
                      {selectedProduct.nutritionFacts.healthyFats}
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#E7DDCA]">
                    <span className="text-gray-400 block mb-0.5">Carbohydrates</span>
                    <span className="font-bold text-sm text-[#302A25]">
                      {selectedProduct.nutritionFacts.carbs}
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#E7DDCA]">
                    <span className="text-gray-400 block mb-0.5">Dietary Fiber</span>
                    <span className="font-bold text-sm text-[#302A25]">
                      {selectedProduct.nutritionFacts.fiber}
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#E7DDCA]">
                    <span className="text-gray-400 block mb-0.5">Essential Minerals</span>
                    <span className="font-bold text-xs text-[#302A25]">
                      {selectedProduct.nutritionFacts.minerals}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  {productReviews.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">
                      Be the first customer to share feedback on this harvest!
                    </p>
                  ) : (
                    productReviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-4 rounded-2xl bg-[#F7F4EC] border border-[#E7DDCA] text-xs"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#302A25]">
                              {rev.customerName}
                            </span>
                            <span className="text-gray-400">· {rev.city}</span>
                            {rev.verifiedPurchase && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400">{rev.date}</span>
                        </div>
                        <div className="flex text-[#B69A62] mb-1.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < rev.rating ? 'fill-current' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[#5E5750] leading-relaxed">{rev.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Review Form */}
                <div className="p-5 rounded-2xl bg-white border border-[#E7DDCA]">
                  <h4 className="font-serif text-base font-bold text-[#302A25] mb-2">
                    Share Your Harvest Experience
                  </h4>
                  {reviewSubmitted ? (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Shukriya! Your verified review has been published.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleReviewSubmit} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-700">Rating:</span>
                        <div className="flex text-[#B69A62]">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setReviewerRating(num)}
                              className="p-1 cursor-pointer"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  num <= reviewerRating
                                    ? 'fill-current text-[#B69A62]'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          placeholder="Your Name (e.g. Asad Qureshi)"
                          className="w-full text-xs p-2.5 rounded-xl border border-[#E7DDCA] bg-[#F7F4EC] focus:outline-hidden focus:border-[#344B36]"
                        />
                        <input
                          type="text"
                          value={reviewerCity}
                          onChange={(e) => setReviewerCity(e.target.value)}
                          placeholder="City (e.g. Islamabad, Lahore)"
                          className="w-full text-xs p-2.5 rounded-xl border border-[#E7DDCA] bg-[#F7F4EC] focus:outline-hidden focus:border-[#344B36]"
                        />
                      </div>

                      <textarea
                        required
                        rows={3}
                        value={reviewerComment}
                        onChange={(e) => setReviewerComment(e.target.value)}
                        placeholder="Details on aroma, oil content, and packaging..."
                        className="w-full text-xs p-2.5 rounded-xl border border-[#E7DDCA] bg-[#F7F4EC] focus:outline-hidden focus:border-[#344B36]"
                      />

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#344B36] text-[#F7F4EC] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#233425] transition-colors cursor-pointer"
                      >
                        Submit Review
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Related products */}
          {related.length > 0 && (
            <div className="mt-10 border-t border-[#E7DDCA] pt-6">
              <h3 className="font-serif text-lg font-bold text-[#302A25] mb-4">
                Harmonious Pantry Pairings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {related.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => {
                      setSelectedProduct(rel);
                      setActiveImageIndex(0);
                      setSelectedVariant(rel.variants[0]);
                    }}
                    className="flex items-center space-x-3 p-3 bg-[#F7F4EC] hover:bg-[#E7DDCA]/40 rounded-2xl cursor-pointer transition-colors border border-[#E7DDCA]"
                  >
                    <img
                      src={rel.imageUrl}
                      alt={rel.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#302A25] truncate">
                        {rel.name}
                      </h4>
                      <p className="text-[11px] text-[#344B36] font-semibold tabular-nums">
                        From Rs. {rel.variants[0].price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
