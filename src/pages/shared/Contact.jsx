// Contact Us - back button and route back per prompt
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import Section from "../../components/Section";
import styled from "styled-components";

const Title = styled.h2`
  color: ${({ theme }) => theme.dark};
  margin-bottom: 16px;
`;

const Text = styled.p`
  color: ${({ theme }) => theme.text};
  line-height: 1.7;
`;

const Email = styled.a`
  color: ${({ theme }) => theme.primary};
  font-weight: 600;
`;

export default function Contact() {
  return (
    <PageContainer>
      <PageHeader title="Contact Us" showBack />
      <Section>
        <Title>Contact</Title>
        <Text>
          Questions or media inquiries? Email us at{" "}
          <Email href="mailto:support@knockers.app">support@knockers.app</Email>
        </Text>
      </Section>
    </PageContainer>
  );
}
