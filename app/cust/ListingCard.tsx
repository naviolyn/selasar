import { Listing } from "@/lib/mock-data";
import { formatRupiah, formatSisaWaktu } from "@/lib/format";

function urgencyStyle(minutes: number) {
  if (minutes <= 30) return "bg-clay text-white";
  if (minutes <= 60) return "bg-turmeric text-ink";
  return "bg-forest-light text-forest-dark";
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const discountPct = Math.round(
    (1 - listing.discountPrice / listing.originalPrice) * 100
  );

  return (
    <article className="w-full rounded-card bg-white shadow-sm shadow-ink/5 overflow-hidden border border-line/70">
      {/* Foto / ilustrasi makanan */}
      <div className="relative h-40 bg-forest-light flex items-center justify-center text-6xl">
        {listing.imageEmoji}
        <span
          className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold ${urgencyStyle(
            listing.pickupEndsInMinutes
          )}`}
        >
          {formatSisaWaktu(listing.pickupEndsInMinutes)}
        </span>
      </div>

      {/* Sobekan tiket — motif signature */}
      <div className="ticket-notch bg-white" />
      <div className="dash-divider" />

      {/* Info listing */}
      <div className="p-4 pt-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-forest-dark/70">
          {listing.category}
        </p>
        <h3 className="font-display text-lg font-semibold text-ink leading-snug mt-0.5">
          {listing.title}
        </h3>
        <p className="text-sm text-ink/60 mt-0.5">{listing.mitraName}</p>

        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold text-forest-dark">
              {formatRupiah(listing.discountPrice)}
            </span>
            <span className="text-sm text-ink/40 line-through">
              {formatRupiah(listing.originalPrice)}
            </span>
          </div>
          <span className="text-xs font-semibold text-clay bg-clay-light rounded-full px-2 py-1">
            -{discountPct}%
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-ink/50">
          <span>
            Sisa {listing.quantityLeft} {listing.unit}
          </span>
          <span>{listing.distanceKm} km dari kamu</span>
        </div>

        {/* Langsung ke halaman klaim — gak perlu daftar/login dulu.
            Nama & no HP diminta di halaman claim sebagai data pickup. */}
        <a
          href={`/claim/${listing.id}`}
          className="mt-4 block text-center w-full rounded-full bg-forest text-white font-semibold py-2.5 text-sm hover:bg-forest-dark transition-colors"
        >
          Selamatkan Sekarang
        </a>
      </div>
    </article>
  );
}
