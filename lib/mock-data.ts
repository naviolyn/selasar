export type Listing = {
  id: string;
  title: string;
  mitraName: string;
  category: string;
  originalPrice: number;
  discountPrice: number;
  quantityLeft: number;
  unit: string;
  pickupEndsInMinutes: number;
  distanceKm: number;
  imageEmoji: string;
};

export const mockListings: Listing[] = [
  {
    id: "1",
    title: "Nasi Box Ayam Penyet",
    mitraName: "Warung Bu Sari",
    category: "Makanan Berat",
    originalPrice: 25000,
    discountPrice: 9000,
    quantityLeft: 6,
    unit: "box",
    pickupEndsInMinutes: 45,
    distanceKm: 1.2,
    imageEmoji: "🍛",
  },
  {
    id: "2",
    title: "Roti & Pastry Campur",
    mitraName: "Medan Bakery Corner",
    category: "Roti",
    originalPrice: 18000,
    discountPrice: 6000,
    quantityLeft: 10,
    unit: "pack",
    pickupEndsInMinutes: 120,
    distanceKm: 2.8,
    imageEmoji: "🥐",
  },
  {
    id: "3",
    title: "Bika Ambon Sisa Produksi",
    mitraName: "Kedai Bika Zulaikha",
    category: "Kue Khas Medan",
    originalPrice: 35000,
    discountPrice: 15000,
    quantityLeft: 4,
    unit: "loyang",
    pickupEndsInMinutes: 20,
    distanceKm: 0.8,
    imageEmoji: "🍰",
  },
  {
    id: "4",
    title: "Paket Sayur & Lauk Katering",
    mitraName: "Dapur Berkah Katering",
    category: "Makanan Berat",
    originalPrice: 20000,
    discountPrice: 7000,
    quantityLeft: 12,
    unit: "porsi",
    pickupEndsInMinutes: 90,
    distanceKm: 3.5,
    imageEmoji: "🍲",
  },
];
