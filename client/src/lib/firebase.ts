import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKl0W7XqgBCtBiWXp8bANDhwv_lnVR2GU",
  authDomain: "live-pay-97ac6.firebaseapp.com",
  projectId: "live-pay-97ac6",
  storageBucket: "live-pay-97ac6.firebasestorage.app",
  messagingSenderId: "393340248714",
  appId: "1:393340248714:web:e801d2d986b6ae87f84373",
  measurementId: "G-WMC0H3D2KD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// User types
export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  role: "vendor" | "admin";
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Auth functions
export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(userCredential.user.uid);
  if (!profile) {
    throw new Error("Profil utilisateur introuvable");
  }
  return profile;
}

export async function registerWithEmail(
  email: string, 
  password: string, 
  data: { firstName?: string; lastName?: string; businessName?: string; phone?: string }
): Promise<UserProfile> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update display name
  const displayName = data.firstName && data.lastName 
    ? `${data.firstName} ${data.lastName}` 
    : data.businessName || email.split('@')[0];
  await updateProfile(user, { displayName });
  
  // Create user profile in Firestore
  const profile: UserProfile = {
    id: user.uid,
    email: email.toLowerCase(),
    firstName: data.firstName,
    lastName: data.lastName,
    businessName: data.businessName,
    phone: data.phone,
    role: "vendor",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await setDoc(doc(db, "users", user.uid), {
    ...profile,
    createdAt: Timestamp.fromDate(profile.createdAt),
    updatedAt: Timestamp.fromDate(profile.updatedAt),
  });
  
  return profile;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, "users", uid));
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as UserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile> {
  const updateData = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  delete (updateData as any).id;
  delete (updateData as any).createdAt;
  
  await updateDoc(doc(db, "users", uid), updateData);
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Erreur mise à jour profil");
  return profile;
}

// Subscribe to auth state
export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      callback(profile);
    } else {
      callback(null);
    }
  });
}

// ========== VENDOR CONFIG ==========
export interface VendorConfig {
  id: string;
  vendorId: string;
  businessName: string;
  mobileMoneyNumber?: string;
  preferredPaymentMethod: string;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappVerifyToken?: string;
  status: "active" | "inactive" | "suspended";
  liveMode: boolean;
  reservationDurationMinutes: number;
  autoReplyEnabled: boolean;
  welcomeMessage?: string;
  segment: string;
  allowQuantitySelection: boolean;
  requireDeliveryAddress: boolean;
  autoReminderEnabled: boolean;
  upsellEnabled: boolean;
  minTrustScoreRequired: number;
  messageTemplates?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getVendorConfig(vendorId: string): Promise<VendorConfig | null> {
  const q = query(collection(db, "vendorConfigs"), where("vendorId", "==", vendorId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docData = snap.docs[0];
  const data = docData.data();
  return {
    ...data,
    id: docData.id,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as VendorConfig;
}

export async function createVendorConfig(config: Omit<VendorConfig, "id" | "createdAt" | "updatedAt">): Promise<VendorConfig> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, "vendorConfigs"), {
    ...config,
    createdAt: now,
    updatedAt: now,
  });
  return {
    ...config,
    id: docRef.id,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  };
}

export async function updateVendorConfig(configId: string, data: Partial<VendorConfig>): Promise<void> {
  const updateData = { ...data, updatedAt: Timestamp.now() };
  delete (updateData as any).id;
  delete (updateData as any).createdAt;
  await updateDoc(doc(db, "vendorConfigs", configId), updateData);
}

// ========== PRODUCTS ==========
export interface Product {
  id: string;
  vendorId: string;
  keyword: string;
  shareCode?: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  imageUrl?: string;
  images?: string;
  category?: string;
  stock: number;
  reservedStock: number;
  active: boolean;
  featured?: boolean;
  createdAt: Date;
}

function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getProducts(vendorId: string): Promise<Product[]> {
  const q = query(
    collection(db, "products"), 
    where("vendorId", "==", vendorId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    ...d.data(),
    id: d.id,
    createdAt: d.data().createdAt?.toDate() || new Date(),
  })) as Product[];
}

export async function getProduct(productId: string): Promise<Product | null> {
  const docRef = doc(db, "products", productId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return {
    ...snap.data(),
    id: snap.id,
    createdAt: snap.data().createdAt?.toDate() || new Date(),
  } as Product;
}

export async function getProductByShareCode(code: string): Promise<Product | null> {
  const q = query(collection(db, "products"), where("shareCode", "==", code));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return {
    ...d.data(),
    id: d.id,
    createdAt: d.data().createdAt?.toDate() || new Date(),
  } as Product;
}

export async function createProduct(data: Omit<Product, "id" | "createdAt" | "shareCode" | "reservedStock">): Promise<Product> {
  const shareCode = generateShareCode();
  const docRef = await addDoc(collection(db, "products"), {
    ...data,
    shareCode,
    reservedStock: 0,
    createdAt: Timestamp.now(),
  });
  return {
    ...data,
    id: docRef.id,
    shareCode,
    reservedStock: 0,
    createdAt: new Date(),
  };
}

export async function updateProduct(productId: string, data: Partial<Product>): Promise<void> {
  const updateData = { ...data };
  delete (updateData as any).id;
  delete (updateData as any).createdAt;
  await updateDoc(doc(db, "products", productId), updateData);
}

export async function deleteProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db, "products", productId));
}

