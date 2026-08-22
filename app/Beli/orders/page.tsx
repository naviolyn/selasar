"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "@/components/Navbar";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { formatRupiah } from "@/lib/format";

type OrderStatus =
  | "menunggu_pembayaran"
  | "menunggu"
  | "confirmed"
  | "selesai"
  | "dibatalkan";

type PaymentStatus = "pending" | "paid" | "failed";

type Order = {
  id: string;
  customerId: string;
  listingTitle: string;
  customerName: string;
  customerPhone: string;
  qty: number;
  unit: string;
  totalPrice: number;
  pickupCode: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  createdAt?: any;
  confirmedAt?: any;
  completedAt?: any;
  cancelledAt?: any;
};

const SEMUA = "Semua";
type FilterValue = typeof SEMUA | OrderStatus;

// Batas waktu pembayaran: 5 menit sejak order dibuat
const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000;

// Sesuaikan dengan route halaman pembayaran kamu yang sebenarnya
const PAYMENT_ROUTE = (orderId: string) => `/pay/${orderId}`;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: SEMUA, label: "Semua" },
  { value: "menunggu_pembayaran", label: "Menunggu Pembayaran" },
  { value: "menunggu", label: "Menunggu" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "selesai", label: "Selesai" },
  { value: "dibatalkan", label: "Dibatalkan" },
];

function statusBadgeColor(status: OrderStatus) {
  switch (status) {
    case "menunggu_pembayaran":
      return "bg-turmeric-light text-turmeric-dark";
    case "menunggu":
      return "bg-clay-light text-clay";
    case "confirmed":
      return "bg-forest-light text-forest-dark";
    case "selesai":
      return "bg-green-light text-green-dark";
    case "dibatalkan":
      return "bg-line text-ink/40 line-through";
    default:
      return "bg-line text-ink/50";
  }
}

function statusLabel(status: OrderStatus) {
  switch (status) {
    case "menunggu_pembayaran":
      return "💳 Menunggu Pembayaran";
    case "menunggu":
      return "⏳ Menunggu Konfirmasi";
    case "confirmed":
      return "✓ Dikonfirmasi - Silakan Pickup";
    case "selesai":
      return "✓✓ Selesai";
    case "dibatalkan":
      return "✕ Dibatalkan";
    default:
      return status;
  }
}

function statusDescription(status: OrderStatus) {
  switch (status) {
    case "menunggu_pembayaran":
      return "Selesaikan pembayaran untuk melanjutkan pesanan ini. Klik kartu ini untuk membayar sekarang.";
    case "menunggu":
      return "Pesanan kamu sedang menunggu konfirmasi dari mitra. Pantau terus notifikasi ya!";
    case "confirmed":
      return "Pesanan sudah dikonfirmasi! Silakan ambil di lokasi pickup pada waktu yang telah ditentukan.";
    case "selesai":
      return "Pesanan selesai. Terima kasih sudah membantu menyelamatkan makanan! 🎉";
    case "dibatalkan":
      return "Pesanan ini telah dibatalkan.";
    default:
      return "";
  }
}

function paymentBadgeColor(paymentStatus: PaymentStatus) {
  switch (paymentStatus) {
    case "paid":
      return "bg-forest-light text-forest-dark";
    case "failed":
      return "bg-clay-light text-clay";
    case "pending":
    default:
      return "bg-line text-ink/50";
  }
}

function paymentLabel(paymentStatus: PaymentStatus) {
  switch (paymentStatus) {
    case "paid":
      return "💰 Sudah Bayar";
    case "failed":
      return "⚠️ Gagal Bayar";
    case "pending":
    default:
      return "⏱️ Belum Bayar";
  }
}

