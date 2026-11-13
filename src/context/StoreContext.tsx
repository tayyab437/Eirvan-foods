import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/apiClient';
import {
  Product,
  ProductVariant,
  CartItem,
  CustomBuildSpec,
  Order,
  OrderStatus,
  StoreSettings,
  Coupon,
  CustomerReview,
  BlogPost,
  CategoryItem,
  ShahiMixBox,
  ShahiMixIngredient,
  UnboxingReview,
  WholesaleInquiry,
  PaymentMethod,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_COUPONS,
  INITIAL_REVIEWS,
  INITIAL_BLOGS,
  INITIAL_CATEGORIES,
  INITIAL_SHAHI_MIX_BOXES,
  INITIAL_SHAHI_MIX_INGREDIENTS,
  INITIAL_UNBOXING_REVIEWS,
} from '../data/mockData';

export interface PlaceOrderPayload {
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city: string;
  province: string;
  address: string;
  specialInstructions?: string;
  paymentMethod: PaymentMethod;
  bankReference?: string;
  couponCode?: string;
  items: {
    productId: string;
    variantId: string;
    quantity: number;
    customBuild?: CustomBuildSpec;
  }[];
}

export interface AddReviewPayload {
  productId: string;
  productName: string;
  customerName: string;
  city: string;
  rating: number;
  comment: string;
  orderNumber?: string;
  phone?: string;
}

interface StoreContextType {
  products: Product[];
  categoriesList: CategoryItem[];
  shahiMixBoxes: ShahiMixBox[];
  shahiMixIngredients: ShahiMixIngredient[];
  unboxingReviews: UnboxingReview[];
  categories: { id: string; name: string; count: number; image: string; description?: string; isSystem?: boolean }[];
  cart: CartItem[];
  cartSubtotal: number;
  shippingFee: number;
  appliedCoupon: Coupon | null;
  couponDiscount: number;
  cartTotal: number;
  freeShippingRemaining: number;
  orders: Order[];
  reviews: CustomerReview[];
  blogs: BlogPost[];
  coupons: Coupon[];
  wholesaleInquiries: WholesaleInquiry[];
  settings: StoreSettings;
  wishlist: string[];
  searchQuery: string;
  selectedProduct: Product | null;
  isCartOpen: boolean;
  isAiSommelierOpen: boolean;
  isAiStudioOpen: boolean;
  isGiftWizardOpen: boolean;
  lastPlacedOrder: Order | null;
  isFirebaseSyncing: boolean;
  firebaseConnected: boolean;
  currentUser: { uid: string; email: string | null; displayName: string | null; emailVerified: boolean } | null;
  isAuthReady: boolean;
  isAdminUser: boolean;

  setSearchQuery: (query: string) => void;
  setSelectedProduct: (prod: Product | null) => void;
  setIsCartOpen: (open: boolean) => void;
  setIsAiSommelierOpen: (open: boolean) => void;
  setIsAiStudioOpen: (open: boolean) => void;
  setIsGiftWizardOpen: (open: boolean) => void;

