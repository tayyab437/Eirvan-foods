import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  getDocFromServer,
  writeBatch,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { getFirestoreDb } from '../firebase/config';
import { Product, Order, StoreSettings, Coupon, CustomerReview, CategoryItem, WholesaleInquiry } from '../types';

export const db_testConnection = async () => {
  try {
    const db = await getFirestoreDb();
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
};

export const db_addCategory = async (category: CategoryItem) => {
  const db = await getFirestoreDb();
  await setDoc(doc(db, 'categories', category.id), category);
};

export const db_deleteCategory = async (categoryId: string) => {
  const db = await getFirestoreDb();
  await deleteDoc(doc(db, 'categories', categoryId));
};

/**
 * Service to handle all heavy Firestore write operations.
 * Moving these to a separate file allows for efficient code-splitting
 * and reduces the initial JS execution on the critical path.
 */

export const db_placeOrder = async (order: Order) => {
  const db = await getFirestoreDb();
  await setDoc(doc(db, 'orders', order.id), order);
};

export const db_updateOrderStatus = async (orderId: string, updates: Partial<Order>) => {
  const db = await getFirestoreDb();
  await updateDoc(doc(db, 'orders', orderId), updates);
};

export const db_addReview = async (review: CustomerReview) => {
  const db = await getFirestoreDb();
  await setDoc(doc(db, 'reviews', review.id), review);
};

export const db_updateSettings = async (newSettings: Partial<StoreSettings>) => {
  const db = await getFirestoreDb();
  await updateDoc(doc(db, 'settings', 'main'), newSettings);
};

export const db_updateProduct = async (updated: Product) => {
  const db = await getFirestoreDb();
  await setDoc(doc(db, 'products', updated.id), updated);
};

export const db_incrementProductView = async (productId: string) => {
  try {
    const { increment } = await import('firebase/firestore');
    const db = await getFirestoreDb();
    await updateDoc(doc(db, 'products', productId), {
      viewCount: increment(1)
    });
  } catch {
    // Graceful fallback if document does not exist yet or offline
  }
};

export const db_deleteProduct = async (productId: string) => {
  const db = await getFirestoreDb();
  await deleteDoc(doc(db, 'products', productId));
};

export const db_addCoupon = async (coupon: Coupon) => {
  const db = await getFirestoreDb();
  await setDoc(doc(db, 'coupons', coupon.code), coupon);
};

export const db_deleteCoupon = async (code: string) => {
  const db = await getFirestoreDb();
  await deleteDoc(doc(db, 'coupons', code));
};

export const db_submitWholesaleInquiry = async (inquiry: WholesaleInquiry) => {
  const db = await getFirestoreDb();
  await setDoc(doc(db, 'wholesale_inquiries', inquiry.id), inquiry);
};

export const db_updateWholesaleStatus = async (inquiryId: string, status: WholesaleInquiry['status']) => {
  const db = await getFirestoreDb();
  await updateDoc(doc(db, 'wholesale_inquiries', inquiryId), { status });
};

export const db_deleteWholesaleInquiry = async (inquiryId: string) => {
  const db = await getFirestoreDb();
  await deleteDoc(doc(db, 'wholesale_inquiries', inquiryId));
};

export const db_seedDatabase = async (
  products: Product[], 
  settings: StoreSettings, 
  coupons: Coupon[], 
  reviews: CustomerReview[]
) => {
  const db = await getFirestoreDb();
  const batch = writeBatch(db);
  
  products.forEach(p => batch.set(doc(db, 'products', p.id), p));
  batch.set(doc(db, 'settings', 'main'), settings);
  coupons.forEach(c => batch.set(doc(db, 'coupons', c.code), c));
  reviews.forEach(r => batch.set(doc(db, 'reviews', r.id), r));
  
  await batch.commit();
};

export const db_initSync = async (
  onProducts: (products: Product[]) => void,
  onOrders: (orders: Order[]) => void,
  onReviews: (reviews: CustomerReview[]) => void,
  onCoupons: (coupons: Coupon[]) => void,
  onSettings: (settings: StoreSettings) => void,
  onError: (error: any, path: string) => void,
  onSeedingNeeded: () => Promise<void>
) => {
  const db = await getFirestoreDb();
  
  const unsubProducts = onSnapshot(
    collection(db, 'products'),
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Product[] = [];
        snapshot.forEach(docSnap => loaded.push(docSnap.data() as Product));
        onProducts(loaded);
      } else {
        onSeedingNeeded();
      }
    },
    (error) => onError(error, 'products')
  );

  const unsubOrders = onSnapshot(
    collection(db, 'orders'),
    (snapshot) => {
      const loaded: Order[] = [];
      snapshot.forEach(docSnap => loaded.push(docSnap.data() as Order));
      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onOrders(loaded);
    },
    (error) => onError(error, 'orders')
  );

  const unsubReviews = onSnapshot(
    collection(db, 'reviews'),
    (snapshot) => {
      const loaded: CustomerReview[] = [];
      snapshot.forEach(docSnap => loaded.push(docSnap.data() as CustomerReview));
      onReviews(loaded);
    },
    (error) => onError(error, 'reviews')
  );

  const unsubCoupons = onSnapshot(
    collection(db, 'coupons'),
    (snapshot) => {
      const loaded: Coupon[] = [];
      snapshot.forEach(docSnap => loaded.push(docSnap.data() as Coupon));
      onCoupons(loaded);
    },
    (error) => onError(error, 'coupons')
  );

  const unsubSettings = onSnapshot(
    doc(db, 'settings', 'main'),
    (docSnap) => {
      if (docSnap.exists()) {
        onSettings(docSnap.data() as StoreSettings);
      }
    },
    (error) => onError(error, 'settings/main')
  );

  return () => {
    unsubProducts();
    unsubOrders();
    unsubReviews();
    unsubCoupons();
    unsubSettings();
  };
};

export const db_initWholesaleSync = async (
  onWholesale: (inquiries: WholesaleInquiry[]) => void,
  onError: (error: any, path: string) => void
) => {
  const db = await getFirestoreDb();

  const unsubWholesale = onSnapshot(
    collection(db, 'wholesale_inquiries'),
    (snapshot) => {
      const loaded: WholesaleInquiry[] = [];
      snapshot.forEach(docSnap => loaded.push(docSnap.data() as WholesaleInquiry));
      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onWholesale(loaded);
    },
    (error) => onError(error, 'wholesale_inquiries')
  );

  return unsubWholesale;
};

// Re-export core read functions to minimize total bundle entry points
export { doc, collection, onSnapshot, getDocs, query, where };



