import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ProductVariant } from '../types';
import { ImageMagnifier } from './ImageMagnifier';
import {
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
  Heart,
  Share2,
  ArrowLeft,
} from 'lucide-react';

export const ProductPageView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    products,
    addToCart,
    reviews,
    addReview,
    setIsCartOpen,
    wishlist,
    toggleWishlist,
    recordProductView,
  } = useStore();

  const product = products.find((p) => p.slug === slug);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'nutrition' | 'reviews'>('details');

  // Review submission state
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerCity, setReviewerCity] = useState('');
  const [reviewerOrderNumber, setReviewerOrderNumber] = useState('');
  const [reviewerPhone, setReviewerPhone] = useState('');
  const [reviewerRating, setReviewerRating] = useState(5);
  const [reviewerComment, setReviewerComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmittedMsg, setReviewSubmittedMsg] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  React.useEffect(() => {
    if (product) {
      setSelectedVariant(product.variants[0]);
      setQuantity(1);
      setActiveImageIndex(0);
      setAddedToast(false);
      recordProductView(product.id);
    }
  }, [product, recordProductView]);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif text-2xl text-[#302A25] mb-4">Harvest Item Not Found</h2>
        <Link
          to="/shop"
          className="px-6 py-3 bg-[#344B36] text-[#F7F4EC] text-xs font-mono uppercase tracking-wider rounded-xl hover:bg-[#273929]"
        >
          Return to Pantry Catalogue
        </Link>
      </div>
    );
  }

  const currentVariant = selectedVariant || product.variants[0];
  const images =
    product.galleryImages && product.galleryImages.length > 0
      ? product.galleryImages
      : [product.imageUrl];

  const currentPrice = currentVariant.salePrice || currentVariant.price;
  const originalPrice = currentVariant.salePrice ? currentVariant.price : null;
  const productReviews = reviews.filter(
    (r) => r.productId === product.id && (!r.status || r.status === 'approved')
  );
  const isWishlisted = wishlist.includes(product.id);

  const handleAddToCart = () => {
    addToCart(product, currentVariant, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product, currentVariant, quantity);
    navigate('/checkout');
    setIsCartOpen(false);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewerComment.trim() || reviewSubmitting) return;
    setReviewError(null);
    setReviewSubmitting(true);

    try {
      const res = await addReview({
        productId: product.id,
        productName: product.name,
        customerName: reviewerName.trim(),
        city: reviewerCity.trim() || 'Pakistan',
        rating: reviewerRating,
        comment: reviewerComment.trim(),
        ...(reviewerOrderNumber.trim() ? { orderNumber: reviewerOrderNumber.trim() } : {}),
        ...(reviewerPhone.trim() ? { phone: reviewerPhone.trim() } : {}),
      });

      setReviewSubmittedMsg(
        res.message || 'Thank you! Your review has been submitted for moderation.'
      );
      setReviewerName('');
      setReviewerCity('');
      setReviewerOrderNumber('');
      setReviewerPhone('');
      setReviewerComment('');
      setTimeout(() => setReviewSubmittedMsg(null), 5000);
    } catch (err: unknown) {
      setReviewError(
        err instanceof Error ? err.message : 'Unable to submit review right now.'
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs font-mono text-gray-500 mb-8 pb-4 border-b border-[#E7DDCA]">
        <button
          onClick={() => navigate('/shop')}
          className="hover:underline text-[#344B36] font-bold flex items-center space-x-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Catalogue</span>
        </button>
        <span>/</span>
        <span className="text-[#B69A62] font-semibold">{product.categoryLabel}</span>
        <span>/</span>
        <span className="text-gray-800 font-bold truncate max-w-[200px] sm:max-w-xs">
          {product.name}
        </span>
      </div>

      {/* Main Product Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start mb-16">
        {/* Gallery with Image Magnifier (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-square sm:aspect-4/3 lg:aspect-square rounded-3xl overflow-hidden bg-[#F7F4EC] border border-[#E7DDCA] relative shadow-md">
            <ImageMagnifier
              src={images[activeImageIndex] || product.imageUrl}
              alt={product.name}
              className="w-full h-full"
              zoomLevel={2.5}
            />

            {product.origin && (
              <span className="absolute top-4 left-4 bg-[#344B36]/90 text-[#F7F4EC] text-xs px-3.5 py-1.5 rounded-full backdrop-blur-md flex items-center space-x-1.5 font-medium shadow-sm pointer-events-none">
                <MapPin className="w-3.5 h-3.5 text-[#B69A62]" />
                <span>{product.origin}</span>
              </span>
            )}

            <button
              onClick={() => toggleWishlist(product.id)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer ${
                isWishlisted
                  ? 'bg-red-50 text-red-600'
                  : 'bg-white/80 text-[#302A25] hover:bg-white hover:text-red-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Gallery Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-[#344B36] shadow-md scale-102'
                      : 'border-[#E7DDCA] opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Trust Guarantees */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-white rounded-2xl border border-[#E7DDCA] text-xs text-[#5E5750] shadow-2xs">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-[#344B36] shrink-0" />
              <div>
                <span className="font-bold block text-[#302A25]">Fast Shipping</span>
                <span className="text-[10px] text-gray-400">24-48h Delivery</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 border-x border-[#E7DDCA] px-3">
              <ShieldCheck className="w-4 h-4 text-[#344B36] shrink-0" />
              <div>
                <span className="font-bold block text-[#302A25]">100% Pure</span>
                <span className="text-[10px] text-gray-400">Single Origin</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 pl-1">
              <RotateCcw className="w-4 h-4 text-[#344B36] shrink-0" />
              <div>
                <span className="font-bold block text-[#302A25]">7-Day Guarantee</span>
                <span className="text-[10px] text-gray-400">Freshness Promise</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details & Purchase Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs uppercase tracking-[0.2em] font-mono font-semibold text-[#B69A62]">
                {product.categoryLabel}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400 font-mono">
                SKU: {currentVariant.sku}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl text-[#302A25] leading-tight mb-3">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex text-[#B69A62]">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating)
                        ? 'fill-current'
                        : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-[#302A25]">
                {product.rating}
              </span>
              <a
                href="#reviews-section"
                className="text-xs text-gray-500 hover:text-[#344B36] underline cursor-pointer"
              >
                ({productReviews.length} customer reviews)
              </a>
            </div>

            {/* Price Box */}
            <div className="flex items-baseline space-x-3 p-4 bg-white rounded-2xl border border-[#E7DDCA] shadow-2xs">
              <span className="font-serif text-3xl font-bold text-[#344B36] tabular-nums">
                Rs. {currentPrice.toLocaleString()}
              </span>
              {originalPrice && (
                <span className="text-base text-gray-400 line-through tabular-nums">
                  Rs. {originalPrice.toLocaleString()}
                </span>
              )}
              {originalPrice && (
                <span className="bg-[#B96F50] text-white text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded-md">
                  Save Rs. {(originalPrice - currentPrice).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Size / Weight Options Selection */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-[#302A25] mb-2.5">
              <span>Select Portion Weight / Size:</span>
              <span className="text-[#344B36] font-mono">
                {currentVariant.stock > 0
                  ? `${currentVariant.stock} in stock`
                  : 'Restocking soon'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {product.variants.map((v) => {
                const isSel = currentVariant.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSel
                        ? 'border-[#244C37] bg-[#244C37] text-white shadow-md font-bold scale-[1.02]'
                        : 'border-[#E7DDCA] bg-white text-gray-700 hover:border-[#244C37] hover:bg-[#F7F4EC]'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">{v.weight}</div>
                    <div
                      className={`text-xs font-semibold tabular-nums mt-0.5 ${
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
          <div className="flex items-center space-x-5">
            <div className="flex items-center border border-[#E8DDCA] rounded-xl bg-white overflow-hidden shadow-2xs">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="p-3 hover:bg-[#F8F5ED] text-gray-600 disabled:opacity-40 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-14 text-center text-sm font-bold text-[#15222E] tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(currentVariant.stock, quantity + 1))}
                disabled={quantity >= currentVariant.stock}
                className="p-3 hover:bg-[#F8F5ED] text-gray-600 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-500">
              Subtotal:{' '}
              <span className="font-serif font-bold text-[#244C37] text-lg tabular-nums block">
                Rs. {(currentPrice * quantity).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              disabled={currentVariant.stock <= 0}
              onClick={handleAddToCart}
              className={`w-full py-4 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md disabled:opacity-50 ${
                addedToast
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#244C37] hover:bg-[#1A3828] text-white'
              }`}
            >
              {addedToast ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Added To Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 text-[#B69A62]" />
                  <span>Add To Cart</span>
                </>
              )}
            </button>

            <button
              disabled={currentVariant.stock <= 0}
              onClick={handleBuyNow}
              className="w-full py-4 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider bg-[#B69A62] hover:bg-[#A38955] text-[#244C37] flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-[#244C37]" />
              <span>Buy Now</span>
            </button>
          </div>

          {/* Specs List */}
          <div className="border-t border-[#E7DDCA] pt-4 grid grid-cols-2 gap-4 text-xs text-[#5E5750]">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-[#344B36] shrink-0" />
              <span>Packaging: {product.packaging}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#344B36] shrink-0" />
              <span>Shelf Life: {product.shelfLife}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Full Detailed Specifications Section */}
      <div id="reviews-section" className="bg-white rounded-3xl border border-[#E7DDCA] p-6 sm:p-10 shadow-sm mb-16">
        <div className="flex border-b border-[#E7DDCA] space-x-8 text-xs sm:text-sm uppercase tracking-wider font-bold mb-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'details'
                ? 'border-[#344B36] text-[#344B36]'
                : 'border-transparent text-gray-400 hover:text-gray-900'
            }`}
          >
            Description &amp; Origin
          </button>
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`pb-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'nutrition'
                ? 'border-[#344B36] text-[#344B36]'
                : 'border-transparent text-gray-400 hover:text-gray-900'
            }`}
          >
            Nutritional Breakdown
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-[#344B36] text-[#344B36]'
                : 'border-transparent text-gray-400 hover:text-gray-900'
            }`}
          >
            Verified Reviews ({productReviews.length})
          </button>
        </div>

        {/* Tab 1: Detailed Description */}
        {activeTab === 'details' && (
          <div className="space-y-6 text-sm text-[#5E5750] leading-relaxed">
            <p className="text-base font-light text-[#302A25]">{product.description}</p>
            <div className="bg-[#F7F4EC] p-6 rounded-2xl border border-[#E7DDCA]">
              <h4 className="font-serif text-lg font-bold text-[#302A25] mb-3 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-[#B69A62]" />
                <span>Key Health Advantages &amp; Sourcing Credo</span>
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.healthBenefits.map((b, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-[#302A25]/80">
                    <Check className="w-4 h-4 text-[#344B36] shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Nutrition */}
        {activeTab === 'nutrition' && (
          <div className="bg-[#F7F4EC] p-6 rounded-2xl border border-[#E7DDCA]">
            <h4 className="font-serif text-lg font-bold text-[#344B36] mb-4">
              Nutritional Profile per {product.nutritionFacts.servingSize}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-[#E7DDCA] text-center">
                <span className="text-gray-400 block mb-1">Energy</span>
                <span className="font-bold text-base text-[#302A25] tabular-nums">
                  {product.nutritionFacts.calories} kcal
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E7DDCA] text-center">
                <span className="text-gray-400 block mb-1">Protein</span>
                <span className="font-bold text-base text-[#302A25]">
                  {product.nutritionFacts.protein}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E7DDCA] text-center">
                <span className="text-gray-400 block mb-1">Healthy Fats</span>
                <span className="font-bold text-base text-[#302A25]">
                  {product.nutritionFacts.healthyFats}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E7DDCA] text-center">
                <span className="text-gray-400 block mb-1">Carbs</span>
                <span className="font-bold text-base text-[#302A25]">
                  {product.nutritionFacts.carbs}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E7DDCA] text-center">
                <span className="text-gray-400 block mb-1">Fiber</span>
                <span className="font-bold text-base text-[#302A25]">
                  {product.nutritionFacts.fiber}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E7DDCA] text-center">
                <span className="text-gray-400 block mb-1">Minerals</span>
                <span className="font-bold text-xs text-[#302A25]">
                  {product.nutritionFacts.minerals}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-8">
            <div className="space-y-4">
              {productReviews.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  Be the first customer to share feedback on this harvest!
                </p>
              ) : (
                productReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 rounded-2xl bg-[#F7F4EC] border border-[#E7DDCA] text-xs sm:text-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#302A25]">
                          {rev.customerName}
                        </span>
                        <span className="text-gray-400">· {rev.city}</span>
                        {rev.verifiedPurchase && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-medium">
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{rev.date}</span>
                    </div>
                    <div className="flex text-[#B69A62] mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
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

            {/* Review Submission Form */}
            <div className="p-6 rounded-2xl bg-[#F7F4EC] border border-[#E7DDCA]">
              <h4 className="font-serif text-lg font-bold text-[#302A25] mb-3">
                Leave a Customer Review
              </h4>
              {reviewSubmittedMsg ? (
                <div className="p-4 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{reviewSubmittedMsg}</span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {reviewError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                      {reviewError}
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
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
                            className={`w-4 h-4 ${
                              num <= reviewerRating
                                ? 'fill-current text-[#B69A62]'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="Your Name (e.g. Tariq Mahmood)"
                      className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-white focus:outline-hidden focus:border-[#344B36]"
                    />
                    <input
                      type="text"
                      value={reviewerCity}
                      onChange={(e) => setReviewerCity(e.target.value)}
                      placeholder="City (e.g. Islamabad)"
                      className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-white focus:outline-hidden focus:border-[#344B36]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={reviewerOrderNumber}
                      onChange={(e) => setReviewerOrderNumber(e.target.value)}
                      placeholder="Order Ref (optional, for Verified badge)"
                      className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-white focus:outline-hidden focus:border-[#344B36] font-mono"
                    />
                    <input
                      type="tel"
                      value={reviewerPhone}
                      onChange={(e) => setReviewerPhone(e.target.value)}
                      placeholder="Order Mobile 03XX (optional, for Verified badge)"
                      className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-white focus:outline-hidden focus:border-[#344B36] font-mono"
                    />
                  </div>

                  <textarea
                    required
                    rows={4}
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    placeholder="Share details on texture, aroma, and natural taste..."
                    className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-white focus:outline-hidden focus:border-[#344B36]"
                  />

                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-6 py-3 bg-[#344B36] text-[#F7F4EC] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#233425] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review for Moderation'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div>
          <h3 className="font-serif text-2xl font-bold text-[#302A25] mb-6">
            Harmonious Pantry Pairings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((rel) => (
              <div
                key={rel.id}
                onClick={() => {
                  navigate(`/product/${rel.slug}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white rounded-2xl p-4 border border-[#E7DDCA] hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#F7F4EC] mb-3">
                    <img
                      src={rel.imageUrl}
                      alt={rel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="text-[10px] font-mono uppercase text-[#B69A62] block mb-1">
                    {rel.categoryLabel}
                  </span>
                  <h4 className="font-serif text-base font-bold text-[#302A25] truncate">
                    {rel.name}
                  </h4>
                </div>
                <div className="mt-3 pt-3 border-t border-[#E7DDCA] flex items-center justify-between">
                  <span className="font-serif text-sm font-bold text-[#344B36] tabular-nums">
                    Rs. {rel.variants[0].price.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#344B36] font-bold underline">
                    View
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
