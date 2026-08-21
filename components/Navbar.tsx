export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-line px-6 lg:px-10 py-4 flex items-center justify-between w-full">
      <a href="/" className="font-display text-xl font-bold text-forest-dark">
        SELASAR
      </a>
      <div className="flex items-center gap-3">
        <a
          href="/login"
          className="text-sm font-semibold text-ink/70 hover:text-ink px-2"
        >
          Masuk
        </a>
        <a
          href="/register"
          className="text-sm font-semibold text-white bg-forest hover:bg-forest-dark transition-colors rounded-full px-5 py-2.5"
        >
          Daftar
        </a>
      </div>
    </header>
  );
}
