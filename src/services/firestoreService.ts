import {
  doc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { getFirestoreDb } from '../firebase/config';
import {
  Product,
  Order,
  StoreSettings,
  Coupon,
  CustomerReview,
  CategoryItem,
  ShahiMixBox,
  ShahiMixIngredient,
  WholesaleInquiry,
} from '../types';

/**
 * Public read-only storefront Firestore synchronization.
 * Sensitive collections (orders, coupons, wholesale_inquiries, unapproved reviews)
 * are NEVER downloaded to unauthenticated storefront visitors.
 */
export const db_initPublicSync = async (
  onProducts: (products: Product[]) => void,
  onReviews: (reviews: CustomerReview[]) => void,
  onSettings: (settings: StoreSettings) => void,
  onCategories: (categories: CategoryItem[]) => void,
  onShahiBoxes: (boxes: ShahiMixBox[]) => void,
  onShahiIngredients: (ingredients: ShahiMixIngredient[]) => void,
  onError: (error: unknown, path: string) => void
) => {
  const db = await getFirestoreDb();

  const unsubProducts = onSnapshot(
    collection(db, 'products'),
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Product[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as Product));
        onProducts(loaded);
      }
    },
    (error) => onError(error, 'products')
  );

  // Only fetch approved reviews publicly
  const approvedReviewsQuery = query(
    collection(db, 'reviews'),
    where('status', '==', 'approved')
  );
  const unsubReviews = onSnapshot(
    approvedReviewsQuery,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: CustomerReview[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as CustomerReview));
        onReviews(loaded);
      }
    },
    (error) => onError(error, 'reviews')
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

  const unsubCategories = onSnapshot(
    collection(db, 'categories'),
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: CategoryItem[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as CategoryItem));
        onCategories(loaded);
      }
    },
    (error) => onError(error, 'categories')
  );

  const unsubBoxes = onSnapshot(
    collection(db, 'shahi_boxes'),
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: ShahiMixBox[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as ShahiMixBox));
        onShahiBoxes(loaded);
      }
    },
    (error) => onError(error, 'shahi_boxes')
  );

  const unsubIngredients = onSnapshot(
    collection(db, 'shahi_ingredients'),
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: ShahiMixIngredient[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as ShahiMixIngredient));
        onShahiIngredients(loaded);
      }
    },
    (error) => onError(error, 'shahi_ingredients')
  );

  return () => {
    unsubProducts();
    unsubReviews();
    unsubSettings();
    unsubCategories();
    unsubBoxes();
    unsubIngredients();
  };
};

/**
 * Admin-only real-time listeners (mounted exclusively after verified Admin Auth).
 */
export const db_initAdminSync = async (
  onOrders: (orders: Order[]) => void,
  onCoupons: (coupons: Coupon[]) => void,
  onAllReviews: (reviews: CustomerReview[]) => void,
  onWholesale: (inquiries: WholesaleInquiry[]) => void,
  onError: (error: unknown, path: string) => void
) => {
  const db = await getFirestoreDb();

  const unsubOrders = onSnapshot(
    collection(db, 'orders'),
    (snapshot) => {
      const loaded: Order[] = [];
      snapshot.forEach((docSnap) => loaded.push(docSnap.data() as Order));
      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onOrders(loaded);
    },
    (error) => onError(error, 'orders')
  );

  const unsubCoupons = onSnapshot(
    collection(db, 'coupons'),
    (snapshot) => {
      const loaded: Coupon[] = [];
      snapshot.forEach((docSnap) => loaded.push(docSnap.data() as Coupon));
      onCoupons(loaded);
    },
    (error) => onError(error, 'coupons')
  );

  const unsubAllReviews = onSnapshot(
    collection(db, 'reviews'),
    (snapshot) => {
      const loaded: CustomerReview[] = [];
      snapshot.forEach((docSnap) => loaded.push(docSnap.data() as CustomerReview));
      onAllReviews(loaded);
    },
    (error) => onError(error, 'reviews')
  );

  const unsubWholesale = onSnapshot(
    collection(db, 'wholesale_inquiries'),
    (snapshot) => {
      const loaded: WholesaleInquiry[] = [];
      snapshot.forEach((docSnap) => loaded.push(docSnap.data() as WholesaleInquiry));
      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onWholesale(loaded);
    },
    (error) => onError(error, 'wholesale_inquiries')
  );

  return () => {
    unsubOrders();
    unsubCoupons();
    unsubAllReviews();
    unsubWholesale();
  };
};

export { doc, collection, onSnapshot, getDocs, query, where };
