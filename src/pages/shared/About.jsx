import Section from "../../components/Section";
import styled from "styled-components";

const Title = styled.h2`
  color: ${({ theme }) => theme.dark};
  margin-bottom: 16px;
`;

const Text = styled.p`
  color: ${({ theme }) => theme.text};
  line-height: 1.7;
  max-width: 640px;
`;

export default function About() {
  return (
    <Section>
      <Title>About Knockers</Title>
      <Text>
        Knockers is an Uber-style marketplace connecting verified entertainers with clients.
        Book singers, DJs, magicians, dancers, comedians, circus acts, cultural performers, and more —
        all in one place.
      </Text>
      <Text>
        Safety-first approach, payments via Stripe Connect, and transparent reviews.
        Entertainers keep more of what they earn with no agency cuts.
      </Text>
    </Section>
  );
}
