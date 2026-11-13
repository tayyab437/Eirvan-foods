import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { handleFirestoreError, OperationType } from '../firebase/errors';

import {
  Product,
  ProductVariant,
  CartItem,
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

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedProduct: (prod: Product | null) => void;
  setIsCartOpen: (open: boolean) => void;
  setIsAiSommelierOpen: (open: boolean) => void;
  setIsAiStudioOpen: (open: boolean) => void;
  setIsGiftWizardOpen: (open: boolean) => void;

  addToCart: (product: Product, variant: ProductVariant, quantity?: number, customGiftNote?: string, boxStyle?: string) => void;
  updateCartQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  placeOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'orderStatus' | 'paymentStatus'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus, adminNote?: string) => Promise<void>;
  submitWholesaleInquiry: (inquiryData: Omit<WholesaleInquiry, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateWholesaleStatus: (inquiryId: string, status: WholesaleInquiry['status']) => Promise<void>;
  deleteWholesaleInquiry: (inquiryId: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  toggleWishlist: (productId: string) => void;
  addReview: (review: Omit<CustomerReview, 'id' | 'date' | 'status'>) => Promise<void>;
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
  addShahiMixBox: (box: ShahiMixBox) => void;
  updateShahiMixBox: (box: ShahiMixBox) => void;
  deleteShahiMixBox: (boxId: string) => void;
  addShahiMixIngredient: (ingredient: ShahiMixIngredient) => void;
  updateShahiMixIngredient: (ingredient: ShahiMixIngredient) => void;
  deleteShahiMixIngredient: (ingredientId: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wholesaleInquiries, setWholesaleInquiries] = useState<WholesaleInquiry[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_REVIEWS);
  const [blogs] = useState<BlogPost[]>(INITIAL_BLOGS);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState<boolean>(true);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string | null; displayName: string | null; emailVerified: boolean } | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const isAdminUser = Boolean(
    currentUser &&
    currentUser.email === 'ac.repair.in.dubai3@gmail.com' &&
    currentUser.emailVerified
  );

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('zds_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('zds_wishlist');
    return saved ? JSON.parse(saved) : ['prod-3', 'prod-9'];
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isAiSommelierOpen, setIsAiSommelierOpen] = useState<boolean>(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState<boolean>(false);
  const [isGiftWizardOpen, setIsGiftWizardOpen] = useState<boolean>(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  const seedingInProgress = useRef(false);

  // Track Firebase Auth state so admin-only collections are gated safely
  useEffect(() => {
    let unsubAuth = () => {};
    let mounted = true;

    const initAuth = async () => {
      try {
        const { getFirebaseAuth } = await import('../firebase/config');
        const { onAuthStateChanged } = await import('firebase/auth');
        const auth = await getFirebaseAuth();
        unsubAuth = onAuthStateChanged(auth, (user) => {
          if (!mounted) return;
          if (user) {
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              emailVerified: user.emailVerified,
            });
          } else {
            setCurrentUser(null);
          }
          setIsAuthReady(true);
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

  // Synchronize public storefront collections with Firebase Firestore in real-time
  useEffect(() => {
    let unsubPublic = () => {};
    let mounted = true;

    const initFirestoreSync = async () => {
      try {
        setIsFirebaseSyncing(true);
        const { db_testConnection, db_initSync, db_seedDatabase } = await import('../services/firestoreService');

        await db_testConnection();

        const stopSync = await db_initSync(
          (prods) => setProducts(prods),
          (ords) => setOrders(ords),
          (revs) => setReviews(revs),
          (coups) => setCoupons(coups),
          (setts) => setSettings({
            ...setts,
            contactPhone: '+92 317 6369458',
            whatsappNumber: '+92 317 6369458',
            contactEmail: 'eirvanfoods@gmail.com',
          }),
          (error, path) => handleFirestoreError(error, OperationType.GET, path),
          async () => {
            if (!seedingInProgress.current) {
              seedingInProgress.current = true;
              await db_seedDatabase(INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_COUPONS, INITIAL_REVIEWS);
            }
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
        console.error('Failed to initialize Firestore connection:', err);
        setFirebaseConnected(false);
        setIsFirebaseSyncing(false);
      }
    };

    initFirestoreSync();

    return () => {
      mounted = false;
      unsubPublic();
    };
  }, []);

  // Synchronize protected admin-only wholesale inquiries ONLY when signed in as verified admin
  useEffect(() => {
    if (!isAuthReady || !isAdminUser) {
      setWholesaleInquiries([]);
      return;
    }

    let unsubWholesale = () => {};
    let mounted = true;

    const initWholesaleSync = async () => {
      try {
        const { db_initWholesaleSync } = await import('../services/firestoreService');
        const stopSync = await db_initWholesaleSync(
          (whls) => {
            if (mounted) setWholesaleInquiries(whls);
          },
          (error, path) => handleFirestoreError(error, OperationType.GET, path)
        );
        if (!mounted) {
          stopSync();
          return;
        }
        unsubWholesale = stopSync;
      } catch (err) {
        console.error('Failed to subscribe to wholesale inquiries:', err);
      }
    };

    initWholesaleSync();

    return () => {
      mounted = false;
      unsubWholesale();
    };
  }, [isAuthReady, isAdminUser]);

  // Save Cart and Wishlist in localStorage
  useEffect(() => {
    localStorage.setItem('zds_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('zds_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>(() => {
    const saved = localStorage.getItem('zds_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem('zds_categories', JSON.stringify(categoriesList));
  }, [categoriesList]);

  // Derived category counts dynamically from categoriesList and products
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

  // Cart calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const shippingFee =
    cartSubtotal === 0 || cartSubtotal >= settings.freeShippingThreshold
      ? 0
      : settings.standardShippingRate;

  const freeShippingRemaining = Math.max(0, settings.freeShippingThreshold - cartSubtotal);

  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      couponDiscount = Math.round((cartSubtotal * appliedCoupon.discountValue) / 100);
    } else {
      couponDiscount = Math.min(cartSubtotal, appliedCoupon.discountValue);
    }
  }

  const cartTotal = Math.max(0, cartSubtotal + shippingFee - couponDiscount);

  // Cart actions
  const addToCart = (
    product: Product,
    variant: ProductVariant,
    quantity = 1,
    customGiftNote?: string,
    boxStyle?: string
  ) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.variantId === variant.id);
      const effectivePrice = variant.salePrice || variant.price;

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(variant.stock, updated[existingIndex].quantity + quantity);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          customGiftNote: customGiftNote || updated[existingIndex].customGiftNote,
          boxStyle: boxStyle || updated[existingIndex].boxStyle,
        };
        return updated;
      } else {
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
          },
        ];
      }
    });
    setIsCartOpen(true);
  };

  const updateCartQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          return { ...item, quantity: Math.min(item.maxStock, quantity) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === trimmed && c.isActive);

    if (!found) {
      return { success: false, message: 'Invalid or expired coupon code.' };
    }
    if (cartSubtotal < found.minOrderAmount) {
      return {
        success: false,
        message: `This coupon requires a minimum cart order of Rs. ${found.minOrderAmount.toLocaleString()}.`,
      };
    }

    setAppliedCoupon(found);
    return {
      success: true,
      message: `Coupon "${found.code}" applied successfully! You saved Rs. ${
        found.discountType === 'percentage'
          ? Math.round((cartSubtotal * found.discountValue) / 100)
          : found.discountValue
      }.`,
    };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Place order synced directly with Firestore
  const placeOrder = async (
    orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'orderStatus' | 'paymentStatus'>
  ): Promise<Order> => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ZDS-2026-${randomSuffix}`;
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      orderStatus: 'Pending',
      paymentStatus: 'Pending',
      courier: 'TCS Express Pakistan',
      trackingNumber: `PK-${Math.floor(100000000 + Math.random() * 900000000)}`,
    };

    try {
      const { db_placeOrder, db_updateProduct, db_addCoupon } = await import('../services/firestoreService');
      await db_placeOrder(newOrder);

      // Deduct stock in Firestore
      for (const item of cart) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const updatedVariants = prod.variants.map((v) => {
            if (v.id === item.variantId) {
              return { ...v, stock: Math.max(0, v.stock - item.quantity) };
            }
            return v;
          });
          const hasStock = updatedVariants.some((v) => v.stock > 0);
          const updatedProd = { ...prod, variants: updatedVariants, inStock: hasStock };
          await db_updateProduct(updatedProd);
        }
      }

      // If coupon used, increment usage count in Firestore
      if (appliedCoupon) {
        await db_addCoupon({
          ...appliedCoupon,
          usageCount: (appliedCoupon.usageCount || 0) + 1,
        });
      }

      setLastPlacedOrder(newOrder);
      clearCart();
      return newOrder;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `orders/${newOrder.id}`);
      setLastPlacedOrder(newOrder);
      clearCart();
      return newOrder;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, adminNote?: string) => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) return;

    const notes = ord.internalNotes || [];
    if (adminNote) {
      notes.push(`[${new Date().toLocaleDateString()}] ${adminNote}`);
    }

    const updates: Partial<Order> = {
      orderStatus: status,
      internalNotes: notes,
      paymentStatus: status === 'Delivered' && ord.paymentMethod === 'COD' ? 'Paid' : ord.paymentStatus,
    };

    try {
      const { db_updateOrderStatus } = await import('../services/firestoreService');
      await db_updateOrderStatus(orderId, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const submitWholesaleInquiry = async (inquiryData: Omit<WholesaleInquiry, 'id' | 'createdAt' | 'status'>) => {
    const newInquiry: WholesaleInquiry = {
      ...inquiryData,
      id: `whl-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'New',
    };

    try {
      const { db_submitWholesaleInquiry } = await import('../services/firestoreService');
      await db_submitWholesaleInquiry(newInquiry);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `wholesale_inquiries/${newInquiry.id}`);
    }
  };

  const updateWholesaleStatus = async (inquiryId: string, status: WholesaleInquiry['status']) => {
    try {
      const { db_updateWholesaleStatus } = await import('../services/firestoreService');
      await db_updateWholesaleStatus(inquiryId, status);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `wholesale_inquiries/${inquiryId}`);
    }
  };

  const deleteWholesaleInquiry = async (inquiryId: string) => {
    try {
      const { db_deleteWholesaleInquiry } = await import('../services/firestoreService');
      await db_deleteWholesaleInquiry(inquiryId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `wholesale_inquiries/${inquiryId}`);
    }
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

  const addReview = async (review: Omit<CustomerReview, 'id' | 'date' | 'status'>) => {
    const newRev: CustomerReview = {
      ...review,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'approved',
    };

    try {
      const { db_addReview, db_updateProduct } = await import('../services/firestoreService');
      await db_addReview(newRev);

      // Update product rating
      const prod = products.find((p) => p.id === review.productId);
      if (prod) {
        const prodReviews = [...reviews.filter((r) => r.productId === prod.id), newRev];
        const avg = prodReviews.reduce((acc, r) => acc + r.rating, 0) / prodReviews.length;
        await db_updateProduct({
          ...prod,
          rating: Number(avg.toFixed(1)),
          reviewCount: prodReviews.length,
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `reviews/${newRev.id}`);
    }
  };

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    try {
      const { db_updateSettings } = await import('../services/firestoreService');
      await db_updateSettings(newSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/main');
    }
  };

  const updateProduct = async (updated: Product) => {
    // Optimistic local state update
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    try {
      const { db_updateProduct } = await import('../services/firestoreService');
      await db_updateProduct(updated);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updated.id}`);
    }
  };

  const addNewProduct = async (product: Product) => {
    // Optimistic local state update
    setProducts((prev) => [product, ...prev]);
    try {
      const { db_updateProduct } = await import('../services/firestoreService');
      await db_updateProduct(product);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${product.id}`);
    }
  };

  const deleteProduct = async (productId: string) => {
    // Optimistic local state update
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      const { db_deleteProduct } = await import('../services/firestoreService');
      await db_deleteProduct(productId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  };

  const recordProductView = async (productId: string) => {
    // Avoid double counting in the same session
    try {
      const viewedKey = `viewed_prod_${productId}`;
      const sessionViewed = sessionStorage.getItem(viewedKey);
      if (sessionViewed) {
        return;
      }
      sessionStorage.setItem(viewedKey, 'true');
    } catch {
      // In case sessionStorage is restricted in iframe/private mode
    }

    // Optimistic local increment
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p
      )
    );

    try {
      const { db_incrementProductView } = await import('../services/firestoreService');
      await db_incrementProductView(productId);
    } catch {
      // Background counter sync failure is non-blocking
    }
  };

  const addCoupon = async (coupon: Coupon) => {
    const formatted: Coupon = {
      ...coupon,
      code: coupon.code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, ''),
    };
    setCoupons((prev) => [formatted, ...prev.filter((c) => c.code !== formatted.code)]);
    try {
      const { db_addCoupon } = await import('../services/firestoreService');
      await db_addCoupon(formatted);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `coupons/${formatted.code}`);
    }
  };

  const toggleCoupon = async (code: string) => {
    const coupon = coupons.find((c) => c.code === code);
    if (!coupon) return;
    const updated = { ...coupon, isActive: !coupon.isActive };
    setCoupons((prev) => prev.map((c) => (c.code === code ? updated : c)));
    try {
      const { db_addCoupon } = await import('../services/firestoreService');
      await db_addCoupon(updated);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `coupons/${code}`);
    }
  };

  const deleteCoupon = async (code: string) => {
    setCoupons((prev) => prev.filter((c) => c.code !== code));
    try {
      const { db_deleteCoupon } = await import('../services/firestoreService');
      await db_deleteCoupon(code);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `coupons/${code}`);
    }
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

    setCategoriesList((prev) => [...prev, itemToSave]);

    try {
      const { db_addCategory } = await import('../services/firestoreService');
      await db_addCategory(itemToSave);
    } catch {
      // Local fallback in localStorage
    }

    return { success: true, message: `Category "${trimmedName}" created successfully!` };
  };

  const [shahiMixBoxes, setShahiMixBoxes] = useState<ShahiMixBox[]>(() => {
    const saved = localStorage.getItem('zds_shahi_boxes');
    return saved ? JSON.parse(saved) : INITIAL_SHAHI_MIX_BOXES;
  });

  const [shahiMixIngredients, setShahiMixIngredients] = useState<ShahiMixIngredient[]>(() => {
    const saved = localStorage.getItem('zds_shahi_ingredients');
    return saved ? JSON.parse(saved) : INITIAL_SHAHI_MIX_INGREDIENTS;
  });

  const [unboxingReviews] = useState<UnboxingReview[]>(INITIAL_UNBOXING_REVIEWS);

  useEffect(() => {
    localStorage.setItem('zds_shahi_boxes', JSON.stringify(shahiMixBoxes));
  }, [shahiMixBoxes]);

  useEffect(() => {
    localStorage.setItem('zds_shahi_ingredients', JSON.stringify(shahiMixIngredients));
  }, [shahiMixIngredients]);

  const addShahiMixBox = (box: ShahiMixBox) => {
    setShahiMixBoxes((prev) => [box, ...prev.filter((b) => b.id !== box.id)]);
  };

  const updateShahiMixBox = (box: ShahiMixBox) => {
    setShahiMixBoxes((prev) => prev.map((b) => (b.id === box.id ? box : b)));
  };

  const deleteShahiMixBox = (boxId: string) => {
    setShahiMixBoxes((prev) => prev.filter((b) => b.id !== boxId));
  };

  const addShahiMixIngredient = (ingredient: ShahiMixIngredient) => {
    setShahiMixIngredients((prev) => [ingredient, ...prev.filter((i) => i.id !== ingredient.id)]);
  };

  const updateShahiMixIngredient = (ingredient: ShahiMixIngredient) => {
    setShahiMixIngredients((prev) => prev.map((i) => (i.id === ingredient.id ? ingredient : i)));
  };

  const deleteShahiMixIngredient = (ingredientId: string) => {
    setShahiMixIngredients((prev) => prev.filter((i) => i.id !== ingredientId));
  };

  const deleteCategory = async (categoryId: string) => {
    const found = categoriesList.find((c) => c.id === categoryId);
    if (!found) {
      return { success: false, message: 'Category not found.' };
    }

    setCategoriesList((prev) => prev.filter((c) => c.id !== categoryId));

    try {
      const { db_deleteCategory } = await import('../services/firestoreService');
      await db_deleteCategory(categoryId);
    } catch {
      // Local fallback
    }

    return { success: true, message: `Category "${found.name}" removed successfully!` };
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
