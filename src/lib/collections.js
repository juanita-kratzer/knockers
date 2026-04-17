// src/lib/collections.js
// Centralized Firestore collection names and path helpers

const isDev = import.meta.env.DEV;
const suffix = isDev ? "_dev" : "";

// Top-level collections
export const COL = {
  users: `users${suffix}`,
  entertainers: `entertainers${suffix}`,
  bookings: `bookings${suffix}`,
  reviews: `reviews${suffix}`,
  ratings: `ratings${suffix}`,
  messages: `messages${suffix}`,
  userPosts: `userPosts${suffix}`,       // ASAP requests from users
  safetyAlerts: `safetyAlerts${suffix}`, // Emergency safety alerts
  disputes: `disputes${suffix}`,          // Review disputes
  blockedContacts: `blockedContacts${suffix}`, // Blocked users/entertainers
  favorites: `favorites${suffix}`,        // Saved entertainers/users
  payments: `payments${suffix}`,          // Payment records
  finances: `finances${suffix}`,          // Entertainer earnings
  listings: `listings${suffix}`,           // Client job listings (entertainers apply)
  listingApplications: `listingApplications${suffix}`,
  adminLogs: `adminLogs${suffix}`,         // Admin audit trail
  // Phase 5: Growth & acquisition
  leads: `leads${suffix}`,
  referrals: `referrals${suffix}`,
  campaigns: `campaigns${suffix}`,
  promotions: `promotions${suffix}`,
  testimonials: `testimonials${suffix}`,
  // Phase 6: Fee accounting
  fees: `fees${suffix}`,
};

// Subcollections
export const SUBCOL = {
  messages: "messages",
  photos: "photos",
  availability: "availability",
  services: "services",
  rules: "rules",
};

// Path helpers
export const paths = {
  // Users
  user: (uid) => `${COL.users}/${uid}`,

  // Entertainers
  entertainer: (id) => `${COL.entertainers}/${id}`,
  entertainerByUser: (uid) => `${COL.entertainers}/${uid}`,
  entertainerServices: (id) => `${COL.entertainers}/${id}/${SUBCOL.services}`,

  // Bookings
  booking: (id) => `${COL.bookings}/${id}`,
  bookingMessages: (bookingId) => `${COL.bookings}/${bookingId}/${SUBCOL.messages}`,

  // Reviews/Ratings
  review: (id) => `${COL.reviews}/${id}`,
  rating: (id) => `${COL.ratings}/${id}`,

  // User posts
  userPost: (id) => `${COL.userPosts}/${id}`,

  // Listings
  listing: (id) => `${COL.listings}/${id}`,
  listingApplication: (id) => `${COL.listingApplications}/${id}`,

  // Safety
  safetyAlert: (id) => `${COL.safetyAlerts}/${id}`,

  // Admin
  adminLog: (id) => `${COL.adminLogs}/${id}`,

  // Phase 5
  lead: (id) => `${COL.leads}/${id}`,
  referral: (id) => `${COL.referrals}/${id}`,
  campaign: (id) => `${COL.campaigns}/${id}`,
  promotion: (id) => `${COL.promotions}/${id}`,
  testimonial: (id) => `${COL.testimonials}/${id}`,
  fee: (id) => `${COL.fees}/${id}`,
};

// Storage paths
export const storagePaths = {
  entertainerPhoto: (entertainerId, filename) =>
    `entertainers/${entertainerId}/photos/${filename}`,
  profilePhoto: (uid, filename) =>
    `users/${uid}/profile/${filename}`,
  idDocument: (uid, filename) =>
    `users/${uid}/verification/${filename}`,
  policeCheck: (uid, filename) =>
    `users/${uid}/police-check/${filename}`,
};
