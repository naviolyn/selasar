import Navbar from "@/components/Navbar";
import ListingCard from "@/components/ListingCard";
import { mockListings } from "@/lib/mock-data";

const categories = ["Semua", "Makanan Berat", "Roti", "Kue Khas Medan"];

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-24">
        {/* Hero singkat */}
        <section className="pt-8 pb-6">
          <h1 className="font-display text-3xl font-semibold text-ink leading-tight max-w-xl">
            Selamatkan makanan di sekitar Medan hari ini
          </h1>
          <p className="text-sm text-ink/60 mt-2">
            {mockListings.length} makanan menunggu diselamatkan sebelum waktu
            pickup habis. Kamu bisa lihat-lihat dulu — daftar akun cuma
            diperlukan saat mau klaim.
          </p>
        </section>

        {/* Filter kategori */}
        <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar">
          {categories.map((cat, i) => (
            <button
              key={cat}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border ${
                i === 0
                  ? "bg-forest text-white border-forest"
                  : "bg-white text-ink/70 border-line"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid listing — responsive: 1 kolom di HP, 2 di tablet, 3 di laptop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {mockListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </main>
  );
}
