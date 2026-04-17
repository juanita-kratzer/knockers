// src/components/BookNowForm.jsx
// Comprehensive booking request form

import { useState } from "react";
import styled from "styled-components";
import { X, Calendar, Clock, MapPin, Users, PartyPopper, Info, AlertTriangle } from "lucide-react";

const EVENT_TYPES = [
  "Birthday Party",
  "Bucks Party",
  "Hens Party",
  "Corporate Event",
  "Wedding",
  "Private Party",
  "Club/Bar Event",
  "Festival",
  "Other",
];

const AGE_GROUPS = ["18-25", "26-35", "36-45", "46-55", "55+", "Mixed"];

export default function BookNowForm({ entertainer, onSubmit, onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    location: "",
    isIndoors: true,
    eventType: "",
    otherEventType: "",
    numberOfPeople: "",
    genderMix: "",
    ageGroup: "",
    selectedServices: [],
    specialRequests: "",
    acknowledgedRules: false,
  });
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const toggleService = (serviceId) => {
    setFormData((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter((id) => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  const validateStep = (stepNum) => {
    const newErrors = {};

    if (stepNum === 1) {
      if (!formData.date) newErrors.date = "Date is required";
      if (!formData.time) newErrors.time = "Time is required";
      if (!formData.location) newErrors.location = "Location is required";
    }

    if (stepNum === 2) {
      if (!formData.eventType) newErrors.eventType = "Event type is required";
      if (!formData.numberOfPeople) newErrors.numberOfPeople = "Number of guests is required";
    }

    if (stepNum === 3) {
      if (formData.selectedServices.length === 0) {
        newErrors.services = "Select at least one service";
      }
    }

    if (stepNum === 4) {
      if (!formData.acknowledgedRules) {
        newErrors.rules = "You must acknowledge the rules";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    if (validateStep(4)) {
      const selectedServiceDetails = entertainer.services?.filter((s) =>
        formData.selectedServices.includes(s.id)
      ) || [];

      const totalEstimate = selectedServiceDetails.reduce(
        (sum, s) => sum + (s.price || 0),
        0
      );

      onSubmit({
        ...formData,
        entertainerId: entertainer.id,
        entertainerName: entertainer.displayName,
        eventType: formData.eventType === "Other" ? formData.otherEventType : formData.eventType,
        selectedServiceDetails,
        estimatedTotal: totalEstimate,
      });
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderTitle>
            {step === 1 && "When & Where"}
            {step === 2 && "Event Details"}
            {step === 3 && "Select Services"}
            {step === 4 && "Review & Confirm"}
          </HeaderTitle>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </Header>

        <ProgressBar>
          {[1, 2, 3, 4].map((s) => (
            <ProgressStep key={s} $active={step >= s} />
          ))}
        </ProgressBar>

        <Content>
          {/* Step 1: Date, Time, Location */}
          {step === 1 && (
            <StepContent>
              <FormGroup>
                <Label>
                  <Calendar size={16} />
                  Date
                </Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  $error={errors.date}
                />
                {errors.date && <ErrorText>{errors.date}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <Label>
                  <Clock size={16} />
                  Time
                </Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => updateField("time", e.target.value)}
                  $error={errors.time}
                />
                {errors.time && <ErrorText>{errors.time}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <Label>
                  <MapPin size={16} />
                  Location / Suburb
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Sydney CBD, Bondi Beach"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  $error={errors.location}
                />
                {errors.location && <ErrorText>{errors.location}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <Label>Venue Type</Label>
                <ToggleGroup>
                  <ToggleButton
                    type="button"
                    $active={formData.isIndoors}
                    onClick={() => updateField("isIndoors", true)}
                  >
                    Indoors
                  </ToggleButton>
                  <ToggleButton
                    type="button"
                    $active={!formData.isIndoors}
                    onClick={() => updateField("isIndoors", false)}
                  >
                    Outdoors
                  </ToggleButton>
                </ToggleGroup>
              </FormGroup>
            </StepContent>
          )}

          {/* Step 2: Event Details */}
          {step === 2 && (
            <StepContent>
              <FormGroup>
                <Label>
                  <PartyPopper size={16} />
                  Event Type
                </Label>
                <Select
                  value={formData.eventType}
                  onChange={(e) => updateField("eventType", e.target.value)}
                  $error={errors.eventType}
                >
                  <option value="">Select event type...</option>
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                {errors.eventType && <ErrorText>{errors.eventType}</ErrorText>}
              </FormGroup>

              {formData.eventType === "Other" && (
                <FormGroup>
                  <Label>Describe your event</Label>
                  <Input
                    type="text"
                    placeholder="What kind of event?"
                    value={formData.otherEventType}
                    onChange={(e) => updateField("otherEventType", e.target.value)}
                  />
                </FormGroup>
              )}

              <FormGroup>
                <Label>
                  <Users size={16} />
                  Number of Guests
                </Label>
                <Input
                  type="number"
                  placeholder="How many people?"
                  value={formData.numberOfPeople}
                  onChange={(e) => updateField("numberOfPeople", e.target.value)}
                  min="1"
                  $error={errors.numberOfPeople}
                />
                {errors.numberOfPeople && <ErrorText>{errors.numberOfPeople}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <Label>Gender Mix (optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g. All female, Mixed, 10M/5F"
                  value={formData.genderMix}
                  onChange={(e) => updateField("genderMix", e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <Label>Age Group (optional)</Label>
                <Select
                  value={formData.ageGroup}
                  onChange={(e) => updateField("ageGroup", e.target.value)}
                >
                  <option value="">Select age group...</option>
                  {AGE_GROUPS.map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            </StepContent>
          )}

          {/* Step 3: Services */}
          {step === 3 && (
            <StepContent>
              <SectionTitle>Select Services</SectionTitle>

              {entertainer.services && entertainer.services.length > 0 ? (
                <ServicesList>
                  {entertainer.services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      $selected={formData.selectedServices.includes(service.id)}
                      onClick={() => toggleService(service.id)}
                    >
                      <ServiceHeader>
                        <ServiceName>{service.name}</ServiceName>
                        <ServicePrice>${service.price}</ServicePrice>
                      </ServiceHeader>
                      <ServiceDuration>{service.duration}</ServiceDuration>
                      <ServiceDescription>{service.description}</ServiceDescription>
                      <ServiceCheckbox
                        $checked={formData.selectedServices.includes(service.id)}
                      />
                    </ServiceCard>
                  ))}
                </ServicesList>
              ) : (
                <EmptyServices>
                  <Info size={24} />
                  <p>This entertainer will send you a custom quote after reviewing your request.</p>
                </EmptyServices>
              )}

              {errors.services && <ErrorText>{errors.services}</ErrorText>}

              <FormGroup>
                <Label>Special Requests (optional)</Label>
                <Textarea
                  placeholder="Any specific requirements, songs, themes, or notes for the entertainer..."
                  value={formData.specialRequests}
                  onChange={(e) => updateField("specialRequests", e.target.value)}
                  rows={4}
                />
              </FormGroup>
            </StepContent>
          )}

          {/* Step 4: Review & Rules */}
          {step === 4 && (
            <StepContent>
              <DisclaimerBox>
                <AlertTriangle size={20} />
                <DisclaimerText>
                  Make sure you have read and understood the entertainer's rules and special
                  requirements properly. If you do not accommodate those needs, your booking
                  will be cancelled at your expense.
                </DisclaimerText>
              </DisclaimerBox>

              <SectionTitle>Booking Summary</SectionTitle>

              <SummaryCard>
                <SummaryRow>
                  <SummaryLabel>Entertainer</SummaryLabel>
                  <SummaryValue>{entertainer.displayName}</SummaryValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryLabel>Date</SummaryLabel>
                  <SummaryValue>
                    {formData.date
                      ? new Date(formData.date).toLocaleDateString("en-AU", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })
                      : "-"}
                  </SummaryValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryLabel>Time</SummaryLabel>
                  <SummaryValue>{formData.time || "-"}</SummaryValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryLabel>Location</SummaryLabel>
                  <SummaryValue>{formData.location}</SummaryValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryLabel>Venue</SummaryLabel>
                  <SummaryValue>{formData.isIndoors ? "Indoors" : "Outdoors"}</SummaryValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryLabel>Event</SummaryLabel>
                  <SummaryValue>
                    {formData.eventType === "Other"
                      ? formData.otherEventType
                      : formData.eventType}
                  </SummaryValue>
                </SummaryRow>
                <SummaryRow>
                  <SummaryLabel>Guests</SummaryLabel>
                  <SummaryValue>{formData.numberOfPeople}</SummaryValue>
                </SummaryRow>
              </SummaryCard>

              {entertainer.rules && entertainer.rules.length > 0 && (
                <>
                  <SectionTitle>Entertainer's Rules</SectionTitle>
                  <RulesList>
                    {entertainer.rules.map((rule, i) => (
                      <RuleItem key={i}>{rule}</RuleItem>
                    ))}
                  </RulesList>
                </>
              )}

              {entertainer.specialRequirements && (
                <>
                  <SectionTitle>Special Requirements</SectionTitle>
                  <RequirementsBox>{entertainer.specialRequirements}</RequirementsBox>
                </>
              )}

              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  id="acknowledgeRules"
                  checked={formData.acknowledgedRules}
                  onChange={(e) => updateField("acknowledgedRules", e.target.checked)}
                />
                <CheckboxLabel htmlFor="acknowledgeRules">
                  I have read and agree to the entertainer's rules and requirements. I
                  understand that failure to comply may result in cancellation at my expense.
                </CheckboxLabel>
              </CheckboxGroup>
              {errors.rules && <ErrorText>{errors.rules}</ErrorText>}
            </StepContent>
          )}
        </Content>

        <Footer>
          {step > 1 && (
            <BackButton type="button" onClick={prevStep}>
              Back
            </BackButton>
          )}
          {step < 4 ? (
            <NextButton type="button" onClick={nextStep}>
              Continue
            </NextButton>
          ) : (
            <SubmitButton type="button" onClick={handleSubmit}>
              Send Request
            </SubmitButton>
          )}
        </Footer>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 0;

  @media (min-width: 640px) {
    align-items: center;
    padding: 20px;
  }
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.card};
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (min-width: 640px) {
    border-radius: 24px;
    max-height: 85vh;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.muted};
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: ${({ theme }) => theme.text};
  }
`;

const ProgressBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 0 20px 16px;
`;

const ProgressStep = styled.div`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: ${({ $active, theme }) => ($active ? theme.primary : theme.border)};
  transition: background 0.2s ease;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const StepContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const Input = styled.input`
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
  cursor: pointer;

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
  resize: vertical;
  min-height: 100px;
  font-family: inherit;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
`;

const ToggleGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const ToggleButton = styled.button`
  flex: 1;
  padding: 14px;
  background: ${({ $active, theme }) => ($active ? theme.primary : theme.bgAlt)};
  color: ${({ $active, theme }) => ($active ? "#1a1d21" : theme.text)};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.primary : theme.border)};
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
`;

const ErrorText = styled.span`
  font-size: 0.8rem;
  color: #ef4444;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const ServicesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ServiceCard = styled.div`
  padding: 16px;
  background: ${({ $selected, theme }) =>
    $selected ? `${theme.primary}15` : theme.bgAlt};
  border: 2px solid ${({ $selected, theme }) => ($selected ? theme.primary : theme.border)};
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const ServiceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const ServiceName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const ServicePrice = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
`;

const ServiceDuration = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const ServiceDescription = styled.p`
  margin: 8px 0 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.4;
`;

const ServiceCheckbox = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid ${({ $checked, theme }) => ($checked ? theme.primary : theme.border)};
  background: ${({ $checked, theme }) => ($checked ? theme.primary : "transparent")};

  &::after {
    content: ${({ $checked }) => ($checked ? "'\\2713'" : "''")};
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a1d21;
    font-size: 14px;
    font-weight: bold;
  }
`;

const EmptyServices = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 16px;
  text-align: center;
  color: ${({ theme }) => theme.muted};

  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

const DisclaimerBox = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  color: #f59e0b;
`;

const DisclaimerText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
`;

const SummaryCard = styled.div`
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 16px;
  padding: 16px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  &:last-child {
    border-bottom: none;
  }
`;

const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.muted};
  font-size: 0.9rem;
`;

const SummaryValue = styled.span`
  color: ${({ theme }) => theme.text};
  font-weight: 600;
  font-size: 0.9rem;
`;

const RulesList = styled.ul`
  margin: 0;
  padding-left: 20px;
`;

const RuleItem = styled.li`
  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;
  padding: 4px 0;
`;

const RequirementsBox = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 12px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};
  line-height: 1.5;
`;

const CheckboxGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  margin-top: 2px;
  accent-color: ${({ theme }) => theme.primary};
`;

const CheckboxLabel = styled.label`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};
  line-height: 1.5;
  cursor: pointer;
`;

const Footer = styled.div`
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid ${({ theme }) => theme.border};
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
  padding: 16px;
  background: ${({ theme }) => theme.primary};
  border: none;
  border-radius: 12px;
  color: #1a1d21;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
`;

const SubmitButton = styled(NextButton)``;


