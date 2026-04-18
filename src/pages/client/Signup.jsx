// src/pages/client/Signup.jsx
// Comprehensive user/client signup with ID verification

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ChevronRight,
  Check,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import { logger } from "../../lib/logger";

const ID_TYPES = [
  "Australian Driver's Licence",
  "Australian Passport",
  "Foreign Passport with Visa",
  "Proof of Age Card",
  "Photo Card",
];

export default function ClientSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    firstName: "",
    lastName: "",
    email: "",
    confirmEmail: "",
    phone: "",
    username: "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",

    // Step 2: Verification
    idType: "",
    idVerified: false,

    // Step 3: T&C
    agreeToTerms: false,
    understandRules: false,
    marketingOptIn: false,
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = (stepNum) => {
    const errors = {};

    if (stepNum === 1) {
      if (!formData.firstName.trim()) errors.firstName = "First name is required";
      if (!formData.lastName.trim()) errors.lastName = "Last name is required";
      if (!formData.email.trim()) errors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Invalid email format";
      }
      if (!formData.confirmEmail.trim()) errors.confirmEmail = "Please confirm your email address";
      else if (formData.email !== formData.confirmEmail) {
        errors.confirmEmail = "Email addresses do not match";
      }
      if (!formData.phone.trim()) errors.phone = "Phone number is required";
      else if (!/^[\d\s+()-]{8,}$/.test(formData.phone)) {
        errors.phone = "Invalid phone number";
      }
      if (!formData.username.trim()) errors.username = "Username is required";
      else if (formData.username.length < 3) {
        errors.username = "Username must be at least 3 characters";
      }
      if (!formData.dateOfBirth) errors.dateOfBirth = "Date of birth is required";
      else {
        const birth = new Date(formData.dateOfBirth);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
        if (age < 18) errors.dateOfBirth = "You must be 18 or older to sign up";
      }
      if (!formData.password) errors.password = "Password is required";
      else if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    if (stepNum === 2) {
      if (!formData.idType) errors.idType = "Please select an ID type";
    }

    if (stepNum === 3) {
      if (!formData.agreeToTerms) {
        errors.agreeToTerms = "You must agree to the Terms & Conditions";
      }
      if (!formData.understandRules) {
        errors.understandRules = "You must acknowledge the safety rules";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    setError(null);

    try {
      await signup(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        role: "client",
        idType: formData.idType,
        idVerified: false,
        profileType: "soft",
        agreedToTermsAt: new Date(),
        termsVersion: "v1",
        marketingOptIn: formData.marketingOptIn,
        signupSource: searchParams.get("source") || null,
        referralCode: searchParams.get("ref") || null,
        campaignId: searchParams.get("campaign") || null,
        leadId: searchParams.get("lead") || null,
      });

      navigate("/", { replace: true });
    } catch (err) {
      logger.error("Signup error:", err);
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <BackLink to="/client/login">
          Back
        </BackLink>
        <HeaderTitle>Create Account</HeaderTitle>
        <HeaderSpacer />
      </Header>

      <ProgressBar>
        {[1, 2, 3].map((s) => (
          <ProgressStep key={s} $active={step >= s}>
            {step > s ? <Check size={14} /> : s}
          </ProgressStep>
        ))}
      </ProgressBar>

      <ProgressLabels>
        <ProgressLabel $active={step >= 1}>Details</ProgressLabel>
        <ProgressLabel $active={step >= 2}>Verify</ProgressLabel>
        <ProgressLabel $active={step >= 3}>Confirm</ProgressLabel>
      </ProgressLabels>

      <Content>
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <StepContent>
            <StepTitle>Your Details</StepTitle>
            <StepDescription>
              Create your account to start booking entertainers.
            </StepDescription>

            <FormRow>
              <FormGroup>
                <Label>First Name</Label>
                <InputWrapper>
                  <InputIcon>
                    <User size={18} />
                  </InputIcon>
                  <Input
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    $error={fieldErrors.firstName}
                  />
                </InputWrapper>
                {fieldErrors.firstName && <ErrorText>{fieldErrors.firstName}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <Label>Last Name</Label>
                <InputWrapper>
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    $error={fieldErrors.lastName}
                  />
                </InputWrapper>
                {fieldErrors.lastName && <ErrorText>{fieldErrors.lastName}</ErrorText>}
              </FormGroup>
            </FormRow>

            <FormGroup>
              <Label>Phone Number</Label>
              <InputWrapper>
                <InputIcon>
                  <Phone size={18} />
                </InputIcon>
                <Input
                  type="tel"
                  placeholder="04XX XXX XXX"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  $error={fieldErrors.phone}
                />
              </InputWrapper>
              <HelpText>
                Required for account verification and booking updates
              </HelpText>
              {fieldErrors.phone && <ErrorText>{fieldErrors.phone}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label>Email</Label>
              <InputWrapper>
                <InputIcon>
                  <Mail size={18} />
                </InputIcon>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  $error={fieldErrors.email}
                />
              </InputWrapper>
              {fieldErrors.email && <ErrorText>{fieldErrors.email}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label>Confirm Email Address</Label>
              <InputWrapper>
                <InputIcon>
                  <Mail size={18} />
                </InputIcon>
                <Input
                  type="email"
                  placeholder="Re-enter your email"
                  value={formData.confirmEmail}
                  onChange={(e) => updateField("confirmEmail", e.target.value)}
                  $error={fieldErrors.confirmEmail}
                />
              </InputWrapper>
              {fieldErrors.confirmEmail && <ErrorText>{fieldErrors.confirmEmail}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label>Username</Label>
              <InputWrapper>
                <InputIcon>
                  <User size={18} />
                </InputIcon>
                <Input
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  $error={fieldErrors.username}
                />
              </InputWrapper>
              {fieldErrors.username && <ErrorText>{fieldErrors.username}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label>Date of Birth</Label>
              <InputWrapper>
                <InputIcon>
                  <Calendar size={18} />
                </InputIcon>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  $error={fieldErrors.dateOfBirth}
                />
              </InputWrapper>
              <HelpText>You must be at least 18 years old</HelpText>
              {fieldErrors.dateOfBirth && <ErrorText>{fieldErrors.dateOfBirth}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label>Password</Label>
              <InputWrapper>
                <InputIcon>
                  <Lock size={18} />
                </InputIcon>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create password (8+ characters)"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  $error={fieldErrors.password}
                />
                <PasswordToggle
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </PasswordToggle>
              </InputWrapper>
              {fieldErrors.password && <ErrorText>{fieldErrors.password}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label>Confirm Password</Label>
              <InputWrapper>
                <InputIcon>
                  <Lock size={18} />
                </InputIcon>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  $error={fieldErrors.confirmPassword}
                />
              </InputWrapper>
              {fieldErrors.confirmPassword && (
                <ErrorText>{fieldErrors.confirmPassword}</ErrorText>
              )}
            </FormGroup>
          </StepContent>
        )}

        {/* Step 2: Verification */}
        {step === 2 && (
          <StepContent>
            <StepTitle>Verify Your Identity</StepTitle>
            <StepDescription>
              ID verification is required to ensure the safety of our entertainers.
            </StepDescription>

            <FormGroup>
              <Label>ID Type</Label>
              <Select
                value={formData.idType}
                onChange={(e) => updateField("idType", e.target.value)}
                $error={fieldErrors.idType}
              >
                <option value="">Select ID type...</option>
                {ID_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              {fieldErrors.idType && <ErrorText>{fieldErrors.idType}</ErrorText>}
            </FormGroup>

            <VerificationNote>
              <Shield size={20} />
              <div>
                <strong>Identity Verification</strong>
                <p>ID verification confirms you are 18+ and creates a trusted profile.</p>
              </div>
            </VerificationNote>

            <InfoBox>
              <AlertTriangle size={16} />
              <span>
                You will be asked to upload your ID after signup. Your details are
                encrypted and stored securely.
              </span>
            </InfoBox>
          </StepContent>
        )}

        {/* Step 3: Terms & Conditions */}
        {step === 3 && (
          <StepContent>
            <StepTitle>Almost Done</StepTitle>
            <StepDescription>
              Please read and agree to our terms and safety guidelines.
            </StepDescription>

            <RulesBox>
              <RulesTitle>Safety Rules for Bookers</RulesTitle>
              <RulesList>
                <li>Entertainers are independent contractors, not Knockers employees</li>
                <li>Respect all entertainer boundaries and rules at all times</li>
                <li>Provide accurate event details when booking</li>
                <li>No photography or recording without explicit consent</li>
                <li>Ensure a safe environment for entertainers</li>
                <li>Cancellations within 72 hours incur full booking fee</li>
                <li>Harassment or inappropriate behavior will result in a permanent ban</li>
              </RulesList>
            </RulesBox>

            <CheckboxGroup>
              <Checkbox
                type="checkbox"
                id="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={(e) => updateField("agreeToTerms", e.target.checked)}
              />
              <CheckboxLabel htmlFor="agreeToTerms">
                I agree to the{" "}
                <TermsLink to="/legal/terms" target="_blank" rel="noopener noreferrer">
                  Terms & Conditions
                </TermsLink>{" "}
                and{" "}
                <TermsLink to="/legal/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </TermsLink>
              </CheckboxLabel>
            </CheckboxGroup>
            {fieldErrors.agreeToTerms && <ErrorText>{fieldErrors.agreeToTerms}</ErrorText>}

            <CheckboxGroup>
              <Checkbox
                type="checkbox"
                id="understandRules"
                checked={formData.understandRules}
                onChange={(e) => updateField("understandRules", e.target.checked)}
              />
              <CheckboxLabel htmlFor="understandRules">
                I understand that entertainers are self-contractors and Knockers is
                simply a platform that connects. We are not responsible for
                entertainer "quality" or availability.
              </CheckboxLabel>
            </CheckboxGroup>
            {fieldErrors.understandRules && (
              <ErrorText>{fieldErrors.understandRules}</ErrorText>
            )}

            <CheckboxGroup>
              <Checkbox
                type="checkbox"
                id="marketingOptIn"
                checked={formData.marketingOptIn}
                onChange={(e) => updateField("marketingOptIn", e.target.checked)}
              />
              <CheckboxLabel htmlFor="marketingOptIn">
                I agree to receive promotional messages (emails, SMS) about offers and updates.
              </CheckboxLabel>
            </CheckboxGroup>

            {error && <ErrorBox>{error}</ErrorBox>}
          </StepContent>
        )}
      </Content>

      <Footer>
        {step > 1 && (
          <BackButton type="button" onClick={prevStep}>
            Back
          </BackButton>
        )}
        {step < 3 ? (
          <NextButton type="button" onClick={nextStep}>
            Continue
            <ChevronRight size={20} />
          </NextButton>
        ) : (
          <SubmitButton type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? <LoadingSpinner size={20} /> : "Create Account"}
          </SubmitButton>
        )}
      </Footer>

      <LoginPrompt>
        Already have an account?{" "}
        <LoginLink to="/client/login">Log in</LoginLink>
      </LoginPrompt>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  padding-top: env(safe-area-inset-top, 0px);
  background: ${({ theme }) => theme.bg};
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: 16px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 1.1rem;
  border: 1px solid ${({ theme }) => theme.primary};
  border-radius: 50px;
  background: transparent;
  color: ${({ theme }) => theme.primary};
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
`;

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const HeaderSpacer = styled.div`
  width: 24px;
`;

const ProgressBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 20px;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 25%;
    right: 25%;
    height: 2px;
    background: ${({ theme }) => theme.border};
    transform: translateY(-50%);
    z-index: 0;
  }
`;

const ProgressStep = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  background: ${({ $active, theme }) => ($active ? theme.primary : theme.card)};
  color: ${({ $active }) => ($active ? "#1a1d21" : "#6b7280")};
  border: 2px solid ${({ $active, theme }) => ($active ? theme.primary : theme.border)};
  position: relative;
  z-index: 1;
`;

const ProgressLabels = styled.div`
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 0 20px 20px;
`;

const ProgressLabel = styled.span`
  font-size: 0.8rem;
  color: ${({ $active, theme }) => ($active ? theme.text : theme.muted)};
  font-weight: ${({ $active }) => ($active ? "600" : "400")};
  width: 60px;
  text-align: center;
`;

const Content = styled.div`
  flex: 1;
  padding: 0 20px 20px;
  overflow-y: auto;
`;

const StepContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const StepTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const StepDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
  line-height: 1.5;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.span`
  position: absolute;
  left: 14px;
  color: ${({ theme }) => theme.muted};
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  padding-left: ${({ $hasIcon }) => ($hasIcon !== false ? "44px" : "16px")};
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ $error, theme }) => ($error ? "#ef4444" : theme.border)};
  border-radius: 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
`;

const Select = styled.select`
  padding: 14px 16px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ $error, theme }) => ($error ? "#ef4444" : theme.border)};
  border-radius: 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.muted};
  cursor: pointer;
  padding: 4px;
  display: flex;
`;

const HelpText = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;

const ErrorText = styled.span`
  font-size: 0.8rem;
  color: #ef4444;
`;

const ErrorBox = styled.div`
  padding: 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #ef4444;
  font-size: 0.9rem;
`;

const VerificationNote = styled.div`
  display: flex;
  gap: 14px;
  padding: 16px;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 16px;

  svg {
    color: ${({ theme }) => theme.primary};
    flex-shrink: 0;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.text};
    margin-bottom: 4px;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: ${({ theme }) => theme.muted};
    line-height: 1.4;
  }
