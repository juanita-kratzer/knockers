// src/pages/admin/Dashboard.jsx
// Admin dashboard with platform metrics

import { useState, useEffect } from "react";
import styled from "styled-components";
import { COL } from "../../lib/collections";
import { logger } from "../../lib/logger";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    activeEntertainers: 0,
    bookingsToday: 0,
    bookingsTotal: 0,
    revenue: 0,
    cancellations: 0,
    safetyAlerts: 0,
    disputesOpen: 0,
    bans: 0,
    leadsToday: 0,
    leadsTotal: 0,
    leadsConverted: 0,
    topSource: "—",
    referralsThisMonth: 0,
    referralsTotal: 0,
    iapRevenueCents: 0,
    stripeRevenueCents: 0,
    totalRevenueCents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { db } = await import("../../firebase");
        const { collection, query, where, getDocs, orderBy, limit } = await import("firebase/firestore");

        const [
          usersSnap,
          entertainersSnap,
          bookingsSnap,
          alertsSnap,
          disputesSnap,
          bannedSnap,
          leadsSnap,
          referralsSnap,
          feesSnap,
        ] = await Promise.all([
          getDocs(collection(db, COL.users)),
          getDocs(collection(db, COL.entertainers)),
          getDocs(query(collection(db, COL.bookings), orderBy("createdAt", "desc"), limit(500))),
          getDocs(collection(db, COL.safetyAlerts)),
          getDocs(collection(db, COL.disputes)),
          getDocs(query(collection(db, COL.users), where("isBanned", "==", true))),
          getDocs(collection(db, COL.leads)).catch(() => ({ docs: [] })),
          getDocs(collection(db, COL.referrals)).catch(() => ({ docs: [] })),
          getDocs(collection(db, COL.fees)).catch(() => ({ docs: [] })),
        ]);

        const bookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const cancelled = bookings.filter((b) => b.status === "cancelled").length;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const bookingsToday = bookings.filter((b) => {
          const t = b.createdAt?.toDate?.() ?? (b.createdAt ? new Date(b.createdAt) : null);
          return t && t >= todayStart;
        }).length;
        let revenue = 0;
        bookings.forEach((b) => {
          if (b.status === "completed" && b.platformFeeCents) revenue += (b.platformFeeCents || 0) / 100;
          else if (b.status === "completed" && !b.platformFeeCents && b.totalAmount) revenue += 30;
        });

        const disputesOpen = disputesSnap.docs.filter((d) => d.data().status === "pending").length;

        const leads = leadsSnap.docs.map((d) => d.data());
        const leadsToday = leads.filter((l) => {
          const t = l.createdAt?.toDate?.() ?? l.createdAt;
          return t && new Date(t) >= todayStart;
        }).length;
        const leadsConverted = leads.filter((l) => l.status === "converted").length;
        const sourceCounts = {};
        leads.forEach((l) => {
          const s = l.source || "other";
          sourceCounts[s] = (sourceCounts[s] || 0) + 1;
        });
        const topSource = Object.keys(sourceCounts).length
          ? Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0][0]
          : "—";

        const referrals = referralsSnap.docs.map((d) => d.data());
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const referralsThisMonth = referrals.filter((r) => {
          const t = r.createdAt?.toDate?.() ?? r.createdAt;
          return t && new Date(t) >= monthStart;
        }).length;

        const feesList = (feesSnap?.docs ?? []).map((d) => d.data());
        let iapRevenueCents = 0;
        let stripeRevenueCents = 0;
        feesList.forEach((f) => {
          const cents = f.amountCents ?? 0;
          if (f.type === "signup_iap") iapRevenueCents += cents;
          if (f.type === "booking_stripe") stripeRevenueCents += cents;
        });

        setMetrics((m) => ({
          ...m,
          activeUsers: usersSnap.size,
          activeEntertainers: entertainersSnap.size,
          bookingsToday,
          bookingsTotal: bookingsSnap.size,
          revenue,
          cancellations: cancelled,
          safetyAlerts: alertsSnap.size,
          disputesOpen,
          bans: bannedSnap.size,
          leadsToday,
          leadsTotal: leadsSnap.docs.length,
          leadsConverted,
          topSource,
          referralsThisMonth,
          referralsTotal: referralsSnap.docs.length,
          iapRevenueCents,
          stripeRevenueCents,
          totalRevenueCents: iapRevenueCents + stripeRevenueCents,
        }));
      } catch (e) {
        logger.error("Admin dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <PageTitle>Loading metrics…</PageTitle>;
  }

  return (
    <div>
      <PageTitle>Dashboard</PageTitle>
      <Grid>
        <Card>
          <CardLabel>Active users</CardLabel>
          <CardValue>{metrics.activeUsers}</CardValue>
        </Card>
        <Card>
          <CardLabel>Active entertainers</CardLabel>
          <CardValue>{metrics.activeEntertainers}</CardValue>
        </Card>
        <Card>
          <CardLabel>Bookings today</CardLabel>
          <CardValue>{metrics.bookingsToday}</CardValue>
        </Card>
        <Card>
          <CardLabel>Bookings (sample)</CardLabel>
          <CardValue>{metrics.bookingsTotal}</CardValue>
        </Card>
        <Card>
          <CardLabel>Revenue (sample)</CardLabel>
          <CardValue>${metrics.revenue.toFixed(2)}</CardValue>
        </Card>
        <Card>
          <CardLabel>Cancellations (sample)</CardLabel>
          <CardValue>{metrics.cancellations}</CardValue>
        </Card>
        <Card>
          <CardLabel>Safety alerts</CardLabel>
          <CardValue>{metrics.safetyAlerts}</CardValue>
        </Card>
        <Card>
          <CardLabel>Disputes (pending)</CardLabel>
          <CardValue>{metrics.disputesOpen}</CardValue>
        </Card>
        <Card>
          <CardLabel>Banned users</CardLabel>
          <CardValue>{metrics.bans}</CardValue>
        </Card>
      </Grid>

      <SectionTitle>Revenue (Phase 6)</SectionTitle>
      <Grid>
        <Card>
          <CardLabel>IAP revenue</CardLabel>
          <CardValue>${((metrics.iapRevenueCents || 0) / 100).toFixed(2)}</CardValue>
        </Card>
        <Card>
          <CardLabel>Stripe revenue</CardLabel>
          <CardValue>${((metrics.stripeRevenueCents || 0) / 100).toFixed(2)}</CardValue>
        </Card>
        <Card>
          <CardLabel>Total revenue</CardLabel>
          <CardValue>${((metrics.totalRevenueCents || 0) / 100).toFixed(2)}</CardValue>
        </Card>
      </Grid>

      <SectionTitle>Growth (Phase 5)</SectionTitle>
      <Grid>
        <Card>
          <CardLabel>Leads today</CardLabel>
          <CardValue>{metrics.leadsToday}</CardValue>
        </Card>
        <Card>
          <CardLabel>Leads total</CardLabel>
          <CardValue>{metrics.leadsTotal}</CardValue>
        </Card>
        <Card>
          <CardLabel>Leads converted</CardLabel>
          <CardValue>{metrics.leadsConverted}</CardValue>
        </Card>
        <Card>
          <CardLabel>Conversion rate</CardLabel>
          <CardValue>
            {metrics.leadsTotal
              ? `${((metrics.leadsConverted / metrics.leadsTotal) * 100).toFixed(1)}%`
              : "—"}
          </CardValue>
        </Card>
        <Card>
          <CardLabel>Top source</CardLabel>
          <CardValue>{metrics.topSource}</CardValue>
        </Card>
        <Card>
          <CardLabel>Referrals this month</CardLabel>
          <CardValue>{metrics.referralsThisMonth}</CardValue>
        </Card>
        <Card>
          <CardLabel>Referrals total</CardLabel>
          <CardValue>{metrics.referralsTotal}</CardValue>
        </Card>
      </Grid>
    </div>
  );
}

const PageTitle = styled.h1`
  margin: 0 0 20px;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.text};
`;

const SectionTitle = styled.h2`
  margin: 28px 0 16px;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.muted};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  padding: 16px;
`;

const CardLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  margin-bottom: 4px;
`;

const CardValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;
