import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
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
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_COUPONS,
  INITIAL_REVIEWS,
  INITIAL_BLOGS,
} from '../data/mockData';

interface StoreContextType {
  products: Product[];
  categories: { id: string; name: string; count: number; image: string }[];
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
  settings: StoreSettings;
  wishlist: string[];
  activeView: 'home' | 'shop' | 'blog' | 'track' | 'admin' | 'checkout' | 'account' | 'gift-builder';
  selectedCategory: string;
  searchQuery: string;
  selectedProduct: Product | null;
  isCartOpen: boolean;
  isAiSommelierOpen: boolean;
  isAiStudioOpen: boolean;
  lastPlacedOrder: Order | null;
  isFirebaseSyncing: boolean;
  firebaseConnected: boolean;

  // Actions
  setActiveView: (view: 'home' | 'shop' | 'blog' | 'track' | 'admin' | 'checkout' | 'account' | 'gift-builder') => void;
  setSelectedCategory: (cat: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedProduct: (prod: Product | null) => void;
  setIsCartOpen: (open: boolean) => void;
  setIsAiSommelierOpen: (open: boolean) => void;
  setIsAiStudioOpen: (open: boolean) => void;

  addToCart: (product: Product, variant: ProductVariant, quantity?: number, customGiftNote?: string, boxStyle?: string) => void;
  updateCartQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  placeOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'orderStatus' | 'paymentStatus'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus, adminNote?: string) => Promise<void>;
  toggleWishlist: (productId: string) => void;
  addReview: (review: Omit<CustomerReview, 'id' | 'date' | 'status'>) => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  updateProduct: (updated: Product) => Promise<void>;
  addNewProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addCoupon: (coupon: Coupon) => Promise<void>;
  toggleCoupon: (code: string) => Promise<void>;
  deleteCoupon: (code: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_REVIEWS);
  const [blogs] = useState<BlogPost[]>(INITIAL_BLOGS);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState<boolean>(true);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(true);

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('zds_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('zds_wishlist');
    return saved ? JSON.parse(saved) : ['prod-3', 'prod-9'];
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'shop' | 'blog' | 'track' | 'admin' | 'checkout' | 'account' | 'gift-builder'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isAiSommelierOpen, setIsAiSommelierOpen] = useState<boolean>(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState<boolean>(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  const seedingInProgress = useRef(false);

  // Synchronize with Firebase Firestore in real-time
  useEffect(() => {
    let unsubProducts = () => {};
    let unsubOrders = () => {};
    let unsubReviews = () => {};
    let unsubCoupons = () => {};
    let unsubSettings = () => {};

    const initFirestoreSync = async () => {
      try {
        setIsFirebaseSyncing(true);

        // Attach Real-Time Listeners immediately to prevent initial network chain delays
        unsubProducts = onSnapshot(
          collection(db, 'products'),
          (snapshot) => {
            if (!snapshot.empty) {
              const loadedProducts: Product[] = [];
              snapshot.forEach((docSnap) => {
                loadedProducts.push(docSnap.data() as Product);
              });
              setProducts(loadedProducts);
            } else if (!seedingInProgress.current) {
              // Seed database if empty
              seedingInProgress.current = true;
              console.log('Seeding initial Firestore database collections...');
              const batch = writeBatch(db);

              INITIAL_PRODUCTS.forEach((prod) => {
                const docRef = doc(db, 'products', prod.id);
                batch.set(docRef, prod);
              });

              const settingsRef = doc(db, 'settings', 'main');
              batch.set(settingsRef, INITIAL_SETTINGS);

              INITIAL_COUPONS.forEach((c) => {
                const couponRef = doc(db, 'coupons', c.code);
                batch.set(couponRef, c);
              });

              INITIAL_REVIEWS.forEach((r) => {
                const reviewRef = doc(db, 'reviews', r.id);
                batch.set(reviewRef, r);
              });

              const initialOrder: Order = {
                id: 'ord-init-1',
                orderNumber: 'ZDS-2026-8421',
                createdAt: '2026-11-06T14:20:00Z',
                customerName: 'Hamza Tariq',
                customerPhone: '0300-4829102',
                customerEmail: 'hamza.t@gmail.com',
                city: 'Lahore',
                province: 'Punjab',
                address: 'House 42, Sector Y, Phase 3, DHA',
                subtotal: 5950,
                shippingFee: 0,
                discountAmount: 0,
                totalAmount: 5950,
                paymentMethod: 'COD',
                paymentStatus: 'Pending',
                orderStatus: 'Shipped',
                trackingNumber: 'TCS-928173491',
                courier: 'TCS Express Pakistan',
                items: [
                  {
                    productId: 'prod-1',
                    productName: 'Royal Shahi Trail Mix',
                    variantWeight: '1kg',
                    sku: 'ZDS-MX-1KG',
                    price: 5950,
                    quantity: 1,
                    subtotal: 5950,
                    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
                  },
                ],
              };
              batch.set(doc(db, 'orders', initialOrder.id), initialOrder);

              batch.commit().then(() => {
                console.log('Firestore collections seeded successfully.');
              }).catch(err => {
                console.error('Error committing seed batch:', err);
              });
            }
            setIsFirebaseSyncing(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'products');
            setIsFirebaseSyncing(false);
          }
        );

        unsubOrders = onSnapshot(
          collection(db, 'orders'),
          (snapshot) => {
            const loadedOrders: Order[] = [];
            snapshot.forEach((docSnap) => {
              loadedOrders.push(docSnap.data() as Order);
            });
            // Sort orders descending by createdAt
            loadedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setOrders(loadedOrders);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'orders');
          }
        );

        unsubReviews = onSnapshot(
          collection(db, 'reviews'),
          (snapshot) => {
            const loadedReviews: CustomerReview[] = [];
            snapshot.forEach((docSnap) => {
              loadedReviews.push(docSnap.data() as CustomerReview);
            });
            setReviews(loadedReviews);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'reviews');
          }
        );

        unsubCoupons = onSnapshot(
          collection(db, 'coupons'),
          (snapshot) => {
            const loadedCoupons: Coupon[] = [];
            snapshot.forEach((docSnap) => {
              loadedCoupons.push(docSnap.data() as Coupon);
            });
            setCoupons(loadedCoupons);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'coupons');
          }
        );

        unsubSettings = onSnapshot(
          doc(db, 'settings', 'main'),
          (docSnap) => {
            if (docSnap.exists()) {
              setSettings(docSnap.data() as StoreSettings);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'settings/main');
          }
        );

        setFirebaseConnected(true);
      } catch (err) {
        console.error('Failed to initialize Firestore connection:', err);
        setFirebaseConnected(false);
        setIsFirebaseSyncing(false);
      }
    };

    initFirestoreSync();

    return () => {
      unsubProducts();
      unsubOrders();
      unsubReviews();
      unsubCoupons();
      unsubSettings();
    };
  }, []);

  // Save Cart and Wishlist in localStorage
  useEffect(() => {
    localStorage.setItem('zds_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('zds_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Derived category counts
  const categories = [
    {
      id: 'all',
      name: 'All Products',
      count: products.length,
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'mixed',
      name: 'Mixed Dry Fruits',
      count: products.filter((p) => p.category === 'mixed').length,
      image: 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'nuts',
      name: 'Premium Nuts',
      count: products.filter((p) => p.category === 'nuts').length,
      image: 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'powders',
      name: 'Dry Fruit Powders',
      count: products.filter((p) => p.category === 'powders').length,
      image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'dates-raisins',
      name: 'Dates & Raisins',
      count: products.filter((p) => p.category === 'dates-raisins').length,
      image: 'https://images.unsplash.com/photo-1598030304671-5aa1d6f21128?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'gift-boxes',
      name: 'Luxury Gift Boxes',
      count: products.filter((p) => p.category === 'gift-boxes').length,
      image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    },
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
      // Write order to Firestore
      const orderRef = doc(db, 'orders', newOrder.id);
      await setDoc(orderRef, newOrder);

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
          await setDoc(doc(db, 'products', prod.id), updatedProd, { merge: true });
        }
      }

      // If coupon used, increment usage count in Firestore
      if (appliedCoupon) {
        const couponRef = doc(db, 'coupons', appliedCoupon.code);
        await updateDoc(couponRef, {
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
      await updateDoc(doc(db, 'orders', orderId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
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
      await setDoc(doc(db, 'reviews', newRev.id), newRev);

      // Update product rating
      const prod = products.find((p) => p.id === review.productId);
      if (prod) {
        const prodReviews = [...reviews.filter((r) => r.productId === prod.id), newRev];
        const avg = prodReviews.reduce((acc, r) => acc + r.rating, 0) / prodReviews.length;
        await updateDoc(doc(db, 'products', prod.id), {
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
      await setDoc(doc(db, 'settings', 'main'), newSettings, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/main');
    }
  };

  const updateProduct = async (updated: Product) => {
    try {
      await setDoc(doc(db, 'products', updated.id), updated, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updated.id}`);
    }
  };

  const addNewProduct = async (product: Product) => {
    try {
      await setDoc(doc(db, 'products', product.id), product);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${product.id}`);
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  };

  const addCoupon = async (coupon: Coupon) => {
    try {
      await setDoc(doc(db, 'coupons', coupon.code), coupon);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `coupons/${coupon.code}`);
    }
  };

  const toggleCoupon = async (code: string) => {
    const coupon = coupons.find((c) => c.code === code);
    if (!coupon) return;
    try {
      await updateDoc(doc(db, 'coupons', code), { isActive: !coupon.isActive });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `coupons/${code}`);
    }
  };

  const deleteCoupon = async (code: string) => {
    try {
      await deleteDoc(doc(db, 'coupons', code));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `coupons/${code}`);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
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
        settings,
        wishlist,
        activeView,
        selectedCategory,
        searchQuery,
        selectedProduct,
        isCartOpen,
        isAiSommelierOpen,
        isAiStudioOpen,
        lastPlacedOrder,
        isFirebaseSyncing,
        firebaseConnected,
        setActiveView,
        setSelectedCategory,
        setSearchQuery,
        setSelectedProduct,
        setIsCartOpen,
        setIsAiSommelierOpen,
        setIsAiStudioOpen,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        placeOrder,
        updateOrderStatus,
        toggleWishlist,
        addReview,
        updateSettings,
        updateProduct,
        addNewProduct,
        deleteProduct,
        addCoupon,
        toggleCoupon,
        deleteCoupon,
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
