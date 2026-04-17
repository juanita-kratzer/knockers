// src/pages/shared/Terms.jsx
// Terms & Conditions page

import styled from "styled-components";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";

export default function Terms() {
  return (
    <PageContainer>
      <PageHeader title="Terms & Conditions" showBack />

      <Content>
        <LastUpdated>Last updated: January 2026</LastUpdated>

        <Section>
          <SectionTitle>1. Introduction</SectionTitle>
          <Paragraph>
            Welcome to Knockers. By using our platform, you agree to these Terms &
            Conditions. Please read them carefully before creating an account or
            making any bookings.
          </Paragraph>
          <Paragraph>
            Knockers is a platform that connects clients with independent entertainers.
            We do not employ entertainers directly - they are self-employed contractors
            who use our platform to find clients.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>2. User Accounts</SectionTitle>
          <SubTitle>2.1 Account Creation</SubTitle>
          <BulletList>
            <li>You must be 18 years or older to create an account</li>
            <li>You must provide accurate and complete information</li>
            <li>You are responsible for maintaining account security</li>
            <li>One account per person - duplicate accounts will be terminated</li>
          </BulletList>

          <SubTitle>2.2 Account Types</SubTitle>
          <Paragraph>
            <strong>Soft Profile:</strong> ID verified, confirms you are 18+
          </Paragraph>
          <Paragraph>
            <strong>Hard Profile:</strong> ID verified plus police check (recommended)
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>3. Booking Policy</SectionTitle>
          <SubTitle>3.1 Making a Booking</SubTitle>
          <BulletList>
            <li>Bookings are requests until accepted by the entertainer</li>
            <li>A deposit is required to confirm accepted bookings</li>
            <li>You have 10 minutes to pay the deposit after acceptance</li>
            <li>Read and agree to entertainer rules before paying</li>
          </BulletList>

          <SubTitle>3.2 Platform Fee</SubTitle>
          <Paragraph>
            Knockers charges a $30 booking fee per booking. This fee is non-refundable
            in most circumstances.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>4. Cancellation Policy</SectionTitle>
          <SubTitle>4.1 Client Cancellations</SubTitle>
          <BulletList>
            <li>
              <strong>Within 72 hours of event:</strong> Full booking fee charged,
              entertainer receives full payment
            </li>
            <li>
              <strong>Outside 72 hours:</strong> $80 cancellation fee ($50 to
              entertainer, $30 platform fee not refunded)
            </li>
          </BulletList>

          <SubTitle>4.2 Entertainer Cancellations</SubTitle>
          <BulletList>
            <li>Client receives full refund of deposit</li>
            <li>Entertainer pays $30 cancellation fee</li>
            <li>Frequent cancellations may result in account suspension</li>
          </BulletList>

          <SubTitle>4.3 No-Shows</SubTitle>
          <Paragraph>
            If an entertainer fails to arrive within 20 minutes of the booking start
            time without communication, the client may cancel at the entertainer's
            expense.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>5. Code of Conduct</SectionTitle>
          <SubTitle>5.1 For Clients</SubTitle>
          <BulletList>
            <li>Respect entertainer boundaries at all times</li>
            <li>No photography or recording without explicit consent</li>
            <li>Provide a safe environment for entertainers</li>
            <li>No harassment, discrimination, or abusive behavior</li>
            <li>Accurate event details must be provided</li>
          </BulletList>

          <SubTitle>5.2 For Entertainers</SubTitle>
          <BulletList>
            <li>Professional conduct at all times</li>
            <li>Arrive on time or communicate delays</li>
            <li>Respect client privacy and event details</li>
            <li>Report safety concerns immediately</li>
            <li>Maintain accurate profile information</li>
          </BulletList>
        </Section>

        <Section>
          <SectionTitle>6. Payment Terms</SectionTitle>
          <BulletList>
            <li>All payments are processed securely through our platform</li>
            <li>Entertainer payments are released after booking completion</li>
            <li>Payouts are processed weekly (every Monday)</li>
            <li>Do not arrange payments outside the platform</li>
          </BulletList>
        </Section>

        <Section>
          <SectionTitle>7. Safety & Privacy</SectionTitle>
          <BulletList>
            <li>Personal information is encrypted and stored securely</li>
            <li>We do not share personal details with third parties</li>
            <li>Emergency safety features are available for entertainers</li>
            <li>Report any safety concerns to our support team</li>
          </BulletList>
        </Section>

        <Section>
          <SectionTitle>8. Liability</SectionTitle>
          <Paragraph>
            Knockers is a platform that connects clients with independent entertainers.
            We are not responsible for:
          </Paragraph>
          <BulletList>
            <li>The quality of entertainment services provided</li>
            <li>Actions of entertainers or clients</li>
            <li>Personal injuries or property damage during bookings</li>
            <li>Disputes between parties (though we will assist in resolution)</li>
          </BulletList>
        </Section>

        <Section>
          <SectionTitle>9. Termination</SectionTitle>
          <Paragraph>
            We reserve the right to suspend or terminate accounts that violate these
            terms, engage in fraudulent activity, or behave inappropriately. Serious
            violations may result in permanent bans.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>10. Changes to Terms</SectionTitle>
          <Paragraph>
            We may update these terms from time to time. Continued use of the platform
            after changes constitutes acceptance of the new terms.
          </Paragraph>
        </Section>

        <ContactBox>
          <ContactTitle>Questions?</ContactTitle>
          <ContactText>
            If you have any questions about these Terms & Conditions, please contact
            us at support@knockers.app
          </ContactText>
        </ContactBox>
      </Content>
    </PageContainer>
  );
}

const Content = styled.div`
  padding: 0 16px 60px;
`;

const LastUpdated = styled.p`
  color: ${({ theme }) => theme.muted};
  font-size: 0.85rem;
  margin-bottom: 24px;
`;

const Section = styled.div`
  margin-bottom: 28px;
`;

const SectionTitle = styled.h2`
  font-size: 1.15rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  margin: 0 0 16px;
`;

const SubTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin: 16px 0 12px;
`;

const Paragraph = styled.p`
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
  line-height: 1.7;
  margin: 0 0 12px;

  strong {
    color: ${({ theme }) => theme.text};
  }
`;

const BulletList = styled.ul`
  margin: 0 0 16px;
  padding-left: 20px;

  li {
    color: ${({ theme }) => theme.muted};
    font-size: 0.95rem;
    line-height: 1.6;
    padding: 4px 0;

    strong {
      color: ${({ theme }) => theme.text};
    }
  }
`;

const ContactBox = styled.div`
  padding: 20px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  text-align: center;
  margin-top: 32px;
`;

const ContactTitle = styled.h3`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.text};
  font-size: 1.1rem;
`;

const ContactText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.muted};
  font-size: 0.9rem;
  line-height: 1.5;
`;


