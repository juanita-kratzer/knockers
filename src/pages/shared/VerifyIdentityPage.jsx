// Verification & Badges page.
// - If user has NOT done basic ID verification: shows the manual upload flow (gate target).
// - If user IS basic-verified: shows status cards + optional police check upload.
// - If user IS hard-verified (police check approved): shows fully-verified state.

import { useState, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import styled from "styled-components";
import { ref, uploadBytes } from "firebase/storage";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../context/RoleContext";
import { submitManualVerification } from "../../lib/verificationCallables";
import { storagePaths } from "../../lib/collections";
import { storage } from "../../firebase";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  ShieldCheck,
  AlertCircle,
  Camera,
  ChevronRight,
  Award,
  CheckCircle,
  Clock,
  Upload,
  XCircle,
  ExternalLink as ExternalLinkIcon,
} from "lucide-react";
import { isIdentityVerified, isHardVerified } from "../../lib/identityVerification";
import { canUsePaidFeatures } from "../../lib/verificationFee";
import { logger } from "../../lib/logger";

const ID_TYPES = [
  "Australian Driver's Licence",
  "Australian Passport",
  "Foreign Passport with Visa",
  "Proof of Age Card",
  "Photo Card",
];

const NEEDS_BACK = "Australian Driver's Licence";

