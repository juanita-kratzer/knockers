// src/pages/shared/LegalDoc.jsx
// Renders legal markdown from public/legal (final documents).

import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import styled from "styled-components";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import LoadingSpinner from "../../components/LoadingSpinner";

const DOC_CONFIG = {
  privacy: { filename: "privacy-policy.md", title: "Privacy Policy" },
  terms: { filename: "terms-and-conditions.md", title: "Terms & Conditions" },
  contractor: { filename: "entertainer-contractor-agreement.md", title: "Contractor Agreement" },
};

export default function LegalDoc() {
  const { docType } = useParams();
  const config = docType ? DOC_CONFIG[docType] : null;
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(!!config);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!config) return;
    setLoading(true);
    setError(false);
    fetch(`/legal/${config.filename}`)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error("Not found"))))
      .then(setContent)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [config?.filename]);

  if (!config) {
    return <Navigate to="/" replace />;
  }

  return (
    <PageContainer>
      <PageHeader title={config.title} showBack />
      <Content>
        {loading && (
          <LoadingWrap>
            <LoadingSpinner />
          </LoadingWrap>
        )}
        {error && <ErrorText>Unable to load document. Please try again later.</ErrorText>}
        {!loading && !error && content && (
          <MarkdownBlock>{content}</MarkdownBlock>
        )}
      </Content>
    </PageContainer>
  );
}

const Content = styled.div`
  padding: 0 16px 60px;
`;

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 40px 0;
`;

const ErrorText = styled.p`
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
  margin: 0;
`;

const MarkdownBlock = styled.pre`
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.text};
  margin: 0;
`;
