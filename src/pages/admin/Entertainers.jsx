// src/pages/admin/Entertainers.jsx
// Admin entertainers: list, Stripe status, earnings, strikes, verification, actions

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { useAdminUsers, adminBanUser, adminSuspendUser } from "../../hooks/useAdminUsers";
import { COL } from "../../lib/collections";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminEntertainers() {
  const { user } = useAuth();
  const { users } = useAdminUsers();
  const [entertainers, setEntertainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setEntertainers([]);
      setLoading(false);
      return;
    }
    (async () => {
      const { db } = await import("../../firebase");
      const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, COL.entertainers), orderBy("createdAt", "desc")));
      setEntertainers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

  const act = async (fn, id, ...args) => {
    setActing(id);
    try {
      await fn(user.uid, id, ...args);
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Entertainers</PageTitle>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Stripe</th>
              <th>Balance</th>
              <th>Strikes</th>
              <th>Reviews</th>
              <th>Verification</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entertainers.map((e) => {
              const u = userMap[e.id];
              const balanceCents = e.balanceCents ?? 0;
              const strikes = e.strikes ?? u?.strikes ?? 0;
              const suspended = e.isSuspended ?? u?.isSuspended;
              const banned = e.isBanned ?? u?.isBanned;
              return (
                <tr key={e.id}>
                  <td>
                    <Link to={`/talent/${e.id}`} target="_blank">{e.displayName || e.id}</Link>
                  </td>
                  <td>{e.stripe?.accountId ? "Connected" : "—"}</td>
                  <td>${(balanceCents / 100).toFixed(2)} {balanceCents < 0 && "(owed)"}</td>
                  <td>{strikes}</td>
                  <td>{e.totalRatings ?? 0}</td>
                  <td>{e.profileType === "hard" ? "Police Check ✓" : "Standard"}</td>
                  <td>
                    {acting === e.id ? "…" : (
                      <>
                        {!banned && <button type="button" onClick={() => act(adminBanUser, e.id)}>Ban</button>}
                        {!suspended && <button type="button" onClick={() => act(adminSuspendUser, e.id)}>Suspend</button>}
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
  button { background: none; border: none; cursor: pointer; color: ${({ theme }) => theme.primary}; font-size: 0.85rem; margin-right: 8px; }
`;
