import { NextRequest, NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const snap = new midtransClient.Snap({
  isProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { listingId, customerId, customerName, customerPhone, qty } =
      await req.json();

    const listingRef = adminDb.collection("listings").doc(listingId);

    // Transaksi Firestore: cek & kurangi stok secara atomik, biar nggak race condition
    // kalau ada 2 pelanggan klaim bersamaan.
    const result = await adminDb.runTransaction(async (tx) => {
      const listingSnap = await tx.get(listingRef);
      if (!listingSnap.exists) throw new Error("Listing tidak ditemukan.");

      const listing = listingSnap.data()!;
      if (listing.quantityLeft < qty) {
        throw new Error("Stok tidak cukup.");
      }

      const totalPrice = listing.discountPrice * qty;
      const orderId = `SELASAR-${listingId.slice(0, 6)}-${Date.now()}`;

      const claimRef = adminDb.collection("claims").doc();
      tx.update(listingRef, { quantityLeft: FieldValue.increment(-qty) });
      tx.set(claimRef, {
        listingId,
        listingTitle: listing.title,
        mitraId: listing.mitraId,
        customerId,
        customerName,
        customerPhone,
        qty,
        unit: listing.unit,
        totalPrice,
        status: "menunggu_pembayaran",
        paymentStatus: "pending",
        midtransOrderId: orderId,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
      });

      return { orderId, totalPrice, claimId: claimRef.id, listing };
    });

    // Buat transaksi Snap dengan expiry 10 menit — Midtrans yang jagain timernya
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: result.orderId,
        gross_amount: result.totalPrice,
      },
      customer_details: {
        first_name: customerName,
        phone: customerPhone,
      },
      item_details: [
        {
          id: listingId,
          price: result.listing.discountPrice,
          quantity: qty,
          name: result.listing.title.slice(0, 50),
        },
      ],
      expiry: {
        unit: "minutes",
        duration: 10,
      },
    });

    return NextResponse.json({
      token: transaction.token,
      claimId: result.claimId,
    });
  } catch (err: any) {
    console.error("Gagal membuat transaksi:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}