// src/pages/shared/Help.jsx
// Unified Help Centre: FAQ (inline accordion) + contact form

import { useState } from "react";
import styled from "styled-components";
import {
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import { useRole } from "../../context/RoleContext";
import { FAQ_USER, FAQ_ENTERTAINER } from "./faqData";

export default function Help() {
  const { isEntertainer } = useRole();
  const FAQ_DATA = isEntertainer ? FAQ_ENTERTAINER : FAQ_USER;

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ topic: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openItems, setOpenItems] = useState({});

  const HELP_TOPICS = [
    { id: "booking", label: "Booking Issues" },
    { id: "payment", label: "Payment & Refunds" },
    { id: "account", label: "Account Problems" },
    { id: "safety", label: "Safety Concerns" },
    { id: "entertainer", label: "Entertainer Questions" },
    { id: "other", label: "Other" },
  ];

  const toggleFaq = (sectionId, index) => {
    const key = `${sectionId}-${index}`;
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <PageContainer>
        <PageHeader title="Help Centre" showBack />
        <SuccessContent>
          <SuccessIcon><CheckCircle size={64} /></SuccessIcon>
          <SuccessTitle>Message Sent</SuccessTitle>
          <SuccessText>We've received your message and will respond within 24 hours.</SuccessText>
          <SuccessButton onClick={() => {
            setSubmitted(false);
            setShowForm(false);
            setFormData({ topic: "", message: "" });
          }}>
            Back
          </SuccessButton>
        </SuccessContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Help Centre" showBack />

      <Content>
        {!showForm ? (
          <>
            <Section>
              <SectionTitle>How can we help?</SectionTitle>
              <QuickAction onClick={() => setShowForm(true)}>
                <QuickIcon><MessageSquare size={24} /></QuickIcon>
                <QuickLabel>
                  <QuickTitle>Send a Message</QuickTitle>
                  <QuickDescription>We'll respond within 24 hours</QuickDescription>
                </QuickLabel>
                <ChevronRight size={20} />
              </QuickAction>
            </Section>

            <Section>
              <SectionTitle>Frequently Asked Questions</SectionTitle>
              {FAQ_DATA.map((section) => (
                <FaqSection key={section.id} id={section.id}>
                  <FaqSectionTitle>{section.title}</FaqSectionTitle>
                  <FaqList>
                    {section.questions.map((item, index) => {
                      const isOpen = openItems[`${section.id}-${index}`];
                      return (
                        <FaqItem key={index}>
                          <FaqButton onClick={() => toggleFaq(section.id, index)} $open={isOpen}>
                            <FaqQuestion>{item.q}</FaqQuestion>
                            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </FaqButton>
                          {isOpen && (
                            <FaqAnswer><FaqAnswerText>{item.a}</FaqAnswerText></FaqAnswer>
                          )}
                        </FaqItem>
                      );
                    })}
                  </FaqList>
                </FaqSection>
              ))}
            </Section>

            <Section>
              <SectionTitle>Contact</SectionTitle>
              <ContactCard>
                <ContactRow><Mail size={18} /><span>support@knockers.app</span></ContactRow>
                <ContactRow><Clock size={18} /><span>Response time: Within 24 hours</span></ContactRow>
              </ContactCard>
            </Section>
          </>
        ) : (
          <FormSection>
            <FormTitle>Send a Message</FormTitle>
            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>What's this about?</Label>
                <Select value={formData.topic} onChange={(e) => setFormData((p) => ({ ...p, topic: e.target.value }))} required>
                  <option value="">Select a topic...</option>
                  {HELP_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Tell us more</Label>
                <Textarea
                  placeholder="Describe your issue or question..."
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  rows={5}
                  required
                />
              </FormGroup>
              <SubmitButton type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </SubmitButton>
              <CancelButton type="button" onClick={() => setShowForm(false)}>Cancel</CancelButton>
            </Form>
          </FormSection>
        )}
      </Content>
    </PageContainer>
  );
}

const Content = styled.div`padding: 0 16px 40px;`;
const Section = styled.div`margin-bottom: 28px;`;
const SectionTitle = styled.h2`font-size: 1.1rem; font-weight: 700; color: ${({ theme }) => theme.text}; margin: 0 0 16px;`;

const QuickAction = styled.button`
  display: flex; align-items: center; gap: 14px; padding: 18px; width: 100%;
  background: ${({ theme }) => theme.card}; border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px; text-align: left; cursor: pointer;
  &:active { background: ${({ theme }) => theme.bgAlt}; }
  svg:last-child { color: ${({ theme }) => theme.muted}; }
`;
const QuickIcon = styled.div`
  width: 48px; height: 48px; background: rgba(135, 206, 235, 0.15); border-radius: 12px;
  display: flex; align-items: center; justify-content: center; color: ${({ theme }) => theme.primary};
`;
const QuickLabel = styled.div`flex: 1;`;
const QuickTitle = styled.div`font-weight: 700; color: ${({ theme }) => theme.text}; font-size: 1rem;`;
const QuickDescription = styled.div`font-size: 0.85rem; color: ${({ theme }) => theme.muted}; margin-top: 4px;`;

const FaqSection = styled.div`margin-bottom: 20px;`;
const FaqSectionTitle = styled.h3`font-size: 1rem; font-weight: 700; color: ${({ theme }) => theme.text}; margin: 0 0 12px;`;
const FaqList = styled.div`display: flex; flex-direction: column; gap: 10px;`;
const FaqItem = styled.div`
  background: ${({ theme }) => theme.card}; border: 1px solid ${({ theme }) => theme.border};
  border-radius: 14px; overflow: hidden;
`;
const FaqButton = styled.button`
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 16px; background: transparent; border: none; text-align: left; cursor: pointer;
  color: ${({ theme }) => theme.text};
  svg { color: ${({ $open, theme }) => ($open ? theme.primary : theme.muted)}; flex-shrink: 0; }
`;
const FaqQuestion = styled.span`font-weight: 600; font-size: 0.95rem; line-height: 1.4;`;
const FaqAnswer = styled.div`padding: 0 16px 16px; border-top: 1px solid ${({ theme }) => theme.border}; margin-top: -1px; padding-top: 14px;`;
const FaqAnswerText = styled.p`margin: 0; color: ${({ theme }) => theme.muted}; font-size: 0.9rem; line-height: 1.7;`;

const ContactCard = styled.div`
  padding: 20px; background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border}; border-radius: 16px;
`;
const ContactRow = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 8px 0;
  color: ${({ theme }) => theme.text}; font-size: 0.95rem;
  svg { color: ${({ theme }) => theme.primary}; }
`;

const FormSection = styled.div``;
const FormTitle = styled.h2`font-size: 1.5rem; font-weight: 700; color: ${({ theme }) => theme.text}; margin: 0 0 24px;`;
const Form = styled.form`display: flex; flex-direction: column; gap: 20px;`;
const FormGroup = styled.div`display: flex; flex-direction: column; gap: 8px;`;
const Label = styled.label`font-size: 0.9rem; font-weight: 600; color: ${({ theme }) => theme.text};`;
const Select = styled.select`
  padding: 14px 16px; background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border}; border-radius: 12px;
  font-size: 1rem; color: ${({ theme }) => theme.text}; outline: none;
  &:focus { border-color: ${({ theme }) => theme.primary}; }
