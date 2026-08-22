import { NextRequest, NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { adminDb } from "@/lib/firebaseAdmin";

const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
});

export async function POST(req: NextRequest) {
  const notification = await req.json();
  const statusResponse = await core.transaction.notification(notification);

  const orderId = statusResponse.order_id;
  const transactionStatus = statusResponse.transaction_status;

  const claimsSnap = await adminDb
    .collection("claims")
    .where("midtransOrderId", "==", orderId)
    .limit(1)
    .get();

  if (claimsSnap.empty) {
    return NextResponse.json({ message: "Claim tidak ditemukan" }, { status: 404 });
  }

  const claimDoc = claimsSnap.docs[0];

  if (transactionStatus === "settlement" || transactionStatus === "capture") {
    await claimDoc.ref.update({ status: "menunggu", paymentStatus: "paid" });
  } else if (transactionStatus === "expire" || transactionStatus === "cancel") {
    await claimDoc.ref.update({ status: "dibatalkan", paymentStatus: "failed" });
  }

  return NextResponse.json({ message: "OK" });
}