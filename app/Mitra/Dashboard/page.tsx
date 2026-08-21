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
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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
    console.log("Query listing untuk mitraId:", mitraId); // ← tambahan
    const q = query(
      collection(db, "listings"),
      where("mitraId", "==", mitraId),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        console.log("Jumlah listing ditemukan:", snap.docs.length); // ← tambahan
        setListings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoadingData(false);
      },
      (err) => {
        console.error("Gagal memuat listing:", err); // ← ini yang paling penting dilihat
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
      (snap) => setClaims(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
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
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm text-clay">{authError}</p>
      </main>
    );
  }

  const activeListings = listings.filter((l) => l.status === "active");
  const completedListings = listings.filter((l) => l.status === "completed");

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-line bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-display text-xl font-bold text-forest-dark">
            SELASAR <span className="text-ink/40 font-normal text-sm">· Mitra</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink/60 hidden sm:inline">Halo, {mitraName}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-ink/60 hover:text-clay transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-card border border-line p-5">
            <p className="text-xs text-ink/50">Listing Aktif</p>
            <p className="font-display text-2xl font-semibold text-ink mt-1">{activeListings.length}</p>
          </div>
          <div className="bg-white rounded-card border border-line p-5">
            <p className="text-xs text-ink/50">Klaim Menunggu</p>
            <p className="font-display text-2xl font-semibold text-forest mt-1">{claims.length}</p>
          </div>
          <div className="bg-white rounded-card border border-line p-5 col-span-2 sm:col-span-1">
            <p className="text-xs text-ink/50">Total Kontribusi</p>
            <p className="font-display text-2xl font-semibold text-ink mt-1">{completedListings.length}</p>
          </div>
        </section>

        <div className="flex items-center justify-between">
  <h2 className="font-display text-lg font-semibold text-ink">
    Listing Kamu
  </h2>

  <a
    href="/Mitra/Upload"
    className="rounded-full bg-forest text-white font-semibold px-5 py-2.5 text-sm hover:bg-forest-dark transition-colors"
  >
    + Tambah Listing
  </a>
</div>

        {actionError && (
          <p className="text-sm text-clay bg-clay-light rounded-lg px-3 py-2">{actionError}</p>
        )}

        {claims.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-ink/70 mb-3">Klaim menunggu konfirmasi</h3>
            <div className="space-y-3">
              {claims.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-card border border-forest/30 p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{c.listingTitle ?? "Listing"}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
  {c.customerName ?? "Pelanggan"} · {c.qty} diambil
  {c.pickupCode && <span className="ml-1 font-mono">· {c.pickupCode}</span>}
</p>
                  </div>
                  <button
                    onClick={() => handleConfirmClaim(c.id)}
                    disabled={busyId === c.id}
                    className="rounded-full bg-forest text-white text-xs font-semibold px-4 py-2 hover:bg-forest-dark transition-colors disabled:opacity-60 whitespace-nowrap"
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
            <p className="text-sm text-ink/50">Belum ada listing. Yuk mulai bantu selamatkan makanan!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {listings.map((l) => (
              <div key={l.id} className="bg-white rounded-card border border-line overflow-hidden">
                <div className="h-32 bg-forest-light">
                  {l.imageUrl && (
                    <img src={l.imageUrl} alt={l.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{l.title}</p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        l.status === "active" ? "bg-forest-light text-forest-dark" : "bg-line text-ink/50"
                      }`}
                    >
                      {l.status === "active" ? "Aktif" : "Selesai"}
                    </span>
                  </div>
                  <p className="text-xs text-ink/50 mt-1">
                    {l.category} · {l.quantityLeft} {l.unit} tersisa
                  </p>
                  <p className="text-sm font-semibold text-forest mt-2">
                    Rp{l.discountPrice.toLocaleString("id-ID")}
                  </p>

                  {l.status === "active" && (
                    <button
                      onClick={() => handleMarkCompleted(l.id)}
                      disabled={busyId === l.id}
                      className="mt-3 w-full rounded-full border border-line text-ink text-xs font-semibold py-2 hover:bg-forest-light transition-colors disabled:opacity-60"
                    >
                      {busyId === l.id ? "..." : "Tandai Selesai"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}