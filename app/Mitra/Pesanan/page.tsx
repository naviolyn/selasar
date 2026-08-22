"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import ConfirmDialog from "@/components/ConfirmDialog";

type Listing = {
  id: string;
  title: string;
  status: "active" | "completed" | "expired";
};

// Status asli di Firestore, mengikuti alur pembayaran Midtrans:
// "menunggu_pembayaran" -> (webhook paid) "menunggu" -> (mitra konfirmasi) "confirmed" -> (mitra tandai diambil) "selesai"
// "kadaluarsa" / "dibatalkan" tetap tersimpan di database tapi tidak ditampilkan sebagai tab terpisah di sini.
type Claim = {
  id: string;
  listingId: string;
  listingTitle?: string;
  customerName?: string;
  customerPhone?: string;
  qty: number;
  unit?: string;
  totalPrice?: number;
  pickupCode?: string;
  status:
    | "menunggu_pembayaran"
    | "menunggu"
    | "confirmed"
    | "selesai"
    | "dibatalkan"
    | "kadaluarsa"
    | string;
  createdAt?: any;
  paymentStatus: "pending" | "paid" | "expired" | "failed";
  midtransOrderId: string;
  expiresAt: any;
};

type StatusFilter =
  | "semua"
  | "selesai"
  | "menunggu_pembayaran"
  | "menunggu"
  | "confirmed";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "selesai", label: "Selesai" },
  { key: "menunggu_pembayaran", label: "Menunggu Pembayaran" },
  { key: "menunggu", label: "Menunggu Konfirmasi" },
  { key: "confirmed", label: "Dikonfirmasi" },
];

function statusBadge(status: string) {
  switch (status) {
    case "menunggu_pembayaran":
      return "bg-turmeric/20 text-turmeric";
    case "menunggu":
      return "bg-clay-light text-clay";
    case "confirmed":
      return "bg-forest-light text-forest-dark";
    case "selesai":
      return "bg-line text-ink/60";
    case "dibatalkan":
      return "bg-line text-ink/40 line-through";
    case "kadaluarsa":
      return "bg-clay-light text-clay/60 line-through";
    default:
      return "bg-line text-ink/50";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "menunggu_pembayaran":
      return "Menunggu Pembayaran";
    case "menunggu":
      return "Menunggu Konfirmasi";
    case "confirmed":
      return "Dikonfirmasi";
    case "selesai":
      return "Selesai";
    case "dibatalkan":
      return "Dibatalkan";
    case "kadaluarsa":
      return "Kadaluarsa";
    default:
      return status;
  }
}

