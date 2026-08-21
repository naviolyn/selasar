"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon Leaflet yang suka pecah kalau dibundle Webpack/Next.
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type LatLng = { lat: number; lng: number };

// Sengaja pakai Leaflet murni (bukan react-leaflet), karena react-leaflet
// masih pakai Context.Consumer internal yang bentrok dengan React 19
// (bawaan Next.js 15) dan bikin error "render is not a function".
export default function LocationPicker({
  position,
  onChange,
}: {
  position: LatLng;
  onChange: (pos: LatLng) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Simpan callback terbaru di ref supaya listener Leaflet (yang cuma dipasang
  // sekali) selalu manggil versi terbaru dari onChange, bukan versi basi.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Inisialisasi peta sekali aja saat mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [position.lat, position.lng],
      zoom: 16,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([position.lat, position.lng], {
      draggable: true,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChangeRef.current({ lat: pos.lat, lng: pos.lng });
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Kadang tinggi container belum kehitung bener pas render pertama
    // (misal peta ada di dalam flex/hidden container) — invalidateSize benerin itu.
    const t = setTimeout(() => map.invalidateSize(), 150);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronkan posisi kalau berubah dari luar (misal habis klik "gunakan lokasi saya")
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const current = markerRef.current.getLatLng();
    if (current.lat === position.lat && current.lng === position.lng) return;

    markerRef.current.setLatLng([position.lat, position.lng]);
    mapRef.current.setView(
      [position.lat, position.lng],
      mapRef.current.getZoom()
    );
  }, [position.lat, position.lng]);

  return (
    <div
      ref={containerRef}
      className="rounded-card overflow-hidden border border-line"
      style={{ height: "220px", width: "100%" }}
    />
  );
}
