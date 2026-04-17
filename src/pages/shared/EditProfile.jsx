// src/pages/shared/EditProfile.jsx
// Edit account: name, email, phone, profile photo (AMBTN-style)

import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import {
  updateProfile,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { db, auth, storage } from "../../firebase";
import { COL, storagePaths } from "../../lib/collections";
import LoadingSpinner from "../../components/LoadingSpinner";
import { logger } from "../../lib/logger";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, userData, refetchUserData } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    photoURL: "",
    profileType: "soft",
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const canChangeEmail = useMemo(() => {
    const providers = user?.providerData?.map((p) => p.providerId) || [];
    return providers.includes("password");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const userRef = doc(db, COL.users, user.uid);
        const snap = await getDoc(userRef);
        const data = snap.exists() ? snap.data() : {};
        const name = data.name || user.displayName || "";
        const username = data.username || "";
        const email = data.email || user.email || "";
        const phone = data.phone || "";
        const dateOfBirth = data.dateOfBirth || "";
        const photoURL = data.photoURL || user.photoURL || "";
        const profileType = data.profileType === "hard" ? "hard" : "soft";
        setFormData({ name, username, email, phone, dateOfBirth, photoURL, profileType });
        setPreview(photoURL || null);
      } catch (e) {
        logger.error("Load profile failed:", e);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB.");
      return;
    }

    setUploading(true);
    setError("");
    setPreview(URL.createObjectURL(file));

    const path = storagePaths.profilePhoto(user.uid, "avatar.jpg");
    const storageRef = ref(storage, path);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setFormData((prev) => ({ ...prev, photoURL: downloadURL }));
    } catch (err) {
      logger.error("Upload failed:", err);
      setError("Failed to upload image.");
      setPreview(formData.photoURL || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    if (!window.confirm("Remove your profile photo?")) return;
    setError("");
    try {
      const path = storagePaths.profilePhoto(user.uid, "avatar.jpg");
      const storageRef = ref(storage, path);
      await deleteObject(storageRef).catch(() => {});
      setPreview(null);
      setFormData((prev) => ({ ...prev, photoURL: "" }));
    } catch (e) {
      logger.error("Remove photo failed:", e);
      setError("Could not remove photo.");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setError("");
    setSaving(true);

    try {
      const userRef = doc(db, COL.users, user.uid);

      // Update Auth display name and photo if changed
      if (formData.name !== (user.displayName || "") || formData.photoURL !== (user.photoURL || "")) {
        await updateProfile(auth.currentUser, {
          displayName: formData.name || null,
          photoURL: formData.photoURL || null,
        });
      }

      // Update email in Auth if changed (email/password users only)
      if (canChangeEmail && formData.email && formData.email !== (user.email || "")) {
        await updateEmail(auth.currentUser, formData.email);
      }

      // Handle username change (uniqueness via /usernames collection)
      const newUsername = (formData.username || "").toLowerCase().trim();
      const snap = await getDoc(userRef);
      const oldUsername = snap.exists() ? (snap.data().username || "") : "";
      if (newUsername && newUsername !== oldUsername) {
        const usernameDoc = doc(db, "usernames", newUsername);
        const existing = await getDoc(usernameDoc);
        if (existing.exists() && existing.data().userId !== user.uid) {
          throw new Error("This username is already taken.");
        }
        await setDoc(usernameDoc, { userId: user.uid });
        if (oldUsername) {
          await deleteDoc(doc(db, "usernames", oldUsername)).catch(() => {});
        }
      }

      await updateDoc(userRef, {
        name: formData.name || "",
        username: newUsername,
        email: formData.email || "",
        phone: formData.phone || "",
        dateOfBirth: formData.dateOfBirth || "",
        photoURL: formData.photoURL || "",
        profileType: formData.profileType === "hard" ? "hard" : "soft",
        updatedAt: serverTimestamp(),
      });

      await refetchUserData();
      navigate("/profile");
    } catch (err) {
      logger.error("Save failed:", err);
      if (err.code === "auth/requires-recent-login") {
        setError("Please sign out and sign in again, then try updating your email.");
      } else {
        setError(err.message || "Failed to save profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Container>
        <PageHeader title="Edit Profile" onBack={() => navigate("/profile")} />
        <Message>Sign in to edit your profile.</Message>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <LoadingWrap>
          <LoadingSpinner size={32} />
        </LoadingWrap>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title="Edit Profile"
        onBack={() => navigate("/profile")}
        rightContent={
          <SaveBtn onClick={handleSave} disabled={saving || uploading}>
            {saving ? <LoadingSpinner size={18} inline color="#1a1d21" /> : "Save"}
          </SaveBtn>
        }
      />

      <Form>
        <AvatarSection>
          <AvatarLabel>Profile photo</AvatarLabel>
          <AvatarWrap>
            <AvatarPreview>
              {preview ? (
                <img src={preview} alt="Profile" />
              ) : (
                <AvatarPlaceholder>{formData.name?.[0]?.toUpperCase() || "?"}</AvatarPlaceholder>
              )}
            </AvatarPreview>
            <AvatarActions>
              <AvatarInputLabel>
                {uploading ? "Uploading…" : "Change photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploading}
                  hidden
                />
              </AvatarInputLabel>
              {preview && (
                <RemovePhotoBtn type="button" onClick={handleRemovePhoto}>
                  Remove
                </RemovePhotoBtn>
              )}
            </AvatarActions>
          </AvatarWrap>
        </AvatarSection>

        {error ? <ErrorMessage>{error}</ErrorMessage> : null}

        <Field>
          <Label>Name</Label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your name"
            autoComplete="name"
          />
        </Field>

        <Field>
          <Label>Username</Label>
          <Input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Choose a username"
            autoComplete="off"
          />
          <FieldHint>Lowercase, no spaces. Visible on your profile.</FieldHint>
        </Field>

        <Field>
          <Label>Email</Label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            autoComplete="email"
            readOnly={!canChangeEmail}
          />
          {!canChangeEmail && (
            <FieldHint>Email can’t be changed for this sign-in method.</FieldHint>
          )}
        </Field>

        <Field>
          <Label>Phone</Label>
          <Input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone number"
            autoComplete="tel"
          />
        </Field>

        <Field>
          <Label>Date of Birth</Label>
          <Input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
          />
        </Field>

        <Field>
          <Label>Profile type</Label>
          <ProfileTypeHint>Soft = ID only; Hard = police check verified.</ProfileTypeHint>
          <Select
            name="profileType"
            value={formData.profileType}
            onChange={handleChange}
          >
            <option value="soft">Soft (ID only)</option>
            <option value="hard">Hard (Police check)</option>
          </Select>
        </Field>

        <ChangePasswordLink to="/settings/password">
          Change password
        </ChangePasswordLink>
      </Form>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100%;
  background: ${({ theme }) => theme.bg};
  padding-bottom: 40px;
`;

const SaveBtn = styled.button`
  padding: 8px 16px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

const Message = styled.p`
  padding: 24px 16px;
  color: ${({ theme }) => theme.muted};
  text-align: center;
`;

const Form = styled.div`
  padding: 24px 16px;
`;

const AvatarSection = styled.div`
  margin-bottom: 24px;
`;

const AvatarLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin-bottom: 12px;
`;

const AvatarWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const AvatarPreview = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: ${({ theme }) => theme.card};
  border: 2px solid ${({ theme }) => theme.border};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
`;

const AvatarActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AvatarInputLabel = styled.label`
  display: inline-block;
  padding: 10px 16px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  input:disabled + & {
    opacity: 0.7;
  }
`;

const RemovePhotoBtn = styled.button`
  padding: 8px 14px;
  background: transparent;
  color: ${({ theme }) => theme.muted};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
`;

const ErrorMessage = styled.div`
  padding: 12px;
  margin-bottom: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  color: #ef4444;
  font-size: 0.9rem;
`;

const Field = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
  &[readOnly] {
    opacity: 0.8;
  }
`;

const FieldHint = styled.p`
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;

const ProfileTypeHint = styled.p`
  margin: 0 0 8px 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;

const Select = styled.select`
  width: 100%;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
`;

const ChangePasswordLink = styled(Link)`
  display: inline-block;
  margin-top: 8px;
  color: ${({ theme }) => theme.primary};
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
`;
