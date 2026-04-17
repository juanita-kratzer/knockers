// src/pages/client/UserPosts.jsx
// User request posts - Post ASAP or scheduled requests for entertainers to apply

import { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  Plus,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Zap,
  CheckCircle,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMyPosts, createUserPost, acceptApplication, cancelUserPost } from "../../hooks/useUserPosts";
import { entertainerCategories } from "../../data/entertainerTypes";
import useVerificationGate from "../../hooks/useVerificationGate";
import VerificationModal from "../../components/VerificationModal";
import { isIdentityVerified } from "../../lib/identityVerification";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import { logger } from "../../lib/logger";

export default function UserPosts() {
  const { user, userData } = useAuth();
  const { posts, loading } = useMyPosts(user?.uid);
  const { requireVerification, showModal: showVerifModal, dismissModal: dismissVerifModal } = useVerificationGate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    entertainerType: "",
    location: "",
    eventDate: "",
    eventTime: "",
    eventType: "",
    description: "",
    budget: "",
    bonusAmount: "",
    isAsap: false,
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!requireVerification()) return;
    if (!isIdentityVerified(userData, user)) {
      alert("Please verify your identity before posting a request.");
      return;
    }
    setCreating(true);

    try {
      await createUserPost({
        userId: user.uid,
        userName: user.displayName || "User",
        ...formData,
        budget: Number(formData.budget),
        bonusAmount: Number(formData.bonusAmount) || 0,
      });

      setShowCreateForm(false);
      setFormData({
        entertainerType: "",
        location: "",
        eventDate: "",
        eventTime: "",
        eventType: "",
        description: "",
        budget: "",
        bonusAmount: "",
        isAsap: false,
      });
    } catch (err) {
      logger.error("Create post error:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleAccept = async (postId, entertainerId) => {
    try {
      await acceptApplication(postId, entertainerId);
    } catch (err) {
      logger.error("Accept error:", err);
    }
  };

  const handleCancel = async (postId) => {
    try {
      await cancelUserPost(postId);
    } catch (err) {
      logger.error("Cancel error:", err);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="My Requests" showBack />
        <LoadingWrapper>
          <LoadingSpinner size={32} />
        </LoadingWrapper>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="My Requests" showBack />

      <Content>
        <CreateButton onClick={() => setShowCreateForm(true)}>
          <Plus size={20} />
          Post a Request
        </CreateButton>

        <Description>
          Post what you're looking for and let entertainers come to you. Great for
          last-minute bookings or specific requirements.
        </Description>

        {posts.length === 0 ? (
          <EmptyState
            icon={<Zap size={48} />}
            title="No requests yet"
            message="Post a request and entertainers will apply with their offers."
          />
        ) : (
          <PostsList>
            {posts.map((post) => (
              <PostCard key={post.id} $status={post.status}>
                <PostHeader>
                  <PostType>
                    {post.isAsap && <AsapBadge>ASAP</AsapBadge>}
                    {post.entertainerType}
                  </PostType>
                  <PostStatus $status={post.status}>
                    {post.status === "open" && "Open"}
                    {post.status === "filled" && "Filled"}
                    {post.status === "cancelled" && "Cancelled"}
                    {post.status === "expired" && "Expired"}
                  </PostStatus>
                </PostHeader>

                <PostDetails>
                  <PostDetail>
                    <MapPin size={14} />
                    {post.location}
                  </PostDetail>
                  <PostDetail>
                    <Clock size={14} />
                    {post.isAsap
                      ? "ASAP"
                      : new Date(post.eventDate).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                    {post.eventTime && `at ${post.eventTime}`}
                  </PostDetail>
                  <PostDetail>
                    <DollarSign size={14} />
                    ${post.budget}
                    {post.bonusAmount > 0 && ` (+$${post.bonusAmount} bonus)`}
                  </PostDetail>
                </PostDetails>

                <PostDescription>{post.description}</PostDescription>

                {/* Applications */}
                {post.status === "open" && post.applications?.length > 0 && (
                  <ApplicationsSection>
                    <ApplicationsTitle>
                      <Users size={16} />
                      {post.applications.length} Application
                      {post.applications.length !== 1 ? "s" : ""}
                    </ApplicationsTitle>

                    {post.applications.map((app, i) => (
                      <ApplicationCard key={i}>
                        <ApplicationInfo>
                          <ApplicationName>{app.entertainerName}</ApplicationName>
                          <ApplicationPrice>
                            ${app.proposedPrice}
                            {app.eta && ` - ETA ${app.eta}`}
                          </ApplicationPrice>
                          {app.message && (
                            <ApplicationMessage>{app.message}</ApplicationMessage>
                          )}
                        </ApplicationInfo>
                        <AcceptButton
                          onClick={() => handleAccept(post.id, app.entertainerId)}
                        >
                          Accept
                        </AcceptButton>
                      </ApplicationCard>
                    ))}
                  </ApplicationsSection>
                )}

                {post.status === "open" && (
                  <CancelLink onClick={() => handleCancel(post.id)}>
                    Cancel Request
                  </CancelLink>
                )}
              </PostCard>
            ))}
          </PostsList>
        )}
      </Content>

      {/* Create Form Modal */}
      {showCreateForm && (
        <ModalOverlay onClick={() => setShowCreateForm(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Post a Request</ModalTitle>
              <CloseButton onClick={() => setShowCreateForm(false)}>
                <X size={24} />
              </CloseButton>
            </ModalHeader>

            <ModalContent>
              <Form onSubmit={handleCreate}>
                <FormGroup>
                  <Label>Type of Entertainer</Label>
                  <Select
                    value={formData.entertainerType}
                    onChange={(e) => updateField("entertainerType", e.target.value)}
                    required
                  >
                    <option value="">Select type...</option>
                    {entertainerCategories.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                </FormGroup>

                <AsapToggle>
                  <ToggleLabel>
                    <Zap size={18} />
                    <span>I need someone ASAP</span>
                  </ToggleLabel>
                  <Toggle
                    type="checkbox"
                    checked={formData.isAsap}
                    onChange={(e) => updateField("isAsap", e.target.checked)}
                  />
                </AsapToggle>

                {!formData.isAsap && (
                  <FormRow>
                    <FormGroup>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.eventDate}
                        onChange={(e) => updateField("eventDate", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        required={!formData.isAsap}
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={formData.eventTime}
                        onChange={(e) => updateField("eventTime", e.target.value)}
                        required={!formData.isAsap}
                      />
                    </FormGroup>
                  </FormRow>
                )}

                <FormGroup>
                  <Label>Location / Suburb</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Sydney CBD"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Event Type</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Birthday Party, Hens Night"
                    value={formData.eventType}
                    onChange={(e) => updateField("eventType", e.target.value)}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Budget</Label>
                  <InputWrapper>
                    <DollarIcon>$</DollarIcon>
                    <Input
                      type="number"
                      placeholder="Your budget"
                      value={formData.budget}
                      onChange={(e) => updateField("budget", e.target.value)}
                      required
                      min="50"
                      $padLeft
                    />
                  </InputWrapper>
                </FormGroup>

                {formData.isAsap && (
                  <FormGroup>
                    <Label>Bonus for Quick Response (optional)</Label>
                    <InputWrapper>
                      <DollarIcon>$</DollarIcon>
                      <Input
                        type="number"
                        placeholder="Extra $ for ASAP"
                        value={formData.bonusAmount}
                        onChange={(e) => updateField("bonusAmount", e.target.value)}
                        min="0"
                        $padLeft
                      />
                    </InputWrapper>
                    <HelpText>
                      Offering a bonus attracts more entertainers quickly
                    </HelpText>
                  </FormGroup>
                )}

                <FormGroup>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe what you're looking for..."
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={4}
                    required
                  />
                </FormGroup>

                <SubmitButton type="submit" disabled={creating}>
                  {creating ? "Posting..." : "Post Request"}
                </SubmitButton>
              </Form>
            </ModalContent>
          </Modal>
        </ModalOverlay>
      )}
      <VerificationModal show={showVerifModal} onDismiss={dismissVerifModal} />
    </PageContainer>
  );
}

const Content = styled.div`
  padding: 0 16px 40px;
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 60px 0;
`;

const CreateButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px;
  background: ${({ theme }) => theme.primary};
  border: none;
  border-radius: 16px;
  color: #1a1d21;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 16px;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.muted};
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 24px;
`;

const PostsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PostCard = styled.div`
  padding: 20px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  opacity: ${({ $status }) => ($status === "cancelled" || $status === "expired" ? 0.6 : 1)};
`;

const PostHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const PostType = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const AsapBadge = styled.span`
  padding: 4px 8px;
  background: #f59e0b;
  color: #1a1d21;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 6px;
`;

const PostStatus = styled.span`
  padding: 6px 12px;
  background: ${({ $status }) => {
    if ($status === "open") return "rgba(34, 197, 94, 0.15)";
    if ($status === "filled") return "rgba(135, 206, 235, 0.15)";
    return "rgba(107, 114, 128, 0.15)";
  }};
  color: ${({ $status }) => {
    if ($status === "open") return "#22c55e";
    if ($status === "filled") return "#87CEEB";
    return "#6b7280";
  }};
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 8px;
  text-transform: uppercase;
`;

const PostDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
`;

const PostDetail = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.muted};
  font-size: 0.85rem;

  svg {
    color: ${({ theme }) => theme.primary};
  }
`;

const PostDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const ApplicationsSection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.border};
`;

const ApplicationsTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin-bottom: 12px;

  svg {
    color: ${({ theme }) => theme.primary};
  }
`;

const ApplicationCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 12px;
  margin-bottom: 8px;
`;

const ApplicationInfo = styled.div`
  flex: 1;
`;

const ApplicationName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const ApplicationPrice = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.primary};
  margin-top: 2px;
`;

const ApplicationMessage = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  margin-top: 4px;
`;

const AcceptButton = styled.button`
  padding: 10px 18px;
  background: ${({ theme }) => theme.primary};
  border: none;
  border-radius: 10px;
  color: #1a1d21;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
`;

const CancelLink = styled.button`
  margin-top: 16px;
  padding: 0;
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.85rem;
  cursor: pointer;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;

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
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const ModalTitle = styled.h2`
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
`;

const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
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

const Input = styled.input`
  padding: 14px 16px;
  padding-left: ${({ $padLeft }) => ($padLeft ? "36px" : "16px")};
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
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

const InputWrapper = styled.div`
  position: relative;
`;

const DollarIcon = styled.span`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.muted};
  font-weight: 600;
`;

const Select = styled.select`
  padding: 14px 16px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
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

const AsapToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
`;

const ToggleLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f59e0b;
  font-weight: 600;
`;

const Toggle = styled.input`
  width: 44px;
  height: 24px;
  appearance: none;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 12px;
  position: relative;
  cursor: pointer;

  &:checked {
    background: #f59e0b;
  }

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s ease;
  }

  &:checked::after {
    transform: translateX(20px);
  }
`;

const HelpText = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;

const SubmitButton = styled.button`
  padding: 16px;
  background: ${({ theme }) => theme.primary};
  border: none;
  border-radius: 12px;
  color: #1a1d21;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;


