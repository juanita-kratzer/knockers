// Phase 5: Campaign / influencer tracking

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { COL } from "../../lib/collections";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;
const PLATFORMS = ["TikTok", "Insta", "DatingApp", "Event", "Street", "Other"];

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    const { db } = await import("../../firebase");
    const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
    const snap = await getDocs(query(collection(db, COL.campaigns), orderBy("startDate", "desc")));
    setCampaigns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Campaigns</PageTitle>
      {message && <Message>{message}</Message>}
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Platform</th>
              <th>Code</th>
              <th>Start</th>
              <th>End</th>
              <th>Budget</th>
              <th>Manager</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.name || "—"}</td>
                <td>{c.platform || "—"}</td>
                <td><code>{c.code || "—"}</code></td>
                <td>{c.startDate?.toDate?.()?.toLocaleDateString() ?? "—"}</td>
                <td>{c.endDate?.toDate?.()?.toLocaleDateString() ?? "—"}</td>
                <td>{c.budget != null ? `$${c.budget}` : "—"}</td>
                <td>{c.manager || "—"}</td>
                <td>{c.isActive ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {campaigns.length === 0 && <Empty>No campaigns. Add via Firestore or a future form.</Empty>}
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
  font-size: 0.9rem;
  color: ${({ theme }) => theme.primary};
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
