"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [isMitra, setIsMitra] = useState(false);

  // State untuk popup konfirmasi keluar
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const data = userDoc.exists() ? userDoc.data() : null;
          setIsMitra(data?.role === "mitra");
        } catch (err) {
          console.error("Gagal memuat data user:", err);
        }
      } else {
        setIsMitra(false);
      }

      setChecking(false);
    });
    return () => unsubscribe();
  }, []);

  async function handleConfirmLogout() {
    setLoggingOut(true);
    try {
      await signOut(auth);
      router.push("/");
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }

  // Kalau lagi di halaman pesanan (endsWith biar cocok walau nested,
  // misal /Beli/orders), tombol jadi "Menu" balik ke dashboard.
  // Kalau di halaman lain, tombol jadi "Pesanan" menuju halaman pesanan.
  const ORDERS_PATH = "/Beli/orders"; // ganti sesuai path aktual halaman pesanan kamu
  const isOnOrdersPage = pathname?.endsWith("/orders") ?? false;

  const handleNavButtonClick = () => {
    if (isOnOrdersPage) {
      router.push("/discover"); // ganti sesuai route dashboard customer kamu
    } else {
      router.push(ORDERS_PATH);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-10 py-3.5 sm:py-4 flex items-center justify-between w-full">
        <a
          href="/"
          className="font-display text-lg sm:text-xl font-bold text-forest-dark shrink-0"
        >
          SELASAR
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          {checking ? (
            <div className="w-20 h-8 rounded-full bg-line/60 animate-pulse" />
          ) : user ? (
            <>
              {!isMitra && (
                <button
                  onClick={handleNavButtonClick}
                  className="text-sm font-semibold text-ink/70 hover:text-forest px-3 py-1.5 transition-colors"
                  title={isOnOrdersPage ? "Kembali ke menu" : "Lihat pesanan kamu"}
                >
                  {isOnOrdersPage ? "Menu" : "Pesanan"}
                </button>
              )}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="text-sm font-semibold text-ink/70 hover:text-ink px-2 py-1.5 transition-colors"
              >
                Keluar
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </header>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Keluar dari akun?"
        description="Kamu perlu masuk lagi untuk mengakses akun kamu."
        confirmLabel="Ya, Keluar"
        variant="danger"
        loading={loggingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}