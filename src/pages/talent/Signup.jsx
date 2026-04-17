// src/pages/talent/Signup.jsx
// Comprehensive entertainer signup; payouts via Stripe Connect (Finances page)

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
  ChevronLeft,
  Check,
  AlertTriangle,
  Theater,
  ContactRound,
  Calendar,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import SuburbAutocomplete from "../../components/SuburbAutocomplete";
import { entertainerCategories } from "../../data/entertainerTypes";
import { logger } from "../../lib/logger";

const ID_TYPES = [
  "Australian Driver's Licence",
  "Australian Passport",
  "Foreign Passport with Visa",
  "Proof of Age Card",
  "Photo Card",
];

const WORK_RIGHTS = [
  "Australian Citizen",
  "Permanent Resident",
  "Valid Work Visa",
  "Working Holiday Visa",
];

export default function TalentSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signup, addEntertainerProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const isAddingToExistingAccount = !!user;

  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    firstName: "",
    lastName: "",
    stageName: "",
    username: "",
    dateOfBirth: "",
    email: "",
    confirmEmail: "",
    phone: "",
    password: "",
    confirmPassword: "",

    // Step 2: Entertainer Details
    entertainerTypes: [],
    bio: "",
    locationData: null, // { suburb, state, region, lat, lng } from SuburbAutocomplete; required to submit

    // Step 3: Verification
    idType: "",
    workRights: "",
    blockContacts: false,
    policeCheckOptIn: false,

    // Step 4: T&C
    agreeToTerms: false,
    understandContractor: false,
    marketingOptIn: false,
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const toggleEntertainerType = (type) => {
    setFormData((prev) => ({
      ...prev,
      entertainerTypes: prev.entertainerTypes.includes(type)
        ? prev.entertainerTypes.filter((t) => t !== type)
        : [...prev.entertainerTypes, type],
    }));
  };

  const validateStep = (stepNum) => {
    const errors = {};

    if (stepNum === 1) {
      if (!formData.stageName.trim()) errors.stageName = "Stage name is required";
      if (!isAddingToExistingAccount) {
        if (!formData.username.trim()) errors.username = "Username is required";
        else if (formData.username.length < 3) errors.username = "Username must be at least 3 characters";
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
      if (isAddingToExistingAccount) {
        // Only stage name (+ username above) required when adding to existing account
      } else {
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
        if (!formData.password) errors.password = "Password is required";
        else if (formData.password.length < 8) {
          errors.password = "Password must be at least 8 characters";
        }
        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = "Passwords do not match";
        }
      }
    }

    if (stepNum === 2) {
      if (formData.entertainerTypes.length === 0) {
        errors.entertainerTypes = "Select at least one entertainer type";
      }
      if (!formData.locationData) errors.location = "Please select a valid suburb";
    }

    if (stepNum === 3) {
      if (!formData.idType) errors.idType = "Please select an ID type";
      if (!formData.workRights) errors.workRights = "Work rights selection is required";
    }

    if (stepNum === 4) {
      if (!formData.agreeToTerms) {
        errors.agreeToTerms = "You must agree to the Terms & Conditions";
      }
      if (!formData.understandContractor) {
        errors.understandContractor = "You must acknowledge the contractor agreement";
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

  const buildEntertainerProfileData = () => ({
    displayName: formData.stageName,
    bio: formData.bio || "",
    suburb: formData.locationData?.suburb ?? "",
    location: formData.locationData ?? undefined,
    categories: formData.entertainerTypes || [],
    isAdultContent: false,
    profileType: formData.policeCheckOptIn ? "hard" : "soft",
    idType: formData.idType,
    workRights: formData.workRights,
    blockContacts: formData.blockContacts,
    agreedToTermsAt: new Date(),
    agreementVersion: "v1",
    // Bank details deprecated; payouts via Stripe Connect (Finances page)
  });

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    setError(null);

    try {
      if (isAddingToExistingAccount) {
        await addEntertainerProfile(buildEntertainerProfileData());
        navigate("/talent/edit-profile", { replace: true });
      } else {
        await signup(formData.email, formData.password, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          displayName: formData.stageName,
          username: formData.username,
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone,
          role: "entertainer",
          profileType: formData.policeCheckOptIn ? "hard" : "soft",
          entertainerTypes: formData.entertainerTypes,
          bio: formData.bio,
          locationData: formData.locationData,
          idType: formData.idType,
          idVerified: false,
          workRights: formData.workRights,
          blockContacts: formData.blockContacts,
          agreedToTermsAt: new Date(),
          termsVersion: "v1",
          agreementVersion: "v1",
          marketingOptIn: formData.marketingOptIn,
          signupSource: searchParams.get("source") || null,
          referralCode: searchParams.get("ref") || null,
          campaignId: searchParams.get("campaign") || null,
          leadId: searchParams.get("lead") || null,
        });
        navigate("/talent/edit-profile", { replace: true });
      }
    } catch (err) {
      logger.error("Signup error:", err);
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 4;

  return (
    <Container>
      <Header>
        <BackLink to={isAddingToExistingAccount ? "/settings" : "/talent/login"}>
          <ChevronLeft size={24} />
        </BackLink>
        <HeaderTitle>Join as Entertainer</HeaderTitle>
        <HeaderSpacer />
      </Header>

      <ProgressBar>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <ProgressStep key={s} $active={step >= s}>
            {step > s ? <Check size={12} /> : s}
          </ProgressStep>
        ))}
      </ProgressBar>

      <Content>
        {/* Step 1: Basic Info (or just performer details when already signed in) */}
        {step === 1 && (
          <StepContent>
            <StepTitle>{isAddingToExistingAccount ? "Your Performer Details" : "Your Details"}</StepTitle>
            <StepDescription>
              {isAddingToExistingAccount
                ? "You're signed in. Add the details clients will see."
                : "Personal info is kept private. Your stage name is what clients see."}
            </StepDescription>
            {isAddingToExistingAccount ? (
              <SignupNote>
                Signed in as <strong>{user.email}</strong>. Adding an entertainer profile keeps you on the same account — you can switch between client and entertainer anytime.
              </SignupNote>
            ) : (
              <SignupNote>
                Creating an entertainer profile also gives you a client profile on the same account — you can switch between hiring and offering services anytime. (Signing up as a client only creates a client account.)
              </SignupNote>
            )}

            {!isAddingToExistingAccount && (
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
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    $error={fieldErrors.lastName}
                  />
                  {fieldErrors.lastName && <ErrorText>{fieldErrors.lastName}</ErrorText>}
                </FormGroup>
              </FormRow>
            )}

            <FormGroup>
              <Label>Stage Name / Display Name</Label>
              <InputWrapper>
                <InputIcon>
                  <Theater size={18} />
                </InputIcon>
                <Input
                  type="text"
                  placeholder="Your performer name"
                  value={formData.stageName}
                  onChange={(e) => updateField("stageName", e.target.value)}
                  $error={fieldErrors.stageName}
                />
              </InputWrapper>
              <HelpText>This is what clients will see on your profile</HelpText>
              {fieldErrors.stageName && <ErrorText>{fieldErrors.stageName}</ErrorText>}
            </FormGroup>

            {!isAddingToExistingAccount && (
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
                <HelpText>Lowercase, min 3 characters</HelpText>
                {fieldErrors.username && <ErrorText>{fieldErrors.username}</ErrorText>}
              </FormGroup>
            )}

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
              <Label>Phone Number{!isAddingToExistingAccount ? "" : " (optional)"}</Label>
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
              <HelpText>Hidden from clients - for verification only</HelpText>
              {fieldErrors.phone && <ErrorText>{fieldErrors.phone}</ErrorText>}
            </FormGroup>

            {!isAddingToExistingAccount && (
              <>
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
                  <HelpText>Hidden from clients - for account access only</HelpText>
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
              </>
            )}
          </StepContent>
        )}

        {/* Step 2: Entertainer Details */}
        {step === 2 && (
          <StepContent>
            <StepTitle>What Do You Offer?</StepTitle>
            <StepDescription>
              Select all that apply — performances, acts, or equipment and event hire (e.g. fairy floss, jumping castle, popcorn machine).
            </StepDescription>

            <TypesGrid>
              {entertainerCategories.map((cat) => (
                <TypeCard
                  key={cat.name}
                  $selected={formData.entertainerTypes.includes(cat.name)}
                  onClick={() => toggleEntertainerType(cat.name)}
                  $adult={cat.ageRestricted}
                >
                  <TypeName>{cat.name}</TypeName>
                  {cat.ageRestricted && <AdultBadge>18+</AdultBadge>}
                </TypeCard>
              ))}
            </TypesGrid>
            {fieldErrors.entertainerTypes && (
              <ErrorText>{fieldErrors.entertainerTypes}</ErrorText>
            )}

            <FormGroup>
              <Label>Short Bio (optional)</Label>
              <Textarea
                placeholder="Tell clients about yourself, your act, or what you hire out..."
                value={formData.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                rows={3}
                maxLength={300}
              />
              <CharCount>{formData.bio.length}/300</CharCount>
            </FormGroup>

            <FormGroup>
              <Label>Your Location / Suburb</Label>
              <SuburbAutocomplete
                value={formData.locationData}
                onChange={(loc) => updateField("locationData", loc)}
                error={fieldErrors.location}
                placeholder="e.g. Burleigh Heads, Surfers Paradise"
                aria-label="Suburb"
              />
              <HelpText>Select a suburb from the list so clients can find you on the map.</HelpText>
              {fieldErrors.location && <ErrorText>{fieldErrors.location}</ErrorText>}
            </FormGroup>
          </StepContent>
        )}

        {/* Step 3: Verification */}
        {step === 3 && (
          <StepContent>
            <StepTitle>Verify Your Identity</StepTitle>
            <StepDescription>
              Required to ensure you are who you say you are and can legally work.
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

            <FormGroup>
              <Label>Work Rights in Australia</Label>
              <Select
                value={formData.workRights}
                onChange={(e) => updateField("workRights", e.target.value)}
                $error={fieldErrors.workRights}
              >
                <option value="">Select your work rights...</option>
                {WORK_RIGHTS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              {fieldErrors.workRights && <ErrorText>{fieldErrors.workRights}</ErrorText>}
            </FormGroup>

            <Divider />

            <PrivacyOption>
              <PrivacyInfo>
                <ContactRound size={24} />
                <div>
                  <strong>Block Known Contacts</strong>
                  <p>
                    Optionally sync your contacts to automatically block people you know
                    from seeing your profile.
                  </p>
                </div>
              </PrivacyInfo>
              <Checkbox
                type="checkbox"
                checked={formData.blockContacts}
                onChange={(e) => updateField("blockContacts", e.target.checked)}
              />
            </PrivacyOption>

            <PoliceCheckOption style={{ marginTop: "16px" }}>
              <Checkbox
                type="checkbox"
                id="talent-police-check"
                checked={formData.policeCheckOptIn}
                onChange={(e) => updateField("policeCheckOptIn", e.target.checked)}
              />
              <label htmlFor="talent-police-check">
                <strong>Hard profile:</strong> I have (or will complete) a police check. Soft = ID only; Hard = police check verified.
              </label>
            </PoliceCheckOption>

            <InfoBox>
              <Shield size={16} />
              <span>
                Your identity documents are encrypted and stored securely. They are only
                used for verification purposes.
              </span>
            </InfoBox>
          </StepContent>
        )}

        {/* Step 4: Terms & Conditions */}
        {step === 4 && (
          <StepContent>
            <StepTitle>Final Step</StepTitle>
            <StepDescription>
              Please read and agree to our terms and contractor agreement.
            </StepDescription>

            <RulesBox>
              <RulesTitle>Important Information</RulesTitle>
              <RulesList>
                <li>You are an independent contractor, not a Knockers employee</li>
                <li>You set your own prices, services, and availability</li>
                <li>Knockers takes a $30 booking fee from each booking</li>
                <li>Cancelling bookings may result in penalties and fees</li>
                <li>Maintain professional conduct at all times</li>
                <li>Respect client privacy and event details</li>
                <li>Report any safety concerns immediately</li>
              </RulesList>
            </RulesBox>

            <InfoBox>
              <AlertTriangle size={16} />
              <span>
                Frequent cancellations or no-shows will result in account penalties and
                potential suspension.
              </span>
            </InfoBox>

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
                </TermsLink>
                ,{" "}
                <TermsLink to="/legal/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </TermsLink>
                , and{" "}
                <TermsLink to="/legal/contractor" target="_blank" rel="noopener noreferrer">
                  Contractor Agreement
                </TermsLink>
              </CheckboxLabel>
            </CheckboxGroup>
            {fieldErrors.agreeToTerms && <ErrorText>{fieldErrors.agreeToTerms}</ErrorText>}

            <CheckboxGroup>
              <Checkbox
                type="checkbox"
                id="understandContractor"
                checked={formData.understandContractor}
                onChange={(e) => updateField("understandContractor", e.target.checked)}
              />
              <CheckboxLabel htmlFor="understandContractor">
                I understand that I am signing up as an independent contractor and
                Knockers is a platform that connects entertainers with clients.
              </CheckboxLabel>
            </CheckboxGroup>
            {fieldErrors.understandContractor && (
              <ErrorText>{fieldErrors.understandContractor}</ErrorText>
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
        {step < totalSteps ? (
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

      {!isAddingToExistingAccount && (
        <LoginPrompt>
          Already have an account?{" "}
          <LoginLink to="/talent/login">Log in</LoginLink>
        </LoginPrompt>
      )}
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
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
  color: ${({ theme }) => theme.text};
  display: flex;
  align-items: center;
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
  gap: 20px;
  padding: 16px 20px;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 15%;
    right: 15%;
    height: 2px;
    background: ${({ theme }) => theme.border};
    transform: translateY(-50%);
    z-index: 0;
  }
`;

const ProgressStep = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${({ $active, theme }) => ($active ? theme.primary : theme.card)};
  color: ${({ $active }) => ($active ? "#1a1d21" : "#6b7280")};
  border: 2px solid ${({ $active, theme }) => ($active ? theme.primary : theme.border)};
  position: relative;
  z-index: 1;
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

const SignupNote = styled.p`
  margin: 0 0 20px 0;
  padding: 12px 14px;
  background: ${({ theme }) => theme.bgAlt || "rgba(255,255,255,0.06)"};
  border-radius: 10px;
  border-left: 3px solid ${({ theme }) => theme.primary || "#c084fc"};
  color: ${({ theme }) => theme.muted};
  font-size: 0.85rem;
  line-height: 1.45;
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

const Textarea = styled.textarea`
  padding: 14px 16px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
  outline: none;
  resize: none;
  font-family: inherit;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
`;

const CharCount = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  text-align: right;
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

const TypesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`;

const TypeCard = styled.button`
  padding: 14px;
  background: ${({ $selected, theme }) =>
    $selected ? `${theme.primary}15` : theme.bgAlt};
  border: 2px solid ${({ $selected, theme }) =>
    $selected ? theme.primary : theme.border};
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const TypeName = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const AdultBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 6px;
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 4px;
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.border};
`;

const PrivacyOption = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
`;

const PrivacyInfo = styled.div`
  display: flex;
  gap: 14px;

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
    font-size: 0.85rem;
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

const PoliceCheckOption = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;

  label {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.text};
    line-height: 1.4;
    cursor: pointer;
  }
`;

const InfoBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(135, 206, 235, 0.1);
  border-radius: 12px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.primary};
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
  padding: 16px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
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