function getRemainingMs(order: Order) {
  const createdMs = order.createdAt?.toMillis?.() ?? Date.now();
  const deadline = createdMs + PAYMENT_TIMEOUT_MS;
  return deadline - Date.now();
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Menampilkan hitung mundur batas waktu pembayaran.
 * Memanggil onExpire sekali saat waktu habis (dan order masih pending).
 */
function PaymentCountdown({
  order,
  onExpire,
}: {
  order: Order;
  onExpire: (order: Order) => void;
}) {
  const [remaining, setRemaining] = useState(() => getRemainingMs(order));

  useEffect(() => {
    // Reset setiap kali order berubah (mis. createdAt baru dari server)
    setRemaining(getRemainingMs(order));

    if (getRemainingMs(order) <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(interval);
          onExpire(order);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.createdAt]);

  if (order.status !== "menunggu_pembayaran") return null;

  if (remaining <= 0) {
    return (
      <span className="text-xs font-semibold text-clay">
        Waktu pembayaran habis, membatalkan pesanan…
      </span>
    );
  }

  return (
    <span className="text-xs font-semibold text-turmeric-dark">
      ⏰ Bayar dalam {formatCountdown(remaining)}
    </span>
  );
}

export default function OrdersPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeFilter, setActiveFilter] = useState<FilterValue>(SEMUA);

  // Cek siapa yang sedang login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login?redirect=/orders");
        return;
      }
      setUid(user.uid);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, [router]);

  // Ambil pesanan milik user yang sedang login, realtime
  useEffect(() => {
    if (checkingAuth || !uid) return;

    const q = query(collection(db, "claims"), where("customerId", "==", uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...(d.data() as any),
            } as Order)
        );

        // Sort: status terbaru dulu (menunggu_pembayaran > menunggu > confirmed > selesai > dibatalkan)
        const statusOrder: Record<OrderStatus, number> = {
          menunggu_pembayaran: 0,
          menunggu: 1,
          confirmed: 2,
          selesai: 3,
          dibatalkan: 4,
        };
        data.sort((a, b) => {
          const aOrder = statusOrder[a.status] ?? 5;
          const bOrder = statusOrder[b.status] ?? 5;
          if (aOrder !== bOrder) return aOrder - bOrder;

          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });

        setOrders(data);
        setLoading(false);
      },
      (err) => {
        console.error("Gagal memuat pesanan:", err);
        setError("Gagal memuat pesanan. Silakan coba lagi.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid, checkingAuth]);

  // Hitung jumlah order per status, buat badge angka di tab
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { [SEMUA]: orders.length };
    for (const o of orders) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === SEMUA) return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  // Set untuk mencegah pembatalan ganda saat re-render
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  const handleExpirePayment = useCallback(
    async (order: Order) => {
      // Kalau ternyata sudah dibayar / bukan lagi menunggu_pembayaran, jangan batalkan
      if (order.paymentStatus === "paid") return;
      if (order.status !== "menunggu_pembayaran") return;
      if (cancellingIds.has(order.id)) return;

      setCancellingIds((prev) => new Set(prev).add(order.id));

      try {
        await updateDoc(doc(db, "claims", order.id), {
          status: "dibatalkan",
          cancelledAt: serverTimestamp(),
          cancelReason: "payment_timeout",
        });
      } catch (err) {
        console.error("Gagal membatalkan pesanan otomatis:", err);
      } finally {
        setCancellingIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }
    },
    [cancellingIds]
  );

  const goToPayment = (order: Order) => {
    if (order.status !== "menunggu_pembayaran") return;
    router.push(PAYMENT_ROUTE(order.id));
  };

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-ink/60 hover:text-ink mb-4"
        >
          ← Kembali
        </button>

        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Pesanan Kamu
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Pantau status semua pesanan yang sudah kamu lakukan
          </p>
        </div>

        {error && (
          <div className="bg-clay-light border border-clay rounded-card p-4 mb-6">
            <p className="text-sm text-clay">{error}</p>

            <a
              href="/discover"
              className="inline-block mt-3 text-sm font-semibold text-clay hover:underline"
            >
              ← Kembali ke Discover
            </a>
          </div>
        )}

        {!loading && !checkingAuth && orders.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                  activeFilter === f.value
                    ? "bg-forest text-white border-forest"
                    : "bg-white text-ink/70 border-line"
                }`}
              >
                {f.label}
                {typeof filterCounts[f.value] === "number" && (
                  <span
                    className={`ml-1.5 text-xs ${
                      activeFilter === f.value ? "text-white/80" : "text-ink/40"
                    }`}
                  >
                    ({filterCounts[f.value] ?? 0})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {loading || checkingAuth ? (
          <div className="bg-white rounded-card border border-line p-8 text-center">
            <p className="text-sm text-ink/50">Memuat pesanan...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-card border border-dashed border-line p-8 text-center">
            <p className="text-sm text-ink/50 mb-4">
              Belum ada pesanan dengan akun ini.
            </p>

            <a
              href="/discover"
              className="inline-block rounded-full bg-forest text-white font-semibold px-6 py-2.5 text-sm hover:bg-forest-dark transition-colors"
            >
              Cari makanan sekarang
            </a>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-card border border-dashed border-line p-8 text-center">
            <p className="text-sm text-ink/50">
              Tidak ada pesanan dengan status ini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isPendingPayment = order.status === "menunggu_pembayaran";

              return (
                <div
                  key={order.id}
                  role={isPendingPayment ? "button" : undefined}
                  tabIndex={isPendingPayment ? 0 : undefined}
                  onClick={() => isPendingPayment && goToPayment(order)}
                  onKeyDown={(e) => {
                    if (isPendingPayment && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      goToPayment(order);
                    }
                  }}
                  className={`bg-white rounded-card border overflow-hidden transition-colors ${
                    isPendingPayment
                      ? "border-turmeric cursor-pointer hover:border-turmeric-dark hover:shadow-sm"
                      : "border-line"
                  }`}
                >
                  <div className="bg-gradient-to-r from-forest-light to-forest-light/50 px-6 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-semibold text-ink">
                          {order.listingTitle}
                        </h3>
                        <p className="text-sm text-ink/60 mt-0.5">
                          Kode:{" "}
                          <span className="font-mono font-semibold">
                            {order.pickupCode}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isPendingPayment && (
                          <PaymentCountdown
                            order={order}
                            onExpire={handleExpirePayment}
                          />
                        )}

                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${statusBadgeColor(
                            order.status
                          )}`}
                        >
                          {statusLabel(order.status)}
                        </span>

                        {order.paymentStatus && (
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${paymentBadgeColor(
                              order.paymentStatus
                            )}`}
                          >
                            {paymentLabel(order.paymentStatus)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-ink/2">
                    <p className="text-sm text-ink/70">
                      {statusDescription(order.status)}
                    </p>
                  </div>

                  <div className="px-6 py-4 border-t border-line space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-ink/50 text-xs mb-1">Jumlah</p>
                        <p className="font-semibold text-ink">
                          {order.qty} {order.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-ink/50 text-xs mb-1">Total Bayar</p>
                        <p className="font-semibold text-forest-dark">
                          {formatRupiah(order.totalPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-line space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-forest"></div>
                        <span className="text-xs text-ink/60">
                          Pesanan dibuat:{" "}
                          <span className="font-semibold text-ink">
                            {order.createdAt?.toDate?.()?.toLocaleDateString(
                              "id-ID",
                              {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </span>
                      </div>

                      {order.confirmedAt && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-forest"></div>
                          <span className="text-xs text-ink/60">
                            Dikonfirmasi oleh mitra:{" "}
                            <span className="font-semibold text-ink">
                              {order.confirmedAt?.toDate?.()?.toLocaleDateString(
                                "id-ID",
                                {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </span>
                        </div>
                      )}

                      {order.completedAt && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-forest"></div>
                          <span className="text-xs text-ink/60">
                            Selesai diambil:{" "}
                            <span className="font-semibold text-ink">
                              {order.completedAt?.toDate?.()?.toLocaleDateString(
                                "id-ID",
                                {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </span>
                        </div>
                      )}

                      {order.cancelledAt && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-clay"></div>
                          <span className="text-xs text-ink/60">
                            Dibatalkan:{" "}
                            <span className="font-semibold text-clay">
                              {order.cancelledAt?.toDate?.()?.toLocaleDateString(
                                "id-ID",
                                {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-line">
                      <p className="text-xs text-ink/50">
                        Nama:{" "}
                        <span className="font-semibold text-ink">
                          {order.customerName}
                        </span>
                      </p>
                      <p className="text-xs text-ink/50 mt-1">
                        HP:{" "}
                        <span className="font-semibold text-ink">
                          {order.customerPhone}
                        </span>
                      </p>
                    </div>
                  </div>

                  {isPendingPayment && (
                    <div className="px-6 py-4 bg-turmeric-light/30 border-t border-line">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPayment(order);
                        }}
                        className="w-full rounded-full bg-turmeric-dark text-white font-semibold px-6 py-2.5 text-sm hover:opacity-90 transition-opacity"
                      >
                        Lanjutkan Pembayaran →
                      </button>
                    </div>
                  )}

                  {order.status === "confirmed" && (
                    <div className="px-6 py-4 bg-forest-light/20 border-t border-line">
                      <p className="text-xs font-semibold text-forest-dark mb-3">
                        ⚠️ Jangan lupa ambil pesanan dengan kode di atas!
                      </p>

                      <a
                        href="/discover"
                        className="inline-block text-xs font-semibold text-forest hover:underline"
                      >
                        ← Kembali cari makanan lain
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}