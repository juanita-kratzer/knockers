/**
 * Phase 5: Admin leads CRM — load leads, update lead, export.
 */
import { useState, useEffect, useCallback } from "react";
import { COL } from "../lib/collections";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export function useAdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { db } = await import("../firebase");
      const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, COL.leads), orderBy("createdAt", "desc")));
      setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError(e.message);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateLead = async (leadId, updates) => {
    if (!isFirebaseConfigured()) return;
    const { db } = await import("../firebase");
    const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
    const ref = doc(db, COL.leads, leadId);
    const payload = { ...updates, updatedAt: serverTimestamp() };
    if (updates.status === "contacted") payload.contactedAt = serverTimestamp();
    await updateDoc(ref, payload);
    await load();
  };

  const createLead = async (data) => {
    if (!isFirebaseConfigured()) return null;
    const { db } = await import("../firebase");
    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
    const docRef = await addDoc(collection(db, COL.leads), {
      name: data.name || "",
      phone: data.phone || "",
      email: data.email || "",
      source: data.source || "other",
      city: data.city || "",
      notes: data.notes || "",
      status: data.status || "new",
      assignedTo: data.assignedTo || null,
      campaignId: data.campaignId || null,
      followUpAt: data.followUpAt || null,
      contactedAt: null,
      createdAt: serverTimestamp(),
      marketingOptIn: data.marketingOptIn === true,
    });
    await load();
    return docRef.id;
  };

  return { leads, loading, error, refetch: load, updateLead, createLead };
}

export const LEAD_SOURCES = [
  "street",
  "tiktok",
  "dating-app",
  "referral",
  "event",
  "website",
  "instagram",
  "other",
];

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "onboarded",
  "converted",
  "dead",
];
