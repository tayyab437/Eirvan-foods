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
  StoreSettings,
  CustomerReview,
  CategoryItem,
  ShahiMixBox,
  ShahiMixIngredient,
} from '../types';

/**
 * Public read-only storefront Firestore synchronization.
 * Sensitive collections (orders, coupons, wholesale_inquiries, unapproved reviews)
 * are NEVER downloaded to unauthenticated storefront visitors, and admin collections
 * are fetched exclusively through paginated PHP /api/* endpoints.
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
      const loaded: Product[] = [];
      snapshot.forEach((docSnap) => loaded.push(docSnap.data() as Product));
      onProducts(loaded);
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
      const loaded: CustomerReview[] = [];
      snapshot.forEach((docSnap) => loaded.push(docSnap.data() as CustomerReview));
      onReviews(loaded);
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
      const loaded: CategoryItem[] = [];
      snapshot.forEach((docSnap) => loaded.push(docSnap.data() as CategoryItem));
      onCategories(loaded);
    },
    (error) => onError(error, 'categories')
  );

  const unsubBoxes = onSnapshot(
    collection(db, 'shahi_boxes'),
    (snapshot) => {
      const loaded: ShahiMixBox[] = [];
      snapshot.forEach((docSnap) => loaded.push(docSnap.data() as ShahiMixBox));
      onShahiBoxes(loaded);
    },
    (error) => onError(error, 'shahi_boxes')
  );

  const unsubIngredients = onSnapshot(
    collection(db, 'shahi_ingredients'),
    (snapshot) => {
      const loaded: ShahiMixIngredient[] = [];
      snapshot.forEach((docSnap) => loaded.push(docSnap.data() as ShahiMixIngredient));
      onShahiIngredients(loaded);
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

export { doc, collection, onSnapshot, getDocs, query, where };
