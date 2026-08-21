"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import AuthLayout from "@/components/AuthLayout";

type Role = "pelanggan" | "mitra";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("pelanggan");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        email,
        phone,
        role,
        createdAt: serverTimestamp(),
      });

      if (role === "mitra") {
        router.push("/register/mitra-profile");
      } else {
        router.push("/discover");
      }
    } catch (err: any) {
      setError(
        err?.code === "auth/email-already-in-use"
          ? "Email ini sudah terdaftar. Coba masuk."
          : "Gagal mendaftar. Periksa kembali data kamu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Gabung dengan SELASAR"
      quote="Dari dapur usahamu ke piring orang lain — sebelum makanan itu jadi sampah."
    >
      <h1 className="font-display text-3xl font-semibold text-ink">
        Buat akun
      </h1>
      <p className="text-sm text-ink/60 mt-2">
        Sudah punya akun?{" "}
        <a href="/login" className="text-forest font-semibold underline underline-offset-2">
          Masuk di sini
        </a>
      </p>

      {/* Toggle role */}
      <div className="mt-6 grid grid-cols-2 gap-2 bg-white border border-line rounded-full p-1">
        <button
          type="button"
          onClick={() => setRole("pelanggan")}
          className={`rounded-full py-2 text-sm font-semibold transition-colors ${
            role === "pelanggan"
              ? "bg-forest text-white"
              : "text-ink/60"
          }`}
        >
          Pelanggan
        </button>
        <button
          type="button"
          onClick={() => setRole("mitra")}
          className={`rounded-full py-2 text-sm font-semibold transition-colors ${
            role === "mitra" ? "bg-forest text-white" : "text-ink/60"
          }`}
        >
          Mitra Usaha
        </button>
      </div>
      <p className="text-xs text-ink/50 mt-2">
        {role === "pelanggan"
          ? "Untuk kamu yang ingin klaim makanan berlebih dengan harga hemat."
          : "Untuk pelaku usaha (resto, kedai, katering) yang punya makanan sisa layak konsumsi."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            {role === "mitra" ? "Nama penanggung jawab" : "Nama lengkap"}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Nomor HP / WhatsApp
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            placeholder="Minimal 6 karakter"
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
          {loading
            ? "Memproses..."
            : role === "mitra"
            ? "Daftar sebagai Mitra"
            : "Daftar sebagai Pelanggan"}
        </button>
      </form>
    </AuthLayout>
  );
}
