"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ListingCard from "@/components/ListingCard";
import { getListings, Listing } from "@/lib/firestore-listings";
import { getUserById, AppUser } from "@/lib/firestore-users";

const PAGE_SIZE = 10;
const HABIS = "Habis";
const LAINNYA = "Lainnya";

type LatLng = { lat: number; lng: number };

// Haversine formula: hitung jarak antara 2 titik koordinat (dalam km)
function getDistanceKm(a: LatLng, b: LatLng) {
  const R = 6371; // radius bumi (km)
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function DiscoverPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [page, setPage] = useState(1);

  // ── User (auth + data dari Firestore) ───────────────────────
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  // ── Lokasi customer ──────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [sortNearest, setSortNearest] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const data = await getUserById(u.uid);
        setAppUser(data);
      } else {
        setAppUser(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    getListings().then((data) => {
      setListings(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, sortNearest]);

  function handleToggleNearest() {
    // Kalau sudah aktif, matikan lagi (balik ke urutan default)
    if (sortNearest) {
      setSortNearest(false);
      return;
    }

    setLocationError("");

    if (!("geolocation" in navigator)) {
      setLocationError("Perangkat ini tidak mendukung deteksi lokasi.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setSortNearest(true);
        setLocating(false);
      },
      (err) => {
        console.error(err);
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            "Izin lokasi ditolak. Aktifkan izin lokasi di browser untuk pakai fitur ini."
          );
        } else {
          setLocationError("Gagal mendeteksi lokasi. Coba lagi.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Tab kategori: Semua -> kategori dari data (alfabet, tanpa "Lainnya") -> Lainnya -> Habis
  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(listings.map((l) => l.category).filter(Boolean))
    );

    const hasLainnya = unique.includes(LAINNYA);
    const rest = unique
      .filter((c) => c !== LAINNYA)
      .sort((a, b) => a.localeCompare(b));

    const ordered = hasLainnya ? [...rest, LAINNYA] : rest;

    return ["Semua", ...ordered, HABIS];
  }, [listings]);

  const filteredListings = useMemo(() => {
    let result: Listing[];

    if (activeCategory === HABIS) {
      result = listings.filter((l) => l.quantityLeft <= 0);
    } else if (activeCategory === "Semua") {
      result = listings.filter((l) => l.quantityLeft > 0);
    } else {
      result = listings.filter(
        (l) => l.category === activeCategory && l.quantityLeft > 0
      );
    }

    if (sortNearest && userLocation) {
      result = [...result].sort((a, b) => {
        const distA = a.location
          ? getDistanceKm(userLocation, a.location)
          : Infinity;
        const distB = b.location
          ? getDistanceKm(userLocation, b.location)
          : Infinity;
        return distA - distB;
      });
    }

    return result;
  }, [listings, activeCategory, sortNearest, userLocation]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE));
  const paginatedListings = filteredListings.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-24">
        <section className="pt-8 pb-6">
          {appUser && (
            <p className="font-display text-base sm:text-lg font-semibold text-forest-dark mb-2">
              Halo {appUser.name || "Sahabat Selasar"}, Selamat Datang di Selasar!
            </p>
          )}
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink leading-snug max-w-xl sm:max-w-none sm:whitespace-nowrap">
            Selamatkan makanan di sekitar Medan hari ini
          </h1>
          <p className="text-sm text-ink/60 mt-2">
            {loading
              ? "Memuat..."
              : activeCategory === HABIS
              ? `${filteredListings.length} makanan sudah habis`
              : `${filteredListings.length} makanan menunggu diselamatkan`}
          </p>
        </section>

        <div className="flex items-center justify-between gap-3 pb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                  activeCategory === cat
                    ? cat === HABIS
                      ? "bg-ink/40 text-white border-ink/40"
                      : "bg-forest text-white border-forest"
                    : "bg-white text-ink/70 border-line"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleToggleNearest}
            disabled={locating}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors disabled:opacity-50 ${
              sortNearest
                ? "bg-forest text-white border-forest"
                : "bg-white text-ink/70 border-line"
            }`}
          >
            📍 {locating ? "Mendeteksi..." : "Terdekat"}
          </button>
        </div>

        {locationError && (
          <p className="text-xs text-clay mb-4">{locationError}</p>
        )}

        {!loading && filteredListings.length === 0 && (
          <p className="text-sm text-ink/50 py-10 text-center">
            {activeCategory === HABIS
              ? "Belum ada makanan yang habis."
              : "Belum ada makanan untuk kategori ini."}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedListings.map((listing) => (
            <div
              key={listing.id}
              className={activeCategory === HABIS ? "opacity-50" : ""}
            >
              <ListingCard listing={listing} />
              {activeCategory === HABIS && (
                <p className="text-xs font-semibold text-red-500 mt-1">
                  Habis
                </p>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-full px-3 py-1.5 text-sm font-medium border border-line bg-white text-ink/70 disabled:opacity-40"
            >
              Sebelumnya
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`rounded-full w-8 h-8 text-sm font-medium border ${
                  page === n
                    ? "bg-forest text-white border-forest"
                    : "bg-white text-ink/70 border-line"
                }`}
              >
                {n}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-full px-3 py-1.5 text-sm font-medium border border-line bg-white text-ink/70 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </main>
  );
}