  addToCart: (
    product: Product,
    variant: ProductVariant,
    quantity?: number,
    customGiftNote?: string,
    boxStyle?: string,
    customBuild?: CustomBuildSpec
  ) => void;
  updateCartQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  placeOrder: (orderData: PlaceOrderPayload) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus, adminNote?: string) => Promise<void>;
  submitWholesaleInquiry: (inquiryData: Omit<WholesaleInquiry, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateWholesaleStatus: (inquiryId: string, status: WholesaleInquiry['status']) => Promise<void>;
  deleteWholesaleInquiry: (inquiryId: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  toggleWishlist: (productId: string) => void;
  addReview: (review: AddReviewPayload) => Promise<{ success: boolean; message: string }>;
  moderateReview: (reviewId: string, status: CustomerReview['status']) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  updateProduct: (updated: Product) => Promise<void>;
  addNewProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  recordProductView: (productId: string) => Promise<void>;
  addCoupon: (coupon: Coupon) => Promise<void>;
  toggleCoupon: (code: string) => Promise<void>;
  deleteCoupon: (code: string) => Promise<void>;
  addCategory: (category: { name: string; image?: string; description?: string }) => Promise<{ success: boolean; message: string }>;
  deleteCategory: (categoryId: string) => Promise<{ success: boolean; message: string }>;
  addShahiMixBox: (box: ShahiMixBox) => Promise<void>;
  updateShahiMixBox: (box: ShahiMixBox) => Promise<void>;
  deleteShahiMixBox: (boxId: string) => Promise<void>;
  addShahiMixIngredient: (ingredient: ShahiMixIngredient) => Promise<void>;
  updateShahiMixIngredient: (ingredient: ShahiMixIngredient) => Promise<void>;
  deleteShahiMixIngredient: (ingredientId: string) => Promise<void>;
  backfillCatalogToFirestore: () => Promise<{ createdMissingDocs: number }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

function isExpiredDate(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const exp = new Date(`${expiryDate}T23:59:59`);
  return !Number.isNaN(exp.getTime()) && Date.now() > exp.getTime();
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [shahiMixBoxes, setShahiMixBoxes] = useState<ShahiMixBox[]>(INITIAL_SHAHI_MIX_BOXES);
  const [shahiMixIngredients, setShahiMixIngredients] = useState<ShahiMixIngredient[]>(INITIAL_SHAHI_MIX_INGREDIENTS);
  const [unboxingReviews] = useState<UnboxingReview[]>(INITIAL_UNBOXING_REVIEWS);

  const [orders, setOrders] = useState<Order[]>([]);
  const [wholesaleInquiries, setWholesaleInquiries] = useState<WholesaleInquiry[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_REVIEWS);
  const [blogs] = useState<BlogPost[]>(INITIAL_BLOGS);

  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState<boolean>(true);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    emailVerified: boolean;
  } | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('zds_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zds_wishlist');
      return saved ? JSON.parse(saved) : ['prod-3', 'prod-9'];
    } catch {
      return ['prod-3', 'prod-9'];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isAiSommelierOpen, setIsAiSommelierOpen] = useState<boolean>(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState<boolean>(false);
  const [isGiftWizardOpen, setIsGiftWizardOpen] = useState<boolean>(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  // 1. Track Firebase Auth & Verify Admin Role Server-Side via /api/auth/session
  useEffect(() => {
    let unsubAuth = () => {};
    let mounted = true;

    const initAuth = async () => {
      try {
        const { getFirebaseAuth } = await import('../firebase/config');
        const { onAuthStateChanged } = await import('firebase/auth');
        const auth = await getFirebaseAuth();

        unsubAuth = onAuthStateChanged(auth, async (user) => {
          if (!mounted) return;
          if (!user) {
            setCurrentUser(null);
            setIsAdminUser(false);
            setIsAuthReady(true);
            return;
          }

          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified,
          });

          try {
            const session = await apiRequest<{ isAdmin?: boolean }>('/api/auth/session', {
              optionalAuth: true,
            });
            if (mounted) {
              setIsAdminUser(Boolean(session?.isAdmin));
            }
          } catch {
            // If PHP backend isn't mounted (e.g. local Vite-only preview), verify strictly via /admins/{uid} document read
            try {
              const { getFirestoreDb } = await import('../firebase/config');
              const { doc, getDoc } = await import('firebase/firestore');
              const db = await getFirestoreDb();
              const adminSnap = await getDoc(doc(db, 'admins', user.uid));
              if (mounted) {
                setIsAdminUser(Boolean(user.emailVerified && adminSnap.exists()));
              }
            } catch {
              if (mounted) {
                setIsAdminUser(false);
              }
            }
          } finally {
            if (mounted) {
              setIsAuthReady(true);
            }
          }
        });
      } catch (err) {
        console.error('Failed to initialize Firebase Auth:', err);
        if (mounted) setIsAuthReady(true);
      }
    };

    initAuth();
    return () => {
      mounted = false;
      unsubAuth();
    };
  }, []);

  // 2. Public Read-Only Storefront Sync (No orders, no coupon list, no unauth seeding)
  useEffect(() => {
    let unsubPublic = () => {};
    let mounted = true;

    const initFirestorePublicSync = async () => {
      try {
        setIsFirebaseSyncing(true);
        const { db_initPublicSync } = await import('../services/firestoreService');

        const stopSync = await db_initPublicSync(
          (prods) => setProducts(prods),
          (revs) => setReviews(revs),
          (setts) => setSettings(setts),
          (cats) => setCategoriesList(cats),
          (boxes) => setShahiMixBoxes(boxes),
          (ings) => setShahiMixIngredients(ings),
          (error, path) => {
            console.warn(`[Firestore Public Sync] Listener warning on "${path}":`, error);
          }
        );

        if (!mounted) {
          stopSync();
          return;
        }
        unsubPublic = stopSync;
        setFirebaseConnected(true);
        setIsFirebaseSyncing(false);
      } catch (err) {
        console.error('Failed to initialize public Firestore sync:', err);
        setFirebaseConnected(false);
        setIsFirebaseSyncing(false);
      }
    };

    initFirestorePublicSync();
    return () => {
      mounted = false;
      unsubPublic();
    };
  }, []);

  // 3. Admin-Only Protected Data Sync (Orders, Coupons, All Reviews, Wholesale Inquiries)
  useEffect(() => {
    if (!isAuthReady || !isAdminUser) {
      setOrders([]);
      setWholesaleInquiries([]);
      setCoupons([]);
      return;
    }

    let unsubAdmin = () => {};
    let mounted = true;

    const initProtectedSync = async () => {
      // Load initial privileged collections cleanly from PHP Admin API
      try {
        const [ordRes, coupRes, revRes, whlRes] = await Promise.allSettled([
          apiRequest<{ orders: Order[] }>('/api/orders', { requireAuth: true }),
          apiRequest<{ coupons: Coupon[] }>('/api/coupons', { requireAuth: true }),
          apiRequest<{ reviews: CustomerReview[] }>('/api/reviews', { requireAuth: true }),
          apiRequest<{ inquiries: WholesaleInquiry[] }>('/api/wholesale', { requireAuth: true }),
        ]);

        if (!mounted) return;
        if (ordRes.status === 'fulfilled' && Array.isArray(ordRes.value.orders)) {
          setOrders(ordRes.value.orders);
        }
        if (coupRes.status === 'fulfilled' && Array.isArray(coupRes.value.coupons)) {
          setCoupons(coupRes.value.coupons);
        }
        if (revRes.status === 'fulfilled' && Array.isArray(revRes.value.reviews)) {
          setReviews(revRes.value.reviews);
        }
        if (whlRes.status === 'fulfilled' && Array.isArray(whlRes.value.inquiries)) {
          setWholesaleInquiries(whlRes.value.inquiries);
        }
      } catch (err) {
        console.warn('Admin API hydration warning:', err);
      }

      // Attach live Firestore admin listeners when permitted by rules
      try {
        const { db_initAdminSync } = await import('../services/firestoreService');
        const stopAdmin = await db_initAdminSync(
          (ords) => mounted && setOrders(ords),
          (coups) => mounted && setCoupons(coups),
          (revs) => mounted && setReviews(revs),
          (whls) => mounted && setWholesaleInquiries(whls),
          (error, path) => {
            console.warn(`[Firestore Admin Sync] "${path}" warning:`, error);
          }
        );
        if (!mounted) {
          stopAdmin();
          return;
        }
        unsubAdmin = stopAdmin;
      } catch (err) {
        console.warn('Admin live listener initialization skipped:', err);
      }
    };

    initProtectedSync();
    return () => {
      mounted = false;
      unsubAdmin();
    };
  }, [isAuthReady, isAdminUser]);

  // Persist cart and wishlist locally
  useEffect(() => {
    try {
      localStorage.setItem('zds_cart', JSON.stringify(cart));
    } catch {
      // Storage unavailable
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('zds_wishlist', JSON.stringify(wishlist));
    } catch {
      // Storage unavailable
    }
  }, [wishlist]);

  const categories = [
    {
      id: 'all',
      name: 'All Products',
      count: products.length,
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=480&q=65&fm=webp',
      isSystem: true,
    },
    ...categoriesList.map((cat) => ({
      id: cat.id,
      name: cat.name,
      count: products.filter((p) => p.category === cat.id).length,
      image: cat.image || 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=480&q=65&fm=webp',
      description: cat.description,
      isSystem: cat.isSystem,
    })),
  ];

  // Derived cart preview totals (server remains authoritative on order submission)
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingFee =
    cartSubtotal === 0 || cartSubtotal >= settings.freeShippingThreshold
      ? 0
      : settings.standardShippingRate;
  const freeShippingRemaining = Math.max(0, settings.freeShippingThreshold - cartSubtotal);

  let couponDiscount = 0;
  if (appliedCoupon && appliedCoupon.isActive && !isExpiredDate(appliedCoupon.expiryDate) && cartSubtotal >= appliedCoupon.minOrderAmount) {
    if (appliedCoupon.discountType === 'percentage') {
      couponDiscount = Math.round((cartSubtotal * appliedCoupon.discountValue) / 100);
    } else {
      couponDiscount = Math.min(cartSubtotal, appliedCoupon.discountValue);
    }
  }
  const cartTotal = Math.max(0, cartSubtotal + shippingFee - couponDiscount);

  const addToCart = (
    product: Product,
    variant: ProductVariant,
    quantity = 1,
    customGiftNote?: string,
    boxStyle?: string,
    customBuild?: CustomBuildSpec
  ) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.variantId === variant.id);
      const effectivePrice = variant.salePrice || variant.price;

      if (existingIndex > -1 && !customBuild) {
        const updated = [...prev];
        const newQty = Math.min(variant.stock, updated[existingIndex].quantity + quantity);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          customGiftNote: customGiftNote || updated[existingIndex].customGiftNote,
          boxStyle: boxStyle || updated[existingIndex].boxStyle,
        };
        return updated;
      }

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          imageUrl: product.imageUrl,
          variantId: variant.id,
          weight: variant.weight,
          price: effectivePrice,
          quantity: Math.min(variant.stock, quantity),
          sku: variant.sku,
          maxStock: variant.stock,
          customGiftNote,
          boxStyle,
          ...(customBuild ? { customBuild } : {}),
        },
      ];
    });
    setIsCartOpen(true);
  };

  const updateCartQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.variantId === variantId ? { ...item, quantity: Math.min(item.maxStock, quantity) } : item
      )
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      return { success: false, message: 'Please enter a promo code.' };
    }

    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        coupon?: Coupon;
      }>('/api/coupons/validate', {
        method: 'POST',
        body: { code: trimmed, subtotal: cartSubtotal },
      });

      if (res.success && res.coupon) {
        setAppliedCoupon(res.coupon);
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || 'Invalid or expired coupon code.' };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unable to validate coupon code.',
      };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Authoritative Server-Side Order Creation — NEVER swallows errors or clears cart on failure!
  const placeOrder = async (orderData: PlaceOrderPayload): Promise<Order> => {
    const response = await apiRequest<{
      success: boolean;
      order: Order;
      trackingToken?: string;
    }>('/api/orders', {
      method: 'POST',
      body: orderData,
    });

    if (!response?.order?.id) {
      throw new Error('Server did not return a confirmed order record.');
    }

    const confirmedOrder: Order = {
      ...response.order,
      ...(response.trackingToken ? { trackingToken: response.trackingToken } : {}),
    };

    try {
      sessionStorage.setItem('eirvan_last_order', JSON.stringify(confirmedOrder));
    } catch {
      // sessionStorage restricted
    }

    setLastPlacedOrder(confirmedOrder);
    clearCart();
    return confirmedOrder;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, adminNote?: string) => {
    const res = await apiRequest<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      requireAuth: true,
      body: { orderStatus: status, adminNote },
    });

    if (res?.order) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
    }
  };

  const submitWholesaleInquiry = async (
    inquiryData: Omit<WholesaleInquiry, 'id' | 'createdAt' | 'status'>
  ) => {
    await apiRequest('/api/wholesale', {
      method: 'POST',
      body: inquiryData,
    });
  };

  const updateWholesaleStatus = async (inquiryId: string, status: WholesaleInquiry['status']) => {
    await apiRequest(`/api/wholesale/${encodeURIComponent(inquiryId)}`, {
      method: 'PATCH',
      requireAuth: true,
      body: { status },
    });
    setWholesaleInquiries((prev) =>
      prev.map((w) => (w.id === inquiryId ? { ...w, status } : w))
    );
  };

  const deleteWholesaleInquiry = async (inquiryId: string) => {
    await apiRequest(`/api/wholesale/${encodeURIComponent(inquiryId)}`, {
      method: 'DELETE',
      requireAuth: true,
    });
    setWholesaleInquiries((prev) => prev.filter((w) => w.id !== inquiryId));
  };

  const signInWithGoogle = async () => {
    const { getFirebaseAuth } = await import('../firebase/config');
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const auth = await getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOutUser = async () => {
    const { getFirebaseAuth } = await import('../firebase/config');
    const { signOut } = await import('firebase/auth');
    const auth = await getFirebaseAuth();
    await signOut(auth);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const addReview = async (review: AddReviewPayload) => {
    const res = await apiRequest<{ success: boolean; message: string; review?: CustomerReview }>('/api/reviews', {
      method: 'POST',
      body: review,
    });
    return {
      success: true,
      message: res.message || 'Review submitted for moderation.',
    };
  };

  const moderateReview = async (reviewId: string, status: CustomerReview['status']) => {
    await apiRequest(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'PATCH',
      requireAuth: true,
      body: { status },
    });
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status } : r)));
  };

  const deleteReview = async (reviewId: string) => {
    await apiRequest(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'DELETE',
      requireAuth: true,
    });
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    const res = await apiRequest<{ settings: StoreSettings }>('/api/settings', {
      method: 'PUT',
      requireAuth: true,
      body: newSettings,
    });
    if (res?.settings) {
      setSettings(res.settings);
    }
  };

  const updateProduct = async (updated: Product) => {
    await apiRequest(`/api/products/${encodeURIComponent(updated.id)}`, {
      method: 'PUT',
      requireAuth: true,
      body: updated,
    });
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const addNewProduct = async (product: Product) => {
    await apiRequest('/api/products', {
      method: 'POST',
      requireAuth: true,
      body: product,
    });
    setProducts((prev) => [product, ...prev]);
  };

  const deleteProduct = async (productId: string) => {
    await apiRequest(`/api/products/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      requireAuth: true,
    });
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const recordProductView = async (productId: string) => {
    try {
      const viewedKey = `viewed_prod_${productId}`;
      if (sessionStorage.getItem(viewedKey)) {
        return;
      }
      sessionStorage.setItem(viewedKey, 'true');
    } catch {
      // sessionStorage restricted
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p))
    );

    try {
      await fetch(`/api/products/${encodeURIComponent(productId)}/view`, {
        method: 'POST',
        keepalive: true,
      });
    } catch {
      // Non-blocking analytics failure
    }
  };

  const addCoupon = async (coupon: Coupon) => {
    const formatted: Coupon = {
      ...coupon,
      code: coupon.code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, ''),
    };
    const res = await apiRequest<{ coupon: Coupon }>('/api/coupons', {
      method: 'POST',
      requireAuth: true,
      body: formatted,
    });
    const saved = res?.coupon || formatted;
    setCoupons((prev) => [saved, ...prev.filter((c) => c.code !== saved.code)]);
  };

  const toggleCoupon = async (code: string) => {
    const res = await apiRequest<{ isActive: boolean }>(`/api/coupons/${encodeURIComponent(code)}/toggle`, {
      method: 'PATCH',
      requireAuth: true,
    });
    setCoupons((prev) =>
      prev.map((c) => (c.code === code ? { ...c, isActive: Boolean(res?.isActive) } : c))
    );
  };

  const deleteCoupon = async (code: string) => {
    await apiRequest(`/api/coupons/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      requireAuth: true,
    });
    setCoupons((prev) => prev.filter((c) => c.code !== code));
  };

  const addCategory = async (newCat: { name: string; image?: string; description?: string }) => {
    const trimmedName = newCat.name.trim();
    if (!trimmedName) {
      return { success: false, message: 'Category name cannot be empty.' };
    }
    const catId = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!catId) {
      return { success: false, message: 'Invalid category name.' };
    }
    if (categoriesList.some((c) => c.id === catId || c.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, message: `Category "${trimmedName}" already exists.` };
    }

    const itemToSave: CategoryItem = {
      id: catId,
      name: trimmedName,
      image: newCat.image || 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=480&q=65&fm=webp',
      description: newCat.description || 'Artisanal organic pantry category',
      isSystem: false,
    };

    try {
      await apiRequest('/api/categories', {
        method: 'POST',
        requireAuth: true,
        body: itemToSave,
      });
      setCategoriesList((prev) => [...prev, itemToSave]);
      return { success: true, message: `Category "${trimmedName}" created successfully!` };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to create category.',
      };
    }
  };

  const deleteCategory = async (categoryId: string) => {
    const found = categoriesList.find((c) => c.id === categoryId);
    if (!found) {
      return { success: false, message: 'Category not found.' };
    }
    try {
      await apiRequest(`/api/categories/${encodeURIComponent(categoryId)}`, {
        method: 'DELETE',
        requireAuth: true,
      });
      setCategoriesList((prev) => prev.filter((c) => c.id !== categoryId));
      return { success: true, message: `Category "${found.name}" removed successfully!` };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to remove category.',
      };
    }
  };

  const addShahiMixBox = async (box: ShahiMixBox) => {
    await apiRequest('/api/shahi-mix/boxes', {
      method: 'POST',
      requireAuth: true,
      body: box,
    });
    setShahiMixBoxes((prev) => [box, ...prev.filter((b) => b.id !== box.id)]);
  };

  const updateShahiMixBox = async (box: ShahiMixBox) => {
    await apiRequest('/api/shahi-mix/boxes', {
      method: 'POST',
      requireAuth: true,
      body: box,
    });
    setShahiMixBoxes((prev) => prev.map((b) => (b.id === box.id ? box : b)));
  };

  const deleteShahiMixBox = async (boxId: string) => {
    await apiRequest(`/api/shahi-mix/boxes/${encodeURIComponent(boxId)}`, {
      method: 'DELETE',
      requireAuth: true,
    });
    setShahiMixBoxes((prev) => prev.filter((b) => b.id !== boxId));
  };

  const addShahiMixIngredient = async (ingredient: ShahiMixIngredient) => {
    await apiRequest('/api/shahi-mix/ingredients', {
      method: 'POST',
      requireAuth: true,
      body: ingredient,
    });
    setShahiMixIngredients((prev) => [ingredient, ...prev.filter((i) => i.id !== ingredient.id)]);
  };

  const updateShahiMixIngredient = async (ingredient: ShahiMixIngredient) => {
    await apiRequest('/api/shahi-mix/ingredients', {
      method: 'POST',
      requireAuth: true,
      body: ingredient,
    });
    setShahiMixIngredients((prev) => prev.map((i) => (i.id === ingredient.id ? ingredient : i)));
  };

  const deleteShahiMixIngredient = async (ingredientId: string) => {
    await apiRequest(`/api/shahi-mix/ingredients/${encodeURIComponent(ingredientId)}`, {
      method: 'DELETE',
      requireAuth: true,
    });
    setShahiMixIngredients((prev) => prev.filter((i) => i.id !== ingredientId));
  };

  const backfillCatalogToFirestore = async () => {
    const res = await apiRequest<{ createdMissingDocs: number }>('/api/settings/backfill', {
      method: 'POST',
      requireAuth: true,
      body: {
        categories: INITIAL_CATEGORIES,
        shahiBoxes: INITIAL_SHAHI_MIX_BOXES,
        shahiIngredients: INITIAL_SHAHI_MIX_INGREDIENTS,
        products: INITIAL_PRODUCTS,
      },
    });
    return { createdMissingDocs: res.createdMissingDocs ?? 0 };
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        categoriesList,
        shahiMixBoxes,
        shahiMixIngredients,
        unboxingReviews,
        categories,
        cart,
        cartSubtotal,
        shippingFee,
        appliedCoupon,
        couponDiscount,
        cartTotal,
        freeShippingRemaining,
        orders,
        reviews,
        blogs,
        coupons,
        wholesaleInquiries,
        settings,
        wishlist,
        searchQuery,
        selectedProduct,
        isCartOpen,
        isAiSommelierOpen,
        isAiStudioOpen,
        isGiftWizardOpen,
        lastPlacedOrder,
        isFirebaseSyncing,
        firebaseConnected,
        currentUser,
        isAuthReady,
        isAdminUser,
        setSearchQuery,
        setSelectedProduct,
        setIsCartOpen,
        setIsAiSommelierOpen,
        setIsAiStudioOpen,
        setIsGiftWizardOpen,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        placeOrder,
        updateOrderStatus,
        submitWholesaleInquiry,
        updateWholesaleStatus,
        deleteWholesaleInquiry,
        signInWithGoogle,
        signOutUser,
        toggleWishlist,
        addReview,
        moderateReview,
        deleteReview,
        updateSettings,
        updateProduct,
        addNewProduct,
        deleteProduct,
        recordProductView,
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
        backfillCatalogToFirestore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
