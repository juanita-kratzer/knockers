// src/pages/talent/EditProfile.jsx
// Entertainer profile editing page

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import { useMyEntertainerProfile, saveEntertainerProfile, toggleEntertainerActive } from "../../hooks/useEntertainers";
import { entertainerCategories } from "../../data/entertainerTypes";
import { storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storagePaths } from "../../lib/collections";
import { sanitizeOrReject } from "../../lib/contentModeration";
import LoadingSpinner from "../../components/LoadingSpinner";
import SuburbAutocomplete from "../../components/SuburbAutocomplete";
import { canUsePaidFeatures } from "../../lib/verificationFee";
import { logger } from "../../lib/logger";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { entertainer, loading } = useMyEntertainerProfile(user?.uid);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    categories: [],
    subCategories: [],
    suburb: "",
    locationData: null, // { suburb, state, region, lat, lng } from SuburbAutocomplete
    baseRate: "",
    profileType: "soft",
    photos: [],
    servicesIncludedInRate: [],
    servicesExtra: [],
    availability: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
  });

  // Load existing profile data
  useEffect(() => {
    if (entertainer) {
      setFormData({
        displayName: entertainer.displayName || "",
        bio: entertainer.bio || "",
        categories: entertainer.categories || [],
        subCategories: entertainer.subCategories || [],
        suburb: entertainer.suburb || "",
        locationData: entertainer.location && typeof entertainer.location === "object"
          ? {
              suburb: entertainer.location.suburb ?? entertainer.suburb ?? "",
              state: entertainer.location.state ?? "",
              region: entertainer.location.region ?? "",
              lat: entertainer.location.lat ?? 0,
              lng: entertainer.location.lng ?? 0,
            }
          : null,
        baseRate: entertainer.pricing?.baseRate || "",
        profileType: entertainer.profileType === "hard" ? "hard" : "soft",
        photos: entertainer.photos || [],
        servicesIncludedInRate: entertainer.servicesIncludedInRate?.length
          ? entertainer.servicesIncludedInRate
          : [...(entertainer.categories || []), ...(entertainer.subCategories || [])].filter((s, i, a) => a.indexOf(s) === i),
        servicesExtra: entertainer.servicesExtra || [],
        availability: entertainer.availability || {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
        },
      });
    }
  }, [entertainer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (categoryName) => {
    setFormData((prev) => {
      const cats = prev.categories.includes(categoryName)
        ? prev.categories.filter((c) => c !== categoryName)
        : [...prev.categories, categoryName];
      return { ...prev, categories: cats };
    });
  };

  const handleSubCategoryToggle = (subCat) => {
    setFormData((prev) => {
      const subCats = prev.subCategories.includes(subCat)
        ? prev.subCategories.filter((c) => c !== subCat)
        : [...prev.subCategories, subCat];
      return { ...prev, subCategories: subCats };
    });
  };

  const allServiceNames = [...new Set([...formData.categories, ...formData.subCategories])];
  const setServicePricing = (serviceName, kind) => {
    setFormData((prev) => {
      const included = kind === "included"
        ? prev.servicesIncludedInRate.includes(serviceName) ? prev.servicesIncludedInRate : [...prev.servicesIncludedInRate, serviceName]
        : prev.servicesIncludedInRate.filter((s) => s !== serviceName);
      const extra = kind === "extra"
        ? prev.servicesExtra.includes(serviceName) ? prev.servicesExtra : [...prev.servicesExtra, serviceName]
        : prev.servicesExtra.filter((s) => s !== serviceName);
      return { ...prev, servicesIncludedInRate: included, servicesExtra: extra };
    });
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: !prev.availability[day],
      },
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const filename = `${Date.now()}_${file.name}`;
      const path = storagePaths.entertainerPhoto(user.uid, filename);
      const storageRef = ref(storage, path);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, url],
      }));
    } catch (err) {
      logger.error("Upload failed:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    const bioCheck = sanitizeOrReject(formData.bio || "");
    if (!bioCheck.ok) {
      alert(bioCheck.reason || "Please don't include personal contact details in your bio.");
      return;
    }

    setSaving(true);
    try {
      // Check if any adult categories are selected
      const selectedCategories = entertainerCategories.filter(
        (c) => formData.categories.includes(c.name)
      );
      const isAdultContent = selectedCategories.some((c) => c.ageRestricted);

      await saveEntertainerProfile(user.uid, {
        displayName: formData.displayName,
        bio: formData.bio,
        categories: formData.categories,
        subCategories: formData.subCategories,
        suburb: formData.locationData?.suburb ?? formData.suburb ?? "",
        location: formData.locationData ?? undefined,
        pricing: {
          baseRate: parseFloat(formData.baseRate) || 0,
        },
        photos: formData.photos,
        servicesIncludedInRate: (() => {
          const all = [...new Set([...formData.categories, ...formData.subCategories])];
          const extra = formData.servicesExtra || [];
          return all.filter((s) => !extra.includes(s));
        })(),
        servicesExtra: formData.servicesExtra || [],
        availability: formData.availability,
        isAdultContent,
      });

      navigate("/talent");
    } catch (err) {
      logger.error("Save failed:", err);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!user || !entertainer) return;
    if (!entertainer.isActive && !canUsePaidFeatures(userData, user)) {
      alert("Pay the $1.99 verification fee before going live. Go to Profile → Verification & Badges.");
      return;
    }
    if (!entertainer.isActive && entertainer.stripe?.payoutsEnabled !== true) {
      alert("Connect Stripe to receive payments before going live. Set up payouts on the Finances page.");
      return;
    }
    try {
      await toggleEntertainerActive(user.uid, !entertainer.isActive);
    } catch (err) {
      logger.error("Toggle failed:", err);
      alert("Failed to update status.");
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  // Get available sub-categories based on selected categories
  const availableSubCategories = entertainerCategories
    .filter((c) => formData.categories.includes(c.name))
    .flatMap((c) => c.types);

  return (
    <Container>
      <PageHeader
        title="Edit Profile"
        onBack={() => navigate("/talent")}
        rightContent={
          <SaveButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </SaveButton>
        }
      />

      <Content>
        {/* Profile Status */}
        {entertainer && (
          <StatusCard $active={entertainer.isActive}>
            <StatusInfo>
              <StatusLabel>Profile Status</StatusLabel>
              <StatusText>{entertainer.isActive ? "Active" : "Hidden"}</StatusText>
            </StatusInfo>
            <ToggleButton 
              onClick={handleToggleActive}
              $active={entertainer.isActive}
            >
              {entertainer.isActive ? "Go Offline" : "Go Live"}
            </ToggleButton>
          </StatusCard>
        )}

        {/* Photos */}
        <Section>
          <SectionTitle>Photos</SectionTitle>
          <PhotoGrid>
            {formData.photos.map((url, i) => (
              <PhotoItem key={i}>
                <Photo src={url} alt={`Photo ${i + 1}`} />
                <RemovePhotoButton onClick={() => handleRemovePhoto(i)}>×</RemovePhotoButton>
              </PhotoItem>
            ))}
            {formData.photos.length < 10 && (
              <AddPhotoButton>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
                {uploading ? <LoadingSpinner size={24} /> : "+"}
              </AddPhotoButton>
            )}
          </PhotoGrid>
        </Section>

        {/* Basic Info */}
        <Section>
          <SectionTitle>Basic Info</SectionTitle>
          <Input
            name="displayName"
            value={formData.displayName}
            onChange={handleInputChange}
            placeholder="Display Name"
          />
          <TextArea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Bio - Tell clients about yourself..."
            rows={4}
          />
          <SuburbWrap>
            <SuburbAutocomplete
              value={formData.locationData}
              onChange={(loc) => setFormData((prev) => ({ ...prev, locationData: loc }))}
              placeholder="e.g. Burleigh Heads, Surfers Paradise"
              aria-label="Suburb"
            />
          </SuburbWrap>
          <Input
            name="baseRate"
            type="number"
            value={formData.baseRate}
            onChange={handleInputChange}
            placeholder="Base Rate ($)"
          />
        </Section>

        {/* Categories */}
        <Section>
          <SectionTitle>Categories</SectionTitle>
          <ChipGrid>
            {entertainerCategories.map((cat) => (
              <CategoryChip
                key={cat.name}
                $selected={formData.categories.includes(cat.name)}
                onClick={() => handleCategoryToggle(cat.name)}
              >
                <span>{cat.emoji}</span>
                {cat.name}
              </CategoryChip>
            ))}
          </ChipGrid>
        </Section>

        {/* Sub-categories */}
        {availableSubCategories.length > 0 && (
          <Section>
            <SectionTitle>Specialties</SectionTitle>
            <ChipGrid>
              {availableSubCategories.map((subCat) => (
                <Chip
                  key={subCat}
                  $selected={formData.subCategories.includes(subCat)}
                  onClick={() => handleSubCategoryToggle(subCat)}
                >
                  {subCat}
                </Chip>
              ))}
            </ChipGrid>
          </Section>
        )}

        {/* Service pricing: included in hourly vs charged on top */}
        {allServiceNames.length > 0 && (
          <Section>
            <SectionTitle>Service pricing</SectionTitle>
            <SectionHint>Choose whether each service is included in your hourly rate or charged on top.</SectionHint>
            <ServicePricingList>
              {allServiceNames.map((name) => (
                <ServicePricingRow key={name}>
                  <ServicePricingName>{name}</ServicePricingName>
                  <ServicePricingOptions>
                    <ServicePricingChip
                      $selected={formData.servicesIncludedInRate.includes(name)}
                      onClick={() => setServicePricing(name, "included")}
                    >
                      Included in rate
                    </ServicePricingChip>
                    <ServicePricingChip
                      $selected={formData.servicesExtra.includes(name)}
                      onClick={() => setServicePricing(name, "extra")}
                    >
                      Charged on top
                    </ServicePricingChip>
                  </ServicePricingOptions>
                </ServicePricingRow>
              ))}
            </ServicePricingList>
          </Section>
        )}

        {/* Availability */}
        <Section>
          <SectionTitle>Availability</SectionTitle>
          <DayGrid>
            {Object.keys(formData.availability).map((day) => (
              <DayChip
                key={day}
                $selected={formData.availability[day]}
                onClick={() => handleDayToggle(day)}
              >
                {day.slice(0, 3)}
              </DayChip>
            ))}
          </DayGrid>
        </Section>

      </Content>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100%;
  background: ${({ theme }) => theme.bg};
`;

const SaveButton = styled.button`
  padding: 0.4rem 1.1rem;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  min-width: 72px;
  
  &:disabled {
    opacity: 0.6;
  }
`;

const Content = styled.div`
  padding: 16px;
  padding-bottom: 100px;
`;

const StatusCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ $active, theme }) => $active ? "#22c55e" : theme.border};
  border-radius: 16px;
  margin-bottom: 24px;
`;

const StatusInfo = styled.div``;

const StatusLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  margin-bottom: 4px;
`;

const StatusText = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const ToggleButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active }) => $active ? "#ef4444" : "#22c55e"};
  color: white;
`;

const Section = styled.section`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.muted};
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SectionHint = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
  margin: 0 0 14px 0;
  line-height: 1.4;
`;

const ServicePricingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ServicePricingRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
`;

const ServicePricingName = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
  color: ${({ theme }) => theme.text};
`;

const ServicePricingOptions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const ServicePricingChip = styled.button`
  padding: 8px 14px;
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 500;
  border: 1px solid ${({ theme, $selected }) => ($selected ? theme.primary : theme.border)};
  background: ${({ theme, $selected }) => ($selected ? theme.primary : theme.card)};
  color: ${({ theme, $selected }) => ($selected ? "#1a1d21" : theme.text)};
  cursor: pointer;
  &:active {
    opacity: 0.9;
  }
`;

const SuburbWrap = styled.div`
  margin-bottom: 12px;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  margin-bottom: 12px;
  outline: none;
  
  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  margin-bottom: 12px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  
  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const PhotoItem = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
`;

const Photo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RemovePhotoButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AddPhotoButton = styled.label`
  aspect-ratio: 1;
  border: 2px dashed ${({ theme }) => theme.border};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: ${({ theme }) => theme.muted};
  cursor: pointer;
  
  input {
    display: none;
  }
  
  &:active {
    background: ${({ theme }) => theme.hoverDark};
  }
`;

const ChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const CategoryChip = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 50px;
  border: 1px solid ${({ $selected, theme }) => $selected ? theme.primary : theme.border};
  background: ${({ $selected, theme }) => $selected ? theme.hover : theme.card};
  color: ${({ $selected, theme }) => $selected ? theme.primary : theme.text};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
`;

const Chip = styled.button`
  padding: 8px 12px;
  border-radius: 50px;
  border: 1px solid ${({ $selected, theme }) => $selected ? theme.primary : theme.border};
  background: ${({ $selected, theme }) => $selected ? theme.hover : theme.card};
  color: ${({ $selected, theme }) => $selected ? theme.primary : theme.text};
  font-size: 0.8rem;
  cursor: pointer;
`;

const DayGrid = styled.div`
  display: flex;
  gap: 8px;
`;

const DayChip = styled.button`
  flex: 1;
  padding: 12px 8px;
  border-radius: 50px;
  border: 1px solid ${({ $selected, theme }) => $selected ? theme.primary : theme.border};
  background: ${({ $selected, theme }) => $selected ? theme.hover : theme.card};
  color: ${({ $selected, theme }) => $selected ? theme.primary : theme.text};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
`;


