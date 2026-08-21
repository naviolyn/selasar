"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { mockListings } from "@/lib/mock-data";
import { formatRupiah, formatSisaWaktu } from "@/lib/format";

function generatePickupCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I biar gak ketuker
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SLS-${code}`;
}

export default function ClaimPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const listing = useMemo(
    () => mockListings.find((l) => l.id === params.id),
    [params.id]
  );

  const [step, setStep] = useState<"review" | "success">("review");
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pickupCode, setPickupCode] = useState("");

  if (!listing) {
    return (
      <main className="min-h-screen bg-cream">
        <Navbar />
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="font-display text-2xl font-semibold text-ink">
            Listing tidak ditemukan
          </p>
          <p className="text-sm text-ink/60 mt-2">
            Mungkin sudah habis diklaim orang lain, atau linknya salah.
          </p>
          <a
            href="/discover"
            className="inline-block mt-6 rounded-full bg-forest text-white font-semibold px-6 py-3 text-sm hover:bg-forest-dark transition-colors"
          >
            Kembali ke daftar makanan
          </a>
        </div>
      </main>
    );
  }

  const total = listing.discountPrice * qty;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !phone.trim()) {
      setError("Nama dan nomor HP wajib diisi ya.");
      return;
    }
    if (qty < 1 || qty > listing!.quantityLeft) {
      setError("Jumlah yang kamu pilih tidak tersedia.");
      return;
    }

    setSubmitting(true);
    // Simulasi proses klaim — nanti tinggal diganti call ke backend/Firestore.
    setTimeout(() => {
      setPickupCode(generatePickupCode());
      setSubmitting(false);
      setStep("success");
    }, 600);
  }

  if (step === "success") {
    return (
      <main className="min-h-screen bg-cream">
        <Navbar />
        <div className="max-w-md mx-auto px-6 py-16">
          <div className="bg-white rounded-card border border-line shadow-sm shadow-ink/5 overflow-hidden">
            <div className="bg-forest-dark px-6 pt-8 pb-10 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-turmeric mb-2">
                Pesanan berhasil
              </p>
              <p className="text-sm text-white/70">
                Tunjukkan kode ini ke mitra saat ambil makanan
              </p>
              <p className="font-display text-4xl font-bold text-white mt-4 tracking-wider">
                {pickupCode}
              </p>
            </div>

            <div className="ticket-notch bg-white" />
            <div className="dash-divider" />

            <div className="p-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{listing.imageEmoji}</span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink leading-snug">
                    {listing.title}
                  </h2>
                  <p className="text-sm text-ink/60">{listing.mitraName}</p>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between text-ink/70">
                  <span>Jumlah</span>
                  <span className="font-medium text-ink">
                    {qty} {listing.unit}
                  </span>
                </div>
                <div className="flex justify-between text-ink/70">
                  <span>Total bayar (di tempat)</span>
                  <span className="font-semibold text-forest-dark">
                    {formatRupiah(total)}
                  </span>
                </div>
                <div className="flex justify-between text-ink/70">
                  <span>Batas pickup</span>
                  <span className="font-medium text-ink">
                    {formatSisaWaktu(listing.pickupEndsInMinutes)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-ink/50 mt-5 leading-relaxed">
                Konfirmasi juga dikirim ke {phone}. Kalau berubah pikiran, cukup
                jangan datang — tapi kasih tau mitra dulu ya biar bisa dialihkan
                ke orang lain.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <a
                  href="/discover"
                  className="text-center w-full rounded-full bg-forest text-white font-semibold py-3 text-sm hover:bg-forest-dark transition-colors"
                >
                  Cari makanan lain
                </a>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-center w-full text-sm font-medium text-ink/60 hover:text-ink py-2"
                >
                  Kembali ke beranda
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-md mx-auto px-6 py-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-ink/60 hover:text-ink mb-4"
        >
          ← Kembali
        </button>

        <div className="bg-white rounded-card border border-line shadow-sm shadow-ink/5 overflow-hidden">
          <div className="relative h-40 bg-forest-light flex items-center justify-center text-6xl">
            {listing.imageEmoji}
            <span className="absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold bg-clay text-white">
              {formatSisaWaktu(listing.pickupEndsInMinutes)}
            </span>
          </div>

          <div className="ticket-notch bg-white" />
          <div className="dash-divider" />

          <div className="p-5">
            <p className="font-mono text-[11px] uppercase tracking-wide text-forest-dark/70">
              {listing.category}
            </p>
            <h1 className="font-display text-xl font-semibold text-ink mt-0.5">
              {listing.title}
            </h1>
            <p className="text-sm text-ink/60 mt-0.5">{listing.mitraName}</p>
            <p className="text-xs text-ink/50 mt-1">
              {listing.distanceKm} km dari kamu · Sisa {listing.quantityLeft}{" "}
              {listing.unit}
            </p>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-forest-dark">
                {formatRupiah(listing.discountPrice)}
              </span>
              <span className="text-sm text-ink/40 line-through">
                {formatRupiah(listing.originalPrice)}
              </span>
              <span className="text-xs text-ink/50">/ {listing.unit}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Jumlah
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full border border-line bg-white text-ink font-semibold hover:bg-forest-light"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold text-ink">
                {qty}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQty((q) => Math.min(listing.quantityLeft, q + 1))
                }
                className="w-10 h-10 rounded-full border border-line bg-white text-ink font-semibold hover:bg-forest-light"
              >
                +
              </button>
              <span className="text-xs text-ink/50 ml-1">
                maks {listing.quantityLeft} {listing.unit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Nama kamu
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Nomor HP / WhatsApp
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Catatan untuk mitra{" "}
              <span className="text-ink/40 font-normal">(opsional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Misal: saya datang naik motor, jam 5 sore"
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-clay bg-clay-light rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="dash-divider !border-line" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-ink/70">Total bayar di tempat</span>
            <span className="font-display text-lg font-bold text-forest-dark">
              {formatRupiah(total)}
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-forest text-white font-semibold py-3 text-sm hover:bg-forest-dark transition-colors disabled:opacity-60"
          >
            {submitting ? "Memproses..." : "Konfirmasi Pesanan"}
          </button>
          <p className="text-xs text-ink/40 text-center leading-relaxed">
            Belum perlu bikin akun. Bayar langsung ke mitra saat pickup.
          </p>
        </form>
      </div>
    </main>
  );
}
