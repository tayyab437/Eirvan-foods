import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/apiClient';
import { Order, OrderStatus } from '../types';
import { isValidPakistaniPhone, normalizePakistaniPhone } from '../utils/phone';
import {
  Package,
  Search,
  CheckCircle2,
  Truck,
  Printer,
  ShieldCheck,
  AlertCircle,
  ShoppingBag,
  Lock,
} from 'lucide-react';

const STATUS_STEPS: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Delivered',
];

function loadSavedOrder(): Order | null {
  try {
    const raw = sessionStorage.getItem('eirvan_last_order');
    return raw ? (JSON.parse(raw) as Order) : null;
  } catch {
    return null;
  }
}

export const OrderTrackingView: React.FC = () => {
  const { lastPlacedOrder, settings } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialOrder = lastPlacedOrder || loadSavedOrder();

  const [orderRefInput, setOrderRefInput] = useState(
    searchParams.get('ref') || initialOrder?.orderNumber || ''
  );
  const [phoneInput, setPhoneInput] = useState(
    initialOrder?.customerPhone || ''
  );
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(initialOrder);
  const [privacyLevel, setPrivacyLevel] = useState<'full' | 'masked'>('full');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (lastPlacedOrder) {
      setSearchedOrder(lastPlacedOrder);
      setOrderRefInput(lastPlacedOrder.orderNumber);
      setPrivacyLevel('full');
    }
  }, [lastPlacedOrder]);

  useEffect(() => {
    const ref = searchParams.get('ref')?.trim();
    const token = searchParams.get('token')?.trim();
    if (!ref || !token) return;

    let active = true;
    setSearching(true);
    setSearchError(null);

    apiRequest<{ success: boolean; privacyLevel?: 'full' | 'masked'; order: Order }>('/api/tracking', {
      method: 'POST',
      body: { orderNumber: ref, trackingToken: token },
    })
      .then((res) => {
        if (!active) return;
        setSearchedOrder(res.order);
        setPrivacyLevel(res.privacyLevel || 'full');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setSearchError(
          err instanceof Error ? err.message : 'Unable to locate order for this tracking link.'
        );
      })
      .finally(() => {
        if (active) setSearching(false);
      });

    return () => {
      active = false;
    };
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    const ref = orderRefInput.trim().toUpperCase();
    const phone = normalizePakistaniPhone(phoneInput);

    if (!ref || !isValidPakistaniPhone(phone)) {
      setSearchError(
        'Please enter both your Order Reference (e.g. ZDS-2026-...) and your registered Pakistani mobile number (03XX-XXXXXXX or +923XX...).'
      );
      return;
    }

    setSearching(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        privacyLevel?: 'full' | 'masked';
        order: Order;
      }>('/api/tracking', {
        method: 'POST',
        body: { orderNumber: ref, phone },
      });

      setSearchedOrder(res.order);
      setPrivacyLevel(res.privacyLevel || 'masked');
    } catch (err: unknown) {
      setSearchError(
        err instanceof Error
          ? err.message
          : 'No matching order found. Please verify your Order Reference and 03XX mobile number.'
      );
    } finally {
      setSearching(false);
    }
  };

  const currentStepIndex = searchedOrder
    ? STATUS_STEPS.indexOf(searchedOrder.orderStatus)
    : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      {/* Search Bar */}
      <div className="text-center max-w-2xl mx-auto mb-12 print:hidden">
        <div className="inline-flex items-center space-x-1.5 text-[11px] font-mono tracking-widest uppercase text-[#B69A62] mb-2">
          <Truck className="w-3.5 h-3.5" />
          <span>Courier Logistics &amp; Dispatch Verification</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#302A25]">
          Track Your Pantry Consignment
        </h1>
        <p className="text-xs sm:text-sm text-[#302A25]/70 mt-2 font-light">
          For your privacy, please verify both your Order Reference and registered Pakistani mobile number
        </p>

        <form onSubmit={handleSearch} className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative sm:col-span-5">
            <Search className="w-4 h-4 text-[#302A25]/40 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              value={orderRefInput}
              onChange={(e) => setOrderRefInput(e.target.value)}
              placeholder="Order Ref (e.g. ZDS-2026-A1B2C3)"
              className="w-full text-xs pl-10 pr-3 py-3 border border-[#E7DDCA] bg-[#FFFFFF] text-[#302A25] focus:outline-hidden focus:border-[#344B36] font-mono"
            />
          </div>
          <div className="relative sm:col-span-4">
            <input
              type="tel"
              required
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="03XX-XXXXXXX"
              className="w-full text-xs px-3.5 py-3 border border-[#E7DDCA] bg-[#FFFFFF] text-[#302A25] focus:outline-hidden focus:border-[#344B36] font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="sm:col-span-3 px-5 py-3 bg-[#344B36] text-[#F7F4EC] text-xs font-mono uppercase tracking-wider hover:bg-[#2C3E2E] cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            {searching ? 'Checking...' : 'Track Order'}
          </button>
        </form>

        {searchError && (
          <p className="text-xs text-red-700 mt-3 flex items-center justify-center space-x-1 font-mono">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{searchError}</span>
          </p>
        )}
      </div>

      {searchedOrder ? (
        <div className="space-y-8">
          {privacyLevel === 'masked' && (
            <div className="p-3.5 bg-[#F7F4EC] border border-[#E7DDCA] text-[#302A25]/80 text-xs flex items-center space-x-2 print:hidden">
              <Lock className="w-4 h-4 text-[#B69A62] shrink-0" />
              <span>
                Privacy protection active: street address and personal digits are masked during lookup verification.
              </span>
            </div>
          )}

          {/* Status Tracker Card (Hidden in print) */}
          <div className="bg-[#FFFFFF] p-6 sm:p-8 border border-[#E7DDCA] shadow-sm print:hidden space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#E7DDCA] gap-2">
              <div>
                <span className="text-[11px] font-mono text-[#302A25]/50 block uppercase tracking-wider">Consignment Reference</span>
                <span className="font-serif text-2xl text-[#344B36]">
                  {searchedOrder.orderNumber}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs px-3 py-1 font-mono uppercase tracking-wider bg-[#F7F4EC] text-[#344B36] border border-[#344B36]/30">
                  Status: {searchedOrder.orderStatus}
                </span>
                <button
                  onClick={handlePrint}
                  className="p-2 border border-[#E7DDCA] hover:bg-[#F7F4EC] text-[#302A25] transition-colors cursor-pointer"
                  title="Print Formal Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {searchedOrder.orderStatus === 'Cancelled' || searchedOrder.orderStatus === 'Returned' ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                This consignment has been marked as <strong>{searchedOrder.orderStatus}</strong>. Contact our helpline if you have questions regarding stock or settlement.
              </div>
            ) : (
              <>
                {/* Visual Timeline Stepper */}
                <div className="py-8 relative">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#244C37] to-[#B69A62] transition-all duration-1000 ease-out"
                      style={{ width: `${(Math.max(0, currentStepIndex) / (STATUS_STEPS.length - 1)) * 100}%` }}
                    ></div>
                  </div>

                  <div className="relative flex justify-between">
                    {[
                      { label: 'Placed', icon: ShoppingBag, status: 'Pending' },
                      { label: 'QA Check', icon: ShieldCheck, status: 'Processing' },
                      { label: 'Sealed', icon: Package, status: 'Packed' },
                      { label: 'Dispatched', icon: Truck, status: 'Shipped' },
                      { label: 'Delivered', icon: CheckCircle2, status: 'Delivered' },
                    ].map((stage) => {
                      const statusIdx = STATUS_STEPS.indexOf(stage.status as OrderStatus);
                      const isCompleted = currentStepIndex >= statusIdx;
                      const isCurrent = searchedOrder.orderStatus === stage.status;

                      return (
                        <div key={stage.label} className="flex flex-col items-center group">
                          <div 
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 ${
                              isCompleted 
                                ? 'bg-[#244C37] text-[#B69A62] shadow-lg shadow-[#244C37]/20 scale-110' 
                                : 'bg-white text-gray-300 border-2 border-gray-100'
                            } ${isCurrent ? 'ring-4 ring-[#B69A62]/30' : ''}`}
                          >
                            <stage.icon className={`w-6 h-6 ${isCurrent ? 'animate-bounce-subtle' : ''}`} />
                          </div>
                          <div className="absolute mt-14 flex flex-col items-center text-center w-24">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isCompleted ? 'text-[#244C37]' : 'text-gray-400'}`}>
                              {stage.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] bg-[#B69A62]/10 text-[#B69A62] px-2 py-0.5 rounded-full font-bold mt-1 animate-pulse">
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="h-10"></div> {/* Spacer for absolute labels */}
              </>
            )}

            {/* Courier dispatch note */}
            <div className="p-4 bg-[#F7F4EC] border border-[#E7DDCA] flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
              <div className="flex items-center space-x-3">
                <Truck className="w-5 h-5 text-[#B69A62] shrink-0" />
                <div>
                  <p className="font-medium text-[#302A25]">
                    Logistics Courier: {searchedOrder.courier || 'TCS Express Pakistan'}
                  </p>
                  <p className="text-[#302A25]/60 text-[11px] font-mono">
                    Consignment No: <span className="font-semibold text-[#302A25]">{searchedOrder.trackingNumber || 'Pending Courier Intake'}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#302A25]/50 block">Est. Arrival Window:</span>
                <span className="font-serif text-sm font-semibold text-[#344B36]">
                  {searchedOrder.city === 'Lahore' || searchedOrder.city === 'Islamabad'
                    ? '24–48 Hours Priority Transit'
                    : '2 to 4 Business Days'}
                </span>
              </div>
            </div>
          </div>

          {/* Printable Formal Tax Invoice & Receipt */}
          <div className="bg-[#FFFFFF] p-8 sm:p-12 border border-[#E7DDCA] shadow-sm text-[#302A25] print:border-none print:shadow-none print:p-0">
            {/* Invoice Top Header */}
            <div className="flex justify-between items-start pb-6 border-b border-[#E7DDCA]">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-white p-1 border border-[#0A3D62]/20 flex items-center justify-center shadow-xs">
                    <img
                      src="/assets/aistudio/Eirvan_Foods_Natural_Goodness_Logo_8d5cce5b.png"
                      alt="Eirvan Foods"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="font-serif text-2xl font-bold text-[#0A3D62]">
                      Eirvan Foods®
                    </span>
                    <span className="block text-[10px] font-sans font-bold text-[#4E9B36] tracking-wider uppercase">
                      Natural Goodness • Better Tomorrow
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#15222E]/70 mt-1 font-light">
                  Eirvan Foods (Pvt) Ltd • Single-Origin Mountain Harvests
                </p>
                <p className="text-[11px] text-[#15222E]/50 font-mono mt-0.5">
                  Gulberg III, Lahore, Pakistan • Helpline:{' '}
                  <a
                    href={`tel:${settings.contactPhone.replace(/[^0-9+]/g, '')}`}
                    className="text-[#344B36] hover:underline font-semibold"
                  >
                    {settings.contactPhone}
                  </a>
                </p>
                <p className="text-[10px] text-[#4E9B36] font-mono font-medium">
                  Registered with Punjab Food Authority (PFA-LHR-2026-921)
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#B69A62] block">
                  Official Harvest Invoice
                </span>
                <span className="font-serif text-xl font-bold text-[#302A25] block mt-0.5">
                  {searchedOrder.orderNumber}
                </span>
                <span className="text-xs text-[#302A25]/60 font-mono block">
                  Date: {new Date(searchedOrder.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Customer & Address Details */}
            <div className="grid grid-cols-2 gap-6 py-6 border-b border-[#E7DDCA] text-xs">
              <div>
                <span className="font-mono uppercase text-[10px] tracking-wider text-[#302A25]/50 block mb-1">
                  Recipient & Destination:
                </span>
                <p className="font-medium text-sm text-[#302A25]">
                  {searchedOrder.customerName}
                </p>
                <p className="text-[#302A25]/70 mt-0.5">{searchedOrder.address}</p>
                <p className="text-[#302A25]/70">
                  {searchedOrder.city}, {searchedOrder.province}, Pakistan
                </p>
                <p className="text-[#302A25]/80 font-mono mt-1">
                  Contact: {searchedOrder.customerPhone}
                </p>
              </div>

              <div className="text-right">
                <span className="font-mono uppercase text-[10px] tracking-wider text-[#302A25]/50 block mb-1">
                  Settlement Details:
                </span>
                <p className="font-medium text-sm text-[#302A25]">
                  {searchedOrder.paymentMethod === 'COD'
                    ? 'Cash on Delivery (COD)'
                    : searchedOrder.paymentMethod === 'BankTransfer'
                    ? 'Direct Bank Transfer'
                    : 'Raast Instant Settlement'}
                </p>
                <p className="text-[#302A25]/70 mt-0.5 font-mono">
                  Payment Status:{' '}
                  <span className="font-bold text-[#344B36]">
                    {searchedOrder.paymentStatus}
                  </span>
                </p>
                {searchedOrder.specialInstructions && (
                  <p className="text-[#302A25]/60 italic mt-1 font-light">
                    Note: &quot;{searchedOrder.specialInstructions}&quot;
                  </p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="py-6 border-b border-[#E7DDCA] overflow-x-auto w-full">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#E7DDCA] text-left text-[#302A25]/50 font-mono uppercase text-[10px] tracking-wider">
                    <th className="pb-2">Harvest Description</th>
                    <th className="pb-2">Weight</th>
                    <th className="pb-2">SKU</th>
                    <th className="pb-2 text-right">Unit Price</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7DDCA]/50 font-sans">
                  {searchedOrder.items.map((item: any, idx: number) => (
                    <tr key={idx} className="py-3">
                      <td className="py-3 font-medium text-[#302A25]">
                        {item.productName}
                      </td>
                      <td className="py-3 text-[#302A25]/70 font-mono text-[11px]">{item.variantWeight}</td>
                      <td className="py-3 font-mono text-[11px] text-[#302A25]/50">
                        {item.sku}
                      </td>
                      <td className="py-3 text-right text-[#302A25]/80 font-mono">
                        Rs. {item.price.toLocaleString()}
                      </td>
                      <td className="py-3 text-center font-mono font-medium">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-[#344B36]">
                        Rs. {(item.price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Total */}
            <div className="py-6 flex justify-end">
              <div className="w-64 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[#302A25]/70">
                  <span>Subtotal:</span>
                  <span>Rs. {searchedOrder.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#302A25]/70">
                  <span>Nationwide Courier:</span>
                  <span>
                    {searchedOrder.shippingFee === 0
                      ? 'FREE'
                      : `Rs. ${searchedOrder.shippingFee.toLocaleString()}`}
                  </span>
                </div>
                {searchedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-[#344B36] font-semibold">
                    <span>Discount Privilege:</span>
                    <span>- Rs. {searchedOrder.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-[#E7DDCA] flex justify-between font-bold text-sm text-[#344B36]">
                  <span>Total Payable:</span>
                  <span className="font-serif text-lg">
                    Rs. {searchedOrder.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer notes on receipt */}
            <div className="pt-4 border-t border-[#E7DDCA] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#302A25]/60 space-y-2 sm:space-y-0">
              <p className="font-light">
                Thank you for patronizing authentic Pakistani harvests. Support helpline:{' '}
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#344B36] hover:underline"
                >
                  {settings.whatsappNumber}
                </a>
              </p>
              <div className="flex items-center space-x-1.5 text-[#B69A62]">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-mono text-[10px] uppercase tracking-wider">100% Single-Origin Botanical Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-[#FFFFFF] border border-[#E7DDCA] p-8 space-y-4">
          <Package className="w-12 h-12 text-[#B69A62] mx-auto stroke-1" />
          <h3 className="font-serif text-xl text-[#302A25]">
            No Active Orders Found
          </h3>
          <p className="text-xs text-[#302A25]/70 max-w-sm mx-auto font-light leading-relaxed">
            Enter your order reference above or explore our seasonal harvests to place an order.
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="px-6 py-2.5 bg-[#344B36] text-[#F7F4EC] text-xs font-mono uppercase tracking-wider hover:bg-[#2C3E2E] cursor-pointer"
          >
            Explore The Pantry
          </button>
        </div>
      )}
    </div>
  );
};

