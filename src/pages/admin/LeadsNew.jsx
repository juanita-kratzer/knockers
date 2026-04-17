// Phase 5: Street / Event quick lead entry (mobile-friendly)

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { useAdminLeads, LEAD_SOURCES } from "../../hooks/useAdminLeads";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function LeadsNew() {
  const navigate = useNavigate();
  const { createLead, loading: hookLoading } = useAdminLeads();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    source: "street",
    notes: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await createLead({
        name: form.name.trim(),
        phone: form.phone.trim(),
        source: form.source,
        notes: form.notes.trim(),
        status: "new",
      });
      setMessage("Saved. Add another or go back.");
      setForm({ name: "", phone: "", source: "street", notes: "" });
    } catch (e) {
      setMessage(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container>
      <Header>
        <BackLink to="/admin/leads">← Leads</BackLink>
        <Title>New lead</Title>
      </Header>

      <Form onSubmit={handleSubmit}>
        <Field>
          <Label>Name</Label>
          <Input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            autoFocus
          />
        </Field>
        <Field>
          <Label>Phone</Label>
          <Input
            type="tel"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
        </Field>
        <Field>
          <Label>Source</Label>
          <Select
            value={form.source}
            onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
          >
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label>Notes</Label>
          <Textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            rows={2}
          />
        </Field>
        {message && <Message>{message}</Message>}
        <Actions>
          <SubmitButton type="submit" disabled={saving}>
            {saving ? <LoadingSpinner size={20} /> : "Save lead"}
          </SubmitButton>
          <Link to="/admin/leads">
            <CancelButton type="button">Back to list</CancelButton>
          </Link>
        </Actions>
      </Form>
    </Container>
  );
}

const Container = styled.div`
  max-width: 420px;
  margin: 0 auto;
  padding: 16px;
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
  text-decoration: none;
  &:hover { color: ${({ theme }) => theme.text}; }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.text};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${({ theme }) => theme.muted};
`;

const Input = styled.input`
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
`;

const Select = styled.select`
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
`;

const Textarea = styled.textarea`
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  resize: vertical;
`;

const Message = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.primary};
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
  a { text-decoration: none; }
`;

const SubmitButton = styled.button`
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  &:disabled { opacity: 0.7; cursor: not-allowed; }
`;

const CancelButton = styled.button`
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.text};
  font-size: 0.95rem;
  cursor: pointer;
  width: 100%;
`;
