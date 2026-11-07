import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { PaymentMethod } from '../types';
import { PAKISTAN_CITIES } from '../data/mockData';
import {
  ShieldCheck,
  Building,
  Smartphone,
  Banknote,
  ArrowLeft,
  AlertCircle,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CheckoutView: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    shippingFee,
    appliedCoupon,
    couponDiscount,
    cartTotal,
    placeOrder,
    setActiveView,
    settings,
  } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('03');
  const [customerEmail, setCustomerEmail] = useState('');
  const [province, setProvince] = useState('Punjab');
  const [city, setCity] = useState('Lahore');
  const [address, setAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [bankRef, setBankRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#344B36]">
          Your Selection is Empty
        </h2>
        <p className="text-xs text-[#5E5750]">
          Please add items to your cart before proceeding to checkout.
        </p>
        <button
          onClick={() => setActiveView('shop')}
          className="px-6 py-2.5 bg-[#344B36] text-[#F7F4EC] text-xs uppercase tracking-wider font-bold rounded-xl hover:bg-[#233425] cursor-pointer"
        >
          Explore Mountain Harvests
        </button>
      </div>
    );
  }

  const validatePakistaniPhone = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return cleaned.length === 11 && cleaned.startsWith('03');
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Please provide your recipient name.');
      return;
    }

    if (!validatePakistaniPhone(customerPhone)) {
      setErrorMessage(
        'Please enter a valid Pakistani mobile number starting with 03 (e.g. 0300-1234567 or 03211234567).'
      );
      return;
    }

    if (!address.trim() || address.trim().length < 8) {
      setErrorMessage(
        'Please provide a complete street/house/sector delivery address.'
      );
      return;
    }

    if (paymentMethod === 'BankTransfer' && !bankRef.trim()) {
      setErrorMessage(
        'Please provide your Bank Transfer transaction reference ID or sender account title.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const orderItems = cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantWeight: item.weight,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        imageUrl: item.imageUrl,
      }));

      await placeOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        city,
        province,
        address: address.trim(),
        specialInstructions: specialInstructions.trim() || undefined,
        items: orderItems,
        subtotal: cartSubtotal,
        shippingFee,
        discountAmount: couponDiscount,
        couponCode: appliedCoupon?.code,
        totalAmount: cartTotal,
        paymentMethod,
        internalNotes: bankRef ? [`Bank Reference: ${bankRef}`] : [],
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setActiveView('track');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        'An unexpected error occurred while placing your order. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        onClick={() => setActiveView('shop')}
        className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#344B36] hover:underline mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Pantry</span>
      </button>

      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#A5AD91] block mb-1">
          Finalize Selection
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#344B36]">
          Checkout · Nationwide Delivery
        </h1>
        <p className="text-xs text-[#5E5750] mt-1.5 flex items-center justify-center space-x-1.5">
          <Lock className="w-3.5 h-3.5 text-[#B69A62]" />
          <span>Encrypted Order Processing · Direct Dispatch from Central Hub</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form (2 cols) */}
        <form onSubmit={handleSubmitOrder} className="lg:col-span-2 space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Contact Information */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DDCA] shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E7DDCA]">
              <span className="w-5 h-5 rounded-full bg-[#344B36] text-[#F7F4EC] text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="font-serif text-lg font-bold text-[#302A25]">
                Recipient &amp; Contact Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-xs font-bold text-[#302A25] uppercase tracking-wider block mb-1">
                  Full Name <span className="text-[#B96F50]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-[#F7F4EC] focus:outline-hidden focus:border-[#344B36]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#302A25] uppercase tracking-wider block mb-1">
                  Mobile Number (03XX-XXXXXXX) <span className="text-[#B96F50]">*</span>
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full text-xs pl-9 pr-3 py-3 rounded-xl border border-[#E7DDCA] bg-[#F7F4EC] focus:outline-hidden focus:border-[#344B36]"
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Rider will send dispatch confirmation via SMS.
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#302A25] uppercase tracking-wider block mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-[#F7F4EC] focus:outline-hidden focus:border-[#344B36]"
              />
            </div>
          </div>

          {/* 2. Delivery Address */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DDCA] shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E7DDCA]">
              <span className="w-5 h-5 rounded-full bg-[#344B36] text-[#F7F4EC] text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="font-serif text-lg font-bold text-[#302A25]">
                Delivery Address in Pakistan
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-xs font-bold text-[#302A25] uppercase tracking-wider block mb-1">
                  Province
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-[#F7F4EC]"
                >
                  <option>Punjab</option>
                  <option>Sindh</option>
                  <option>Khyber Pakhtunkhwa (KPK)</option>
                  <option>Balochistan</option>
                  <option>Islamabad Capital Territory</option>
                  <option>Gilgit-Baltistan</option>
                  <option>Azad Jammu &amp; Kashmir (AJK)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#302A25] uppercase tracking-wider block mb-1">
                  City
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-[#F7F4EC]"
                >
                  {PAKISTAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#302A25] uppercase tracking-wider block mb-1">
                Complete Street Address <span className="text-[#B96F50]">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / Flat No., Street, Sector / Block, Colony or Town"
                className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-[#F7F4EC] focus:outline-hidden focus:border-[#344B36] leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#302A25] uppercase tracking-wider block mb-1">
                Special Delivery Notes (Optional)
              </label>
              <input
                type="text"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Ring gate bell, Nearest landmark: Jamia Masjid Bilal"
                className="w-full text-xs p-3 rounded-xl border border-[#E7DDCA] bg-[#F7F4EC] focus:outline-hidden focus:border-[#344B36]"
              />
            </div>
          </div>

          {/* 3. Payment Method */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7DDCA] shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E7DDCA]">
              <span className="w-5 h-5 rounded-full bg-[#344B36] text-[#F7F4EC] text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="font-serif text-lg font-bold text-[#302A25]">
                Select Payment Method
              </h3>
            </div>

            <div className="space-y-3 pt-1">
              <label
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 rounded-2xl border flex items-start space-x-3.5 cursor-pointer transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-[#344B36] bg-[#F7F4EC]'
                    : 'border-[#E7DDCA] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-1 text-[#344B36]"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Banknote className="w-4 h-4 text-[#344B36]" />
                    <span className="text-sm font-bold text-[#302A25]">
                      Cash on Delivery (COD)
                    </span>
                    <span className="bg-[#A5AD91]/25 text-[#344B36] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Standard
                    </span>
                  </div>
                  <p className="text-xs text-[#5E5750] mt-1 leading-relaxed">
                    Pay in cash upon doorstep delivery by courier across all cities in Pakistan.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setPaymentMethod('BankTransfer')}
                className={`p-4 rounded-2xl border flex items-start space-x-3.5 cursor-pointer transition-all ${
                  paymentMethod === 'BankTransfer'
                    ? 'border-[#344B36] bg-[#F7F4EC]'
                    : 'border-[#E7DDCA] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'BankTransfer'}
                  onChange={() => setPaymentMethod('BankTransfer')}
                  className="mt-1 text-[#344B36]"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-[#344B36]" />
                    <span className="text-sm font-bold text-[#302A25]">
                      Direct Islamic Bank Transfer (Meezan Bank)
                    </span>
                  </div>
                  <p className="text-xs text-[#5E5750] mt-1 leading-relaxed">
                    Online IBFT or ATM transfer to our corporate Islamic banking account.
                  </p>

                  {paymentMethod === 'BankTransfer' && (
                    <div className="mt-3.5 p-3.5 rounded-xl bg-white border border-[#E7DDCA] space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2 text-gray-700">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Bank:</span>
                          <span className="font-bold">{settings.bankDetails.bankName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Title:</span>
                          <span className="font-bold">{settings.bankDetails.accountTitle}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Account No:</span>
                          <span className="font-mono font-bold">{settings.bankDetails.accountNumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">IBAN:</span>
                          <span className="font-mono font-bold text-[11px] truncate block">
                            {settings.bankDetails.iban}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="text-[11px] font-bold text-[#302A25] block mb-1">
                          Transfer Reference ID / Sender Title:
                        </label>
                        <input
                          type="text"
                          value={bankRef}
                          onChange={(e) => setBankRef(e.target.value)}
                          placeholder="e.g. Trx ID 948271 or Sender Tariq Mehmood"
                          className="w-full text-xs p-2.5 rounded-lg border border-[#E7DDCA] bg-[#F7F4EC]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>

              <label
                onClick={() => setPaymentMethod('Raast')}
                className={`p-4 rounded-2xl border flex items-start space-x-3.5 cursor-pointer transition-all ${
                  paymentMethod === 'Raast'
                    ? 'border-[#344B36] bg-[#F7F4EC]'
                    : 'border-[#E7DDCA] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'Raast'}
                  onChange={() => setPaymentMethod('Raast')}
                  className="mt-1 text-[#344B36]"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-[#344B36]" />
                    <span className="text-sm font-bold text-[#302A25]">
                      State Bank of Pakistan (Raast Instant ID)
                    </span>
                  </div>
                  <p className="text-xs text-[#5E5750] mt-1 leading-relaxed">
                    Zero fees instant mobile transfer via State Bank Raast ID: <strong>{settings.bankDetails.raastId}</strong>
                  </p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#344B36] hover:bg-[#233425] text-[#F7F4EC] rounded-2xl font-sans text-xs uppercase tracking-widest font-bold flex items-center justify-center space-x-2 shadow-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-[#B69A62]" />
            <span>
              {submitting
                ? 'Processing Your Order...'
                : `Confirm Order · Rs. ${cartTotal.toLocaleString()}`}
            </span>
          </button>
        </form>

        {/* Order Summary (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7DDCA] shadow-xl h-fit space-y-5 sticky top-24">
          <h3 className="font-serif text-lg font-bold text-[#302A25] pb-3 border-b border-[#E7DDCA]">
            Order Summary ({cart.reduce((a, b) => a + b.quantity, 0)} Items)
          </h3>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={item.variantId}
                className="flex items-center space-x-3 text-xs py-1.5 border-b border-gray-100"
              >
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="w-12 h-12 rounded-xl object-cover border border-[#E7DDCA]"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#302A25] truncate">
                    {item.productName}
                  </p>
                  <p className="text-[11px] text-[#A5AD91]">
                    {item.weight} × {item.quantity}
                  </p>
                </div>
                <span className="font-semibold text-[#344B36] tabular-nums">
                  Rs. {(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs text-[#5E5750] bg-[#F7F4EC] p-4 rounded-2xl border border-[#E7DDCA]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-[#302A25] tabular-nums">
                Rs. {cartSubtotal.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Shipping to {city}:</span>
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
                <span>Voucher ({appliedCoupon?.code}):</span>
                <span className="tabular-nums">- Rs. {couponDiscount.toLocaleString()}</span>
              </div>
            )}

            <div className="pt-3 border-t border-[#E7DDCA] flex justify-between font-bold text-sm text-[#344B36]">
              <span>Payable Total:</span>
              <span className="font-serif text-xl tabular-nums">
                Rs. {cartTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
