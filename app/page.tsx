import { mockListings } from "@/lib/mock-data";

const steps = [
  {
    n: "01",
    title: "POST",
    desc: "Mitra unggah makanan berlebih: foto, jenis, jumlah, kondisi, dan batas waktu pickup.",
  },
  {
    n: "02",
    title: "DISCOVER",
    desc: "Listing tampil ke pelanggan terdekat, difilter berdasarkan kategori & jarak.",
  },
  {
    n: "03",
    title: "CLAIM & PAY",
    desc: "Pelanggan klaim makanan yang diinginkan dan membayar sesuai harga diskon.",
  },
  {
    n: "04",
    title: "HANDOVER",
    desc: "Makanan diserahkan pakai kode bukti, transaksi tercatat sebagai kontribusi.",
  },
];

export default function WelcomePage() {
  return (
    <main className="bg-cream min-h-screen">
      {/* Navbar — style disamakan dengan komponen Navbar shared (sticky, blur, padding) */}
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-10 py-3.5 sm:py-4 flex items-center justify-between w-full">
        <span className="font-display text-lg sm:text-xl font-bold text-forest-dark shrink-0">
          SELASAR
        </span>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink/70">
          <a href="/discover" className="hover:text-ink">Lihat Makanan</a>
          <a href="#cara-kerja" className="hover:text-ink">Cara Kerja</a>
          <a href="#mitra" className="hover:text-ink">Untuk Mitra</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/login"
            className="text-sm font-semibold text-ink/70 hover:text-ink px-2 py-1.5 transition-colors"
          >
            Masuk
          </a>
          <a
            href="/register"
            className="text-sm font-semibold text-white bg-forest hover:bg-forest-dark transition-colors rounded-full px-4 sm:px-5 py-2 sm:py-2.5"
          >
            Daftar
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 pb-20 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <p className="font-mono text-m uppercase tracking-widest text-forest-dark/70 mb-4">
            Dari Berlebih, Jadi Berarti
          </p>
          <h1 className="font-display text-4xl lg:text-5xl font-semibold text-ink leading-[1.1]">
            Makanan berlebih,
            <br />
            sebelum jadi sampah.
          </h1>
          <p className="text-base text-ink/60 mt-5 max-w-md leading-relaxed">
            SELASAR menjembatani pelaku usaha di Medan yang punya makanan sisa
            layak konsumsi dengan orang yang membutuhkan — harga hemat, lebih
            sedikit makanan terbuang.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/register"
              className="rounded-full bg-forest text-white font-semibold px-6 py-3 text-sm hover:bg-forest-dark transition-colors"
            >
              Daftar sebagai Pelanggan
            </a>
            <a
              href="/register"
              className="rounded-full border border-forest text-forest font-semibold px-6 py-3 text-sm hover:bg-forest-light transition-colors"
            >
              Daftar sebagai Mitra Usaha
            </a>
          </div>
          <a
            href="/discover"
            className="inline-block mt-4 text-sm font-semibold text-ink/60 underline underline-offset-2 hover:text-ink"
          >
            Atau lihat dulu daftar makanannya →
          </a>
        </div>

        {/* Mockup preview kartu listing, sebagai bukti visual produk */}
        <div className="relative">
          <div className="absolute -inset-6 bg-forest-light rounded-[32px] -z-10" />
          <div className="bg-white rounded-card border border-line shadow-lg shadow-ink/5 overflow-hidden max-w-sm ml-auto">
            <div className="h-40 bg-forest-light flex items-center justify-center text-6xl relative">
              {mockListings[0].imageEmoji}
              <span className="absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold bg-clay text-white">
                45 menit lagi
              </span>
            </div>
            <div className="p-4">
              <p className="font-mono text-[11px] uppercase tracking-wide text-forest-dark/70">
                {mockListings[0].category}
              </p>
              <h3 className="font-display text-lg font-semibold text-ink mt-0.5">
                {mockListings[0].title}
              </h3>
              <p className="text-sm text-ink/60 mt-0.5">
                {mockListings[0].mitraName}
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-xl font-bold text-forest-dark">
                  Rp9.000
                </span>
                <span className="text-sm text-ink/40 line-through">
                  Rp25.000
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cara kerja */}
      <section id="cara-kerja" className="bg-forest-dark py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
          <p className="font-mono text-xs uppercase tracking-widest text-turmeric mb-3">
            Cara Kerja
          </p>
          <h2 className="font-display text-3xl font-semibold text-white max-w-lg">
            Dari dapur mitra ke tanganmu, dalam empat langkah
          </h2>

          <div className="mt-12 grid md:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.n} className="relative">
                <p className="font-display text-4xl font-bold text-white/20">
                  {s.n}
                </p>
                <h3 className="font-display text-lg font-semibold text-white mt-2">
                  {s.title}
                </h3>
                <p className="text-sm text-white/60 mt-2 leading-relaxed">
                  {s.desc}
                </p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-5 -right-4 w-8 h-px bg-white/20" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Mitra */}
      <section id="mitra" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-20">
        <div className="bg-turmeric-light rounded-[28px] p-10 lg:p-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-2xl lg:text-3xl font-semibold text-ink max-w-md">
              Punya usaha makanan di Medan? Jangan biarkan sisa stok jadi rugi.
            </h2>
            <p className="text-sm text-ink/60 mt-3 max-w-md">
              Daftar sebagai mitra, unggah makanan berlebih, dan ubah jadi
              pemasukan tambahan — bukan sampah.
            </p>
          </div>
          <a
            href="/register"
            className="shrink-0 rounded-full bg-ink text-white font-semibold px-7 py-3.5 text-sm hover:bg-forest-dark transition-colors"
          >
            Daftar sebagai Mitra
          </a>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-ink/50">
          <span>SELASAR — Medan Bisa Digital 2026</span>
          <span>Dari Berlebih, Jadi Berarti</span>
        </div>
      </footer>
    </main>
  );
}