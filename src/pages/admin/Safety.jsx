// src/pages/admin/Safety.jsx
// Admin safety alerts: list, mark resolved, escalate, notes

import { useState, useEffect } from "react";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { COL } from "../../lib/collections";
import { logAdminAction } from "../../lib/adminLog";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminSafety() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    (async () => {
      const { db } = await import("../../firebase");
      const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, COL.safetyAlerts), orderBy("triggeredAt", "desc")));
      setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  const updateAlert = async (alertId, updates) => {
    setActing(alertId);
    try {
      const { db } = await import("../../firebase");
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      await updateDoc(doc(db, COL.safetyAlerts, alertId), {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
      });
      await logAdminAction(user?.uid, "safety_alert_update", alertId, updates);
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, ...updates } : a)));
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Safety Alerts</PageTitle>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Entertainer</th>
              <th>Client</th>
              <th>Location</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td>{a.triggeredAt?.toDate?.()?.toLocaleString() ?? "—"}</td>
                <td>{a.entertainerId}</td>
                <td>{a.clientName || a.clientId}</td>
                <td>{a.location ? `${a.location.lat?.toFixed(4)}, ${a.location.lng?.toFixed(4)}` : "—"}</td>
                <td>{a.resolutionStatus || a.status || "pending"}</td>
                <td><NotesText>{a.adminNotes || "—"}</NotesText></td>
                <td>
                  {acting === a.id ? "…" : (
                    <>
                      {(a.resolutionStatus || a.status) !== "resolved" && (
                        <button type="button" onClick={() => updateAlert(a.id, { resolutionStatus: "resolved" })}>Mark resolved</button>
                      )}
                      <button type="button" onClick={() => updateAlert(a.id, { escalated: true })}>Escalate</button>
                    </>
                  )}
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

const NotesText = styled.span`
  max-width: 150px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