`;
const Textarea = styled.textarea`
  padding: 14px 16px; background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border}; border-radius: 12px;
  font-size: 1rem; color: ${({ theme }) => theme.text}; outline: none; resize: none; font-family: inherit;
  &:focus { border-color: ${({ theme }) => theme.primary}; }
  &::placeholder { color: ${({ theme }) => theme.muted}; }
`;
const SubmitButton = styled.button`
  padding: 16px; background: ${({ theme }) => theme.primary}; border: none; border-radius: 12px;
  color: #1a1d21; font-size: 1rem; font-weight: 700; cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const CancelButton = styled.button`
  padding: 16px; background: transparent; border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px; color: ${({ theme }) => theme.muted}; font-size: 1rem; font-weight: 600; cursor: pointer;
`;
const SuccessContent = styled.div`display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center;`;
const SuccessIcon = styled.div`color: #22c55e; margin-bottom: 24px;`;
const SuccessTitle = styled.h2`margin: 0 0 12px; font-size: 1.5rem; font-weight: 700; color: ${({ theme }) => theme.text};`;
const SuccessText = styled.p`margin: 0 0 32px; color: ${({ theme }) => theme.muted}; font-size: 1rem; line-height: 1.6; max-width: 300px;`;
const SuccessButton = styled.button`
  padding: 0.5rem 1.2rem;
  border: 1px solid ${({ theme }) => theme.primary};
  border-radius: 50px;
  background: transparent;
  color: ${({ theme }) => theme.primary};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
`;