export default function VerifyIdentityPage() {
  const navigate = useNavigate();
  const { user, userData, refetchUserData } = useAuth();
  const { isEntertainer } = useRole();

  const basicVerified = isIdentityVerified(userData, user);
  const hardVerified = isHardVerified(userData);
  const policeCheckStatus = userData?.policeCheck?.status || "none";

  // ---------- Basic ID upload state ----------
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [idType, setIdType] = useState("");
  const [idFrontFile, setIdFrontFile] = useState(null);
  const [idBackFile, setIdBackFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);

  const needsBack = idType === NEEDS_BACK;
  const canProceedStep1 = idType.trim() !== "";
  const canProceedStep2 = !!idFrontFile;
  const canProceedStep3 = needsBack ? !!idBackFile : true;
  const canProceedStep4 = !!selfieFile;

  // ---------- Police check upload state ----------
  const [policeFile, setPoliceFile] = useState(null);
  const [policeLoading, setPoliceLoading] = useState(false);
  const [policeError, setPoliceError] = useState(null);
  const [policeSuccess, setPoliceSuccess] = useState(false);

  // ---------- Basic ID submission ----------
  const submitBasicId = useCallback(async () => {
    if (!user || !idFrontFile || !selfieFile || (needsBack && !idBackFile)) return;
    setLoading(true);
    setError(null);
    try {
      const uid = user.uid;
      const makePath = (name) => storagePaths.idDocument(uid, `${name}_${Date.now()}.jpg`);

      const idFrontPath = makePath("id_front");
      await uploadBytes(ref(storage, idFrontPath), idFrontFile);

      let idBackPath = null;
      if (needsBack && idBackFile) {
        idBackPath = makePath("id_back");
        await uploadBytes(ref(storage, idBackPath), idBackFile);
      }

      const selfieWithIdPath = makePath("selfie_with_id");
      await uploadBytes(ref(storage, selfieWithIdPath), selfieFile);

      await submitManualVerification({
        idType: idType.trim(),
        idFrontPath,
        ...(idBackPath ? { idBackPath } : {}),
        selfieWithIdPath,
        useDev: import.meta.env.DEV,
      });
      await refetchUserData();
    } catch (err) {
      logger.error("Manual verification submit error:", err);
      const rawMsg = err?.message;
      const isGenericInternal = err?.code === "internal" && (!rawMsg || rawMsg === "internal" || rawMsg.length < 10);
      const msg =
        (rawMsg && rawMsg !== err?.code && !isGenericInternal ? rawMsg : null) ??
        err?.details ??
        (err?.code === "unauthenticated" ? "Please sign in again." : null) ??
        (err?.code === "invalid-argument" ? "Missing required photos or ID type." : null) ??
        (isGenericInternal
          ? "Server error. If you're running locally, deploy the function: firebase deploy --only functions:submitManualVerificationCallable"
          : "Something went wrong. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, idType, idFrontFile, idBackFile, selfieFile, needsBack, refetchUserData]);

  // ---------- Police check submission ----------
  const submitPoliceCheck = useCallback(async () => {
    if (!user || !policeFile) return;
    setPoliceLoading(true);
    setPoliceError(null);
    try {
      const ext = policeFile.name.split(".").pop() || "pdf";
      const filePath = storagePaths.idDocument(user.uid, `police-check-${Date.now()}.${ext}`);
      await uploadBytes(ref(storage, filePath), policeFile);

      const { httpsCallable } = await import("firebase/functions");
      const { functions } = await import("../../firebase");
      const submitPoliceCheckCallable = httpsCallable(functions, "submitPoliceCheckCallable");
      await submitPoliceCheckCallable({ documentPath: filePath, useDev: import.meta.env.DEV });
      await refetchUserData();
      setPoliceSuccess(true);
    } catch (err) {
      logger.error("Police check submit error:", err);
      setPoliceError(err?.message || "Upload failed. Please try again.");
    } finally {
      setPoliceLoading(false);
    }
  }, [user, policeFile, refetchUserData]);

  // ============================================================
  // RENDER: Basic ID not yet verified → show upload flow (gate)
  // ============================================================
  if (!basicVerified) {
    return (
      <PageContainer>
        <PageHeader title="Verify Identity" showBack />
        <Content>
          <Card>
            <IconWrap><ShieldCheck size={32} /></IconWrap>
            <Title>Verify your identity</Title>
            <Description>
              {isEntertainer
                ? "Upload a photo of your ID and a selfie with your ID. This is used for safety until we connect a verification provider."
                : "Upload a photo of the front of your ID, the back (if it's a driver's licence), and a selfie holding your ID."}
            </Description>

            {error && (
              <ErrorBox><AlertCircle size={20} />{error}</ErrorBox>
            )}

            {step === 1 && (
              <StepBlock>
                <StepLabel>1. Select your ID type</StepLabel>
                <Select value={idType} onChange={(e) => setIdType(e.target.value)} aria-label="ID type">
                  <option value="">Select...</option>
                  {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
                <StepActions>
                  <NextButton onClick={() => setStep(2)} disabled={!canProceedStep1}>
                    Next <ChevronRight size={18} />
                  </NextButton>
                </StepActions>
              </StepBlock>
            )}

            {step === 2 && (
              <StepBlock>
                <StepLabel>2. Photo of the front of your ID</StepLabel>
                <UploadZone>
                  <input type="file" accept="image/*" onChange={(e) => setIdFrontFile(e.target.files?.[0] || null)} id="id-front" style={{ display: "none" }} />
                  <label htmlFor="id-front">
                    <Camera size={28} />
                    <UploadText>{idFrontFile ? `✓ ${idFrontFile.name}` : "Tap to take or choose a photo"}</UploadText>
                  </label>
                </UploadZone>
                <StepActions>
                  <BackStepButton onClick={() => setStep(1)}>Back</BackStepButton>
                  <NextButton onClick={() => setStep(needsBack ? 3 : 4)} disabled={!canProceedStep2}>
                    Next <ChevronRight size={18} />
                  </NextButton>
                </StepActions>
              </StepBlock>
            )}

            {step === 3 && needsBack && (
              <StepBlock>
                <StepLabel>3. Photo of the back of your driver's licence</StepLabel>
                <UploadZone>
                  <input type="file" accept="image/*" onChange={(e) => setIdBackFile(e.target.files?.[0] || null)} id="id-back" style={{ display: "none" }} />
                  <label htmlFor="id-back">
                    <Camera size={28} />
                    <UploadText>{idBackFile ? `✓ ${idBackFile.name}` : "Tap to take or choose a photo"}</UploadText>
                  </label>
                </UploadZone>
                <StepActions>
                  <BackStepButton onClick={() => setStep(2)}>Back</BackStepButton>
                  <NextButton onClick={() => setStep(4)} disabled={!canProceedStep3}>
                    Next <ChevronRight size={18} />
                  </NextButton>
                </StepActions>
              </StepBlock>
            )}

            {((step === 3 && !needsBack) || step === 4) && (
              <StepBlock>
                <StepLabel>{needsBack ? "4. " : "3. "}Selfie with your ID</StepLabel>
                <UploadHint>Hold your ID next to your face so both are clearly visible.</UploadHint>
                <UploadZone>
                  <input type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} id="selfie-id" style={{ display: "none" }} />
                  <label htmlFor="selfie-id">
                    <Camera size={28} />
                    <UploadText>{selfieFile ? `✓ ${selfieFile.name}` : "Tap to take or choose a photo"}</UploadText>
                  </label>
                </UploadZone>
                <StepActions>
                  <BackStepButton onClick={() => setStep(needsBack ? 3 : 2)}>Back</BackStepButton>
                  <SubmitButton onClick={submitBasicId} disabled={loading || !canProceedStep4}>
                    {loading ? <><LoadingSpinner size={20} /> Submitting…</> : <>Submit verification</>}
                  </SubmitButton>
                </StepActions>
              </StepBlock>
            )}
          </Card>
        </Content>
      </PageContainer>
    );
  }

  // ============================================================
  // RENDER: Basic verified → show Verification & Badges hub
  // ============================================================
  return (
    <PageContainer>
      <PageHeader title="Verification & Badges" showBack />
      <Content>
        {/* Status cards */}
        <StatusSection>
          <SectionLabel>Your status</SectionLabel>

          <StatusCard $active>
            <StatusIconWrap $color="#22c55e"><CheckCircle size={22} /></StatusIconWrap>
            <StatusInfo>
              <StatusTitle>Basic Verified</StatusTitle>
              <StatusDesc>ID verified — you can message and book</StatusDesc>
            </StatusInfo>
          </StatusCard>

          <StatusCard $active={hardVerified}>
            <StatusIconWrap $color={hardVerified ? "#f59e0b" : undefined}>
              {hardVerified ? <Award size={22} /> : policeCheckStatus === "pending_review" ? <Clock size={22} /> : <Award size={22} />}
            </StatusIconWrap>
            <StatusInfo>
              <StatusTitle>Police Check Verified</StatusTitle>
              <StatusDesc>
                {hardVerified
                  ? "Police check on file — higher trust & visibility"
                  : policeCheckStatus === "pending_review"
                  ? "Under review — we'll update you soon"
                  : policeCheckStatus === "rejected"
                  ? "Rejected — you can re-upload below"
                  : "Get a police check to upgrade your profile"}
              </StatusDesc>
            </StatusInfo>
          </StatusCard>
        </StatusSection>

        {/* Police check upload — show if not yet hard verified and not pending */}
        {!hardVerified && policeCheckStatus !== "pending_review" && (
          <UpgradeSection>
            <SectionLabel>Get Police Check Verified</SectionLabel>
            <Card>
              <UpgradeTitle>How it works</UpgradeTitle>
              <StepsList>
                <StepsItem><StepNum>1</StepNum><span>Purchase a national police check from an accredited provider (approx. $30–$50)</span></StepsItem>
                <StepsItem><StepNum>2</StepNum><span>Once you receive your results, upload the document here</span></StepsItem>
                <StepsItem><StepNum>3</StepNum><span>Our team will review it — usually within 24–48 hours</span></StepsItem>
                <StepsItem><StepNum>4</StepNum><span>Once approved, your profile earns the Police Check Verified badge</span></StepsItem>
              </StepsList>

              <ProviderLink href="https://www.nationalcrimecheck.com.au" target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon size={16} />
                Get a police check at nationalcrimecheck.com.au
              </ProviderLink>
              <UploadHint>Other accredited providers are also accepted — just upload the results document.</UploadHint>

              <Divider />

              {policeCheckStatus === "rejected" && userData?.policeCheck?.rejectionReason && (
                <ErrorBox>
                  <XCircle size={20} />
                  Rejected: {userData.policeCheck.rejectionReason}
                </ErrorBox>
              )}

              <UploadLabel>Upload your police check results</UploadLabel>
              <UploadZone>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => { setPoliceFile(e.target.files?.[0] || null); setPoliceSuccess(false); }}
                  id="police-check-file"
                  style={{ display: "none" }}
                />
                <label htmlFor="police-check-file">
                  <Upload size={28} />
                  <UploadText>{policeFile ? `✓ ${policeFile.name}` : "Tap to upload PDF, photo, or screenshot"}</UploadText>
                </label>
              </UploadZone>
              <UploadHint>PDF, JPG, or PNG — max 10 MB</UploadHint>

              {policeError && <ErrorBox><AlertCircle size={20} />{policeError}</ErrorBox>}
              {policeSuccess && (
                <SuccessBox><CheckCircle size={20} />Submitted for review — we'll notify you when it's approved.</SuccessBox>
              )}

              <SubmitButton onClick={submitPoliceCheck} disabled={policeLoading || !policeFile || policeSuccess}>
                {policeLoading ? <><LoadingSpinner size={20} /> Uploading…</> : <>Submit for review</>}
              </SubmitButton>
            </Card>
          </UpgradeSection>
        )}

        {/* Pending review banner */}
        {policeCheckStatus === "pending_review" && !hardVerified && (
          <PendingBanner>
            <Clock size={20} />
            Your police check is under review. We'll update your profile once approved.
          </PendingBanner>
        )}

        {/* Fully verified message */}
        {hardVerified && (
          <FullyVerifiedBanner>
            <Award size={24} />
            <div>
              <strong>Fully verified</strong>
              <p>You have the highest trust level. Your profile gets priority visibility.</p>
            </div>
          </FullyVerifiedBanner>
        )}

        {/* What verification unlocks */}
        <InfoSection>
          <SectionLabel>What verification unlocks</SectionLabel>
          <InfoList>
            <InfoItem><CheckCircle size={16} /> <span><strong>Basic:</strong> Message and book entertainers</span></InfoItem>
            <InfoItem><CheckCircle size={16} /> <span><strong>Hard:</strong> Priority in search results</span></InfoItem>
            <InfoItem><CheckCircle size={16} /> <span><strong>Hard:</strong> Trust badge on your profile</span></InfoItem>
            <InfoItem><CheckCircle size={16} /> <span><strong>Hard:</strong> Higher booking acceptance rate</span></InfoItem>
          </InfoList>
        </InfoSection>

        {/* Verification fee status */}
        {!canUsePaidFeatures(userData, user) && (
          <FeeSection>
            <Card>
              <FeeText>
                A one-time $1.99 verification fee is required to unlock messaging and bookings.
              </FeeText>
              <FeeButton onClick={() => navigate("/settings/verification")}>Pay verification fee</FeeButton>
            </Card>
          </FeeSection>
        )}
      </Content>
    </PageContainer>
  );
}

// ==================== Styled Components ====================

const Content = styled.div`
  padding: 16px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  padding: 20px;
`;

const IconWrap = styled.div`
  color: ${({ theme }) => theme.primary};
  margin-bottom: 12px;
`;

const Title = styled.h2`
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const Description = styled.p`
  margin: 0 0 24px;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.5;
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  font-size: 0.9rem;
  color: #ef4444;
  svg { flex-shrink: 0; }
`;

const SuccessBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 12px;
  font-size: 0.9rem;
  color: #22c55e;
  svg { flex-shrink: 0; }
`;

const StepBlock = styled.div`
  margin-top: 8px;
`;

const StepLabel = styled.p`
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin: 0 0 12px;
  font-size: 1rem;
`;

const UploadHint = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
  margin: 0 0 12px;
`;

const Select = styled.select`
  width: 100%;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  margin-bottom: 16px;
`;

const UploadZone = styled.div`
  border: 2px dashed ${({ theme }) => theme.border};
  border-radius: 12px;
  padding: 32px 16px;
  text-align: center;
  margin-bottom: 12px;
  background: ${({ theme }) => theme.background};
  label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    color: ${({ theme }) => theme.primary};
  }
  input:focus + label,
  label:focus-within { outline: 2px solid ${({ theme }) => theme.primary}; }
`;

const UploadText = styled.span`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
`;

const StepActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const BackStepButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.2rem;
  background: transparent;
  color: ${({ theme }) => theme.primary};
  border: 1px solid ${({ theme }) => theme.primary};
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
`;

const NextButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

// ---------- Verification & Badges hub styles ----------

const StatusSection = styled.div`
  margin-bottom: 20px;
`;

const SectionLabel = styled.h3`
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.muted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 10px 4px;
`;

const StatusCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ $active, theme }) => $active ? "rgba(34, 197, 94, 0.3)" : theme.border};
  border-radius: 14px;
  margin-bottom: 10px;
  opacity: ${({ $active }) => $active ? 1 : 0.6};
