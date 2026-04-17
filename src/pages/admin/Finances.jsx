// src/pages/admin/Finances.jsx
// Admin finances: earnings, fees, refunds, balances, Stripe status, adjust balance, waive fee

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { COL } from "../../lib/collections";
import { adjustEntertainerBalance } from "../../lib/adminCallables";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminFinances() {
  const [entertainers, setEntertainers] = useState([]);
  const [finances, setFinances] = useState({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    if (!isFirebaseConfigured()) return;
    const { db } = await import("../../firebase");
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const entSnap = await getDocs(collection(db, COL.entertainers));
    const list = entSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setEntertainers(list);
    const finMap = {};
    for (const e of list) {
      const qSnap = await getDocs(query(collection(db, COL.finances), where("ownerId", "==", e.id)));
      const total = qSnap.docs.reduce((s, d) => s + (d.data().amountCents || 0), 0);
      finMap[e.id] = { totalCents: total, docs: qSnap.docs.length };
    }
    setFinances(finMap);
  };

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    load().finally(() => setLoading(false));
  }, []);

  const handleAdjust = async (entertainerId, deltaCents) => {
    setActing(entertainerId);
    setMessage(null);
    try {
      await adjustEntertainerBalance(entertainerId, deltaCents, "Admin adjustment");
      setMessage("Balance updated");
      await load();
    } catch (e) {
      setMessage(e.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Finances</PageTitle>
      {message && <Message>{message}</Message>}
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Entertainer</th>
              <th>Stripe</th>
              <th>Balance (cents)</th>
              <th>Earnings (sample)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entertainers.map((e) => {
              const balanceCents = e.balanceCents ?? 0;
              const fin = finances[e.id];
              return (
                <tr key={e.id}>
                  <td><Link to={`/talent/${e.id}`} target="_blank">{e.displayName || e.id}</Link></td>
                  <td>{e.stripe?.accountId ? "Connected" : "—"}</td>
                  <td>{balanceCents} {balanceCents < 0 && <Negative>(owed)</Negative>}</td>
                  <td>{fin ? (fin.totalCents / 100).toFixed(2) : "—"}</td>
                  <td>
                    {acting === e.id ? "…" : (
                      <>
                        <button type="button" onClick={() => handleAdjust(e.id, -3000)}>−$30</button>
                        <button type="button" onClick={() => handleAdjust(e.id, 3000)}>+$30</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}

const PageTitle = styled.h1`
  margin: 0 0 16px;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.text};
`;

const Message = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.primary};
  font-size: 0.9rem;
`;

const Negative = styled.span`
  color: #ef4444;
`;

const TableWrap = styled.div`
  overflow-x: auto;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid ${({ theme }) => theme.border}; }
  th { color: ${({ theme }) => theme.muted}; font-weight: 600; }
  td { color: ${({ theme }) => theme.text}; }
  tr:last-child td { border-bottom: none; }
  a { color: ${({ theme }) => theme.primary}; }
  button { background: none; border: none; cursor: pointer; color: ${({ theme }) => theme.primary}; margin-right: 8px; }
`;
