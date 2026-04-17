// src/pages/admin/Bookings.jsx
// Admin bookings oversight: status, client, entertainer, amounts, actions
// TODO: Direct Firestore writes from the client rely on security rules. Migrate to callables.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { COL } from "../../lib/collections";
import { logAdminAction } from "../../lib/adminLog";
import { adminRefundBooking, adminFreezeBooking } from "../../lib/adminCallables";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [message, setMessage] = useState(null);

  const loadBookings = async () => {
    if (!isFirebaseConfigured()) return;
    const { db } = await import("../../firebase");
    const { collection, getDocs, orderBy, query, limit } = await import("firebase/firestore");
    const snap = await getDocs(query(collection(db, COL.bookings), orderBy("createdAt", "desc"), limit(200)));
    setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    loadBookings().finally(() => setLoading(false));
  }, []);

  const forceCancel = async (bookingId) => {
    setActing(bookingId);
    setMessage(null);
    try {
      const { db } = await import("../../firebase");
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      await updateDoc(doc(db, COL.bookings, bookingId), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: "admin",
        adminCancelledBy: user?.uid,
      });
      await logAdminAction(user?.uid, "force_cancel_booking", bookingId, {});
      setMessage("Cancelled");
      await loadBookings();
    } catch (e) {
      setMessage(e.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  const handleRefund = async (bookingId, refundType) => {
    setActing(bookingId);
    setMessage(null);
    try {
      await adminRefundBooking(bookingId, refundType, "Admin refund");
      setMessage("Refunded");
      await loadBookings();
    } catch (e) {
      setMessage(e.message || "Refund failed");
    } finally {
      setActing(null);
    }
  };

  const handleFreeze = async (bookingId, freeze) => {
    setActing(bookingId);
    setMessage(null);
    try {
      await adminFreezeBooking(bookingId, freeze, freeze ? "Under review" : "");
      setMessage(freeze ? "Frozen" : "Unfrozen");
      await loadBookings();
    } catch (e) {
      setMessage(e.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageTitle>Bookings</PageTitle>
      {message && <Message>{message}</Message>}
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Frozen</th>
              <th>Client</th>
              <th>Entertainer</th>
              <th>Total / Deposit</th>
              <th>Platform fee</th>
              <th>Arrival code</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.status}</td>
                <td>{b.isFrozen ? "Yes" : "—"}</td>
                <td><Link to={`/admin/users`}>{b.clientName || b.clientId}</Link></td>
                <td><Link to={`/talent/${b.entertainerId}`} target="_blank">{b.entertainerName || b.entertainerId}</Link></td>
                <td>${(b.totalAmount || 0)} / ${(b.depositAmount || 0)}</td>
                <td>${((b.platformFeeCents || 0) / 100).toFixed(2)}</td>
                <td>{b.arrivalCode ? "✓" : "—"}</td>
                <td>{b.createdAt?.toDate?.()?.toLocaleDateString() ?? "—"}</td>
                <td>
                  {acting === b.id ? "…" : (
                    <Actions>
                      {b.status !== "cancelled" && b.status !== "completed" && b.status !== "refunded" && (
                        <>
                          <button type="button" onClick={() => forceCancel(b.id)}>Force cancel</button>
                          {b.paymentStatus === "DEPOSIT_PAID" && (
                            <>
                              <button type="button" onClick={() => handleRefund(b.id, "deposit")}>Refund deposit</button>
                              <button type="button" onClick={() => handleRefund(b.id, "full")}>Refund full</button>
                            </>
                          )}
                          <button type="button" onClick={() => handleFreeze(b.id, !b.isFrozen)}>
                            {b.isFrozen ? "Unfreeze" : "Freeze"}
                          </button>
                        </>
                      )}
                    </Actions>
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

const Message = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.primary};
  font-size: 0.9rem;
`;

const Actions = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
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
  button { background: none; border: none; cursor: pointer; color: ${({ theme }) => theme.primary}; font-size: 0.8rem; }
`;
