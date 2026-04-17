// src/context/AuthContext.jsx
import { createContext, useEffect, useState, useContext, useRef } from "react";
import styled from "styled-components";
import { logger } from "../lib/logger";

export const AuthContext = createContext({ 
  user: null, 
  userData: null, 
  loading: false,
  logout: () => {},
  signup: async () => { throw new Error("signup is not available"); },
  addEntertainerProfile: async () => { throw new Error("addEntertainerProfile is not available"); },
  refetchUserData: async () => {},
  isConfigured: false,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Check if Firebase is configured
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    
    if (!apiKey) {
      logger.log("Firebase not configured - running in demo mode");
      setLoading(false);
      setIsConfigured(false);
      return;
    }

    setIsConfigured(true);

    // Dynamic import to avoid errors when Firebase isn't configured
    const initAuth = async () => {
      try {
        const { auth, db } = await import("../firebase");
        const { onAuthStateChanged, signOut } = await import("firebase/auth");
        const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        // Safety timeout
        timeoutRef.current = setTimeout(() => {
          logger.warn("Auth timeout reached");
          setLoading(false);
        }, 10000);

        const unsub = onAuthStateChanged(auth, async (currentUser) => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          setUser(currentUser || null);

          if (currentUser) {
            try {
              const ref = doc(db, COL.users, currentUser.uid);
              const snap = await getDoc(ref);
              
              if (!snap.exists()) {
                // Create user doc here (same as AMBTN). Token is ready by the time onAuthStateChanged runs.
                const newUserData = {
                  uid: currentUser.uid,
                  email: currentUser.email || "",
                  name: currentUser.displayName || "",
                  phone: currentUser.phoneNumber || "",
                  photoURL: currentUser.photoURL || "",
                  role: null,
                  hasEntertainerProfile: false,
                  createdAt: serverTimestamp(),
                };
                await setDoc(ref, newUserData, { merge: true });
                setUserData(newUserData);
              } else {
                setUserData(snap.data());
              }
            } catch (e) {
              logger.error("Failed to get/create user doc:", e);
            }
          } else {
            setUserData(null);
          }

          setLoading(false);
        }, (error) => {
          logger.error("Auth error:", error);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          setLoading(false);
        });

        return unsub;
      } catch (e) {
        logger.error("Failed to initialize auth:", e);
        setLoading(false);
        return () => {};
      }
    };

    let unsubscribe = () => {};
    initAuth().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const logout = async () => {
    if (!isConfigured) return;
    const { auth } = await import("../firebase");
    const { signOut } = await import("firebase/auth");
    return signOut(auth);
  };

  const refetchUserData = async () => {
    if (!isConfigured || !user) return;
    try {
      const { db } = await import("../firebase");
      const { doc, getDoc } = await import("firebase/firestore");
      const { COL } = await import("../lib/collections");
      const ref = doc(db, COL.users, user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setUserData(snap.data());
      } else {
        setUserData({
          uid: user.uid,
          email: user.email || "",
          name: user.displayName || "",
          phone: user.phoneNumber || "",
          photoURL: user.photoURL || "",
          role: null,
          hasEntertainerProfile: false,
        });
      }
    } catch (e) {
      logger.error("Failed to refetch user data:", e);
    }
  };

  const signup = async (email, password, extra = {}) => {
    if (!isConfigured) throw new Error("App is not configured. Firebase is required for signup.");
    const { auth, db } = await import("../firebase");
    const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
    const { doc, setDoc, getDoc, serverTimestamp } = await import("firebase/firestore");
    const { COL } = await import("../lib/collections");

    const { displayName, role, firstName, lastName, phone, username, dateOfBirth, signupSource, referralCode, campaignId, leadId, marketingOptIn, ...rest } = extra;
    const name = [firstName, lastName].filter(Boolean).join(" ") || displayName || "";

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;

    if (name) {
      await updateProfile(newUser, { displayName: name });
    }

    const normalizedUsername = username ? username.toLowerCase().trim() : "";

    // Reserve username atomically if provided
    if (normalizedUsername) {
      const usernameRef = doc(db, "usernames", normalizedUsername);
      const existing = await getDoc(usernameRef);
      if (existing.exists()) {
        throw new Error("This username is already taken. Please choose another.");
      }
      await setDoc(usernameRef, { userId: newUser.uid, createdAt: serverTimestamp() });
    }

    const userData = {
      uid: newUser.uid,
      email: newUser.email || "",
      name,
      phone: phone || "",
      photoURL: newUser.photoURL || "",
      role: role || null,
      hasEntertainerProfile: role === "entertainer",
      ageVerified: false,
      username: normalizedUsername,
      ...(dateOfBirth ? { dateOfBirth } : {}),
      verification: {
        status: "unverified",
        provider: "stripe",
        updatedAt: serverTimestamp(),
      },
      profileType: extra.profileType === "hard" ? "hard" : "soft",
      createdAt: serverTimestamp(),
      legalAcceptedAt: serverTimestamp(),
      termsVersion: extra.termsVersion || "v1",
      marketingOptIn: marketingOptIn === true,
      ...(signupSource ? { signupSource } : {}),
      ...(referralCode ? { referralCode } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(leadId ? { leadId } : {}),
      ...(role === "entertainer"
        ? {
            contractorAgreementAcceptedAt: serverTimestamp(),
            agreementVersion: extra.agreementVersion || "v1",
          }
        : {}),
    };
    const userRef = doc(db, COL.users, newUser.uid);
    await setDoc(userRef, userData, { merge: true });

    // Phase 5: Create referral doc if came via referral code
    if (referralCode) {
      try {
        const { collection, query, where, getDocs, addDoc } = await import("firebase/firestore");
        const q = query(collection(db, COL.entertainers), where("refCode", "==", referralCode));
        const snap = await getDocs(q);
        const referrerId = snap.empty ? null : snap.docs[0].id;
        if (referrerId) {
          userData.referredBy = referrerId;
          await setDoc(userRef, { referredBy: referrerId }, { merge: true });
          await addDoc(collection(db, COL.referrals), {
            referrerId,
            referredUserId: newUser.uid,
            referralCode,
            rewardStatus: "pending",
            createdAt: serverTimestamp(),
          });
        }
      } catch (e) {
        logger.warn("Referral attribution failed:", e);
      }
    }

    if (role === "entertainer") {
      const { saveEntertainerProfile } = await import("../hooks/useEntertainers");
      const locationData = rest.locationData;
      await saveEntertainerProfile(newUser.uid, {
        displayName: displayName || name,
        bio: rest.bio || "",
        suburb: locationData?.suburb ?? rest.location ?? "",
        location: locationData ?? undefined,
        categories: rest.entertainerTypes || [],
        isAdultContent: false,
        profileType: extra.profileType === "hard" ? "hard" : "soft",
        ...rest,
      });
    }

    setUserData(userData);
    return newUser;
  };

  /** Add entertainer profile to the current user (no new Auth account). Use when user is already signed in. */
  const addEntertainerProfile = async (profileData) => {
    if (!isConfigured || !user) throw new Error("You must be signed in to add an entertainer profile.");
    const { db } = await import("../firebase");
    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const { COL } = await import("../lib/collections");
    const userRef = doc(db, COL.users, user.uid);
    const userUpdate = {
      role: "entertainer",
      hasEntertainerProfile: true,
      contractorAgreementAcceptedAt: serverTimestamp(),
      agreementVersion: profileData.agreementVersion || "v1",
    };
    await setDoc(userRef, userUpdate, { merge: true });
    const { saveEntertainerProfile } = await import("../hooks/useEntertainers");
    await saveEntertainerProfile(user.uid, profileData);
    await refetchUserData();
  };

  // Show loading spinner only briefly
  if (loading) {
    return (
      <LoadingWrapper>
        <Spinner />
        <LoadingText>Loading...</LoadingText>
      </LoadingWrapper>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout, signup, addEntertainerProfile, refetchUserData, isConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #1a1d21;
  gap: 16px;
`;

const LoadingText = styled.p`
  color: #9ca3af;
  font-size: 14px;
  margin: 0;
`;

const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid rgba(135, 206, 235, 0.2);
  border-top-color: #87CEEB;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
