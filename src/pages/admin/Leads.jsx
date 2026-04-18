// Phase 5: Admin Lead Manager (CRM)

import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAdminLeads, LEAD_SOURCES, LEAD_STATUSES } from "../../hooks/useAdminLeads";
import { COL } from "../../lib/collections";
import LoadingSpinner from "../../components/LoadingSpinner";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function AdminLeads() {
  const { leads, loading, error, updateLead } = useAdminLeads();
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingNotes, setEditingNotes] = useState(null);
  const [notesValue, setNotesValue] = useState("");
  const [acting, setActing] = useState(null);
  const [message, setMessage] = useState("");
  const [adminUsers, setAdminUsers] = useState([]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    (async () => {
      const { db } = await import("../../firebase");
      const { collection, getDocs, query, where } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, COL.users), where("role", "==", "admin")));
      setAdminUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = leads;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (l) =>
          (l.name || "").toLowerCase().includes(s) ||
          (l.phone || "").replace(/\s/g, "").includes(s) ||
          (l.email || "").toLowerCase().includes(s)
      );
    }
    if (filterSource) list = list.filter((l) => (l.source || "") === filterSource);
    if (filterStatus) list = list.filter((l) => (l.status || "new") === filterStatus);
    return list;
  }, [leads, search, filterSource, filterStatus]);

  const handleSaveNotes = async (leadId) => {
    setActing(leadId);
    try {
      await updateLead(leadId, { notes: notesValue });
      setEditingNotes(null);
      setMessage("Notes saved");
    } catch (e) {
      setMessage(e.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  const handleStatusChange = async (leadId, status) => {
    setActing(leadId);
    setMessage("");
    try {
      await updateLead(leadId, { status });
      setMessage("Updated");
    } catch (e) {
      setMessage(e.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  const markContacted = (leadId) => handleStatusChange(leadId, "contacted");
  const markConverted = (leadId) => handleStatusChange(leadId, "converted");
  const archive = (leadId) => handleStatusChange(leadId, "dead");

  const handleAssign = async (leadId, uid) => {
    setActing(leadId);
    try {
      await updateLead(leadId, { assignedTo: uid || null });
      setMessage("Assigned");
    } catch (e) {
      setMessage(e.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  const handleFollowUp = async (leadId, dateStr) => {
    setActing(leadId);
    try {
      const followUpAt = dateStr ? new Date(dateStr) : null;
      await updateLead(leadId, { followUpAt });
      setMessage("Saved");
    } catch (e) {
      setMessage(e.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  const exportCsv = () => {
    const optInOnly = true;
    const list = optInOnly ? filtered.filter((l) => l.marketingOptIn === true) : filtered;
    const headers = [
      "name",
      "phone",
      "email",
      "source",
      "city",
      "status",
      "marketingOptIn",
      "createdAt",
    ];
    const rows = list.map((l) =>
      headers.map((h) => {
        const v = l[h];
        if (h === "createdAt" && v?.toDate) return v.toDate().toISOString();
        return typeof v === "string" && (v.includes(",") || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : (v ?? "");
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage("Exported (opt-in only)");
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <PageTitle>Error: {error}</PageTitle>;

  return (
    <div>
      <Header>
        <PageTitle>Leads</PageTitle>
        <Actions>
          <Link to="/admin/leads/new">
            <Button $primary>+ New lead</Button>
          </Link>
          <Button onClick={exportCsv}>Export CSV (opt-in)</Button>
        </Actions>
      </Header>
      {message && <Message>{message}</Message>}

      <Filters>
        <SearchInput
          type="text"
          placeholder="Search name, phone, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">All sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </Filters>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Source</th>
              <th>City</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Follow-up</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td>{l.name || "—"}</td>
                <td>{l.phone || "—"}</td>
                <td>{l.email || "—"}</td>
                <td>{l.source || "—"}</td>
                <td>{l.city || "—"}</td>
                <td>
                  <Select
                    value={l.status || "new"}
                    onChange={(e) => handleStatusChange(l.id, e.target.value)}
                    disabled={acting === l.id}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Select
                    value={l.assignedTo || ""}
                    onChange={(e) => handleAssign(l.id, e.target.value || null)}
                    disabled={acting === l.id}
                  >
                    <option value="">—</option>
                    {adminUsers.map((a) => (
                      <option key={a.id} value={a.id}>{a.name || a.email || a.id}</option>
                    ))}
                  </Select>
                </td>
                <td>
                  <input
                    type="date"
                    value={l.followUpAt?.toDate ? l.followUpAt.toDate().toISOString().slice(0, 10) : ""}
                    onChange={(e) => handleFollowUp(l.id, e.target.value)}
                    disabled={acting === l.id}
                  />
                </td>
                <td>
                  {editingNotes === l.id ? (
                    <div>
                      <textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        rows={2}
                        style={{ width: "100%", fontSize: "0.85rem" }}
                      />
                      <button type="button" onClick={() => handleSaveNotes(l.id)} disabled={acting === l.id} style={{ padding: "0.35rem 1rem", borderRadius: 50, border: "none", background: "var(--primary, #87ceeb)", color: "#1a1d21", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>Save</button>
                      <button type="button" onClick={() => { setEditingNotes(null); setNotesValue(""); }} style={{ padding: "0.35rem 1rem", borderRadius: 50, border: "1px solid var(--primary, #87ceeb)", background: "transparent", color: "var(--primary, #87ceeb)", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNotes(l.id);
                        setNotesValue(l.notes || "");
                      }}
                    >
                      {l.notes ? `${l.notes.slice(0, 30)}…` : "Add notes"}
                    </button>
                  )}
                </td>
                <td>
                  {acting === l.id ? "…" : (
                    <>
                      {(l.status || "new") === "new" && (
                        <ActionBtn onClick={() => markContacted(l.id)}>Contacted</ActionBtn>
                      )}
                      <ActionBtn onClick={() => markConverted(l.id)}>Convert</ActionBtn>
                      <ActionBtn onClick={() => archive(l.id)}>Archive</ActionBtn>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {filtered.length === 0 && <Empty>No leads match filters.</Empty>}
    </div>
  );
}

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.text};
`;

const Message = styled.p`
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.primary};
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  a { text-decoration: none; }
`;

const Button = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  font-size: 0.9rem;
  ${({ $primary, theme }) => $primary && `background: ${theme.primary}; color: #1a1d21; border-color: transparent;`}
`;

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  font-size: 0.85rem;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  th,
  td {
    padding: 10px 8px;
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
  input,
  select,
  textarea {
    max-width: 140px;
  }
`;

const ActionBtn = styled.button`
  margin-right: 6px;
  padding: 4px 8px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary};
  cursor: pointer;
  font-size: 0.8rem;
`;

const Empty = styled.p`
  margin: 24px 0 0;
  color: ${({ theme }) => theme.muted};
  font-size: 0.9rem;
`;
