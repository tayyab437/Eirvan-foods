import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Product, Order, OrderStatus, ProductVariant, Coupon, StoreSettings } from '../types';
import { buildSafeCsv } from '../utils/csvExport';
import {
  IONOS_PHP_SECRETS_TEMPLATE,
  IONOS_DEPLOYMENT_CHECKLIST,
} from '../services/ionosExport';
import {
  BarChart3,
  Package,
  ShoppingBag,
  Layers,
  Tag,
  MessageSquare,
  Settings,
  Server,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  ExternalLink,
  Search,
  DollarSign,
  TrendingUp,
  Clock,
  Printer,
  ChevronRight,
  Filter,
  Eye,
  Users,
  Gift,
  Phone,
  MapPin,
  RotateCcw,
  Building2,
  Mail,
  Calendar,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    products,
    categoriesList,
    shahiMixBoxes,
    shahiMixIngredients,
    orders,
    coupons,
    reviews,
    settings,
    updateSettings,
    updateProduct,
    addNewProduct,
    deleteProduct,
    updateOrderStatus,
    addCoupon,
    toggleCoupon,
    deleteCoupon,
    addCategory,
    deleteCategory,
    addShahiMixBox,
    updateShahiMixBox,
    deleteShahiMixBox,
    addShahiMixIngredient,
    updateShahiMixIngredient,
    deleteShahiMixIngredient,
    wholesaleInquiries,
    updateWholesaleStatus,
    deleteWholesaleInquiry,
    moderateReview,
    deleteReview,
    backfillCatalogToFirestore,
    ordersPagination,
    couponsPagination,
    reviewsPagination,
    wholesalePagination,
    loadMoreOrders,
    loadMoreCoupons,
    loadMoreReviews,
    loadMoreWholesale,
    refreshAdminData,
    currentUser,
    isAuthReady,
    isAdminUser,
    signInWithGoogle,
    signOutUser,
    isFirebaseSyncing,
  } = useStore();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    'analytics' | 'products' | 'categories' | 'orders' | 'completed-orders' | 'returns' | 'customers' | 'wholesale' | 'inventory' | 'coupons' | 'shahi-mix' | 'reviews' | 'settings' | 'ionos'
  >('analytics');

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState<'default' | 'views-desc' | 'views-asc' | 'stock-low'>('default');

  // Category management state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image: '',
  });
  const [categoryFeedback, setCategoryFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Shahi Mix Builder Management state
  const [shahiMixSubTab, setShahiMixSubTab] = useState<'ingredients' | 'boxes'>('ingredients');
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    image: '',
    inStock: true,
    inventoryPolicy: 'tracked' as 'tracked' | 'unlimited',
    stockGrams: 5000,
    price10g: 90,
    price50g: 450,
    price100g: 800,
    price250g: 1900,
    price500g: 3700,
    price1kg: 7200,
  });

  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [boxForm, setBoxForm] = useState({
    name: '',
    urduName: '',
    capacity: 4,
    basePrice: 1950,
    image: '',
    description: '',
    inStock: true,
    inventoryPolicy: 'tracked' as 'tracked' | 'unlimited',
    stock: 25,
  });
  const [shahiMixFeedback, setShahiMixFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Product edit modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  // Coupon modal state
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState<Coupon>({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 2000,
    isActive: true,
    expiryDate: '2026-12-31',
    usageCount: 0,
    usageLimit: undefined,
  });

  // Copy notification & IONOS health check state
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [healthResult, setHealthResult] = useState<{ ok: boolean; status: number; body: string } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Order quick inspector / receipt modal
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);

  // Buffered Store Settings state
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Non-destructive catalog backfill state
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // Calculations for analytics
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'Pending').length;
  const shippedDeliveredCount = orders.filter(
    (o) => o.orderStatus === 'Shipped' || o.orderStatus === 'Delivered'
  ).length;

  const lowStockVariants = products.flatMap((p) =>
    p.variants
      .filter((v) => v.stock < 10)
      .map((v) => ({ product: p, variant: v }))
  );

  const uniqueCustomers = useMemo(() => {
    const customerMap: Record<string, {
      phone: string;
      name: string;
      city: string;
      ordersCount: number;
      totalSpent: number;
      lastOrderDate: string;
    }> = {};

    orders.forEach(order => {
      if (!customerMap[order.customerPhone]) {
        customerMap[order.customerPhone] = {
          phone: order.customerPhone,
          name: order.customerName,
          city: order.city,
          ordersCount: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt
        };
      }
      
      const cust = customerMap[order.customerPhone];
      cust.ordersCount += 1;
      cust.totalSpent += order.totalAmount;
      if (new Date(order.createdAt) > new Date(cust.lastOrderDate)) {
        cust.lastOrderDate = order.createdAt;
      }
    });

    return Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch);
    
    let matchesTab = true;
    if (activeTab === 'orders') {
      // Active = Anything not Delivered, Returned, or Cancelled
      matchesTab = o.orderStatus !== 'Delivered' && o.orderStatus !== 'Returned' && o.orderStatus !== 'Cancelled';
    } else if (activeTab === 'completed-orders') {
      // Completed = Delivered or Cancelled
      matchesTab = o.orderStatus === 'Delivered' || o.orderStatus === 'Cancelled';
    } else if (activeTab === 'returns') {
      matchesTab = o.orderStatus === 'Returned';
    }

    const matchesStatus =
      orderStatusFilter === 'all' || o.orderStatus === orderStatusFilter;
      
    return matchesSearch && matchesStatus && matchesTab;
  });

  const filteredProducts = products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.categoryLabel.toLowerCase().includes(productSearch.toLowerCase())
    )
    .sort((a, b) => {
      if (productSort === 'views-desc') {
        return (b.viewCount || 0) - (a.viewCount || 0);
      }
      if (productSort === 'views-asc') {
        return (a.viewCount || 0) - (b.viewCount || 0);
      }
      if (productSort === 'stock-low') {
        const stockA = a.variants.reduce((acc, v) => acc + v.stock, 0);
        const stockB = b.variants.reduce((acc, v) => acc + v.stock, 0);
        return stockA - stockB;
      }
      return 0;
    });

  const handleCopyText = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper function to generate clean URL slug
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    // Ensure slug is clean and non-empty
    const cleanSlug = editingProduct.slug.trim() || generateSlug(editingProduct.name) || `product-${Date.now()}`;
    const productToSave = {
      ...editingProduct,
      slug: cleanSlug,
    };

    if (isNewProduct) {
      await addNewProduct(productToSave);
    } else {
      await updateProduct(productToSave);
    }

    setEditingProduct(null);
    setIsNewProduct(false);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code.trim()) return;

    const payload: Coupon = {
      ...couponForm,
      usageLimit:
        typeof couponForm.usageLimit === 'number' && couponForm.usageLimit > 0
          ? couponForm.usageLimit
          : undefined,
    };

    await addCoupon(payload);
    setIsCouponModalOpen(false);
    setCouponForm({
      code: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 2000,
      isActive: true,
      expiryDate: '2026-12-31',
      usageCount: 0,
      usageLimit: undefined,
    });
  };

  const handleExportOrders = () => {
    const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'City', 'Address', 'Items', 'Total Amount', 'Payment', 'Status'];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString(),
      o.customerName,
      o.customerPhone,
      o.city,
      o.address,
      o.items.map((it) => `${it.productName} (${it.variantWeight} x ${it.quantity})`).join(' | '),
      o.totalAmount,
      o.paymentMethod,
      o.orderStatus,
    ]);

    const csvContent = buildSafeCsv(headers, rows);
    handleDownloadFile(csvContent, `eirvan_orders_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
  };

  const handleAdminGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err?.message || 'Sign-in failed. Please allow popups and try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F7F4EC] px-4">
        <div className="bg-white rounded-3xl border border-[#E8DDCA] p-10 text-center max-w-md w-full shadow-sm">
          <div className="w-10 h-10 border-2 border-[#244C37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-serif font-bold text-[#244C37]">Verifying Staff Credentials...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !isAdminUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F7F4EC] px-4 py-12">
        <div className="bg-white rounded-3xl border border-[#E8DDCA] p-8 sm:p-10 max-w-md w-full shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#244C37] text-[#B69A62] flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#B69A62] bg-[#244C37]/5 px-3 py-1 rounded-full">
              Protected Staff Portal
            </span>
            <h1 className="font-serif text-2xl font-bold text-[#302A25]">
              {currentUser ? 'Unauthorized Account' : 'Administrator Sign-In'}
            </h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              {currentUser
                ? `Signed in as ${currentUser.email || 'unknown user'}. Please sign in with the authorized store administrator Google account to access orders and wholesale leads.`
                : 'Sign in with your authorized Google administrator account to access Store Operations, Orders, and Wholesale Leads.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-left">
              {authError}
            </div>
          )}

          <div className="space-y-3">
            {currentUser ? (
              <button
                onClick={signOutUser}
                className="w-full py-3.5 bg-[#244C37] hover:bg-[#1A3828] text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-[#B69A62]" />
                <span>Sign Out &amp; Switch Account</span>
              </button>
            ) : (
              <button
                onClick={handleAdminGoogleSignIn}
                disabled={authLoading}
                className="w-full py-3.5 bg-[#244C37] hover:bg-[#1A3828] text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-[#B69A62]" />
                <span>{authLoading ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-[#F8F5ED] border border-[#E8DDCA] text-xs font-bold text-[#302A25] rounded-xl hover:bg-[#EFE8D8] transition-all cursor-pointer"
            >
              Return to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full max-w-full overflow-x-hidden">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E8DDCA] gap-4">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-xs bg-[#344B36] text-[#B69A62] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Staff Portal
            </span>
            <span className="text-xs text-gray-500">• {currentUser.email}</span>
            <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[11px] font-mono border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Firebase Firestore: {isFirebaseSyncing ? 'Syncing...' : 'Connected'}</span>
            </div>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#302A25] mt-1">
            Store Administration & Real-Time Firestore Sync
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Cloud Project: gen-lang-client-0351129330 (asia-southeast1) • Database: ai-studio-zauqesehatpremiu
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white border border-[#E8DDCA] text-xs font-bold text-gray-700 rounded-xl hover:bg-[#F8F5ED] cursor-pointer"
          >
            Preview Storefront
          </button>
          <button
            onClick={() => setActiveTab('ionos')}
            className="px-4 py-2 bg-[#B69A62] hover:bg-[#A38955] text-[#344B36] text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Server className="w-3.5 h-3.5" />
            <span>IONOS PHP Deploy</span>
          </button>
          <button
            onClick={signOutUser}
            className="px-3.5 py-2 bg-white border border-[#E8DDCA] text-xs font-bold text-gray-700 rounded-xl hover:bg-red-50 hover:text-red-700 hover:border-red-200 flex items-center space-x-1.5 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Admin Dashboard Sidebar & Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start mt-6">
        {/* Left Vertical Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 bg-white rounded-3xl border border-[#E8DDCA] p-4 shadow-sm lg:sticky lg:top-6 space-y-5">
          {/* Brand & Portal Header */}
          <div className="px-3.5 py-3 bg-[#F8F5ED] rounded-2xl border border-[#E8DDCA] flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#244C37] text-[#B69A62] flex items-center justify-center font-bold font-serif text-base shadow-xs">
              E
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-serif font-bold text-xs text-[#242821] block leading-tight truncate">
                Eirvan Control
              </span>
              <span className="text-[10px] text-gray-500 font-mono block truncate">
                Staff Admin Panel
              </span>
            </div>
          </div>

          {/* Navigation Items Group 1: Core Store */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Core Operations
            </div>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard KPI</span>
              </div>
              {activeTab === 'analytics' && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Package className="w-4 h-4" />
                <span>Products</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'products'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F8F5ED] border border-[#E8DDCA] text-gray-700'
                }`}
              >
                {products.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Layers className="w-4 h-4 text-[#B69A62]" />
                <span>Categories</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'categories'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F8F5ED] border border-[#E8DDCA] text-gray-700'
                }`}
              >
                {categoriesList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Active Orders</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'orders'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F8F5ED] border border-[#E8DDCA] text-gray-700'
                }`}
              >
                {orders.filter(o => o.orderStatus !== 'Delivered' && o.orderStatus !== 'Returned' && o.orderStatus !== 'Cancelled').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('completed-orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'completed-orders'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Completed Orders</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'completed-orders'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F8F5ED] border border-[#E8DDCA] text-gray-700'
                }`}
              >
                {orders.filter(o => o.orderStatus === 'Delivered' || o.orderStatus === 'Cancelled').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('returns')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'returns'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <RotateCcw className="w-4 h-4" />
                <span>Returns</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'returns'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F8F5ED] border border-[#E8DDCA] text-gray-700'
                }`}
              >
                {orders.filter(o => o.orderStatus === 'Returned').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4" />
                <span>Customers</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'customers'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F8F5ED] border border-[#E8DDCA] text-gray-700'
                }`}
              >
                {[...new Set(orders.map(o => o.customerPhone))].length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('wholesale')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'wholesale'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-4 h-4" />
                <span>Wholesale Leads</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'wholesale'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F8F5ED] border border-[#E8DDCA] text-gray-700'
                }`}
              >
                {wholesaleInquiries.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Layers className="w-4 h-4" />
                <span>Stock Audit</span>
              </div>
              {lowStockVariants.length > 0 && (
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    activeTab === 'inventory'
                      ? 'bg-amber-400 text-gray-900'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {lowStockVariants.length} Low
                </span>
              )}
            </button>
          </div>

          {/* Navigation Items Group 2: Management & Marketing */}
          <div className="space-y-1 pt-3 border-t border-[#E8DDCA]">
            <div className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Management
            </div>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'coupons'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Tag className="w-4 h-4" />
                <span>Coupons</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'coupons'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F8F5ED] border border-[#E8DDCA] text-gray-700'
                }`}
              >
                {coupons.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Reviews</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'reviews'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F8F5ED] border border-[#E8DDCA] text-gray-700'
                }`}
              >
                {reviews.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shahi-mix')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'shahi-mix'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Gift className="w-4 h-4 text-[#B69A62]" />
                <span>Shahi Mix Builder</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'shahi-mix'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F8F5ED] border border-[#E8DDCA] text-gray-700'
                }`}
              >
                {shahiMixIngredients.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#244C37] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-[#F8F5ED] hover:text-[#244C37]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Settings className="w-4 h-4" />
                <span>Store Settings</span>
              </div>
              {activeTab === 'settings' && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            </button>
          </div>

          {/* Navigation Items Group 3: Hosting & Infrastructure */}
          <div className="space-y-1 pt-3 border-t border-[#E8DDCA]">
            <div className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Hosting & Deploy
            </div>

            <button
              onClick={() => setActiveTab('ionos')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ionos'
                  ? 'bg-[#C99A45] text-[#344B36] shadow-xs'
                  : 'text-[#AA7F32] hover:bg-[#F8F5ED] hover:text-[#C99A45]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Server className="w-4 h-4 text-[#C99A45]" />
                <span>IONOS PHP + Firestore</span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                PRO
              </span>
            </button>
          </div>

          {/* Quick Realtime Status Badge */}
          <div className="p-3 bg-[#F8F5ED] rounded-2xl border border-[#E8DDCA] text-[11px] space-y-1">
            <div className="flex items-center justify-between text-gray-600 font-semibold">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Firestore Live</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded font-bold">
                Active
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-mono truncate">
              {isFirebaseSyncing ? 'Syncing updates...' : 'Connected'}
            </p>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 w-full min-w-0">

      {/* TAB 1: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-[#E8DDCA] shadow-xs">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-semibold">Total Revenue</span>
                <DollarSign className="w-4 h-4 text-[#C99A45]" />
              </div>
              <div className="font-serif text-2xl font-bold text-[#244C37]">
                Rs. {totalRevenue.toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                +18.4% from last month
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#E8DDCA] shadow-xs">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-semibold">Total Orders</span>
                <ShoppingBag className="w-4 h-4 text-[#244C37]" />
              </div>
              <div className="font-serif text-2xl font-bold text-[#242821]">
                {totalOrdersCount}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {pendingOrdersCount} pending dispatch
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#E8DDCA] shadow-xs">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-semibold">Average Order Value</span>
                <TrendingUp className="w-4 h-4 text-[#C99A45]" />
              </div>
              <div className="font-serif text-2xl font-bold text-[#242821]">
                Rs.{' '}
                {totalOrdersCount > 0
                  ? Math.round(totalRevenue / totalOrdersCount).toLocaleString()
                  : '0'}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Target: Rs. 4,500/order
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#E8DDCA] shadow-xs">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-semibold">Low-Stock Warnings</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="font-serif text-2xl font-bold text-[#C53030]">
                {lowStockVariants.length}
              </div>
              <p className="text-[11px] text-red-600 font-medium mt-1">
                Requires warehouse replenishment
              </p>
            </div>
          </div>

          {/* Recent Orders table */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8DDCA] shadow-xs">
            <h3 className="font-serif text-lg font-bold text-[#244C37] mb-4">
              Recent Customer Orders (Pakistan)
            </h3>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#E8DDCA] text-left text-gray-400 uppercase text-[10px]">
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">City</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.slice(0, 5).map((ord) => (
                    <tr key={ord.id} className="py-2.5">
                      <td className="py-2.5 font-bold font-mono text-[#244C37]">
                        {ord.orderNumber}
                      </td>
                      <td className="py-2.5">
                        <div className="font-bold">{ord.customerName}</div>
                        <div className="text-[11px] text-gray-400">
                          {ord.customerPhone}
                        </div>
                      </td>
                      <td className="py-2.5">{ord.city}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium text-[10px]">
                          {ord.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        Rs. {ord.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C99A45]/20 text-[#AA7F32]">
                          {ord.orderStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search catalog by name or category..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-white rounded-xl border border-[#E8DDCA]"
                />
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={productSort}
                  onChange={(e) => setProductSort(e.target.value as any)}
                  className="text-xs py-2 px-2.5 bg-white rounded-xl border border-[#E8DDCA] text-gray-700"
                >
                  <option value="default">Sort by Default</option>
                  <option value="views-desc">Most Visited First (Views ▼)</option>
                  <option value="views-asc">Least Visited (Views ▲)</option>
                  <option value="stock-low">Lowest Stock First</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-[#F8F5ED] border border-[#E8DDCA] rounded-xl text-xs text-gray-700">
                <Eye className="w-3.5 h-3.5 text-[#244C37]" />
                <span>Total Catalog Views:</span>
                <span className="font-bold font-mono text-[#244C37]">
                  {products.reduce((acc, p) => acc + (p.viewCount || 0), 0).toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => setActiveTab('categories')}
                className="px-3.5 py-2 bg-white border border-[#E8DDCA] hover:bg-[#F8F5ED] text-[#244C37] text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-2xs cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#B69A62]" />
                <span>Manage Categories</span>
              </button>

              <button
                onClick={() => {
                  const blank: Product = {
                    id: `prod-${Date.now()}`,
                    name: '',
                    urduName: '',
                    slug: '',
                    category: 'nuts',
                    categoryLabel: 'Premium Nuts',
                    shortDescription: 'Fresh mountain harvest from Pakistan.',
                    description: 'Detailed nutritional and origin description.',
                    origin: 'Gilgit-Baltistan, Pakistan',
                    packaging: 'Airtight Vacuum Jar',
                    shelfLife: '12 Months',
                    imageUrl:
                      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=480&q=65&fm=webp',
                    galleryImages: [],
                    variants: [
                      {
                        id: `v-${Date.now()}-1`,
                        weight: '250g',
                        sku: `ZDS-NEW-250`,
                        price: 1500,
                        stock: 25,
                      },
                    ],
                    featured: false,
                    bestSeller: false,
                    rating: 5.0,
                    reviewCount: 0,
                    nutritionFacts: {
                      servingSize: '30g',
                      calories: 160,
                      protein: '5.0g',
                      healthyFats: '14.0g',
                      carbs: '8.0g',
                      fiber: '2.5g',
                      minerals: 'Potassium, Zinc, Iron',
                    },
                    healthBenefits: ['Heart health', 'Brain vitality'],
                    inStock: true,
                    viewCount: 0,
                  };
                  setEditingProduct(blank);
                  setIsNewProduct(true);
                }}
                className="px-4 py-2 bg-[#244C37] hover:bg-[#1A3828] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8DDCA] overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs min-w-[720px]">
              <thead>
                <tr className="bg-[#F8F5ED] border-b border-[#E8DDCA] text-left text-gray-500 uppercase text-[10px]">
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Variants & Prices</th>
                  <th className="p-3">Total Stock</th>
                  <th className="p-3">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3.5 h-3.5 text-[#244C37]" />
                      <span>User Visits</span>
                    </div>
                  </th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const totalStock = p.variants.reduce((a, v) => a + v.stock, 0);
                  const visits = p.viewCount || 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div>
                            <span className="font-bold text-[#242821] block">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-[#C99A45]">
                              {p.origin}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-gray-600">
                        {p.categoryLabel}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {p.variants.map((v) => (
                            <span
                              key={v.id}
                              className="inline-block mr-2 px-2 py-0.5 rounded-md bg-[#F8F5ED] border border-[#E8DDCA] text-[10px]"
                            >
                              <strong>{v.weight}:</strong> Rs.{' '}
                              {(v.salePrice || v.price).toLocaleString()} ({v.stock}{' '}
                              left)
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-bold ${
                            totalStock < 15 ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {totalStock} units
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#F8F5ED] border border-[#E8DDCA] text-gray-800">
                          <Users className="w-3 h-3 text-[#244C37]" />
                          <span className="font-bold font-mono text-[11px]">
                            {visits.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-500">views</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsNewProduct(false);
                            }}
                            className="p-1.5 rounded-lg border border-[#E8DDCA] hover:bg-[#F8F5ED] text-gray-700 cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Archive ${p.name}?`)) {
                                deleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-[#E8DDCA] hover:bg-red-50 text-red-600 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2.5: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="py-6 space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DDCA]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B69A62] bg-[#244C37] px-2.5 py-0.5 rounded-full">
                  Pantry Taxonomy
                </span>
                <span className="text-xs text-gray-500">• {categoriesList.length} Active Categories</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#242821] mt-1">
                Store Categories Catalogue
              </h2>
              <p className="text-xs text-gray-500">
                Add new harvest categories or remove obsolete ones. Changes sync dynamically across product forms and shop navigation.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-white border border-[#E8DDCA] rounded-xl text-xs focus:outline-hidden focus:border-[#244C37] w-48 sm:w-64"
                />
              </div>

              <button
                onClick={() => {
                  setCategoryFeedback(null);
                  setCategoryForm({ name: '', description: '', image: '' });
                  setIsCategoryModalOpen(true);
                }}
                className="px-4 py-2 bg-[#244C37] hover:bg-[#1A3828] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Category</span>
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {categoryFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between ${
                categoryFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {categoryFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>{categoryFeedback.text}</span>
              </div>
              <button onClick={() => setCategoryFeedback(null)} className="text-xs underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoriesList
              .filter(
                (cat) =>
                  cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                  cat.id.toLowerCase().includes(categorySearch.toLowerCase())
              )
              .map((cat) => {
                const prodCount = products.filter((p) => p.category === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="bg-white rounded-3xl border border-[#E8DDCA] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="aspect-16/9 w-full bg-[#F8F5ED] overflow-hidden relative">
                        <img
                          src={
                            cat.image ||
                            'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=480&q=65&fm=webp'
                          }
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                        />
                        <span className="absolute top-3 left-3 bg-[#244C37]/90 backdrop-blur-md text-[#B69A62] text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-white/20">
                          ID: {cat.id}
                        </span>
                        {cat.isSystem && (
                          <span className="absolute top-3 right-3 bg-emerald-700/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-2xs">
                            System Category
                          </span>
                        )}
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-serif text-lg font-bold text-[#242821]">
                            {cat.name}
                          </h3>
                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-[#F8F5ED] border border-[#E8DDCA] text-[#244C37]">
                            {prodCount} {prodCount === 1 ? 'Product' : 'Products'}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {cat.description || 'Natural organic harvest category.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-3 border-t border-[#E8DDCA]/60 flex items-center justify-between mt-2">
                      <span className="text-[11px] text-gray-400 font-mono">
                        /shop/{cat.id}
                      </span>

                      <button
                        onClick={async () => {
                          if (
                            window.confirm(
                              `Are you sure you want to remove category "${cat.name}"?${
                                prodCount > 0
                                  ? ` Note: ${prodCount} product(s) are currently tagged with this category.`
                                  : ''
                              }`
                            )
                          ) {
                            const res = await deleteCategory(cat.id);
                            setCategoryFeedback({
                              type: res.success ? 'success' : 'error',
                              text: res.message,
                            });
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Category</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Add New Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E8DDCA] overflow-hidden my-8">
            <div className="p-6 border-b border-[#E8DDCA] flex items-center justify-between bg-[#F8F5ED]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#B69A62] font-bold">
                  Catalogue Expansion
                </span>
                <h2 className="font-serif text-xl font-bold text-[#242821] mt-0.5">
                  Add New Product Category
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await addCategory({
                  name: categoryForm.name,
                  description: categoryForm.description,
                  image: categoryForm.image,
                });

                setCategoryFeedback({
                  type: res.success ? 'success' : 'error',
                  text: res.message,
                });

                if (res.success) {
                  setIsCategoryModalOpen(false);
                  setCategoryForm({ name: '', description: '', image: '' });
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-gray-700 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Kashmiri Saffron & Honey"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden"
                />
                <p className="text-[10px] text-gray-400 mt-1 font-mono">
                  Generated Category ID:{' '}
                  <strong className="text-[#244C37]">
                    {categoryForm.name
                      ? categoryForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
                      : 'category-id'}
                  </strong>
                </p>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Short Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Pure single-harvest organic saffron and raw mountain wildflower honey."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Cover Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={categoryForm.image}
                  onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-mono text-[11px]"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Optional. If left empty, a high quality harvest category cover photo will be assigned automatically.
                </p>
              </div>

              <div className="pt-3 border-t border-[#E8DDCA] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#244C37] hover:bg-[#1A3828] text-white font-bold rounded-xl cursor-pointer shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2.8: SHAHI MIX BUILDER MANAGEMENT */}
      {activeTab === 'shahi-mix' && (
        <div className="py-6 space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DDCA]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#344B36] bg-[#B69A62] px-2.5 py-0.5 rounded-full">
                  Bespoke Packaging & Mixes
                </span>
                <span className="text-xs text-gray-500">
                  • {shahiMixIngredients.length} Ingredients, {shahiMixBoxes.length} Packaging Styles
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#242821] mt-1">
                Custom Shahi Mix Builder Management
              </h2>
              <p className="text-xs text-gray-500">
                Configure ingredient options, portion weights in grams (100g, 250g, 500g, 1kg), gram prices, stock availability, and outer luxury tin/wooden box packaging styles.
              </p>
            </div>

            {/* Sub-tab Switchers */}
            <div className="flex items-center p-1 bg-[#F8F5ED] rounded-2xl border border-[#E8DDCA]">
              <button
                onClick={() => setShahiMixSubTab('ingredients')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  shahiMixSubTab === 'ingredients'
                    ? 'bg-[#244C37] text-white shadow-xs'
                    : 'text-gray-600 hover:text-[#244C37]'
                }`}
              >
                Ingredients ({shahiMixIngredients.length})
              </button>
              <button
                onClick={() => setShahiMixSubTab('boxes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  shahiMixSubTab === 'boxes'
                    ? 'bg-[#244C37] text-white shadow-xs'
                    : 'text-gray-600 hover:text-[#244C37]'
                }`}
              >
                Box Packaging Styles ({shahiMixBoxes.length})
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {shahiMixFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between ${
                shahiMixFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {shahiMixFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>{shahiMixFeedback.text}</span>
              </div>
              <button onClick={() => setShahiMixFeedback(null)} className="text-xs underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* SUB-TAB 1: INGREDIENTS */}
          {shahiMixSubTab === 'ingredients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-[#244C37]">
                  Pantry Dry Fruits & Exotic Ingredients
                </h3>
                <button
                  onClick={() => {
                    setIngredientForm({
                      name: '',
                      image: '',
                      inStock: true,
                      inventoryPolicy: 'tracked',
                      stockGrams: 5000,
                      price10g: 90,
                      price50g: 450,
                      price100g: 800,
                      price250g: 1900,
                      price500g: 3700,
                      price1kg: 7200,
                    });
                    setIsIngredientModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#244C37] hover:bg-[#1A3828] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Ingredient</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-[#E8DDCA] overflow-hidden shadow-xs">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs min-w-[780px]">
                    <thead>
                      <tr className="bg-[#F8F5ED] border-b border-[#E8DDCA] text-left text-gray-500 uppercase text-[10px]">
                        <th className="p-3">Ingredient</th>
                        <th className="p-3">Portion Prices (100g / 250g / 500g / 1kg)</th>
                        <th className="p-3">Inventory &amp; Policy</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {shahiMixIngredients.map((ing) => {
                        const p10 = ing.portions.find((p) => p.weight === '10g')?.price || 0;
                        const p50 = ing.portions.find((p) => p.weight === '50g')?.price || 0;
                        const p100 = ing.portions.find((p) => p.weight === '100g')?.price || 0;
                        const p250 = ing.portions.find((p) => p.weight === '250g')?.price || 0;
                        const p500 = ing.portions.find((p) => p.weight === '500g')?.price || 0;
                        const p1k = ing.portions.find((p) => p.weight === '1kg')?.price || 0;
                        const policy = ing.inventoryPolicy === 'unlimited' ? 'unlimited' : 'tracked';
                        const stockGrams = typeof ing.stockGrams === 'number' ? ing.stockGrams : 0;

                        return (
                          <tr key={ing.id} className="hover:bg-gray-50/50">
                            <td className="p-3">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={ing.image}
                                  alt={ing.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-[#E8DDCA]"
                                />
                                <div>
                                  <span className="font-bold text-[#242821] block">{ing.name}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">ID: {ing.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                {p10 > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-[#F8F5ED] border border-[#E8DDCA] text-[10px]">
                                    <strong>10g:</strong> Rs. {p10}
                                  </span>
                                )}
                                {p50 > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-[#F8F5ED] border border-[#E8DDCA] text-[10px]">
                                    <strong>50g:</strong> Rs. {p50}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-md bg-[#F8F5ED] border border-[#E8DDCA] text-[10px]">
                                  <strong>100g:</strong> Rs. {p100}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-[#F8F5ED] border border-[#E8DDCA] text-[10px]">
                                  <strong>250g:</strong> Rs. {p250}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-[#F8F5ED] border border-[#E8DDCA] text-[10px]">
                                  <strong>500g:</strong> Rs. {p500}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-[#F8F5ED] border border-[#E8DDCA] text-[10px]">
                                  <strong>1kg:</strong> Rs. {p1k}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 space-y-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ing.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {ing.inStock ? 'In Stock' : 'Out of Stock'}
                              </span>
                              <div className="text-[10px] font-mono text-gray-500">
                                {policy === 'unlimited' ? 'Policy: Unlimited' : `Tracked: ${stockGrams.toLocaleString()}g`}
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="inline-flex items-center space-x-1.5">
                                {policy === 'tracked' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await updateShahiMixIngredient({
                                          ...ing,
                                          inventoryPolicy: 'tracked',
                                          stockGrams: stockGrams + 1000,
                                          inStock: true,
                                        });
                                        setShahiMixFeedback({
                                          type: 'success',
                                          text: `Added +1,000g stock to ${ing.name}`,
                                        });
                                      } catch (err: unknown) {
                                        setShahiMixFeedback({
                                          type: 'error',
                                          text: err instanceof Error ? err.message : 'Failed to restock ingredient.',
                                        });
                                      }
                                    }}
                                    className="px-2 py-1 rounded-lg bg-[#244C37] text-white text-[10px] font-bold hover:bg-[#1A3828] cursor-pointer"
                                  >
                                    +1kg
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await updateShahiMixIngredient({
                                        ...ing,
                                        inventoryPolicy: policy,
                                        ...(policy === 'tracked' ? { stockGrams } : {}),
                                        inStock: !ing.inStock,
                                      });
                                    } catch (err: unknown) {
                                      setShahiMixFeedback({
                                        type: 'error',
                                        text: err instanceof Error ? err.message : 'Failed to toggle availability.',
                                      });
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg border border-[#E8DDCA] hover:bg-[#F8F5ED] text-[10px] font-semibold text-gray-700 cursor-pointer"
                                >
                                  {ing.inStock ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Remove ingredient "${ing.name}" from Shahi Mix builder?`)) {
                                      await deleteShahiMixIngredient(ing.id);
                                      setShahiMixFeedback({ type: 'success', text: `Removed ${ing.name}` });
                                    }
                                  }}
                                  className="p-1.5 rounded-lg border border-[#E8DDCA] hover:bg-red-50 text-red-600 cursor-pointer"
                                  title="Delete Ingredient"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: BOX PACKAGING OPTIONS */}
          {shahiMixSubTab === 'boxes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-[#244C37]">
                  Outer Luxury Box Packaging Styles
                </h3>
                <button
                  onClick={() => {
                    setBoxForm({
                      name: '',
                      urduName: '',
                      capacity: 4,
                      basePrice: 1950,
                      image: '',
                      description: '',
                      inStock: true,
                      inventoryPolicy: 'tracked',
                      stock: 25,
                    });
                    setIsBoxModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#244C37] hover:bg-[#1A3828] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Box Packaging Option</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shahiMixBoxes.map((box) => {
                  const boxPolicy = box.inventoryPolicy === 'unlimited' ? 'unlimited' : 'tracked';
                  const boxStock = typeof box.stock === 'number' ? box.stock : 0;
                  const boxAvailable = box.inStock !== false && (boxPolicy === 'unlimited' || boxStock > 0);
                  return (
                    <div
                      key={box.id}
                      className="bg-white rounded-3xl border border-[#E8DDCA] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="aspect-16/9 w-full bg-[#F8F5ED] relative overflow-hidden">
                          <img
                            src={box.image}
                            alt={box.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-3 left-3 bg-[#244C37]/90 backdrop-blur-md text-[#B69A62] text-[10px] font-bold px-2.5 py-1 rounded-full">
                            {box.capacity} Compartments Slot
                          </span>
                          <span className="absolute top-3 right-3 bg-[#B69A62] text-[#344B36] text-[11px] font-bold font-mono px-2.5 py-1 rounded-full">
                            Base Price: Rs. {box.basePrice.toLocaleString()}
                          </span>
                        </div>

                        <div className="p-5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-serif text-base font-bold text-[#242821]">{box.name}</h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                boxAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {boxAvailable ? (boxPolicy === 'unlimited' ? 'Unlimited' : `${boxStock} left`) : 'Out of Stock'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {box.description || 'Handcrafted velvet or tin partition gift box.'}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 pt-3 border-t border-[#E8DDCA]/60 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-gray-400 font-mono truncate">ID: {box.id}</span>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          {boxPolicy === 'tracked' && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await updateShahiMixBox({
                                    ...box,
                                    inventoryPolicy: 'tracked',
                                    stock: boxStock + 10,
                                    inStock: true,
                                  });
                                  setShahiMixFeedback({ type: 'success', text: `Added +10 stock to ${box.name}` });
                                } catch (err: unknown) {
                                  setShahiMixFeedback({
                                    type: 'error',
                                    text: err instanceof Error ? err.message : 'Failed to restock box.',
                                  });
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-[#244C37] text-white text-[10px] font-bold hover:bg-[#1A3828] cursor-pointer"
                            >
                              +10
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Delete box option "${box.name}"?`)) {
                                await deleteShahiMixBox(box.id);
                                setShahiMixFeedback({ type: 'success', text: `Deleted box style ${box.name}` });
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center space-x-1.5 cursor-pointer border border-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add New Ingredient Modal */}
      {isIngredientModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E8DDCA] overflow-hidden my-8">
            <div className="p-6 border-b border-[#E8DDCA] flex items-center justify-between bg-[#F8F5ED]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#B69A62] font-bold">
                  Custom Shahi Mix
                </span>
                <h2 className="font-serif text-xl font-bold text-[#242821] mt-0.5">
                  Add Shahi Mix Ingredient
                </h2>
              </div>
              <button
                onClick={() => setIsIngredientModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!ingredientForm.name.trim()) return;

                const newIng = {
                  id: `ing-${Date.now()}`,
                  name: ingredientForm.name.trim(),
                  image:
                    ingredientForm.image.trim() ||
                    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=480&q=65&fm=webp',
                  inStock: ingredientForm.inStock,
                  inventoryPolicy: ingredientForm.inventoryPolicy,
                  ...(ingredientForm.inventoryPolicy === 'tracked'
                    ? { stockGrams: Math.max(0, Number(ingredientForm.stockGrams) || 0) }
                    : {}),
                  portions: [
                    { id: `p10-${Date.now()}`, weight: '10g', weightGrams: 10, price: ingredientForm.price10g },
                    { id: `p50-${Date.now()}`, weight: '50g', weightGrams: 50, price: ingredientForm.price50g },
                    { id: `p100-${Date.now()}`, weight: '100g', weightGrams: 100, price: ingredientForm.price100g },
                    { id: `p250-${Date.now()}`, weight: '250g', weightGrams: 250, price: ingredientForm.price250g },
                    { id: `p500-${Date.now()}`, weight: '500g', weightGrams: 500, price: ingredientForm.price500g },
                    { id: `p1kg-${Date.now()}`, weight: '1kg', weightGrams: 1000, price: ingredientForm.price1kg },
                  ],
                };

                await addShahiMixIngredient(newIng);
                setIsIngredientModalOpen(false);
                setShahiMixFeedback({ type: 'success', text: `Added ${newIng.name} to Shahi Mix ingredient pool.` });
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-gray-700 block mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Pine Nuts"
                  value={ingredientForm.name}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={ingredientForm.image}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, image: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-[#244C37] block mb-2">Portion Weight Prices (PKR) *</label>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">10g Price</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={ingredientForm.price10g}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, price10g: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-[#E8DDCA] bg-[#F8F5ED] text-center font-bold text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">50g Price</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={ingredientForm.price50g}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, price50g: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-[#E8DDCA] bg-[#F8F5ED] text-center font-bold text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">100g Price</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={ingredientForm.price100g}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, price100g: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-[#E8DDCA] bg-[#F8F5ED] text-center font-bold text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">250g Price</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={ingredientForm.price250g}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, price250g: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-[#E8DDCA] bg-[#F8F5ED] text-center font-bold text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">500g Price</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={ingredientForm.price500g}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, price500g: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-[#E8DDCA] bg-[#F8F5ED] text-center font-bold text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">1kg Price</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={ingredientForm.price1kg}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, price1kg: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-[#E8DDCA] bg-[#F8F5ED] text-center font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Inventory Policy *</label>
                  <select
                    value={ingredientForm.inventoryPolicy}
                    onChange={(e) =>
                      setIngredientForm({
                        ...ingredientForm,
                        inventoryPolicy: e.target.value as 'tracked' | 'unlimited',
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-semibold"
                  >
                    <option value="tracked">Tracked (Gram Stock)</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>

                {ingredientForm.inventoryPolicy === 'tracked' && (
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Available Stock (grams) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={ingredientForm.stockGrams}
                      onChange={(e) =>
                        setIngredientForm({
                          ...ingredientForm,
                          stockGrams: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ingredientForm.inStock}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, inStock: e.target.checked })}
                    className="rounded text-[#244C37]"
                  />
                  <span className="font-semibold text-gray-700">Available in Stock for Custom Boxes</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#E8DDCA] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsIngredientModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#244C37] text-white font-bold rounded-xl shadow-sm cursor-pointer hover:bg-[#1A3828]"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Box Modal */}
      {isBoxModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E8DDCA] overflow-hidden my-8">
            <div className="p-6 border-b border-[#E8DDCA] flex items-center justify-between bg-[#F8F5ED]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#B69A62] font-bold">
                  Custom Packaging
                </span>
                <h2 className="font-serif text-xl font-bold text-[#242821] mt-0.5">
                  Add Luxury Box Style
                </h2>
              </div>
              <button
                onClick={() => setIsBoxModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!boxForm.name.trim()) return;

                const newBox = {
                  id: `box-${Date.now()}`,
                  name: boxForm.name.trim(),
                  urduName: boxForm.urduName.trim() || boxForm.name.trim(),
                  capacity: Number(boxForm.capacity) as 4 | 6,
                  basePrice: Number(boxForm.basePrice),
                  image:
                    boxForm.image.trim() ||
                    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=70',
                  description: boxForm.description.trim() || 'Royal handcrafted presentation box.',
                  inStock: boxForm.inStock,
                  inventoryPolicy: boxForm.inventoryPolicy,
                  ...(boxForm.inventoryPolicy === 'tracked'
                    ? { stock: Math.max(0, Number(boxForm.stock) || 0) }
                    : {}),
                };

                await addShahiMixBox(newBox);
                setIsBoxModalOpen(false);
                setShahiMixFeedback({ type: 'success', text: `Added packaging style ${newBox.name}` });
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-gray-700 block mb-1">Box Style Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regal Octagon Wooden Box"
                  value={boxForm.name}
                  onChange={(e) => setBoxForm({ ...boxForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Partition Capacity *</label>
                  <select
                    value={boxForm.capacity}
                    onChange={(e) => setBoxForm({ ...boxForm, capacity: Number(e.target.value) as 4 | 6 })}
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-bold"
                  >
                    <option value={4}>4 Compartments / Slots</option>
                    <option value={6}>6 Compartments / Slots</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Base Box Price (PKR) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={boxForm.basePrice}
                    onChange={(e) => setBoxForm({ ...boxForm, basePrice: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Box Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={boxForm.image}
                  onChange={(e) => setBoxForm({ ...boxForm, image: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Short Description</label>
                <textarea
                  rows={2}
                  placeholder="Hand-crafted wood finish with gold foil logo insert."
                  value={boxForm.description}
                  onChange={(e) => setBoxForm({ ...boxForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Inventory Policy *</label>
                  <select
                    value={boxForm.inventoryPolicy}
                    onChange={(e) =>
                      setBoxForm({
                        ...boxForm,
                        inventoryPolicy: e.target.value as 'tracked' | 'unlimited',
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-semibold"
                  >
                    <option value="tracked">Tracked (Box Count)</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>

                {boxForm.inventoryPolicy === 'tracked' && (
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Box Stock Qty *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={boxForm.stock}
                      onChange={(e) =>
                        setBoxForm({
                          ...boxForm,
                          stock: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-bold"
                    />
                  </div>
                )}
              </div>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={boxForm.inStock}
                  onChange={(e) => setBoxForm({ ...boxForm, inStock: e.target.checked })}
                  className="rounded text-[#244C37]"
                />
                <span className="font-semibold text-gray-700">In Stock for Custom Orders</span>
              </label>

              <div className="pt-3 border-t border-[#E8DDCA] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsBoxModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#244C37] text-white font-bold rounded-xl shadow-sm cursor-pointer hover:bg-[#1A3828]"
                >
                  Save Box Packaging
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS MANAGEMENT (Active, Completed, Returns) */}
      {(activeTab === 'orders' || activeTab === 'completed-orders' || activeTab === 'returns') && (
        <div className="py-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-xl ${
                activeTab === 'orders' ? 'bg-blue-50 text-blue-600' : 
                activeTab === 'completed-orders' ? 'bg-emerald-50 text-emerald-600' : 
                'bg-rose-50 text-rose-600'
              }`}>
                {activeTab === 'orders' && <ShoppingBag className="w-5 h-5" />}
                {activeTab === 'completed-orders' && <CheckCircle2 className="w-5 h-5" />}
                {activeTab === 'returns' && <RotateCcw className="w-5 h-5" />}
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#244C37]">
                {activeTab === 'orders' && 'Active Customer Orders'}
                {activeTab === 'completed-orders' && 'Completed (Delivered) Orders'}
                {activeTab === 'returns' && 'Customer Returns'}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => refreshAdminData()}
              disabled={ordersPagination.refreshing}
              className="px-3 py-1.5 bg-white border border-[#E8DDCA] hover:bg-[#F8F5ED] text-[#244C37] text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
            >
              {ordersPagination.refreshing ? 'Refreshing...' : 'Refresh Orders'}
            </button>
          </div>

          {orderError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center justify-between">
              <span>{orderError}</span>
              <button type="button" onClick={() => setOrderError(null)} className="underline ml-4 cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search orders..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-white rounded-xl border border-[#E8DDCA]"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="text-xs p-2 rounded-xl border border-[#E8DDCA] bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Processing">Processing</option>
                <option value="Packed">Packed</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Returned">Returned</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <button
                onClick={handleExportOrders}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to Excel (CSV)</span>
              </button>
            </div>

            <span className="text-xs text-gray-500 whitespace-nowrap">
              {filteredOrders.length} Orders Shown
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-[11px] min-w-[1400px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-left text-gray-700 uppercase font-bold">
                    <th className="p-2 border-r border-gray-300">Order ID</th>
                    <th className="p-2 border-r border-gray-300">Date</th>
                    <th className="p-2 border-r border-gray-300">Customer Name</th>
                    <th className="p-2 border-r border-gray-300">Phone</th>
                    <th className="p-2 border-r border-gray-300">City</th>
                    <th className="p-2 border-r border-gray-300">Full Address</th>
                    <th className="p-2 border-r border-gray-300">Items Detail</th>
                    <th className="p-2 border-r border-gray-300">Total (PKR)</th>
                    <th className="p-2 border-r border-gray-300">Payment</th>
                    <th className="p-2 border-r border-gray-300">Order Status</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-gray-400 italic bg-gray-50">
                        No orders match your current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-2 border-r border-gray-200 font-mono font-bold text-gray-900 bg-gray-50/50">
                          {ord.orderNumber}
                        </td>
                        <td className="p-2 border-r border-gray-200 whitespace-nowrap">
                          {new Date(ord.createdAt).toLocaleDateString()} {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-2 border-r border-gray-200 font-semibold">
                          {ord.customerName}
                        </td>
                        <td className="p-2 border-r border-gray-200 font-mono">
                          {ord.customerPhone}
                        </td>
                        <td className="p-2 border-r border-gray-200">
                          {ord.city}
                        </td>
                        <td className="p-2 border-r border-gray-200 leading-relaxed min-w-[200px]">
                          {ord.address}
                        </td>
                        <td className="p-2 border-r border-gray-200">
                          <div className="space-y-1">
                            {ord.items.map((it, idx) => (
                              <div key={idx} className="flex items-center space-x-1.5 border-b border-gray-50 last:border-0 pb-1 mb-1">
                                <span className="font-bold text-[#244C37]">{it.quantity}x</span>
                                <span>{it.productName} ({it.variantWeight})</span>
                              </div>
                            ))}
                            {ord.internalNotes && ord.internalNotes.length > 0 && (
                              <div className="mt-1 p-1 bg-amber-50 text-[9px] text-amber-700 rounded italic">
                                Note: {ord.internalNotes.slice(-1)[0]}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2 border-r border-gray-200 font-bold text-[#244C37] text-right">
                          {ord.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-2 border-r border-gray-200 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${ord.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {ord.paymentMethod}
                          </span>
                        </td>
                        <td className="p-2 border-r border-gray-200">
                          {(() => {
                            const transitionMap: Record<OrderStatus, OrderStatus[]> = {
                              Pending: ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Cancelled'],
                              Confirmed: ['Processing', 'Packed', 'Shipped', 'Cancelled'],
                              Processing: ['Packed', 'Shipped', 'Cancelled'],
                              Packed: ['Shipped', 'Cancelled'],
                              Shipped: ['Delivered', 'Returned', 'Cancelled'],
                              Delivered: ['Returned'],
                              Cancelled: [],
                              Returned: [],
                            };
                            const allowedNext = transitionMap[ord.orderStatus] ?? [];
                            const isTerminal = ord.stockRestored === true || allowedNext.length === 0;
                            const allStatuses: OrderStatus[] = [
                              'Pending',
                              'Confirmed',
                              'Processing',
                              'Packed',
                              'Shipped',
                              'Delivered',
                              'Returned',
                              'Cancelled',
                            ];

                            return (
                              <select
                                value={ord.orderStatus}
                                disabled={isTerminal || updatingOrderId === ord.id}
                                onChange={async (e) => {
                                  const nextStatus = e.target.value as OrderStatus;
                                  if (nextStatus === ord.orderStatus) return;
                                  setOrderError(null);
                                  setUpdatingOrderId(ord.id);
                                  try {
                                    await updateOrderStatus(
                                      ord.id,
                                      nextStatus,
                                      `Admin changed status to ${nextStatus}`
                                    );
                                  } catch (err: unknown) {
                                    setOrderError(
                                      err instanceof Error
                                        ? `Order ${ord.orderNumber}: ${err.message}`
                                        : `Failed to update status for ${ord.orderNumber}.`
                                    );
                                  } finally {
                                    setUpdatingOrderId(null);
                                  }
                                }}
                                title={
                                  isTerminal
                                    ? 'Terminal order status — cannot transition further.'
                                    : 'Select next order workflow stage'
                                }
                                className={`w-full text-[10px] p-1 rounded border font-bold disabled:opacity-70 ${
                                  ord.orderStatus === 'Delivered'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : ord.orderStatus === 'Cancelled' || ord.orderStatus === 'Returned'
                                    ? 'bg-red-50 border-red-200 text-red-800'
                                    : 'bg-white border-gray-300'
                                }`}
                              >
                                {allStatuses.map((statusOption) => (
                                  <option
                                    key={statusOption}
                                    value={statusOption}
                                    disabled={
                                      statusOption !== ord.orderStatus && !allowedNext.includes(statusOption)
                                    }
                                  >
                                    {statusOption}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectingOrder(ord);
                                setTimeout(() => window.print(), 150);
                              }}
                              title="Inspect & Print Order Slip"
                              className="p-1 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setInspectingOrder(ord)}
                              title="Inspect Full Order Details"
                              className="p-1 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {ordersPagination.hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => loadMoreOrders()}
                disabled={ordersPagination.loadingMore}
                className="px-5 py-2.5 bg-white border border-[#E8DDCA] hover:bg-[#F8F5ED] text-[#244C37] text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {ordersPagination.loadingMore ? 'Loading More Orders...' : 'Load More Orders'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3.5: CUSTOMERS MANAGEMENT */}
      {activeTab === 'customers' && (
        <div className="py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-serif text-xl font-bold text-[#244C37]">
              Customer Directory & Lifetime Value
            </h3>
            <div className="text-xs text-gray-500">
              Unique Customers: <strong>{uniqueCustomers.length}</strong>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8DDCA] overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-[#F8F5ED] border-b border-[#E8DDCA] text-left text-gray-500 uppercase text-[10px] font-bold">
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4 text-center">Orders</th>
                    <th className="p-4">Total Revenue (LTV)</th>
                    <th className="p-4">Last Order</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {uniqueCustomers.map((cust) => (
                    <tr key={cust.phone} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-[#F8F5ED] border border-[#E8DDCA] flex items-center justify-center font-bold text-[#244C37]">
                            {cust.name.charAt(0)}
                          </div>
                          <span className="font-bold text-gray-900">{cust.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="flex items-center space-x-1.5 font-mono">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{cust.phone}</span>
                          </span>
                          <span className="flex items-center space-x-1.5 text-gray-400">
                            <MapPin className="w-3 h-3" />
                            <span>{cust.city}</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F8F5ED] border border-[#E8DDCA] text-[#244C37] font-bold">
                          {cust.ordersCount}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-serif font-bold text-[#244C37] text-sm">
                          Rs. {cust.totalSpent.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-[10px] text-gray-500">
                          {new Date(cust.lastOrderDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => {
                            setOrderSearch(cust.phone);
                            setActiveTab('orders');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-[#E8DDCA] hover:bg-[#F8F5ED] text-gray-600 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          View Order History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3.7: WHOLESALE & CORPORATE LEADS */}
      {activeTab === 'wholesale' && (
        <div className="py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#244C37]">
                Wholesale & Corporate Inquiries
              </h3>
              <p className="text-xs text-gray-500">Manage bulk orders, corporate gifting leads, and event inquiries.</p>
            </div>
            <button 
              onClick={() => {
                const headers = ['Company', 'Contact', 'Type', 'Quantity', 'Phone', 'Email', 'Status', 'Date'];
                const rows = wholesaleInquiries.map((w) => [
                  w.companyName,
                  w.contactName,
                  w.inquiryType,
                  w.estimatedQuantity,
                  w.phone,
                  w.email,
                  w.status,
                  new Date(w.createdAt).toLocaleDateString(),
                ]);
                const csv = buildSafeCsv(headers, rows);
                handleDownloadFile(csv, `wholesale_leads_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
              }}
              className="px-4 py-2 bg-white border border-[#E8DDCA] text-[#244C37] text-xs font-bold rounded-xl flex items-center space-x-2 hover:bg-[#F8F5ED] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Leads CSV</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8DDCA] overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-[#F8F5ED] border-b border-[#E8DDCA] text-left text-gray-500 uppercase text-[10px] font-bold">
                    <th className="p-4 border-r border-[#E8DDCA]">Lead Date</th>
                    <th className="p-4 border-r border-[#E8DDCA]">Company & Contact</th>
                    <th className="p-4 border-r border-[#E8DDCA]">Type</th>
                    <th className="p-4 border-r border-[#E8DDCA]">Requirements</th>
                    <th className="p-4 border-r border-[#E8DDCA]">Contact Info</th>
                    <th className="p-4 border-r border-[#E8DDCA]">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {wholesaleInquiries.length > 0 ? wholesaleInquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 border-r border-gray-50 font-mono text-gray-500">
                        {new Date(inquiry.createdAt).toLocaleDateString()}<br/>
                        {new Date(inquiry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 border-r border-gray-50">
                        <div className="font-bold text-[#244C37]">{inquiry.companyName}</div>
                        <div className="text-gray-500">{inquiry.contactName}</div>
                      </td>
                      <td className="p-4 border-r border-gray-50">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          inquiry.inquiryType === 'Corporate Gifting' ? 'bg-purple-100 text-purple-700' :
                          inquiry.inquiryType === 'Wholesale Purchase' ? 'bg-blue-100 text-blue-700' :
                          inquiry.inquiryType === 'Wedding Favors' ? 'bg-pink-100 text-pink-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {inquiry.inquiryType}
                        </span>
                      </td>
                      <td className="p-4 border-r border-gray-50">
                        <div className="font-semibold text-gray-900">Qty: {inquiry.estimatedQuantity}</div>
                        {inquiry.eventDate && (
                          <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(inquiry.eventDate).toLocaleDateString()}
                          </div>
                        )}
                        <div className="mt-2 text-gray-600 line-clamp-2 italic" title={inquiry.message}>
                          "{inquiry.message}"
                        </div>
                      </td>
                      <td className="p-4 border-r border-gray-50">
                        <div className="flex flex-col gap-1.5">
                          <a href={`tel:${inquiry.phone}`} className="flex items-center gap-1.5 text-[#244C37] font-bold hover:underline">
                            <Phone className="w-3 h-3" /> {inquiry.phone}
                          </a>
                          <a href={`mailto:${inquiry.email}`} className="flex items-center gap-1.5 text-gray-500 hover:text-[#244C37]">
                            <Mail className="w-3 h-3" /> {inquiry.email}
                          </a>
                        </div>
                      </td>
                      <td className="p-4 border-r border-gray-50">
                        <select
                          value={inquiry.status}
                          onChange={(e) => updateWholesaleStatus(inquiry.id, e.target.value as any)}
                          className={`w-full text-[10px] font-bold px-2 py-1 rounded-lg border focus:ring-1 focus:ring-[#B69A62] outline-none ${
                            inquiry.status === 'New' ? 'bg-red-50 text-red-700 border-red-200' :
                            inquiry.status === 'Contacted' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            inquiry.status === 'Quoted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            inquiry.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          <option value="New">NEW</option>
                          <option value="Contacted">CONTACTED</option>
                          <option value="Quoted">QUOTED</option>
                          <option value="Converted">CONVERTED</option>
                          <option value="Closed">CLOSED</option>
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a 
                            href={`https://wa.me/${inquiry.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            title="WhatsApp Client"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => {
                              if (confirm(`Delete inquiry from ${inquiry.companyName}?`)) {
                                deleteWholesaleInquiry(inquiry.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-[#E8DDCA] hover:bg-red-50 hover:text-red-600 text-gray-600 cursor-pointer"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-gray-400">
                        No wholesale inquiries found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {wholesalePagination.hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => loadMoreWholesale()}
                disabled={wholesalePagination.loadingMore}
                className="px-5 py-2.5 bg-white border border-[#E8DDCA] hover:bg-[#F8F5ED] text-[#244C37] text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {wholesalePagination.loadingMore ? 'Loading More Leads...' : 'Load More Wholesale Leads'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STOCK AUDIT */}
      {activeTab === 'inventory' && (
        <div className="py-6 space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Real-time stock audit prevents overselling. Stock decreases automatically when orders are confirmed.
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8DDCA] overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs min-w-[550px]">
              <thead>
                <tr className="bg-[#F8F5ED] border-b border-[#E8DDCA] text-left text-gray-500 uppercase text-[10px]">
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Variant Weight</th>
                  <th className="p-3">Current Stock</th>
                  <th className="p-3 text-right">Quick Restock (+10)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.flatMap((p) =>
                  p.variants.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold text-[#242821]">{p.name}</td>
                      <td className="p-3 font-mono text-gray-400">{v.sku}</td>
                      <td className="p-3">{v.weight}</td>
                      <td className="p-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full ${
                            v.stock < 10
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {v.stock} units
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={async () => {
                            const updatedVariants = p.variants.map((vr) =>
                              vr.id === v.id ? { ...vr, stock: vr.stock + 10 } : vr
                            );
                            await updateProduct({
                              ...p,
                              variants: updatedVariants,
                              inStock: updatedVariants.some((vr) => vr.stock > 0),
                            });
                          }}
                          className="px-3 py-1 bg-[#244C37] text-white text-[11px] font-bold rounded-lg hover:bg-[#1A3828] cursor-pointer"
                        >
                          +10 Units
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E8DDCA] shadow-xs">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#244C37]">
                Store Coupon Codes & Promotions ({coupons.length})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage promotional discount codes, minimum order thresholds, and activation status in real-time.
              </p>
            </div>

            <button
              onClick={() => {
                setCouponForm({
                  code: '',
                  discountType: 'percentage',
                  discountValue: 10,
                  minOrderAmount: 2000,
                  isActive: true,
                  expiryDate: '2026-12-31',
                  usageCount: 0,
                  usageLimit: undefined,
                });
                setIsCouponModalOpen(true);
              }}
              className="px-4 py-2 bg-[#244C37] hover:bg-[#1A3828] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Coupon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <div
                key={c.code}
                className="p-5 bg-white rounded-2xl border border-[#E8DDCA] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-base font-bold text-[#244C37] bg-[#F8F5ED] px-2.5 py-0.5 rounded-lg border border-[#E8DDCA]">
                      {c.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mt-2">
                    Discount:{' '}
                    <strong>
                      {c.discountType === 'percentage'
                        ? `${c.discountValue}%`
                        : `Rs. ${c.discountValue}`}
                    </strong>
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Min Order: Rs. {c.minOrderAmount.toLocaleString()} • Used:{' '}
                    {c.usageCount}
                    {typeof c.usageLimit === 'number' && c.usageLimit > 0
                      ? ` / ${c.usageLimit}`
                      : ' times'}
                  </p>
                  {c.expiryDate && (
                    <p className="text-[10px] text-gray-400 mt-1 font-mono">
                      Expires: {c.expiryDate}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 mt-4 flex items-center justify-between">
                  <button
                    onClick={() => toggleCoupon(c.code)}
                    className="text-xs text-[#244C37] font-semibold hover:underline cursor-pointer"
                  >
                    {c.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete coupon code "${c.code}"?`)) {
                        deleteCoupon(c.code);
                      }
                    }}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {couponsPagination.hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => loadMoreCoupons()}
                disabled={couponsPagination.loadingMore}
                className="px-5 py-2.5 bg-white border border-[#E8DDCA] hover:bg-[#F8F5ED] text-[#244C37] text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {couponsPagination.loadingMore ? 'Loading More Coupons...' : 'Load More Coupons'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="py-6 space-y-4">
          {reviews.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-[#E8DDCA] text-center text-xs text-gray-500">
              No customer reviews submitted yet.
            </div>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 bg-white rounded-2xl border border-[#E8DDCA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="font-bold text-[#242821]">
                      {rev.customerName}
                    </span>
                    <span className="text-gray-400">• {rev.city}</span>
                    <span className="text-[#C99A45] font-bold">★ {rev.rating}/5</span>
                    {rev.verifiedPurchase && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                        Verified Order
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-1 italic">&quot;{rev.comment}&quot;</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Product: {rev.productName} • Date: {rev.date}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      rev.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rev.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rev.status === 'approved'
                      ? 'Approved & Public'
                      : rev.status === 'rejected'
                      ? 'Rejected'
                      : 'Pending Moderation'}
                  </span>

                  {rev.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => moderateReview(rev.id, 'approved')}
                      className="px-2.5 py-1 bg-[#244C37] hover:bg-[#1A3828] text-white rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      Approve
                    </button>
                  )}

                  {rev.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => moderateReview(rev.id, 'rejected')}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      Reject
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete review by ${rev.customerName}?`)) {
                        deleteReview(rev.id);
                      }
                    }}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer"
                    title="Delete Review"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}

          {reviewsPagination.hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => loadMoreReviews()}
                disabled={reviewsPagination.loadingMore}
                className="px-5 py-2.5 bg-white border border-[#E8DDCA] hover:bg-[#F8F5ED] text-[#244C37] text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {reviewsPagination.loadingMore ? 'Loading More Reviews...' : 'Load More Reviews'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: SETTINGS */}
      {activeTab === 'settings' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingSettings(true);
            setSettingsFeedback(null);
            try {
              await updateSettings(settingsForm);
              setSettingsFeedback({ type: 'success', text: 'Store settings saved securely to Firestore.' });
            } catch (err: unknown) {
              setSettingsFeedback({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to save store settings.',
              });
            } finally {
              setSavingSettings(false);
            }
          }}
          className="py-6 max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDCA] shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#E8DDCA] pb-3">
            <h3 className="font-serif text-lg font-bold text-[#244C37]">
              Store &amp; Logistics Configuration
            </h3>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 bg-[#244C37] hover:bg-[#1A3828] text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {settingsFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                settingsFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {settingsFeedback.text}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#242821] block mb-1">
              Store Name:
            </label>
            <input
              type="text"
              required
              value={settingsForm.storeName}
              onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#242821] block mb-1">
                Contact Phone:
              </label>
              <input
                type="text"
                required
                value={settingsForm.contactPhone}
                onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#242821] block mb-1">
                WhatsApp Hotline:
              </label>
              <input
                type="text"
                required
                value={settingsForm.whatsappNumber}
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-[#242821] block mb-1">
                Contact Email:
              </label>
              <input
                type="email"
                value={settingsForm.contactEmail}
                onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#242821] block mb-1">
                Free Shipping Threshold (PKR):
              </label>
              <input
                type="number"
                min={0}
                value={settingsForm.freeShippingThreshold}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, freeShippingThreshold: Number(e.target.value) })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#242821] block mb-1">
                Standard Shipping Rate (PKR):
              </label>
              <input
                type="number"
                min={0}
                value={settingsForm.standardShippingRate}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, standardShippingRate: Number(e.target.value) })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#242821] block mb-1">
              Top Announcement Bar Message:
            </label>
            <input
              type="text"
              value={settingsForm.announcementBarMessage}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, announcementBarMessage: e.target.value })
              }
              className="w-full text-xs p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED]"
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-2 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settingsForm.codEnabled}
                onChange={(e) => setSettingsForm({ ...settingsForm, codEnabled: e.target.checked })}
                className="rounded text-[#244C37]"
              />
              <span className="font-semibold text-[#242821]">Enable Cash on Delivery (COD)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settingsForm.announcementActive}
                onChange={(e) => setSettingsForm({ ...settingsForm, announcementActive: e.target.checked })}
                className="rounded text-[#244C37]"
              />
              <span className="font-semibold text-[#242821]">Show Top Announcement Bar</span>
            </label>
          </div>
        </form>
      )}

      {/* TAB 8: IONOS SINGLE-HOSTING DEPLOYMENT SUITE (PHP 8.x + FIRESTORE) */}
      {activeTab === 'ionos' && (
        <div className="py-6 space-y-8">
          <div className="bg-[#244C37] text-white p-6 sm:p-8 rounded-3xl border border-[#1A3828] space-y-4">
            <div className="flex items-center space-x-2 text-[#C99A45]">
              <Server className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Single-Host IONOS Plus Webspace Architecture
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold">
              IONOS PHP 8.x + Firebase Firestore REST Architecture
            </h2>
            <p className="text-xs sm:text-sm text-[#E8DDCA]/80 leading-relaxed max-w-3xl">
              Built to run completely on a single IONOS Plus Webspace account: compiled React SPA and Apache <code className="font-mono text-[#F8F5ED]">public_html/.htaccess</code> at web root, paired with the PHP 8.x REST API (<code className="font-mono text-[#F8F5ED]">public_html/api/index.php</code> -&gt; <code className="font-mono text-[#F8F5ED]">backend/</code>) talking directly to Firebase Firestore over Service Account JWTs.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={checkingHealth}
                onClick={async () => {
                  setCheckingHealth(true);
                  setHealthResult(null);
                  try {
                    const res = await fetch('/api/health');
                    const text = await res.text();
                    setHealthResult({ ok: res.ok, status: res.status, body: text });
                  } catch (err: unknown) {
                    setHealthResult({
                      ok: false,
                      status: 0,
                      body: err instanceof Error ? err.message : 'Unable to reach /api/health',
                    });
                  } finally {
                    setCheckingHealth(false);
                  }
                }}
                className="px-4 py-2.5 bg-[#C99A45] hover:bg-[#AA7F32] text-[#244C37] rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Server className="w-4 h-4" />
                <span>{checkingHealth ? 'Testing /api/health...' : 'Test /api/health Endpoint'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDownloadFile(IONOS_PHP_SECRETS_TEMPLATE, 'secrets.example.php', 'text/plain')
                }
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download secrets.example.php</span>
              </button>
            </div>

            {healthResult && (
              <div
                className={`mt-3 p-4 rounded-2xl text-xs font-mono border ${
                  healthResult.ok
                    ? 'bg-emerald-950/60 border-emerald-400/40 text-emerald-100'
                    : 'bg-amber-950/60 border-amber-400/40 text-amber-100'
                }`}
              >
                <div className="font-bold mb-1">
                  GET /api/health -&gt; HTTP {healthResult.status || 'Network Error'}
                </div>
                <pre className="whitespace-pre-wrap break-words text-[11px]">{healthResult.body}</pre>
              </div>
            )}
          </div>

          {/* Section 1: Non-Secret PHP Configuration Template */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDCA] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDCA]">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#242821]">
                  1. PHP Secrets Template (private/config/secrets.example.php)
                </h3>
                <p className="text-xs text-gray-500">
                  Copy into <code className="font-mono">private/config/secrets.php</code> above <code className="font-mono">public_html/</code> on IONOS. No private keys or hashes are bundled in frontend code.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopyText(IONOS_PHP_SECRETS_TEMPLATE, 'secrets')}
                className="px-3 py-1.5 bg-[#F8F5ED] hover:bg-[#E8DDCA] text-xs font-bold rounded-lg border border-[#E8DDCA] flex items-center space-x-1.5 cursor-pointer"
              >
                {copiedSection === 'secrets' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                    <span>Copy Template</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-[#1A3828] text-[#F8F5ED] text-[11px] font-mono rounded-2xl overflow-x-auto max-h-72 leading-relaxed">
              {IONOS_PHP_SECRETS_TEMPLATE}
            </pre>
          </div>

          {/* Non-Destructive Firestore Catalog Initialization */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDCA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-[#242821]">
                Initialize Missing Firestore Catalog Collections (Safe Backfill)
              </h3>
              <p className="text-xs text-gray-500 max-w-2xl">
                Creates missing category, Shahi box packaging, ingredient, or starter product documents in Firestore without modifying or overwriting any existing records.
              </p>
              {backfillMsg && (
                <p className="text-xs font-semibold text-emerald-700 pt-1">{backfillMsg}</p>
              )}
            </div>
            <button
              type="button"
              disabled={backfilling}
              onClick={async () => {
                setBackfilling(true);
                setBackfillMsg(null);
                try {
                  const res = await backfillCatalogToFirestore();
                  setBackfillMsg(`Safe backfill completed: ${res.createdMissingDocs} missing catalog document(s) created.`);
                } catch (err: unknown) {
                  setBackfillMsg(err instanceof Error ? err.message : 'Backfill failed.');
                } finally {
                  setBackfilling(false);
                }
              }}
              className="px-4 py-2.5 bg-[#244C37] hover:bg-[#1A3828] text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer disabled:opacity-50"
            >
              {backfilling ? 'Checking Firestore...' : 'Backfill Missing Docs'}
            </button>
          </div>

          {/* Section 2: IONOS Deployment Checklist */}
          <div className="bg-[#F8F5ED] p-6 sm:p-8 rounded-3xl border border-[#E8DDCA] space-y-3">
            <h3 className="font-serif text-lg font-bold text-[#244C37]">
              IONOS Plus Webspace Single-Hosting Deployment Checklist (PHP 8.x + Firestore REST):
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-gray-700 leading-relaxed">
              {IONOS_DEPLOYMENT_CHECKLIST.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
      </div>
      </div>

      {/* Product Edit / Create Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E8DDCA] overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#E8DDCA] flex items-center justify-between bg-[#F8F5ED]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#C99A45] font-bold">
                  {isNewProduct ? 'Create New Harvest' : 'Edit Harvest Catalog'}
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#242821] mt-0.5">
                  {isNewProduct ? 'Add Mountain Product' : editingProduct.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kashmiri Mamra Almonds"
                  value={editingProduct.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const newSlug = generateSlug(name);
                    const currentAutoSlug = generateSlug(editingProduct.name);
                    const shouldAutoUpdateSlug = isNewProduct || !editingProduct.slug || editingProduct.slug === currentAutoSlug;
                    
                    setEditingProduct({
                      ...editingProduct,
                      name,
                      slug: shouldAutoUpdateSlug ? newSlug : editingProduct.slug,
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-700 block">URL Slug *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const autoSlug = generateSlug(editingProduct.name);
                        if (autoSlug) {
                          setEditingProduct({ ...editingProduct, slug: autoSlug });
                        }
                      }}
                      title="Auto-fill slug from English name"
                      className="text-[10px] text-[#244C37] hover:underline font-medium cursor-pointer"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kashmiri-mamra-almonds"
                    value={editingProduct.slug}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]+/g, '-'),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 truncate">
                    /product/{editingProduct.slug || generateSlug(editingProduct.name) || 'product-slug'}
                  </p>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Category *</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const foundCat = categoriesList.find((c) => c.id === selectedId);
                      setEditingProduct({
                        ...editingProduct,
                        category: selectedId,
                        categoryLabel: foundCat ? foundCat.name : 'Premium Harvest',
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-medium"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Origin *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.origin}
                    onChange={(e) => setEditingProduct({ ...editingProduct, origin: e.target.value })}
                    placeholder="e.g. Kashmir Valley, Gilgit"
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Image URL *</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="url"
                    required
                    value={editingProduct.imageUrl}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-mono text-[11px]"
                  />
                  {editingProduct.imageUrl && (
                    <img
                      src={editingProduct.imageUrl}
                      alt="Preview"
                      className="w-10 h-10 rounded-xl object-cover border border-[#E8DDCA]"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=480&q=65&fm=webp'; }}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Short Description *</label>
                <textarea
                  rows={2}
                  required
                  value={editingProduct.shortDescription}
                  onChange={(e) => setEditingProduct({ ...editingProduct, shortDescription: e.target.value })}
                  placeholder="One sentence summary for catalog cards"
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="In-depth botanical, sourcing and preparation story"
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Portion Variants & Prices */}
              <div className="space-y-3 pt-2 border-t border-[#E8DDCA]">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                    Portion Weights, Prices & Stock Inventory
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newV: ProductVariant = {
                        id: `v-${Date.now()}-${editingProduct.variants.length + 1}`,
                        weight: '250g',
                        sku: `ZDS-GEN-${Math.floor(100 + Math.random() * 900)}`,
                        price: 1500,
                        stock: 20,
                      };
                      setEditingProduct({
                        ...editingProduct,
                        variants: [...editingProduct.variants, newV],
                      });
                    }}
                    className="text-[11px] text-[#244C37] font-bold hover:underline cursor-pointer"
                  >
                    + Add Portion Weight
                  </button>
                </div>

                <div className="space-y-2">
                  {editingProduct.variants.map((variant, idx) => (
                    <div
                      key={variant.id || idx}
                      className="p-3 bg-[#F8F5ED] rounded-xl border border-[#E8DDCA] grid grid-cols-1 sm:grid-cols-5 gap-2 items-center"
                    >
                      <div>
                        <span className="text-[10px] text-gray-500 block">Portion / Weight:</span>
                        <input
                          type="text"
                          required
                          value={variant.weight}
                          onChange={(e) => {
                            const updated = [...editingProduct.variants];
                            updated[idx] = { ...updated[idx], weight: e.target.value };
                            setEditingProduct({ ...editingProduct, variants: updated });
                          }}
                          placeholder="e.g. 250g, 500g, 1kg"
                          className="w-full p-1.5 rounded-lg border border-[#E8DDCA] bg-white font-medium"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 block">SKU Code:</span>
                        <input
                          type="text"
                          required
                          value={variant.sku}
                          onChange={(e) => {
                            const updated = [...editingProduct.variants];
                            updated[idx] = { ...updated[idx], sku: e.target.value };
                            setEditingProduct({ ...editingProduct, variants: updated });
                          }}
                          className="w-full p-1.5 rounded-lg border border-[#E8DDCA] bg-white font-mono text-[11px]"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 block">Regular Price (PKR):</span>
                        <input
                          type="number"
                          required
                          min={1}
                          value={variant.price}
                          onChange={(e) => {
                            const updated = [...editingProduct.variants];
                            updated[idx] = { ...updated[idx], price: Number(e.target.value) };
                            setEditingProduct({ ...editingProduct, variants: updated });
                          }}
                          className="w-full p-1.5 rounded-lg border border-[#E8DDCA] bg-white font-semibold"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 block">Sale Price (Optional):</span>
                        <input
                          type="number"
                          min={0}
                          value={variant.salePrice || ''}
                          onChange={(e) => {
                            const updated = [...editingProduct.variants];
                            const val = e.target.value ? Number(e.target.value) : undefined;
                            updated[idx] = { ...updated[idx], salePrice: val };
                            setEditingProduct({ ...editingProduct, variants: updated });
                          }}
                          placeholder="None"
                          className="w-full p-1.5 rounded-lg border border-[#E8DDCA] bg-white text-[#B96F50] font-semibold"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <span className="text-[10px] text-gray-500 block">Stock Qty:</span>
                          <input
                            type="number"
                            min={0}
                            required
                            value={variant.stock}
                            onChange={(e) => {
                              const updated = [...editingProduct.variants];
                              updated[idx] = { ...updated[idx], stock: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, variants: updated });
                            }}
                            className="w-full p-1.5 rounded-lg border border-[#E8DDCA] bg-white font-bold"
                          />
                        </div>
                        {editingProduct.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingProduct.variants.filter((_, i) => i !== idx);
                              setEditingProduct({ ...editingProduct, variants: updated });
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 cursor-pointer mt-4"
                            title="Remove portion"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6 pt-3 border-t border-[#E8DDCA]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.featured}
                    onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                    className="rounded text-[#244C37]"
                  />
                  <span className="font-semibold text-gray-700">Feature on Homepage</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.bestSeller}
                    onChange={(e) => setEditingProduct({ ...editingProduct, bestSeller: e.target.checked })}
                    className="rounded text-[#244C37]"
                  />
                  <span className="font-semibold text-gray-700">Curator&apos;s Best Seller Badge</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.inStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, inStock: e.target.checked })}
                    className="rounded text-[#244C37]"
                  />
                  <span className="font-semibold text-gray-700">In Stock for Ordering</span>
                </label>
              </div>

              {/* Analytics & User Visits Field (Server-Managed Read-Only) */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-[#244C37]">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-xs">Total User Visits Counter</h4>
                    <p className="text-[11px] text-gray-500">
                      Read-only analytics counter incremented atomically on the server when shoppers open this product.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white">
                  <span className="font-mono font-bold text-xs text-[#244C37]">
                    {(editingProduct.viewCount ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-gray-500">views</span>
                </div>
              </div>

              <div className="p-4 bg-[#F8F5ED] rounded-2xl flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#244C37] hover:bg-[#1A3828] text-white font-bold shadow-md cursor-pointer flex items-center space-x-2"
                >
                  <span>{isNewProduct ? 'Create & Publish Harvest' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E8DDCA] overflow-hidden my-8 flex flex-col">
            <div className="p-6 border-b border-[#E8DDCA] flex items-center justify-between bg-[#F8F5ED]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#C99A45] font-bold">
                  Promotional Offers
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#242821] mt-0.5">
                  Create New Coupon Code
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Coupon Promo Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WINTER20, SEHAT500, EIDGIFT"
                  value={couponForm.code}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-mono font-bold uppercase"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Letters, numbers, and hyphens only (auto-uppercased).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        discountType: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-semibold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (PKR)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={couponForm.discountType === 'percentage' ? 100 : 50000}
                    value={couponForm.discountValue}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        discountValue: Math.max(1, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    placeholder={couponForm.discountType === 'percentage' ? '15' : '500'}
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Min Order (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={couponForm.minOrderAmount}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        minOrderAmount: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    placeholder="2000"
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Usage Limit (Optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={couponForm.usageLimit ?? ''}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        usageLimit: e.target.value ? Math.max(1, parseInt(e.target.value, 10) || 1) : undefined,
                      })
                    }
                    placeholder="Unlimited"
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={couponForm.expiryDate || '2026-12-31'}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        expiryDate: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED] focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={couponForm.isActive}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="rounded text-[#244C37]"
                  />
                  <span className="font-semibold text-gray-700">Activate Coupon Immediately</span>
                </label>
              </div>

              <div className="p-4 bg-[#F8F5ED] rounded-2xl flex items-center justify-end space-x-3 pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#244C37] hover:bg-[#1A3828] text-white font-bold shadow-md cursor-pointer flex items-center space-x-2"
                >
                  <span>Save & Publish Coupon</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Inspector Modal */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E8DDCA] overflow-hidden my-8">
            <div className="p-6 border-b border-[#E8DDCA] flex items-center justify-between bg-[#F8F5ED]">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#B69A62] font-bold">
                  Consignment Detail Slip
                </span>
                <h2 className="font-serif text-xl font-bold text-[#242821] mt-0.5">
                  {inspectingOrder.orderNumber}
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#244C37] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingOrder(null)}
                  className="p-2 rounded-full hover:bg-gray-200 text-gray-500 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8F5ED] p-4 rounded-2xl border border-[#E8DDCA]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-gray-400 block">Recipient</span>
                  <p className="font-bold text-gray-900">{inspectingOrder.customerName}</p>
                  <p className="font-mono text-gray-600">{inspectingOrder.customerPhone}</p>
                  {inspectingOrder.customerEmail && (
                    <p className="text-gray-500">{inspectingOrder.customerEmail}</p>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-gray-400 block">Delivery Address</span>
                  <p className="text-gray-800">{inspectingOrder.address}</p>
                  <p className="text-gray-600">{inspectingOrder.city}, {inspectingOrder.province}</p>
                  {inspectingOrder.paymentReference && (
                    <p className="font-mono text-[11px] text-[#244C37] mt-1">
                      Payment Ref: {inspectingOrder.paymentReference}
                    </p>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-100 border border-[#E8DDCA] rounded-2xl overflow-hidden">
                {inspectingOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{item.productName}</p>
                      <p className="text-[11px] text-gray-500">{item.variantWeight} • SKU: {item.sku}</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="block">{item.quantity} × Rs. {item.price.toLocaleString()}</span>
                      <span className="font-bold text-[#244C37]">Rs. {item.subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#E8DDCA] font-bold text-sm text-[#244C37]">
                <span>
                  {inspectingOrder.paymentMethod} ({inspectingOrder.paymentStatus}) • Status: {inspectingOrder.orderStatus}
                </span>
                <span className="font-serif text-lg">
                  Total: Rs. {inspectingOrder.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
