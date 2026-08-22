"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import type { LatLng } from "@/components/LocationPicker";

// Peta pakai Leaflet yang bergantung ke `window`, jadi harus di-load tanpa SSR.
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] w-full rounded-card border border-line bg-forest-light/40 flex items-center justify-center text-xs text-ink/40">
      Memuat peta...
    </div>
  ),
});

// Reverse geocoding pakai Nominatim (OpenStreetMap) — gratis, tanpa API key.
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`
  );
  if (!res.ok) throw new Error("Gagal mengambil alamat dari koordinat.");
  const data = await res.json();
  return (data?.display_name as string) ?? "";
}

// Titik tengah default: Medan, buat posisi awal peta kalau listing belum punya lokasi.
const DEFAULT_CENTER: LatLng = { lat: 3.5952, lng: 98.6722 };

// Catatan: sesuaikan daftar kategori & satuan ini dengan yang dipakai di
// halaman Upload listing kamu, supaya konsisten.
const CATEGORIES = [
  "Makanan Siap Saji",
  "Roti & Kue",
  "Buah & Sayur",
  "Bahan Pokok",
  "Minuman",
  "Sisa Makanan",
  "Lainnya",
];

const UNITS = ["porsi", "pcs", "pack", "kg", "loyang"];

type ListingForm = {
  title: string;
  category: string;
  originalPrice: string;
  discountPrice: string;
  quantityLeft: string;
  unit: string;
  imageUrl: string;
};

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const listingId = params?.id;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState("");
  const [mitraId, setMitraId] = useState("");

  const [loadingListing, setLoadingListing] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<ListingForm>({
    title: "",
    category: CATEGORIES[0],
    originalPrice: "",
    discountPrice: "",
    quantityLeft: "",
    unit: UNITS[0],
    imageUrl: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  // ── Lokasi ──────────────────────────────────────────────────────
  const [position, setPosition] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

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
      } catch (err) {
        console.error("Gagal memuat data akun:", err);
        setAuthError("Gagal memuat data akun. Coba refresh halaman.");
      } finally {
        setCheckingAuth(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Muat data listing yang mau diedit
  useEffect(() => {
    if (!mitraId || !listingId) return;

    async function loadListing() {
      try {
        const snap = await getDoc(doc(db, "listings", listingId));
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = snap.data() as any;

        // Cegah mitra mengedit listing milik mitra lain
        if (data.mitraId !== mitraId) {
          router.replace("/Mitra/Dashboard");
          return;
        }

        setForm({
          title: data.title ?? "",
          category: data.category ?? CATEGORIES[0],
          originalPrice: String(data.originalPrice ?? ""),
          discountPrice: String(data.discountPrice ?? ""),
          quantityLeft: String(data.quantityLeft ?? ""),
          unit: data.unit ?? UNITS[0],
          imageUrl: data.imageUrl ?? "",
        });
        setImagePreview(data.imageUrl ?? "");

        // Muat lokasi listing yang sudah ada (kalau ada)
        if (
          data.location &&
          typeof data.location.lat === "number" &&
          typeof data.location.lng === "number"
        ) {
          setPosition({ lat: data.location.lat, lng: data.location.lng });
          setAddress(data.location.address ?? "");
        } else {
          setPosition(DEFAULT_CENTER);
        }
      } catch (err) {
        console.error("Gagal memuat listing:", err);
        setFormError("Gagal memuat data listing. Coba refresh halaman.");
      } finally {
        setLoadingListing(false);
      }
    }

    loadListing();
  }, [mitraId, listingId, router]);

  function handleChange<K extends keyof ListingForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setSaved(false);
  }

  async function handleUseMyLocation() {
    setLocationError("");
    if (!("geolocation" in navigator)) {
      setLocationError("Browser ini tidak mendukung deteksi lokasi.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(next);
        setSaved(false);
        try {
          const found = await reverseGeocode(next.lat, next.lng);
          if (found) setAddress(found);
        } catch (err) {
          console.error(err);
          // Koordinat tetap kepakai walau reverse geocode gagal; user bisa isi alamat manual.
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.error(err);
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            "Izin lokasi ditolak. Kamu masih bisa klik langsung di peta buat nentuin titik lokasi."
          );
        } else {
          setLocationError(
            "Gagal mendeteksi lokasi. Coba lagi atau klik langsung di peta."
          );
        }
        setPosition((p) => p ?? DEFAULT_CENTER);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleMapChange(next: LatLng) {
    setPosition(next);
    setLocationError("");
    setSaved(false);
  }

  function validate(): string | null {
    if (!form.title.trim()) return "Judul listing wajib diisi.";
    const original = Number(form.originalPrice);
    const discount = Number(form.discountPrice);
    const qty = Number(form.quantityLeft);

    if (!form.originalPrice || Number.isNaN(original) || original <= 0)
      return "Harga asli harus berupa angka lebih dari 0.";
    if (!form.discountPrice || Number.isNaN(discount) || discount < 0)
      return "Harga diskon harus berupa angka.";
    if (discount > original)
      return "Harga diskon tidak boleh lebih besar dari harga asli.";
    if (!form.quantityLeft || Number.isNaN(qty) || qty < 0)
      return "Jumlah tersisa harus berupa angka.";
    if (!position) return "Tentukan lokasi pickup dulu ya.";
    if (!address.trim())
      return "Alamat pickup wajib diisi (bisa diedit manual).";

    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaved(false);

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    try {
      let imageUrl = form.imageUrl;

      // Upload foto baru dulu kalau ada, sebelum update Firestore
      if (imageFile) {
        setUploadingImage(true);
        const imageRef = ref(
          storage,
          `listings/${listingId}/${Date.now()}-${imageFile.name}`
        );
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
        setUploadingImage(false);
      }

      await updateDoc(doc(db, "listings", listingId), {
        title: form.title.trim(),
        category: form.category,
        originalPrice: Number(form.originalPrice),
        discountPrice: Number(form.discountPrice),
        quantityLeft: Number(form.quantityLeft),
        unit: form.unit,
        imageUrl,
        location: {
          address: address.trim(),
          lat: position!.lat,
          lng: position!.lng,
        },
        updatedAt: serverTimestamp(),
      });

      setForm((prev) => ({ ...prev, imageUrl }));
      setImageFile(null);
      setSaved(true);
    } catch (err: any) {
      console.error("Gagal menyimpan listing:", err);
      setFormError(err?.message || "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (checkingAuth || loadingListing) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm text-ink/50">Memuat...</p>
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

  if (notFound) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-ink/60">Listing tidak ditemukan.</p>
          <a
            href="/Mitra/Dashboard"
            className="inline-block mt-4 text-sm font-semibold text-forest hover:underline"
          >
            ← Kembali ke Dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-10 py-3.5 sm:py-4 flex items-center justify-between w-full">
        <a
          href="/Mitra/Dashboard"
          className="font-display text-lg sm:text-xl font-bold text-forest-dark shrink-0"
        >
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

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <a
            href="/Mitra/Dashboard"
            className="text-sm font-medium text-ink/60 hover:text-ink transition-colors"
          >
            ← Kembali
          </a>
        </div>

        <form onSubmit={handleSubmit}>
          {formError && (
            <p className="text-sm text-clay bg-clay-light rounded-lg px-3 py-2 mb-5">
              {formError}
            </p>
          )}
          {saved && (
            <p className="text-sm text-forest-dark bg-forest-light rounded-lg px-3 py-2 mb-5">
              Perubahan berhasil disimpan.
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-10">
            {/* Kolom kiri: foto produk */}
            <div>
              <div className="rounded-2xl overflow-hidden bg-forest-light">
                <div className="relative w-full aspect-[16/10] sm:aspect-[16/9]">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Pratinjau foto listing"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-ink/40">
                      Belum ada foto
                    </div>
                  )}
                </div>
              </div>

              <label className="block text-xs font-semibold text-ink/60 mt-4 mb-2">
                Foto Produk
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="text-xs text-ink/60 file:mr-3 file:rounded-full file:border-0 file:bg-forest-light file:px-4 file:py-2 file:text-xs file:font-semibold file:text-forest-dark hover:file:bg-forest/20"
              />
            </div>

            {/* Kolom kanan: form detail listing */}
            <div className="bg-white rounded-card border border-line p-6 h-fit lg:sticky lg:top-6 space-y-5">
              {/* Judul */}
              <div>
                <label className="block text-xs font-semibold text-ink/60 mb-1.5">
                  Judul Listing
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="mis. Nasi Kotak Sisa Katering"
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/30"
                />
              </div>

              {/* Kategori & Satuan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink/60 mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/30"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink/60 mb-1.5">
                    Satuan
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => handleChange("unit", e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/30"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Harga */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink/60 mb-1.5">
                    Harga Asli (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.originalPrice}
                    onChange={(e) => handleChange("originalPrice", e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink/60 mb-1.5">
                    Harga Diskon (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.discountPrice}
                    onChange={(e) => handleChange("discountPrice", e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/30"
                  />
                </div>
              </div>

              {/* Jumlah tersisa */}
              <div>
                <label className="block text-xs font-semibold text-ink/60 mb-1.5">
                  Jumlah Tersisa
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.quantityLeft}
                  onChange={(e) => handleChange("quantityLeft", e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/30"
                />
              </div>

              {/* Lokasi pickup */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-ink/60">
                    Lokasi Pickup
                  </label>
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    className="text-xs font-semibold text-forest hover:text-forest-dark disabled:opacity-50"
                  >
                    {locating ? "Mendeteksi..." : "📍 Gunakan lokasi saya sekarang"}
                  </button>
                </div>

                <LocationPicker
                  position={position ?? DEFAULT_CENTER}
                  onChange={handleMapChange}
                />
                <p className="text-xs text-ink/40 mt-1.5">
                  Klik atau geser pin di peta buat koreksi titik lokasi kalau
                  kurang pas.
                </p>

                <input
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Alamat lengkap (bisa diedit manual)"
                  className="mt-3 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/30"
                />

                {locationError && (
                  <p className="text-xs text-clay mt-1.5">{locationError}</p>
                )}
              </div>

              <div className="dash-divider !border-line" />

              <div className="flex items-center gap-3">
                <a
                  href="/Mitra/Dashboard"
                  className="flex-1 text-center rounded-full border border-line text-ink text-sm font-semibold py-2.5 hover:bg-forest-light transition-colors"
                >
                  Batal
                </a>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-forest text-white text-sm font-semibold py-2.5 hover:bg-forest-dark transition-colors disabled:opacity-60"
                >
                  {uploadingImage
                    ? "Mengunggah foto..."
                    : saving
                    ? "Menyimpan..."
                    : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}