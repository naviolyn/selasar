import {
  collection, doc, getDocs, getDoc, addDoc, runTransaction,
  serverTimestamp, query, orderBy, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Listing = {
  id: string;
  title: string;
  category: string;
  mitraId: string;
  mitraName: string;
  imageUrl?: string;
  originalPrice: number;
  discountPrice: number;
  quantityTotal: number;
  quantityLeft: number;
  unit: string;
  pickupDeadline: Timestamp;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
};

export async function getListings(): Promise<Listing[]> {
  const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
}

export async function getListingById(id: string): Promise<Listing | null> {
  const snap = await getDoc(doc(db, "listings", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Listing) : null;
}

export async function createListing(data: Omit<Listing, "id" | "quantityLeft">) {
  return addDoc(collection(db, "listings"), {
    ...data,
    quantityLeft: data.quantityTotal,
    createdAt: serverTimestamp(),
  });
}

function generatePickupCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `SLS-${code}`;
}

export async function claimListing(params: {
  listingId: string;
  customerId: string;
  qty: number;
  customerName: string;
  customerPhone: string;
  note?: string;
}) {
  const listingRef = doc(db, "listings", params.listingId);
  const pickupCode = generatePickupCode();

  await runTransaction(db, async (tx) => {
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists()) throw new Error("Listing tidak ditemukan");

    const listing = listingSnap.data();
    if (listing.quantityLeft < params.qty) {
      throw new Error("Jumlah yang diminta tidak tersedia lagi");
    }

    tx.update(listingRef, { quantityLeft: listing.quantityLeft - params.qty });

    const claimRef = doc(collection(db, "claims"));
    tx.set(claimRef, {
      listingId: params.listingId,
      listingTitle: listing.title,
      customerId: params.customerId,
      qty: params.qty,
      totalPrice: listing.discountPrice * params.qty,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      note: params.note || "",
      pickupCode,
      status: "menunggu",
      createdAt: serverTimestamp(),
    });
  });

  return pickupCode;
}