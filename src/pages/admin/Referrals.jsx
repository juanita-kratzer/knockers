// Phase 5: Referral tracking

import { useState, useEffect } from "react";
import styled from "styled-components";
import { COL } from "../../lib/collections";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    (async () => {
      const { db } = await import("../../firebase");
      const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, COL.referrals), orderBy("createdAt", "desc")));
      setReferrals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    })().finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Referrals</PageTitle>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Referrer</th>
              <th>Referred user</th>
              <th>Code</th>
              <th>Reward</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((r) => (
              <tr key={r.id}>
                <td><code>{r.referrerId?.slice(0, 8)}…</code></td>
                <td><code>{r.referredUserId?.slice(0, 8)}…</code></td>
                <td>{r.referralCode || "—"}</td>
                <td>{r.rewardStatus || "pending"}</td>
                <td>{r.createdAt?.toDate?.()?.toLocaleString() ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {referrals.length === 0 && <Empty>No referrals yet.</Empty>}
    </div>
  );
}

const PageTitle = styled.h1`
  margin: 0 0 16px;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.text};
`;
const TableWrap = styled.div` overflow-x: auto; `;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid ${({ theme }) => theme.border}; }
  th { color: ${({ theme }) => theme.muted}; font-weight: 600; }
`;
const Empty = styled.p`
  margin: 24px 0 0;
  color: ${({ theme }) => theme.muted};
  font-size: 0.9rem;
`;
