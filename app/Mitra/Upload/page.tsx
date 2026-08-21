"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// ── Konfigurasi Cloudinary ──────────────────────────────────────────
// Butuh 2 env var di .env.local:
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=nama-cloud-kamu
//   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=nama-preset-unsigned
// Upload preset harus dibuat "Unsigned" di Cloudinary dashboard
// (Settings → Upload → Upload presets → Add upload preset → Signing Mode: Unsigned)
// supaya bisa diupload langsung dari browser tanpa backend/API key rahasia.
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(
  file: File
): Promise<{ url: string; publicId: string }> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary belum dikonfigurasi. Cek NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET di .env.local"
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "selasar/listings");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    throw new Error("Upload foto gagal. Coba lagi.");
  }

  const data = await res.json();
  return { url: data.secure_url as string, publicId: data.public_id as string };
}

const categories = ["Makanan Berat", "Roti", "Kue Khas Medan", "Lainnya"];
const units = ["porsi", "pcs", "box", "loyang", "pack"];

export default function UploadListingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guard: hanya mitra yang login boleh akses halaman ini
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mitraName, setMitraName] = useState("");
  const [mitraId, setMitraId] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const data = userDoc.exists() ? userDoc.data() : null;
      if (!data || data.role !== "mitra") {
        router.replace("/discover");
        return;
      }
      setMitraId(user.uid);
      setMitraName(data.name ?? "");
      setCheckingAuth(false);
    });
    return () => unsub();
  }, [router]);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(units[0]);
  const [pickupDeadline, setPickupDeadline] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto maksimal 5MB.");
      return;
    }

    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const original = Number(originalPrice);
    const discount = Number(discountPrice);
    const qty = Number(quantity);

    if (!title.trim()) return setError("Nama makanan wajib diisi.");
    if (!imageFile) return setError("Upload foto makanan dulu ya.");
    if (!original || original <= 0)
      return setError("Harga asli harus lebih dari 0.");
    if (!discount || discount <= 0)
      return setError("Harga diskon harus lebih dari 0.");
    if (discount >= original)
      return setError("Harga diskon harus lebih murah dari harga asli.");
    if (!qty || qty <= 0)
      return setError("Jumlah tersedia harus lebih dari 0.");
    if (!pickupDeadline) return setError("Tentukan batas waktu pickup.");

    const pickupTime = new Date(pickupDeadline);
    if (pickupTime.getTime() <= Date.now()) {
      return setError("Batas pickup harus di waktu yang akan datang.");
    }

    setSubmitting(true);
    try {
      const { url: imageUrl, publicId: imagePublicId } =
        await uploadToCloudinary(imageFile);

      await addDoc(collection(db, "listings"), {
        title: title.trim(),
        category,
        description: description.trim(),
        originalPrice: original,
        discountPrice: discount,
        quantityLeft: qty,
        unit,
        pickupEndsAt: pickupTime,
        imageUrl,
        imagePublicId,
        mitraId,
        mitraName,
        status: "active",
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Gagal mengunggah makanan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setTitle("");
    setCategory(categories[0]);
    setDescription("");
    setOriginalPrice("");
    setDiscountPrice("");
    setQuantity("");
    setUnit(units[0]);
    setPickupDeadline("");
    setImageFile(null);
    setImagePreview("");
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm text-ink/50">Memeriksa akun...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-line bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/mitra/dashboard"
            className="font-display text-xl font-bold text-forest-dark"
          >
            SELASAR{" "}
            <span className="text-ink/40 font-normal text-sm">· Mitra</span>
          </a>
          <a
            href="/mitra/dashboard"
            className="text-sm font-medium text-ink/60 hover:text-ink"
          >
            Kembali
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {success ? (
          <div className="bg-white rounded-card border border-line shadow-sm shadow-ink/5 p-8 text-center">
            <p className="font-display text-2xl font-semibold text-ink">
              Makanan berhasil diunggah 🎉
            </p>
            <p className="text-sm text-ink/60 mt-2">
              Listingmu sekarang tampil di halaman Discover dan siap diklaim
              pelanggan.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full bg-forest text-white font-semibold px-6 py-3 text-sm hover:bg-forest-dark transition-colors"
              >
                Upload makanan lain
              </button>
              <a
                href="/mitra/dashboard"
                className="rounded-full border border-line text-ink font-semibold px-6 py-3 text-sm hover:bg-forest-light transition-colors"
              >
                Ke dashboard
              </a>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold text-ink">
              Upload makanan berlebih
            </h1>
            <p className="text-sm text-ink/60 mt-1">
              Isi detail makanan yang mau diselamatkan. Semakin jelas fotonya,
              semakin cepat diklaim.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Upload foto */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Foto makanan
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-card border-2 border-dashed border-line bg-white h-48 flex items-center justify-center overflow-hidden hover:border-forest transition-colors"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview makanan"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center px-4">
                      <p className="text-sm font-medium text-ink/60">
                        Klik untuk pilih foto
                      </p>
                      <p className="text-xs text-ink/40 mt-1">
                        JPG/PNG, maks 5MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Nama makanan
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Nasi Padang Sisa Hari Ini"
                  className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Satuan
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Deskripsi{" "}
                  <span className="text-ink/40 font-normal">(opsional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Kondisi makanan, isi kemasan, dll."
                  className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Harga asli (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Harga diskon (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    placeholder="9000"
                    className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Jumlah tersedia
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="10"
                    className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Batas waktu pickup
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={pickupDeadline}
                    onChange={(e) => setPickupDeadline(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-clay bg-clay-light rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-forest text-white font-semibold py-3 text-sm hover:bg-forest-dark transition-colors disabled:opacity-60"
              >
                {submitting ? "Mengunggah..." : "Unggah Makanan"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