export default function MitraPesananPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState("");
  const [mitraId, setMitraId] = useState("");
  const [mitraName, setMitraName] = useState("");

  const [listings, setListings] = useState<Listing[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [filter, setFilter] = useState<StatusFilter>("semua");
  const [search, setSearch] = useState("");

  // State untuk popup konfirmasi batalkan pesanan
  const [cancelTarget, setCancelTarget] = useState<Claim | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Guard: hanya mitra yang login boleh akses
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.exists() ? userDoc.data() : null;
        if (!data || data.role !== "mitra") {
          router.replace("/discover");
          return;
        }
        setMitraId(user.uid);
        setMitraName(data.name ?? "Mitra");
      } catch (err) {
        console.error("Gagal memuat data akun:", err);
        setAuthError("Gagal memuat data akun. Coba refresh halaman.");
      } finally {
        setCheckingAuth(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Realtime: semua listing milik mitra ini (untuk mapping listingId -> title & scoping klaim)
  useEffect(() => {
    if (!mitraId) return;
    const q = query(
      collection(db, "listings"),
      where("mitraId", "==", mitraId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => console.error("Gagal memuat listing:", err)
    );
    return () => unsub();
  }, [mitraId]);

  // Realtime: semua klaim untuk listing milik mitra ini (semua status).
  // Ini titik masuk data pelanggan ke sisi mitra — begitu customer checkout
  // dan bayar (lewat API route + webhook Midtrans), dokumen claims baru/updated
  // otomatis kedeteksi listener ini karena listingId-nya cocok dengan salah satu
  // listing milik mitra.
  useEffect(() => {
    if (listings.length === 0) {
      setClaims([]);
      setLoadingData(false);
      return;
    }
    const listingIds = listings.map((l) => l.id).slice(0, 30); // batas 'in' query = 30
    const q = query(
      collection(db, "claims"),
      where("listingId", "in", listingIds)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setClaims(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoadingData(false);
      },
      (err) => {
        console.error("Gagal memuat klaim:", err);
        setLoadingData(false);
      }
    );
    return () => unsub();
  }, [listings]);

  async function handleConfirmClaim(claimId: string) {
    setActionError("");
    setBusyId(claimId);
    try {
      await updateDoc(doc(db, "claims", claimId), {
        status: "confirmed",
        confirmedAt: serverTimestamp(),
      });
    } catch (err: any) {
      setActionError(err?.message || "Gagal konfirmasi klaim.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkPickedUp(claimId: string) {
    setActionError("");
    setBusyId(claimId);
    try {
      await updateDoc(doc(db, "claims", claimId), {
        status: "selesai",
        completedAt: serverTimestamp(),
      });
    } catch (err: any) {
      setActionError(err?.message || "Gagal menandai selesai.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmCancelClaim() {
    if (!cancelTarget) return;
    setCancelling(true);
    setActionError("");
    try {
      await updateDoc(doc(db, "claims", cancelTarget.id), {
        status: "dibatalkan",
        cancelledAt: serverTimestamp(),
      });
      setCancelTarget(null);
    } catch (err: any) {
      setActionError(err?.message || "Gagal membatalkan pesanan.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      semua: claims.length,
      selesai: 0,
      menunggu_pembayaran: 0,
      menunggu: 0,
      confirmed: 0,
    };
    for (const claim of claims) {
      if (claim.status in c) {
        c[claim.status as StatusFilter] += 1;
      }
    }
    return c;
  }, [claims]);

  const visibleClaims = useMemo(() => {
    return claims
      .filter((c) => (filter === "semua" ? true : c.status === filter))
      .filter((c) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          c.customerName?.toLowerCase().includes(q) ||
          c.listingTitle?.toLowerCase().includes(q) ||
          c.pickupCode?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Menunggu konfirmasi di atas, lalu urut dari yang terbaru
        if (a.status === "menunggu" && b.status !== "menunggu") return -1;
        if (b.status === "menunggu" && a.status !== "menunggu") return 1;
        const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      });
  }, [claims, filter, search]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm text-ink/50">Memeriksa akun...</p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm text-clay">{authError}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-line/70 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-display text-xl font-bold text-forest-dark">
            SELASAR{" "}
            <span className="text-ink/40 font-normal text-sm">· Mitra</span>
          </div>
          <div className="flex items-center gap-4">
  <a
    href="/Mitra/Dashboard"
    className="text-sm font-medium text-ink/60 hover:text-ink transition-colors"
  >
    Dashboard
  </a>

  <span className="text-sm text-ink/60 hidden sm:inline">
    Halo, {mitraName}
  </span>

  <button
    onClick={handleLogout}
    className="text-sm font-medium text-ink/60 hover:text-clay transition-colors"
  >
    Keluar
  </button>
</div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">
            Kelola Pesanan
          </h1>
          <p className="text-sm text-ink/50 mt-1">
            Pantau dan konfirmasi klaim dari pelanggan untuk semua listing kamu.
          </p>
        </div>

        {actionError && (
          <p className="text-sm text-clay bg-clay-light rounded-lg px-3 py-2">
            {actionError}
          </p>
        )}

        {/* Filter status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors border ${
                filter === tab.key
                  ? "bg-forest text-white border-forest"
                  : "bg-white text-ink/60 border-line hover:bg-forest-light"
              }`}
            >
              {tab.label}
              <span className="ml-1 opacity-70">({counts[tab.key]})</span>
            </button>
          ))}
        </div>

        {/* Pencarian */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama pelanggan, listing, atau kode pickup..."
          className="w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-forest/30"
        />

        {/* Daftar pesanan */}
        {loadingData ? (
          <p className="text-sm text-ink/50">Memuat pesanan...</p>
        ) : visibleClaims.length === 0 ? (
          <div className="rounded-card bg-white border border-dashed border-line/70 p-8 text-center">
            <p className="text-sm text-ink/50">
              {claims.length === 0
                ? "Belum ada pesanan masuk."
                : "Tidak ada pesanan yang cocok dengan filter ini."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleClaims.map((c) => (
              <div
                key={c.id}
                className="rounded-card bg-white shadow-sm shadow-ink/5 border border-line/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display text-sm font-semibold text-ink">
                      {c.listingTitle ?? "Listing"}
                    </p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge(
                        c.status
                      )}`}
                    >
                      {statusLabel(c.status)}
                    </span>
                  </div>
                  <p className="text-xs text-ink/50 mt-1">
                    {c.customerName ?? "Pelanggan"}
                    {c.customerPhone && ` · ${c.customerPhone}`}
                    {" · "}
                    {c.qty} {c.unit ?? "item"}
                    {c.pickupCode && (
                      <span className="ml-1 font-mono">· {c.pickupCode}</span>
                    )}
                  </p>
                  {typeof c.totalPrice === "number" && (
                    <p className="text-xs font-semibold text-forest mt-1">
                      Rp{c.totalPrice.toLocaleString("id-ID")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {c.status === "menunggu_pembayaran" && (
                    <span className="text-xs text-ink/40 italic">
                      Menunggu pelanggan bayar...
                    </span>
                  )}

                  {c.status === "menunggu" && (
                    <>
                      <button
                        onClick={() => setCancelTarget(c)}
                        disabled={busyId === c.id}
                        className="rounded-full border border-clay text-clay text-xs font-semibold px-4 py-2 hover:bg-clay-light transition-colors disabled:opacity-60"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => handleConfirmClaim(c.id)}
                        disabled={busyId === c.id}
                        className="rounded-full bg-forest text-white text-xs font-semibold px-4 py-2 hover:bg-forest-dark transition-colors disabled:opacity-60"
                      >
                        {busyId === c.id ? "..." : "Konfirmasi"}
                      </button>
                    </>
                  )}

                  {c.status === "confirmed" && (
                    <button
                      onClick={() => handleMarkPickedUp(c.id)}
                      disabled={busyId === c.id}
                      className="rounded-full bg-forest text-white text-xs font-semibold px-4 py-2 hover:bg-forest-dark transition-colors disabled:opacity-60"
                    >
                      {busyId === c.id ? "..." : "Tandai Diambil"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Tolak pesanan ini?"
        description={`Pesanan dari "${
          cancelTarget?.customerName ?? "pelanggan"
        }" akan dibatalkan dan tidak bisa dikonfirmasi lagi.`}
        confirmLabel="Ya, Tolak"
        variant="danger"
        loading={cancelling}
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancelClaim}
      />
    </main>
  );
}