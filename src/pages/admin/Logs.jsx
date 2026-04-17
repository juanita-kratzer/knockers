// src/pages/admin/Logs.jsx
// Admin audit logs: action, actorId, targetId, timestamp, metadata

import { useState, useEffect } from "react";
import styled from "styled-components";
import { COL } from "../../lib/collections";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLogs([]);
      setLoading(false);
      return;
    }
    (async () => {
      const { db } = await import("../../firebase");
      const { collection, getDocs, orderBy, query, limit } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, COL.adminLogs), orderBy("timestamp", "desc"), limit(200)));
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Audit Logs</PageTitle>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.timestamp?.toDate?.()?.toLocaleString() ?? "—"}</td>
                <td>{l.action}</td>
                <td>{l.actorId}</td>
                <td>{l.targetId || "—"}</td>
                <td><MetaText>{JSON.stringify(l.metadata || {})}</MetaText></td>
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
`;

const MetaText = styled.span`
  max-width: 250px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
  font-size: 0.8rem;
`;
