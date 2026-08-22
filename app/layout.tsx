import type { Metadata } from "next";
import Script from "next/script";
import {  Plus_Jakarta_Sans, IBM_Plex_Mono, Merriweather } from "next/font/google";
import "./globals.css";

const fraunces = Merriweather({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "900", "900"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "SELASAR — Selamatkan makanan sebelum jadi sampah",
  description:
    "SELASAR menghubungkan makanan berlebih dari pelaku usaha di Medan dengan orang yang membutuhkan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body
        className={`${fraunces.variable} ${jakarta.variable} ${plexMono.variable} font-body`}
      >
        {children}
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}