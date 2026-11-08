import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, OrderStatus, ProductVariant, Coupon } from '../types';
import {
  IONOS_MYSQL_SCHEMA,
  IONOS_SEED_DATA,
  IONOS_HTACCESS,
  IONOS_PHP_DATABASE_CONFIG,
  IONOS_PHP_INDEX,
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
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    products,
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
    setActiveView,
    isFirebaseSyncing,
    firebaseConnected,
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    'analytics' | 'products' | 'orders' | 'inventory' | 'coupons' | 'reviews' | 'settings' | 'ionos'
  >('analytics');

  // Search & filter states
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');

  // Product edit modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  // Copy notification state
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

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

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch);
    const matchesStatus =
      orderStatusFilter === 'all' || o.orderStatus === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.categoryLabel.toLowerCase().includes(productSearch.toLowerCase())
  );

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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (isNewProduct) {
      await addNewProduct(editingProduct);
    } else {
      await updateProduct(editingProduct);
    }

    setEditingProduct(null);
    setIsNewProduct(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full max-w-full overflow-x-hidden">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E8DDCA] gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-[#344B36] text-[#B69A62] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Staff Portal
            </span>
            <span className="text-xs text-gray-500">• Authenticated Administrator</span>
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
            onClick={() => setActiveView('home')}
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
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-[#E8DDCA] space-x-2 sm:space-x-4 overflow-x-auto py-3 text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center space-x-1.5 pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'analytics'
              ? 'border-[#244C37] text-[#244C37]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard KPI</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center space-x-1.5 pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'products'
              ? 'border-[#244C37] text-[#244C37]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center space-x-1.5 pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'orders'
              ? 'border-[#244C37] text-[#244C37]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center space-x-1.5 pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'inventory'
              ? 'border-[#244C37] text-[#244C37]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stock Audit ({lowStockVariants.length} Low)</span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`flex items-center space-x-1.5 pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'coupons'
              ? 'border-[#244C37] text-[#244C37]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Coupons ({coupons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center space-x-1.5 pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'reviews'
              ? 'border-[#244C37] text-[#244C37]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Reviews ({reviews.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-1.5 pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'settings'
              ? 'border-[#244C37] text-[#244C37]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('ionos')}
          className={`flex items-center space-x-1.5 pb-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'ionos'
              ? 'border-[#C99A45] text-[#C99A45] font-bold'
              : 'border-transparent text-[#AA7F32] hover:text-[#C99A45]'
          }`}
        >
          <Server className="w-4 h-4 text-[#C99A45]" />
          <span>IONOS PHP & MySQL Center</span>
        </button>
      </div>

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
            <div className="relative max-w-sm flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search catalog by name or category..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-white rounded-xl border border-[#E8DDCA]"
              />
            </div>

            <button
              onClick={() => {
                const blank: Product = {
                  id: `prod-${Date.now()}`,
                  name: 'New Mountain Dry Fruit',
                  urduName: '',
                  slug: `product-${Date.now()}`,
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

          <div className="bg-white rounded-3xl border border-[#E8DDCA] overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs min-w-[650px]">
              <thead>
                <tr className="bg-[#F8F5ED] border-b border-[#E8DDCA] text-left text-gray-500 uppercase text-[10px]">
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Variants & Prices</th>
                  <th className="p-3">Total Stock</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const totalStock = p.variants.reduce((a, v) => a + v.stock, 0);
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

      {/* TAB 3: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by Order ID, customer name, or phone..."
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
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <span className="text-xs text-gray-500">
              Showing {filteredOrders.length} of {orders.length} orders
            </span>
          </div>

          <div className="space-y-4">
            {filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-5 bg-white rounded-3xl border border-[#E8DDCA] shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-serif font-bold text-base text-[#244C37]">
                        {ord.orderNumber}
                      </span>
                      <span className="text-xs text-gray-400">
                        • {new Date(ord.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 font-semibold text-gray-700">
                        {ord.paymentMethod} ({ord.paymentStatus})
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Customer: <strong>{ord.customerName}</strong> ({ord.customerPhone}) • {ord.address}, {ord.city}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-serif text-lg font-bold text-[#244C37]">
                      Rs. {ord.totalAmount.toLocaleString()}
                    </span>

                    {/* Status Changer Dropdown */}
                    <select
                      value={ord.orderStatus}
                      onChange={(e) =>
                        updateOrderStatus(
                          ord.id,
                          e.target.value as OrderStatus,
                          `Admin changed status to ${e.target.value}`
                        )
                      }
                      className="text-xs p-1.5 rounded-lg border border-[#E8DDCA] bg-[#F8F5ED] font-bold text-[#244C37]"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Processing">Processing</option>
                      <option value="Packed">Packed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Items in this order */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {ord.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-[#F8F5ED] border border-[#E8DDCA]/60 flex items-center space-x-2 text-xs"
                    >
                      <img
                        src={it.imageUrl}
                        alt=""
                        className="w-8 h-8 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{it.productName}</p>
                        <p className="text-[11px] text-gray-500">
                          {it.variantWeight} × {it.quantity} (Rs.{' '}
                          {it.price.toLocaleString()})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {ord.internalNotes && ord.internalNotes.length > 0 && (
                  <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg">
                    <strong>Admin Notes:</strong> {ord.internalNotes.join(' | ')}
                  </div>
                )}
              </div>
            ))}
          </div>
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
                          onClick={() => {
                            const updatedVariants = p.variants.map((vr) =>
                              vr.id === v.id ? { ...vr, stock: vr.stock + 10 } : vr
                            );
                            updateProduct({ ...p, variants: updatedVariants });
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
                    {c.usageCount} times
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 mt-4 flex items-center justify-between">
                  <button
                    onClick={() => toggleCoupon(c.code)}
                    className="text-xs text-[#244C37] font-semibold hover:underline cursor-pointer"
                  >
                    {c.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteCoupon(c.code)}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="py-6 space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 bg-white rounded-2xl border border-[#E8DDCA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#242821]">
                    {rev.customerName}
                  </span>
                  <span className="text-gray-400">• {rev.city}</span>
                  <span className="text-[#C99A45] font-bold">★ {rev.rating}/5</span>
                </div>
                <p className="text-gray-600 mt-1 italic">&quot;{rev.comment}&quot;</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Product: {rev.productName} • Date: {rev.date}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  Approved & Public
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="py-6 max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDCA] shadow-xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#244C37]">
            Store & Logistics Configuration
          </h3>

          <div>
            <label className="text-xs font-bold text-[#242821] block mb-1">
              Store Name:
            </label>
            <input
              type="text"
              value={settings.storeName}
              onChange={(e) => updateSettings({ storeName: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#242821] block mb-1">
                WhatsApp Hotline:
              </label>
              <input
                type="text"
                value={settings.whatsappNumber}
                onChange={(e) => updateSettings({ whatsappNumber: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#242821] block mb-1">
                Free Shipping Threshold (PKR):
              </label>
              <input
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(e) =>
                  updateSettings({ freeShippingThreshold: Number(e.target.value) })
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
              value={settings.announcementBarMessage}
              onChange={(e) =>
                updateSettings({ announcementBarMessage: e.target.value })
              }
              className="w-full text-xs p-2.5 rounded-xl border border-[#E8DDCA] bg-[#F8F5ED]"
            />
          </div>
        </div>
      )}

      {/* TAB 8: IONOS SHARED HOSTING EXPORT CENTER */}
      {activeTab === 'ionos' && (
        <div className="py-6 space-y-8">
          <div className="bg-[#244C37] text-white p-6 sm:p-8 rounded-3xl border border-[#1A3828] space-y-4">
            <div className="flex items-center space-x-2 text-[#C99A45]">
              <Server className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Production Shared Hosting Export Suite
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold">
              IONOS PHP 8.2 + MySQL Production Architecture
            </h2>
            <p className="text-xs sm:text-sm text-[#E8DDCA]/80 leading-relaxed max-w-3xl">
              Strictly engineered for standard shared hosting environments without Node.js, Docker, or external build processes. This production bundle contains the 26 normalized MySQL tables, PDO database connectors, clean .htaccess Apache routing, and vanilla MVC code ready for upload to your IONOS public_html folder.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() =>
                  handleDownloadFile(
                    IONOS_MYSQL_SCHEMA,
                    'zauq_ecommerce_schema_26_tables.sql',
                    'text/plain'
                  )
                }
                className="px-4 py-2.5 bg-[#C99A45] hover:bg-[#AA7F32] text-[#244C37] rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Schema (26 Tables SQL)</span>
              </button>

              <button
                onClick={() =>
                  handleDownloadFile(IONOS_SEED_DATA, 'zauq_seed_data.sql', 'text/plain')
                }
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Seed Data SQL</span>
              </button>

              <button
                onClick={() =>
                  handleDownloadFile(IONOS_HTACCESS, '.htaccess', 'text/plain')
                }
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download .htaccess</span>
              </button>
            </div>
          </div>

          {/* Section 1: 26 Normalized MySQL Tables */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDCA] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDCA]">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#242821]">
                  1. Production MySQL Schema (26 Normalized Tables)
                </h3>
                <p className="text-xs text-gray-500">
                  Includes users, admin_users, customers, addresses, categories, products, variants, orders, items, payments, coupons, reviews, wishlists, blog, audit_logs.
                </p>
              </div>

              <button
                onClick={() => handleCopyText(IONOS_MYSQL_SCHEMA, 'schema')}
                className="px-3 py-1.5 bg-[#F8F5ED] hover:bg-[#E8DDCA] text-xs font-bold rounded-lg border border-[#E8DDCA] flex items-center space-x-1.5 cursor-pointer"
              >
                {copiedSection === 'schema' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied SQL!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                    <span>Copy Schema SQL</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-[#1A3828] text-[#F8F5ED] text-[11px] font-mono rounded-2xl overflow-x-auto max-h-72 leading-relaxed">
              {IONOS_MYSQL_SCHEMA}
            </pre>
          </div>

          {/* Section 2: PHP 8.2 Database PDO Singleton */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDCA] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDCA]">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#242821]">
                  2. PDO Database Connection Singleton (config/database.php)
                </h3>
                <p className="text-xs text-gray-500">
                  Enforces prepared statements, utf8mb4 encoding, and error logging for IONOS credentials.
                </p>
              </div>

              <button
                onClick={() => handleCopyText(IONOS_PHP_DATABASE_CONFIG, 'pdo')}
                className="px-3 py-1.5 bg-[#F8F5ED] hover:bg-[#E8DDCA] text-xs font-bold rounded-lg border border-[#E8DDCA] flex items-center space-x-1.5 cursor-pointer"
              >
                {copiedSection === 'pdo' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied PHP!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                    <span>Copy database.php</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-[#1A3828] text-[#F8F5ED] text-[11px] font-mono rounded-2xl overflow-x-auto max-h-56 leading-relaxed">
              {IONOS_PHP_DATABASE_CONFIG}
            </pre>
          </div>

          {/* Section 3: IONOS Apache .htaccess */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDCA] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DDCA]">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#242821]">
                  3. Apache Configuration (.htaccess)
                </h3>
                <p className="text-xs text-gray-500">
                  Forces HTTPS, sets security headers (X-Frame-Options, nosniff), enables Gzip, and routes clean URLs.
                </p>
              </div>

              <button
                onClick={() => handleCopyText(IONOS_HTACCESS, 'htaccess')}
                className="px-3 py-1.5 bg-[#F8F5ED] hover:bg-[#E8DDCA] text-xs font-bold rounded-lg border border-[#E8DDCA] flex items-center space-x-1.5 cursor-pointer"
              >
                {copiedSection === 'htaccess' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                    <span>Copy .htaccess</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-[#1A3828] text-[#F8F5ED] text-[11px] font-mono rounded-2xl overflow-x-auto max-h-56 leading-relaxed">
              {IONOS_HTACCESS}
            </pre>
          </div>

          {/* Section 4: IONOS Deployment Checklist */}
          <div className="bg-[#F8F5ED] p-6 sm:p-8 rounded-3xl border border-[#E8DDCA] space-y-3">
            <h3 className="font-serif text-lg font-bold text-[#244C37]">
              IONOS Shared Hosting Deployment Checklist:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-gray-700 leading-relaxed">
              <li>Log in to your <strong>IONOS Cloud / Hosting Panel</strong> and navigate to <strong>Databases &gt; MySQL</strong>.</li>
              <li>Create a new database (e.g. `zauq_db`), noting the Database Host (`db50XXXXXX.hosting-data.io`), Username, and Password.</li>
              <li>Open <strong>phpMyAdmin</strong> from your IONOS dashboard and import the downloaded `zauq_ecommerce_schema_26_tables.sql` followed by `zauq_seed_data.sql`.</li>
              <li>Connect via <strong>SFTP / WebFTP</strong> to the IONOS root and copy the files into your `public_html` directory.</li>
              <li>Update `config/database.php` with your IONOS database host and credentials.</li>
              <li>Ensure PHP version is set to <strong>PHP 8.2 or 8.3</strong> in IONOS Domain Settings.</li>
              <li>Your store is live! Access the admin panel at `https://yourdomain.com/admin` with default credentials: `admin@zauqesehat.pk` / `Admin@Zauq2026!`.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