`;

const StatusIconWrap = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color ? `${$color}15` : "rgba(255,255,255,0.05)"};
  color: ${({ $color, theme }) => $color || theme.muted};
`;

const StatusInfo = styled.div`
  flex: 1;
`;

const StatusTitle = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
  margin-bottom: 2px;
`;

const StatusDesc = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.4;
`;

const UpgradeSection = styled.div`
  margin-bottom: 20px;
`;

const UpgradeTitle = styled.h3`
  margin: 0 0 14px;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const StepsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const StepsItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};
  line-height: 1.4;
`;

const StepNum = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
`;

const ProviderLink = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.primary};
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  margin-bottom: 8px;
  &:active { opacity: 0.8; }
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.border};
  margin: 16px 0;
`;

const UploadLabel = styled.p`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
  margin: 0 0 10px;
`;

const PendingBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 14px;
  font-size: 0.9rem;
  color: #f59e0b;
  margin-bottom: 20px;
  svg { flex-shrink: 0; }
`;

const FullyVerifiedBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px;
  background: ${({ theme }) => theme.card};
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 14px;
  margin-bottom: 20px;
  color: #f59e0b;
  div {
    flex: 1;
    strong { display: block; color: ${({ theme }) => theme.text}; margin-bottom: 4px; }
    p { margin: 0; font-size: 0.85rem; color: ${({ theme }) => theme.muted}; line-height: 1.4; }
  }
`;

const InfoSection = styled.div`
  margin-bottom: 20px;
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};
  svg { color: ${({ theme }) => theme.primary}; flex-shrink: 0; }
`;

const FeeSection = styled.div`
  margin-bottom: 20px;
`;

const FeeText = styled.p`
  margin: 0 0 14px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.5;
`;

const FeeButton = styled.button`
  width: 100%;
  padding: 14px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
`;
