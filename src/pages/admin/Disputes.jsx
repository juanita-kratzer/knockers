// src/pages/admin/Disputes.jsx
// Admin disputes: list, status (pending | resolved | dismissed), actions

import { useState, useEffect } from "react";
import styled from "styled-components";
import { COL } from "../../lib/collections";
import { adminResolveDispute } from "../../lib/adminCallables";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [message, setMessage] = useState(null);

  const loadDisputes = async () => {
    if (!isFirebaseConfigured()) return;
    const { db } = await import("../../firebase");
    const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
    const snap = await getDocs(query(collection(db, COL.disputes), orderBy("createdAt", "desc")));
    setDisputes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    loadDisputes().finally(() => setLoading(false));
  }, []);

  const resolveWith = async (disputeId, outcome, notes) => {
    setActing(disputeId);
    setMessage(null);
    try {
      await adminResolveDispute(disputeId, outcome, notes);
      setMessage("Done");
      await loadDisputes();
    } catch (e) {
      setMessage(e.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Disputes</PageTitle>
      {message && <Message>{message}</Message>}
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Reporter</th>
              <th>Target / Rating</th>
              <th>Reason</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => (
              <tr key={d.id}>
                <td>{d.status || "pending"}</td>
                <td>{d.reporterId || "—"}</td>
                <td>{d.ratingId || d.targetId || "—"}</td>
                <td><ReasonText>{d.reason || d.disputeReason || "—"}</ReasonText></td>
                <td>{d.createdAt?.toDate?.()?.toLocaleDateString() ?? "—"}</td>
                <td>
                  {acting === d.id ? "…" : ((d.status === "pending" || !d.status) && (
                    <>
                      <button type="button" onClick={() => resolveWith(d.id, "uphold")}>Uphold</button>
                      <button type="button" onClick={() => resolveWith(d.id, "dismiss")}>Dismiss</button>
                      <button type="button" onClick={() => resolveWith(d.id, "modify")}>Modify</button>
                    </>
                  ))}
                </td>
              </tr>
            ))}
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
  button { background: none; border: none; cursor: pointer; color: ${({ theme }) => theme.primary}; margin-right: 8px; }
`;

const ReasonText = styled.span`
  max-width: 200px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
