// Phase 5: In-app promotions

import { useState, useEffect } from "react";
import styled from "styled-components";
import { COL } from "../../lib/collections";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    (async () => {
      const { db } = await import("../../firebase");
      const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, COL.promotions), orderBy("expiry", "desc")));
      setPromotions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    })().finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Promotions</PageTitle>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Banner</th>
              <th>Type</th>
              <th>Value</th>
              <th>Target</th>
              <th>Expiry</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr key={p.id}>
                <td>{p.title || "—"}</td>
                <td>{p.bannerText ? `${p.bannerText.slice(0, 40)}…` : "—"}</td>
                <td>{p.discountType || "—"}</td>
                <td>{p.value != null ? (p.discountType === "percentage" ? `${p.value}%` : `$${p.value}`) : "—"}</td>
                <td>{p.targetRole || "both"}</td>
                <td>{p.expiry?.toDate?.()?.toLocaleDateString() ?? "—"}</td>
                <td>{p.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {promotions.length === 0 && <Empty>No promotions. Add via Firestore or a future form.</Empty>}
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
