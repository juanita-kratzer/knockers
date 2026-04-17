// src/pages/admin/Reviews.jsx
// Admin reviews: list, hide, restore, remove, warn, strike

import { useState, useEffect } from "react";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { COL } from "../../lib/collections";
import { logAdminAction } from "../../lib/adminLog";
import { adminWarnUser } from "../../hooks/useAdminUsers";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminReviews() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setRatings([]);
      setLoading(false);
      return;
    }
    (async () => {
      const { db } = await import("../../firebase");
      const { collection, getDocs, orderBy, query, limit } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, COL.ratings), orderBy("createdAt", "desc"), limit(100)));
      setRatings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  const setHidden = async (ratingId, hidden) => {
    setActing(ratingId);
    try {
      const { db } = await import("../../firebase");
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, COL.ratings, ratingId), { hiddenByAdmin: hidden });
      await logAdminAction(user?.uid, hidden ? "hide_review" : "restore_review", ratingId, {});
      setRatings((prev) => prev.map((r) => (r.id === ratingId ? { ...r, hiddenByAdmin: hidden } : r)));
    } finally {
      setActing(null);
    }
  };

  const warnReviewer = async (reviewerId) => {
    setActing(reviewerId);
    try {
      await adminWarnUser(user?.uid, reviewerId, "Review abuse");
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Reviews</PageTitle>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Rating</th>
              <th>Review</th>
              <th>Reviewer</th>
              <th>Reviewee</th>
              <th>Booking</th>
              <th>Hidden</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((r) => (
              <tr key={r.id}>
                <td>{r.rating}</td>
                <td><ReviewText>{r.review || "—"}</ReviewText></td>
                <td>{r.reviewerId}</td>
                <td>{r.revieweeId}</td>
                <td>{r.bookingId}</td>
                <td>{r.hiddenByAdmin ? "Yes" : "—"}</td>
                <td>
                  {acting === r.id ? "…" : (
                    <>
                      {r.hiddenByAdmin ? (
                        <button type="button" onClick={() => setHidden(r.id, false)}>Restore</button>
                      ) : (
                        <button type="button" onClick={() => setHidden(r.id, true)}>Hide</button>
                      )}
                      <button type="button" onClick={() => warnReviewer(r.reviewerId)}>Warn reviewer</button>
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

const ReviewText = styled.span`
  max-width: 200px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