// ========== ORDERS ==========
export type OrderStatus = "pending" | "reserved" | "paid" | "expired" | "cancelled";
export type PaymentMethod = "wave" | "orange_money" | "card" | "cash";

export interface Order {
  id: string;
  vendorId: string;
  productId: string;
  clientId?: string;
  clientPhone: string;
  clientName?: string;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentProof?: string;
  reservedUntil?: Date;
  paidAt?: Date;
  notes?: string;
  deliveryAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getOrders(vendorId: string): Promise<Order[]> {
  const q = query(
    collection(db, "orders"), 
    where("vendorId", "==", vendorId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      reservedUntil: data.reservedUntil?.toDate(),
      paidAt: data.paidAt?.toDate(),
    };
  }) as Order[];
}

export async function createOrder(data: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, "orders"), {
    ...data,
    reservedUntil: data.reservedUntil ? Timestamp.fromDate(data.reservedUntil) : null,
    paidAt: data.paidAt ? Timestamp.fromDate(data.paidAt) : null,
    createdAt: now,
    updatedAt: now,
  });
  return {
    ...data,
    id: docRef.id,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  };
}

export async function updateOrder(orderId: string, data: Partial<Order>): Promise<void> {
  const updateData: any = { ...data, updatedAt: Timestamp.now() };
  delete updateData.id;
  delete updateData.createdAt;
  if (data.reservedUntil) updateData.reservedUntil = Timestamp.fromDate(data.reservedUntil);
  if (data.paidAt) updateData.paidAt = Timestamp.fromDate(data.paidAt);
  await updateDoc(doc(db, "orders", orderId), updateData);
}

// ========== LIVE SESSIONS ==========
export interface LiveSession {
  id: string;
  vendorId: string;
  title: string;
  platform: string;
  active: boolean;
  createdAt: Date;
  endedAt?: Date;
}

export async function getLiveSessions(vendorId: string): Promise<LiveSession[]> {
  const q = query(
    collection(db, "liveSessions"), 
    where("vendorId", "==", vendorId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      endedAt: data.endedAt?.toDate(),
    };
  }) as LiveSession[];
}

export async function createLiveSession(data: Omit<LiveSession, "id" | "createdAt" | "active">): Promise<LiveSession> {
  const docRef = await addDoc(collection(db, "liveSessions"), {
    ...data,
    active: true,
    createdAt: Timestamp.now(),
  });
  return {
    ...data,
    id: docRef.id,
    active: true,
    createdAt: new Date(),
  };
}

export async function updateLiveSession(sessionId: string, data: Partial<LiveSession>): Promise<void> {
  const updateData: any = { ...data };
  delete updateData.id;
  delete updateData.createdAt;
  if (data.endedAt) updateData.endedAt = Timestamp.fromDate(data.endedAt);
  await updateDoc(doc(db, "liveSessions", sessionId), updateData);
}

// ========== INVOICES ==========
export type InvoiceStatus = "pending" | "paid" | "expired" | "cancelled";

export interface Invoice {
  id: string;
  vendorId: string;
  productId?: string;
  clientPhone: string;
  amount: number;
  description?: string;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
}

export async function getInvoices(vendorId: string): Promise<Invoice[]> {
  const q = query(
    collection(db, "invoices"), 
    where("vendorId", "==", vendorId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      dueDate: data.dueDate?.toDate(),
      paidAt: data.paidAt?.toDate(),
    };
  }) as Invoice[];
}

export async function createInvoice(data: Omit<Invoice, "id" | "createdAt">): Promise<Invoice> {
  const docRef = await addDoc(collection(db, "invoices"), {
    ...data,
    dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
    paidAt: data.paidAt ? Timestamp.fromDate(data.paidAt) : null,
    createdAt: Timestamp.now(),
  });
  return {
    ...data,
    id: docRef.id,
    createdAt: new Date(),
  };
}

export async function updateInvoice(invoiceId: string, data: Partial<Invoice>): Promise<void> {
  const updateData: any = { ...data };
  delete updateData.id;
  delete updateData.createdAt;
  if (data.dueDate) updateData.dueDate = Timestamp.fromDate(data.dueDate);
  if (data.paidAt) updateData.paidAt = Timestamp.fromDate(data.paidAt);
  await updateDoc(doc(db, "invoices", invoiceId), updateData);
}

export async function getInvoiceById(invoiceId: string): Promise<Invoice | null> {
  const docRef = doc(db, "invoices", invoiceId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    createdAt: data.createdAt?.toDate() || new Date(),
    dueDate: data.dueDate?.toDate(),
    paidAt: data.paidAt?.toDate(),
  } as Invoice;
}

export async function getOrderByToken(token: string): Promise<Order | null> {
  // Token can be the order ID directly
  const docRef = doc(db, "orders", token);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    reservedUntil: data.reservedUntil?.toDate(),
    paidAt: data.paidAt?.toDate(),
  } as Order;
}

// ========== FILE UPLOAD ==========
export async function uploadImage(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}
