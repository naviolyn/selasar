"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
    });
    return () => unsubscribe();
  }, []);

  async function handleLogout() {
    await signOut(auth);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-line px-6 lg:px-10 py-4 flex items-center justify-between w-full">
      <a href="/" className="font-display text-xl font-bold text-forest-dark">
        SELASAR
      </a>
      <div className="flex items-center gap-3">
        {checking ? null : user ? (
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-ink/70 hover:text-ink px-2"
          >
            Keluar
          </button>
        ) : (
          <>
            
            <a href="/login"
              className="text-sm font-semibold text-ink/70 hover:text-ink px-2"
            >
              Masuk
            </a>
            
            <a href="/register"
              className="text-sm font-semibold text-white bg-forest hover:bg-forest-dark transition-colors rounded-full px-5 py-2.5"
            >
              Daftar
            </a>
          </>
        )}
      </div>
    </header>
  );
}