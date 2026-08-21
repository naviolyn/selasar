import { Listing } from "@/lib/firestore-listings";
import {
  formatRupiah,
  formatSisaWaktu,
  getMinutesRemaining,
} from "@/lib/format";

function urgencyStyle(minutes: number) {
  if (minutes <= 30) return "bg-clay text-white";
  if (minutes <= 60) return "bg-turmeric text-ink";
  return "bg-forest-light text-forest-dark";
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const discountPct = Math.round(
    (1 - listing.discountPrice / listing.originalPrice) * 100
  );
  const minutesLeft = getMinutesRemaining(listing.pickupDeadline);
  const isSoldOut = listing.quantityLeft <= 0;

  return (
    <article className="group w-full h-full flex flex-col rounded-card bg-white shadow-sm shadow-ink/5 overflow-hidden border border-line/70 transition-shadow hover:shadow-lg hover:shadow-ink/10">
      <div className="relative h-40 sm:h-44 bg-forest-light flex items-center justify-center overflow-hidden">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="text-6xl">🍽️</span>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
            <span className="text-white text-sm font-semibold tracking-wide uppercase">
              Habis diklaim
            </span>
          </div>
        )}
        <span
          className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${urgencyStyle(
            minutesLeft
          )}`}
        >
          {formatSisaWaktu(minutesLeft)}
        </span>
      </div>

      <div className="ticket-notch bg-white" />
      <div className="dash-divider" />

      <div className="p-4 pt-3 flex flex-col flex-1">
        <p className="font-mono text-[11px] uppercase tracking-wide text-forest-dark/70">
          {listing.category}
        </p>
        <h3 className="font-display text-lg font-semibold text-ink leading-snug mt-0.5 line-clamp-2">
          {listing.title}
        </h3>
        <p className="text-sm text-ink/60 mt-0.5 line-clamp-1">
          {listing.mitraName}
        </p>

        <div className="mt-3 flex items-end justify-between gap-2 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold text-forest-dark">
              {formatRupiah(listing.discountPrice)}
            </span>
            <span className="text-sm text-ink/40 line-through">
              {formatRupiah(listing.originalPrice)}
            </span>
          </div>
          <span className="text-xs font-semibold text-clay bg-clay-light rounded-full px-2 py-1 shrink-0">
            -{discountPct}%
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-ink/50">
          <span>
            Sisa {listing.quantityLeft} {listing.unit}
          </span>
        </div>

        <a
          href={isSoldOut ? undefined : `/Beli/${listing.id}`}
          aria-disabled={isSoldOut}
          className={`mt-4 block text-center w-full rounded-full font-semibold py-2.5 text-sm transition-colors ${
            isSoldOut
              ? "bg-line text-ink/40 pointer-events-none"
              : "bg-forest text-white hover:bg-forest-dark"
          }`}
        >
          {isSoldOut ? "Sudah Habis" : "Selamatkan Sekarang"}
        </a>
      </div>
    </article>
  );
}
