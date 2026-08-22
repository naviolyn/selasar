import { NextRequest, NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

const snap = new midtransClient.Snap({
  isProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
});

// Harus sama dengan PAYMENT_WINDOW_MINUTES di create-transaction/route.ts
const PAYMENT_WINDOW_MINUTES = 5;

/**
 * Dipakai saat user klik "Lanjutkan Pembayaran" pada order yang statusnya
 * masih "menunggu_pembayaran" (mis. transaksi Midtrans sebelumnya sudah
 * expired atau popup Snap keburu ditutup). Endpoint ini TIDAK membuat claim
 * baru dan TIDAK mengurangi stok lagi — hanya minta token Snap baru untuk
 * claim yang sama, dan reset jendela waktu pembayarannya.
 */
export async function POST(req: NextRequest) {
  try {
    const { claimId, customerId } = await req.json();

    if (!claimId || !customerId) {
      return NextResponse.json(
        { error: "claimId dan customerId wajib diisi." },
        { status: 400 }
      );
    }

    // TODO (keamanan): saat ini customerId dipercaya langsung dari body,
    // sama seperti di create-transaction/route.ts. Idealnya diverifikasi
    // dari Firebase ID token (Authorization header) via adminAuth.verifyIdToken,
    // supaya user A tidak bisa retry pembayaran milik user B.
    const claimRef = adminDb.collection("claims").doc(claimId);
    const claimSnap = await claimRef.get();

    if (!claimSnap.exists) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    const claim = claimSnap.data()!;

    if (claim.customerId !== customerId) {
      return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
    }

    if (claim.status !== "menunggu_pembayaran") {
      return NextResponse.json(
        { error: "Pesanan ini sudah tidak menunggu pembayaran." },
        { status: 400 }
      );
    }

    // Midtrans tidak mengizinkan order_id lama dipakai ulang setelah expired,
    // jadi kita buat order_id baru turunan dari yang lama supaya masih bisa
    // ditelusuri asalnya.
    const newOrderId = `${claim.midtransOrderId}-R${Date.now()}`;
    const newExpiresAt = Timestamp.fromMillis(
      Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000
    );

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: newOrderId,
        gross_amount: claim.totalPrice,
      },
      customer_details: {
        first_name: claim.customerName,
        phone: claim.customerPhone,
      },
      item_details: [
        {
          id: claim.listingId,
          price: claim.totalPrice / claim.qty,
          quantity: claim.qty,
          name: String(claim.listingTitle).slice(0, 50),
        },
      ],
      expiry: {
        unit: "minutes",
        duration: PAYMENT_WINDOW_MINUTES,
      },
    });

    await claimRef.update({
      midtransOrderId: newOrderId,
      expiresAt: newExpiresAt,
    });

    return NextResponse.json({ token: transaction.token });
  } catch (err: any) {
    console.error("Gagal membuat ulang transaksi:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}