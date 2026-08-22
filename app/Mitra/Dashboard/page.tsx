"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  deleteDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import ConfirmDialog from "@/components/ConfirmDialog";

type Listing = {
  id: string;
  title: string;
  category: string;
  originalPrice: number;
  discountPrice: number;
  quantityLeft: number;
  unit: string;
  imageUrl: string;
  status: "active" | "completed" | "expired";
  createdAt: any;
};

// Catatan: sesuaikan nama field di bawah dengan struktur collection "claims" kamu.
// Asumsi field: mitraId, listingId, listingTitle, customerName, quantity, status, createdAt
type Claim = {
  id: string;
  listingId: string;
  listingTitle?: string;
  customerName?: string;
  customerPhone?: string;
  qty: number;
  totalPrice?: number;
  pickupCode?: string;
  status: string;
  paymentStatus: "pending" | "paid" | "expired" | "failed";
  midtransOrderId: string;
  expiresAt: any;
};

export default function MitraDashboardPage() {
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

  // State untuk popup konfirmasi hapus listing
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Realtime: listing milik mitra ini
  useEffect(() => {
    if (!mitraId) return;
    const q = query(
      collection(db, "listings"),
      where("mitraId", "==", mitraId),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoadingData(false);
      },
      (err) => {
        console.error("Gagal memuat listing:", err);
        setLoadingData(false);
      }
    );
    return () => unsub();
  }, [mitraId]);

  // Realtime: klaim yang menunggu konfirmasi, berdasarkan listing milik mitra ini
  useEffect(() => {
    if (listings.length === 0) {
      setClaims([]);
      return;
    }
    const listingIds = listings.map((l) => l.id).slice(0, 30); // batas 'in' query = 30
    const q = query(
      collection(db, "claims"),
      where("listingId", "in", listingIds),
      where("status", "==", "menunggu")
    );
    const unsub = onSnapshot(
      q,
      (snap) =>
        setClaims(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      (err) => console.error("Gagal memuat klaim:", err)
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

  async function handleMarkCompleted(listingId: string) {
    setActionError("");
    setBusyId(listingId);
    try {
      await updateDoc(doc(db, "listings", listingId), {
        status: "completed",
        completedAt: serverTimestamp(),
      });
    } catch (err: any) {
      setActionError(err?.message || "Gagal menandai selesai.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDeleteListing() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError("");
    try {
      await deleteDoc(doc(db, "listings", deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setActionError(err?.message || "Gagal menghapus listing.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm text-ink/50">Memeriksa akun...</p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-4 text-center">
        <p className="text-sm text-clay">{authError}</p>
      </main>
    );
  }

  const activeListings = listings.filter((l) => l.status === "active");
  const completedListings = listings.filter((l) => l.status === "completed");

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-10 py-3.5 sm:py-4 flex items-center justify-between w-full">
        <a href="/Mitra/Dashboard" className="font-display text-lg sm:text-xl font-bold text-forest-dark shrink-0">
          SELASAR{" "}
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/Mitra/Pesanan"
            className="text-sm font-semibold text-ink/70 hover:text-forest px-3 py-1.5 transition-colors"
          >
            Kelola Pesanan
          </a>
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-ink/70 hover:text-ink px-2 py-1.5 transition-colors"
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-24 pt-10 space-y-6 sm:space-y-8">
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-card border border-line/70 shadow-sm shadow-ink/5 p-4 sm:p-5">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Listing Aktif</p>
            <p className="font-display text-xl sm:text-2xl font-semibold text-ink mt-1">
              {activeListings.length}
            </p>
          </div>
          <div className="bg-white rounded-card border border-line/70 shadow-sm shadow-ink/5 p-4 sm:p-5">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Klaim Menunggu</p>
            <a
              href="/Mitra/Pesanan"
              className="block font-display text-xl sm:text-2xl font-semibold text-forest mt-1 hover:underline"
            >
              {claims.length}
            </a>
          </div>
          <div className="bg-white rounded-card border border-line/70 shadow-sm shadow-ink/5 p-4 sm:p-5 col-span-2 sm:col-span-1">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">Total Kontribusi</p>
            <p className="font-display text-xl sm:text-2xl font-semibold text-ink mt-1">
              {completedListings.length}
            </p>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">
            Listing Kamu
          </h2>

          <a
            href="/Mitra/Upload"
            className="rounded-full bg-forest text-white font-semibold px-5 py-2.5 text-sm hover:bg-forest-dark transition-colors text-center"
          >
            + Tambah Listing
          </a>
        </div>

        {actionError && (
          <p className="text-sm text-clay bg-clay-light rounded-lg px-3 py-2">
            {actionError}
          </p>
        )}

        {claims.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="text-sm font-semibold text-ink/70">
                Klaim menunggu konfirmasi
              </h3>
              <a
                href="/Mitra/Pesanan"
                className="text-xs font-semibold text-forest hover:underline whitespace-nowrap"
              >
                Lihat semua pesanan →
              </a>
            </div>
            <div className="space-y-3">
              {claims.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-card border border-forest/30 shadow-sm shadow-ink/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {c.listingTitle ?? "Listing"}
                    </p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {c.customerName ?? "Pelanggan"} · {c.qty} diambil
                      {c.pickupCode && (
                        <span className="ml-1 font-mono">· {c.pickupCode}</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleConfirmClaim(c.id)}
                    disabled={busyId === c.id}
                    className="rounded-full bg-forest text-white text-xs font-semibold px-4 py-2 hover:bg-forest-dark transition-colors disabled:opacity-60 whitespace-nowrap w-full sm:w-auto"
                  >
                    {busyId === c.id ? "..." : "Konfirmasi"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {loadingData ? (
          <p className="text-sm text-ink/50">Memuat listing...</p>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-card border border-dashed border-line p-8 text-center">
            <p className="text-sm text-ink/50">
              Belum ada listing. Yuk mulai bantu selamatkan makanan!
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {listings.map((l) => {
              const discountPct = l.originalPrice
                ? Math.round((1 - l.discountPrice / l.originalPrice) * 100)
                : 0;
              return (
                <article
                  key={l.id}
                  className="w-full rounded-card bg-white shadow-sm shadow-ink/5 overflow-hidden border border-line/70"
                >
                  {/* Foto listing + badge status */}
                  <div className="relative h-40 bg-forest-light flex items-center justify-center overflow-hidden">
                    {l.imageUrl && (
                      <img
                        src={l.imageUrl}
                        alt={l.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span
                      className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold ${
                        l.status === "active"
                          ? "bg-forest-light text-forest-dark"
                          : "bg-line text-ink/60"
                      }`}
                    >
                      {l.status === "active" ? "Aktif" : "Selesai"}
                    </span>
                  </div>

                  {/* Sobekan tiket — motif signature, konsisten dengan ListingCard */}
                  <div className="ticket-notch bg-white" />
                  <div className="dash-divider" />

                  <div className="p-4 pt-3">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-forest-dark/70">
                      {l.category}
                    </p>
                    <h3 className="font-display text-lg font-semibold text-ink leading-snug mt-0.5">
                      {l.title}
                    </h3>

                    <div className="mt-3 flex items-end justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-xl font-bold text-forest-dark">
                          Rp{l.discountPrice.toLocaleString("id-ID")}
                        </span>
                        {l.originalPrice > l.discountPrice && (
                          <span className="text-sm text-ink/40 line-through">
                            Rp{l.originalPrice.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                      {discountPct > 0 && (
                        <span className="text-xs font-semibold text-clay bg-clay-light rounded-full px-2 py-1">
                          -{discountPct}%
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-ink/50">
                      Sisa {l.quantityLeft} {l.unit}
                    </p>

                    <div className="mt-4 flex items-center gap-2">
                      <a
                        href={`/Mitra/Listing/${l.id}/Edit`}
                        className="flex-1 text-center rounded-full border border-line text-ink text-xs font-semibold py-2 hover:bg-forest-light transition-colors"
                      >
                        Edit
                      </a>
                      <button
                        onClick={() => setDeleteTarget(l)}
                        className="flex-1 rounded-full border border-clay text-clay text-xs font-semibold py-2 hover:bg-clay-light transition-colors"
                      >
                        Hapus
                      </button>
                    </div>

                    {l.status === "active" && (
                      <button
                        onClick={() => handleMarkCompleted(l.id)}
                        disabled={busyId === l.id}
                        className="mt-2 w-full rounded-full bg-forest text-white font-semibold py-2.5 text-sm hover:bg-forest-dark transition-colors disabled:opacity-60"
                      >
                        {busyId === l.id ? "..." : "Tandai Selesai"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Hapus "${deleteTarget?.title ?? "listing"}"?`}
        description="Tindakan ini tidak bisa dibatalkan. Listing akan hilang dari daftar pelanggan."
        confirmLabel="Ya, Hapus"
        variant="danger"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteListing}
      />
    </main>
  );
}