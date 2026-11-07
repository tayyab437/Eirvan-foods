import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Tag,
  Truck,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQuantity,
    removeFromCart,
    cartSubtotal,
    shippingFee,
    appliedCoupon,
    couponDiscount,
    cartTotal,
    freeShippingRemaining,
    applyCoupon,
    removeCoupon,
    setActiveView,
    settings,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const result = applyCoupon(couponInput);
    setCouponFeedback(result);
    if (result.success) {
      setCouponInput('');
    }
  };

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setActiveView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#E7DDCA] animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4.5 bg-[#F7F4EC] border-b border-[#E7DDCA] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShoppingBag className="w-5 h-5 text-[#344B36]" />
            <h3 className="font-serif text-lg font-bold text-[#302A25]">
              Your Selection ({cart.reduce((a, b) => a + b.quantity, 0)})
            </h3>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-full hover:bg-[#E7DDCA] text-gray-500 hover:text-black transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div className="px-6 py-3 bg-[#344B36] text-[#F7F4EC] text-xs">
          {freeShippingRemaining > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[#E7DDCA]">
                  Add Rs. {freeShippingRemaining.toLocaleString()} for complimentary delivery:
                </span>
                <span className="font-bold text-[#B69A62] tabular-nums">
                  {Math.round(((settings.freeShippingThreshold - freeShippingRemaining) / settings.freeShippingThreshold) * 100)}%
                </span>
              </div>
              <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#B69A62] h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      ((settings.freeShippingThreshold - freeShippingRemaining) /
                        settings.freeShippingThreshold) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 font-semibold text-[#E7DDCA]">
              <Truck className="w-4 h-4 text-[#B69A62]" />
              <span>Complimentary nationwide delivery unlocked across Pakistan.</span>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-6 divide-y divide-gray-100">
          {cart.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#F7F4EC] flex items-center justify-center mx-auto text-[#A5AD91]">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-serif text-lg font-bold text-[#302A25]">
                Your pantry is empty
              </h4>
              <p className="text-xs text-[#5E5750] max-w-xs mx-auto leading-relaxed">
                Discover our hand-harvested Kashmiri Mamra almonds, stone-white walnuts, and curated gift hampers.
              </p>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setActiveView('shop');
                }}
                className="px-6 py-2.5 bg-[#344B36] text-[#F7F4EC] text-xs uppercase tracking-wider font-bold rounded-xl hover:bg-[#233425] cursor-pointer shadow-md transition-colors"
              >
                Explore Selections
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.variantId} className="py-4 flex space-x-3.5">
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="w-18 h-18 rounded-2xl object-cover border border-[#E7DDCA] bg-[#F7F4EC]"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-[#302A25] truncate pr-2">
                        {item.productName}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.variantId)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[11px] text-[#A5AD91] font-semibold">
                      Weight: {item.weight}
                    </div>

                    {item.boxStyle && (
                      <div className="text-[10px] text-gray-500 line-clamp-1">
                        Box: {item.boxStyle}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Stepper */}
                    <div className="flex items-center border border-[#E7DDCA] rounded-lg bg-white overflow-hidden">
                      <button
                        onClick={() =>
                          updateCartQuantity(item.variantId, item.quantity - 1)
                        }
                        className="p-1 hover:bg-[#F7F4EC] text-gray-600 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-[#302A25] tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateCartQuantity(item.variantId, item.quantity + 1)
                        }
                        className="p-1 hover:bg-[#F7F4EC] text-gray-600 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[#344B36] tabular-nums">
                        Rs. {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer with Coupon & Checkout */}
        {cart.length > 0 && (
          <div className="p-6 bg-[#F7F4EC] border-t border-[#E7DDCA] space-y-4">
            {/* Promo Code */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-white border border-[#E7DDCA] rounded-xl text-xs text-[#344B36]">
                  <div className="flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#B69A62]" />
                    <span>
                      Voucher <strong>{appliedCoupon.code}</strong> applied (-Rs.{' '}
                      {couponDiscount.toLocaleString()})
                    </span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-[#B96F50] hover:text-red-800 font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex space-x-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Promo Code (e.g. WELCOME10)"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white rounded-xl border border-[#E7DDCA] focus:outline-hidden focus:border-[#344B36]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#344B36] text-[#F7F4EC] text-xs uppercase tracking-wider font-bold rounded-xl hover:bg-[#233425] transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}

              {couponFeedback && !appliedCoupon && (
                <p
                  className={`text-[11px] mt-1 ${
                    couponFeedback.success ? 'text-emerald-700' : 'text-[#B96F50]'
                  }`}
                >
                  {couponFeedback.message}
                </p>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-[#5E5750]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-[#302A25] tabular-nums">
                  Rs. {cartSubtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Nationwide Shipping:</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="text-[#344B36] font-semibold">Complimentary</span>
                  ) : (
                    `Rs. ${shippingFee.toLocaleString()}`
                  )}
                </span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-[#B96F50] font-semibold">
                  <span>Savings:</span>
                  <span className="tabular-nums">- Rs. {couponDiscount.toLocaleString()}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#E7DDCA] flex justify-between text-sm font-bold text-[#344B36]">
                <span>Total Amount:</span>
                <span className="font-serif text-lg tabular-nums">
                  Rs. {cartTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 bg-[#344B36] hover:bg-[#233425] text-[#F7F4EC] rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
