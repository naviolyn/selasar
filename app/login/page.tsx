"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import AuthLayout from "@/components/AuthLayout";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      const role = userDoc.exists() ? userDoc.data().role : "pelanggan";
      router.push(role === "mitra" ? "/Mitra/Dashboard" : "/discover");
    } catch (err: any) {
      setError("Email atau password salah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Selamat datang kembali"
      quote="Setiap kali kamu masuk, ada makanan yang lebih dekat untuk diselamatkan hari ini."
    >
      <h1 className="font-display text-3xl font-semibold text-ink">Masuk</h1>
      <p className="text-sm text-ink/60 mt-2">
        Belum punya akun?{" "}
        <a href="/register" className="text-forest font-semibold underline underline-offset-2">
          Daftar di sini
        </a>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
          />
        </div>

        {error && (
          <p className="text-sm text-clay bg-clay-light rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-forest text-white font-semibold py-3 text-sm hover:bg-forest-dark transition-colors disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </AuthLayout>
  );
}
