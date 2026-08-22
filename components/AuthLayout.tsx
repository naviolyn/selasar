import { ReactNode } from "react";

export default function AuthLayout({
  children,
  eyebrow,
  quote,
}: {
  children: ReactNode;
  eyebrow: string;
  quote: string;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-cream">
      {/* Panel kiri — brand, versi penuh hanya tampil di layar lebar */}
      <aside className="hidden lg:flex lg:w-[42%] xl:w-[38%] bg-forest-dark relative overflow-hidden flex-col justify-between p-10 xl:p-12">
        {/* motif tiket sobekan di background, konsisten sama ListingCard */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-turmeric/10"
          aria-hidden
        />

        <a
          href="/"
          className="relative font-display text-2xl font-bold text-white"
        >
          SELASAR
        </a>

        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-widest text-turmeric mb-4">
            {eyebrow}
          </p>
          <p className="font-display text-3xl xl:text-4xl font-medium text-white leading-snug max-w-md">
            {quote}
          </p>
        </div>

        <p className="relative text-sm text-white/50">
          Medan Bisa Digital 2026 — Dari Berlebih, Jadi Berarti
        </p>
      </aside>

      {/* Banner kompak — pengganti panel kiri di layar kecil/medium,
          biar bagian atas nggak terasa kosong, cuma dipendekkan */}
      <div className="lg:hidden bg-forest-dark relative overflow-hidden px-5 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-14">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-turmeric/10"
          aria-hidden
        />

        <a
          href="/"
          className="relative font-display text-2xl font-bold text-white inline-block"
        >
          SELASAR
        </a>

        <div className="relative mt-6">
          <p className="font-mono text-xs uppercase tracking-widest text-turmeric mb-3">
            {eyebrow}
          </p>
          <p className="font-display text-2xl sm:text-3xl font-medium text-white leading-snug max-w-md">
            {quote}
          </p>
        </div>
      </div>

      {/* Panel kanan — form */}
      <main className="flex-1 flex items-center justify-center px-5 sm:px-6 py-8 sm:py-12 lg:px-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}