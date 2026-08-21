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
    <div className="min-h-screen w-full flex bg-cream">
      {/* Panel kiri — brand, hanya tampil di layar lebar */}
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
          Medan Bisa Digital 2026 — Dari Berlebih, Jadi Berarti        </p>
      </aside>

      {/* Panel kanan — form */}
      <main className="flex-1 flex items-center justify-center px-5 sm:px-6 py-10 sm:py-12 lg:px-16">
        <div className="w-full max-w-md">
          <a
            href="/"
            className="lg:hidden font-display text-xl font-bold text-forest-dark mb-8 inline-block"
          >
            SELASAR
          </a>
          {children}
        </div>
      </main>
    </div>
  );
}
