// src/mock.js
export const talentList = [
  {
    id: "t1",
    name: "Ava Blaze",
    ratePerHour: 220,
    rating: 4.9,
    services: ["Spicy Waitressing", "Burlesque", "Show (G/G)"],
    city: "Gold Coast",
    hero: "/assets/placeholder-1.jpg",
    bio: "High-energy showgirl with 5+ years of events experience.",
  },
  {
    id: "t2",
    name: "Luna Noir",
    ratePerHour: 200,
    rating: 4.8,
    services: ["Spicy Waitressing", "Promo / Brand"],
    city: "Brisbane",
    hero: "/assets/placeholder-2.jpg",
    bio: "Professional, fun, and reliable entertainment for bucks & clubs.",
  },
];

export const bookings = [
  {
    id: "b1",
    talentId: "t1",
    clientId: "c1",
    status: "requested", // requested|accepted|paid|completed|canceled
    when: "2025-10-12T19:00:00+10:00",
    hours: 2,
    priceTotal: 440,
    location: "Surfers Paradise",
  },
];
