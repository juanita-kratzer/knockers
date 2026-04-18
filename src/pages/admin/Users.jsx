// src/pages/admin/Users.jsx
// Admin users management: list, suspend, ban, warn, reset strikes

import { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import {
  useAdminUsers,
  adminSuspendUser,
  adminBanUser,
  adminResetStrikes,
  adminUnsuspendUser,
  adminUnbanUser,
  adminWaiveVerification,
  adminUnwaiveVerification,
} from "../../hooks/useAdminUsers";
import { setUserRole, issueStrike } from "../../lib/adminCallables";
import LoadingSpinner from "../../components/LoadingSpinner";

const STRIKES_SUSPEND = 3;
const STRIKES_BAN = 5;

export default function AdminUsers() {
  const { user } = useAuth();
  const { users, loading, error, refetch } = useAdminUsers();
  const [acting, setActing] = useState(null);
  const [message, setMessage] = useState(null);

  const act = async (fn, id, ...args) => {
    setActing(id);
    setMessage(null);
    try {
      await fn(user.uid, id, ...args);
      setMessage("Done");
      refetch();
    } catch (e) {
      setMessage(e.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  const handleRoleChange = async (targetUid, newRole) => {
    setActing(targetUid);
    setMessage(null);
    try {
      await setUserRole(targetUid, newRole);
      setMessage("Role updated");
      refetch();
    } catch (e) {
      setMessage(e.message || "Role change failed");
    } finally {
      setActing(null);
    }
  };

  const handleWarn = async (targetUid) => {
    setActing(targetUid);
    setMessage(null);
    try {
      await issueStrike(targetUid, "Admin warning");
      setMessage("Strike issued");
      refetch();
    } catch (e) {
      setMessage(e.message || "Strike failed");
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <PageTitle>Error: {error}</PageTitle>;

  return (
    <div>
      <PageTitle>Users</PageTitle>
      {message && <Message>{message}</Message>}
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Verified</th>
              <th>Role</th>
              <th>Profile</th>
              <th>Strikes</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const created = u.createdAt?.toDate?.() ?? (u.createdAt ? new Date(u.createdAt) : null);
              const suspended = u.isSuspended === true;
              const banned = u.isBanned === true;
              const strikes = u.strikes ?? 0;
              const verified = u.verificationFeePaid === true || !!u.verificationFeeWaivedBy;
              return (
                <tr key={u.id}>
                  <td>{u.name || "—"}</td>
                  <td>{u.email || "—"}</td>
                  <td>{verified ? <Badge $ok>Verified</Badge> : "—"}</td>
                  <td>
                    <RoleSelect
                      value={u.role || ""}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={acting === u.id}
                    >
                      <option value="">—</option>
                      <option value="client">client</option>
                      <option value="entertainer">entertainer</option>
                      <option value="admin">admin</option>
                    </RoleSelect>
                  </td>
                  <td>{u.profileType === "hard" ? "Police Check ✓" : "Standard"}</td>
                  <td>{strikes} {strikes >= STRIKES_BAN && "(ban)"} {strikes >= STRIKES_SUSPEND && strikes < STRIKES_BAN && "(suspend)"}</td>
                  <td>
                    {banned && <Badge $danger>Banned</Badge>}
                    {suspended && !banned && <Badge $warn>Suspended</Badge>}
                    {!banned && !suspended && "—"}
                  </td>
                  <td>{created ? created.toLocaleDateString() : "—"}</td>
                  <td>
                    <Actions>
                      <Link to={`/talent/${u.id}`} target="_blank">View</Link>
                      {acting === u.id ? (
                        <span>…</span>
                      ) : (
                        <>
                          {suspended && <button type="button" onClick={() => act(adminUnsuspendUser, u.id)}>Unsuspend</button>}
                          {banned && <button type="button" onClick={() => act(adminUnbanUser, u.id)}>Unban</button>}
                          {!suspended && <button type="button" onClick={() => act(adminSuspendUser, u.id)}>Suspend</button>}
                          {!banned && <button type="button" onClick={() => act(adminBanUser, u.id)}>Ban</button>}
                          <button type="button" onClick={() => handleWarn(u.id)}>Warn (strike)</button>
                          {strikes > 0 && <button type="button" onClick={() => act(adminResetStrikes, u.id)}>Reset strikes</button>}
                          {!verified && <button type="button" onClick={() => act(adminWaiveVerification, u.id)}>Waive verification</button>}
                          {verified && !!u.verificationFeeWaivedBy && <button type="button" onClick={() => act(adminUnwaiveVerification, u.id)}>Unwaive</button>}
                        </>
                      )}
                    </Actions>
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
  th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.border};
  }
  th {
    color: ${({ theme }) => theme.muted};
    font-weight: 600;
  }
  td {
    color: ${({ theme }) => theme.text};
  }
  tr:last-child td { border-bottom: none; }
`;

const Badge = styled.span`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  background: ${({ $danger, $warn, $ok }) =>
    $danger ? "rgba(239,68,68,0.2)" : $warn ? "rgba(234,179,8,0.2)" : $ok ? "rgba(34,197,94,0.2)" : "transparent"};
  color: ${({ $danger, $ok }) => ($danger ? "#ef4444" : $ok ? "#22c55e" : "#eab308")};
`;

const RoleSelect = styled.select`
  font-size: 0.85rem;
  padding: 4px 8px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.text};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  a, button {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.primary};
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }
  button:hover, a:hover { opacity: 0.8; }
`;
