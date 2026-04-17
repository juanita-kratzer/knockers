// Phase 5: Testimonials — list and approve (admin)

import { useState, useEffect } from "react";
import styled from "styled-components";
import { COL } from "../../lib/collections";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminTestimonials() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const load = async () => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    const { db } = await import("../../firebase");
    const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
    const snap = await getDocs(query(collection(db, COL.testimonials), orderBy("createdAt", "desc")));
    setList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const setApproved = async (id, approved) => {
    setActing(id);
    try {
      const { db } = await import("../../firebase");
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, COL.testimonials, id), { approved: !!approved });
      await load();
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Testimonials</PageTitle>
      <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "0.9rem" }}>
        Approve testimonials to show on marketing pages. Only approved items are visible to the public.
      </p>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Content</th>
              <th>Approved</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td>{t.role || "—"}</td>
                <td>{t.content ? `${t.content.slice(0, 80)}${t.content.length > 80 ? "…" : ""}` : "—"}</td>
                <td>{t.approved ? "Yes" : "No"}</td>
                <td>{t.createdAt?.toDate?.()?.toLocaleDateString() ?? "—"}</td>
                <td>
                  {acting === t.id ? "…" : (
                    <button
                      type="button"
                      onClick={() => setApproved(t.id, !t.approved)}
                    >
                      {t.approved ? "Unapprove" : "Approve"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {list.length === 0 && <Empty>No testimonials. Users can submit via a future form.</Empty>}
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
  button { background: none; border: none; color: ${({ theme }) => theme.primary}; cursor: pointer; font-size: 0.85rem; }
`;
const Empty = styled.p`
  margin: 24px 0 0;
  color: ${({ theme }) => theme.muted};
  font-size: 0.9rem;
`;