`;

const Checkbox = styled.input`
  width: 22px;
  height: 22px;
  accent-color: ${({ theme }) => theme.primary};
  flex-shrink: 0;
`;

const InfoBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 12px;
  font-size: 0.85rem;
  color: #f59e0b;
  line-height: 1.4;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const RulesBox = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 16px;
`;

const RulesTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const RulesList = styled.ul`
  margin: 0;
  padding-left: 20px;

  li {
    color: ${({ theme }) => theme.muted};
    font-size: 0.9rem;
    padding: 4px 0;
    line-height: 1.4;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const CheckboxLabel = styled.label`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};
  line-height: 1.5;
  cursor: pointer;
`;

const TermsLink = styled(Link)`
  color: ${({ theme }) => theme.primary};
  text-decoration: underline;
`;

const Footer = styled.div`
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.bg};
`;

const BackButton = styled.button`
  flex: 1;
  padding: 0.5rem 1.2rem;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.primary};
  border-radius: 50px;
  color: ${({ theme }) => theme.primary};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
`;

const NextButton = styled.button`
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: ${({ theme }) => theme.primary};
  border: none;
  border-radius: 12px;
  color: #1a1d21;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
`;

const SubmitButton = styled(NextButton)`
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoginPrompt = styled.p`
  text-align: center;
  padding: 20px;
  color: ${({ theme }) => theme.muted};
  font-size: 0.9rem;
`;

const LoginLink = styled(Link)`
  color: ${({ theme }) => theme.primary};
  font-weight: 600;
  text-decoration: none;
`;
