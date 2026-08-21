import { Timestamp } from "firebase/firestore";

export function getMinutesRemaining(deadline?: Timestamp | null | Date | string): number {
  if (!deadline) return 0;

  // Jika memiliki metode toDate (kemungkinan Timestamp dari Firestore)
  const date =
    typeof (deadline as any)?.toDate === "function"
      ? (deadline as any).toDate()
      : deadline instanceof Date
      ? deadline
      : new Date(deadline as any);

  if (isNaN(date.getTime())) return 0;

  const diffMs = date.getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / 60000));
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatSisaWaktu(minutes: number): string {
  if (minutes < 60) return `${minutes} menit lagi`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} jam lagi` : `${hours} jam ${rest} menit lagi`;
}