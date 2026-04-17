// src/App.jsx
import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import { RequireAuth, RequireClient, RequireEntertainer, RequireAdmin, RedirectIfAuth, RedirectIfEntertainer } from "./components/ProtectedRoute";

// Eagerly loaded pages (needed immediately)
import Home from "./pages/shared/Home";

// Lazy-loaded shared pages
const Login = lazy(() => import("./pages/shared/Login"));
const SignupChoice = lazy(() => import("./pages/shared/SignupChoice"));
const Profile = lazy(() => import("./pages/shared/Profile"));
const ProfileEdit = lazy(() => import("./pages/shared/EditProfile"));
const ChangePassword = lazy(() => import("./pages/shared/ChangePassword"));
const Settings = lazy(() => import("./pages/shared/Settings"));
// PoliceCheck removed — absorbed into VerifyIdentityPage (Verification & Badges)
const ChooseDashboard = lazy(() => import("./pages/shared/ChooseDashboard"));
const About = lazy(() => import("./pages/shared/About"));
// Contact removed — /contact redirects to /help
const BookingStatus = lazy(() => import("./pages/shared/BookingStatus"));
const Inbox = lazy(() => import("./pages/shared/Inbox"));
const Conversation = lazy(() => import("./pages/shared/Conversation"));
const Terms = lazy(() => import("./pages/shared/Terms"));
const LegalDoc = lazy(() => import("./pages/shared/LegalDoc"));
const Help = lazy(() => import("./pages/shared/Help"));
const FAQ = lazy(() => import("./pages/shared/FAQ"));
// Settings sub-pages and saved/blocked (routes added per knockers-fixes prompt)
const NotificationsPage = lazy(() => import("./pages/shared/NotificationsPage"));
const SavedEntertainersPage = lazy(() => import("./pages/shared/SavedEntertainersPage"));
const SavedClientsPage = lazy(() => import("./pages/shared/SavedClientsPage"));
const BlockedEntertainersPage = lazy(() => import("./pages/shared/BlockedEntertainersPage"));
const BlockedClientsPage = lazy(() => import("./pages/shared/BlockedClientsPage"));
const BankDetailsPage = lazy(() => import("./pages/shared/BankDetailsPage"));
const EmergencyContactPage = lazy(() => import("./pages/shared/EmergencyContactPage"));
const ShareProfilePage = lazy(() => import("./pages/shared/ShareProfilePage"));
const ReferralPage = lazy(() => import("./pages/shared/ReferralPage"));
const VerificationFeePage = lazy(() => import("./pages/shared/VerificationFeePage"));
const VerifyIdentityPage = lazy(() => import("./pages/shared/VerifyIdentityPage"));
const ReceiptsPage = lazy(() => import("./pages/shared/ReceiptsPage"));
const BookingHistory = lazy(() => import("./pages/shared/BookingHistory"));
const NotFoundPage = lazy(() => import("./pages/shared/NotFoundPage"));
const RefLanding = lazy(() => import("./pages/shared/RefLanding"));

// Lazy-loaded talent pages
const TalentLogin = lazy(() => import("./pages/talent/Login"));
const TalentSignup = lazy(() => import("./pages/talent/Signup"));
const TalentDashboard = lazy(() => import("./pages/talent/Dashboard"));
const TalentActivity = lazy(() => import("./pages/talent/Activity"));
const TalentPublic = lazy(() => import("./pages/talent/TalentPublic"));
const EditProfile = lazy(() => import("./pages/talent/EditProfile"));
const Finances = lazy(() => import("./pages/talent/Finances"));
const TalentListings = lazy(() => import("./pages/talent/Listings"));
const AcceptBooking = lazy(() => import("./pages/talent/AcceptBooking"));

// Lazy-loaded client pages
const ClientLogin = lazy(() => import("./pages/client/Login"));
const ClientSignup = lazy(() => import("./pages/client/Signup"));
const ClientDashboard = lazy(() => import("./pages/client/Dashboard"));
const ExplorePage = lazy(() => import("./pages/client/ExplorePage"));
const BookingRequest = lazy(() => import("./pages/client/BookingRequest"));
const UserPosts = lazy(() => import("./pages/client/UserPosts"));
const CreateListing = lazy(() => import("./pages/client/CreateListing"));
const ListingDetail = lazy(() => import("./pages/client/ListingDetail"));

// Admin pages
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminEntertainers = lazy(() => import("./pages/admin/Entertainers"));
const AdminBookings = lazy(() => import("./pages/admin/Bookings"));
const AdminReviews = lazy(() => import("./pages/admin/Reviews"));
const AdminDisputes = lazy(() => import("./pages/admin/Disputes"));
const AdminFinances = lazy(() => import("./pages/admin/Finances"));
const AdminSafety = lazy(() => import("./pages/admin/Safety"));
const AdminLogs = lazy(() => import("./pages/admin/Logs"));
const AdminLeads = lazy(() => import("./pages/admin/Leads"));
const AdminLeadsNew = lazy(() => import("./pages/admin/LeadsNew"));
const AdminCampaigns = lazy(() => import("./pages/admin/Campaigns"));
const AdminPromotions = lazy(() => import("./pages/admin/Promotions"));
const AdminReferrals = lazy(() => import("./pages/admin/Referrals"));
const AdminTestimonials = lazy(() => import("./pages/admin/Testimonials"));

// Redirect /profile/public/:id to /talent/:id (public profile)
function PublicProfileRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/talent/${id}` : "/"} replace />;
}

// Loading fallback component
const PageLoader = () => (
  <div style={{ 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    minHeight: "50vh" 
  }}>
    <LoadingSpinner />
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            {/* Unified auth pages - Login always accessible to allow sign out */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={
              <RedirectIfAuth><SignupChoice /></RedirectIfAuth>
            } />
            <Route path="/ref/:refCode" element={<RefLanding />} />

            {/* Protected home - requires login */}
            <Route path="/" element={
              <RequireAuth><Home /></RequireAuth>
            } />
            <Route path="/explore" element={
              <RequireAuth><ExplorePage /></RequireAuth>
            } />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Navigate to="/help" replace />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Terms />} />
            <Route path="/legal/:docType" element={<LegalDoc />} />
            <Route path="/help" element={<Help />} />
            <Route path="/faq" element={<FAQ />} />
            
            {/* Public entertainer profile */}
            <Route path="/talent/:id" element={<TalentPublic />} />

            {/* Auth-required pages */}
            <Route path="/inbox" element={
              <RequireAuth><Inbox /></RequireAuth>
            } />
            <Route path="/inbox/:bookingId" element={
              <RequireAuth><Conversation /></RequireAuth>
            } />
            <Route path="/profile" element={
              <RequireAuth><Profile /></RequireAuth>
            } />
            <Route path="/profile/edit" element={
              <RequireAuth><ProfileEdit /></RequireAuth>
            } />
            <Route path="/settings/password" element={
              <RequireAuth><ChangePassword /></RequireAuth>
            } />
            {/* Old police-check route → redirect to new verification page */}
            <Route path="/settings/police-check" element={<Navigate to="/profile/verification" replace />} />
            <Route path="/choose-dashboard" element={
              <RequireAuth><ChooseDashboard /></RequireAuth>
            } />
            <Route path="/settings" element={
              <RequireAuth><Settings /></RequireAuth>
            } />
            <Route path="/settings/notifications" element={
              <RequireAuth><NotificationsPage /></RequireAuth>
            } />
            <Route path="/settings/bank" element={
              <RequireAuth><BankDetailsPage /></RequireAuth>
            } />
            <Route path="/settings/emergency-contact" element={
              <RequireAuth><EmergencyContactPage /></RequireAuth>
            } />
            <Route path="/settings/share-profile" element={
              <RequireAuth><ShareProfilePage /></RequireAuth>
            } />
            <Route path="/settings/referral" element={
              <RequireAuth><ReferralPage /></RequireAuth>
            } />
            <Route path="/settings/verification" element={
              <RequireAuth><VerificationFeePage /></RequireAuth>
            } />
            {/* Primary verification route */}
            <Route path="/profile/verification" element={
              <RequireAuth><VerifyIdentityPage /></RequireAuth>
            } />
            {/* Old route redirect */}
            <Route path="/verify-identity" element={<Navigate to="/profile/verification" replace />} />
            {/* Receipts moved from settings */}
            <Route path="/receipts" element={
              <RequireAuth><ReceiptsPage /></RequireAuth>
            } />
            {/* Old receipts route redirect */}
            <Route path="/settings/receipts" element={<Navigate to="/receipts" replace />} />
            <Route path="/saved/entertainers" element={
              <RequireAuth><SavedEntertainersPage /></RequireAuth>
            } />
            <Route path="/saved/clients" element={
              <RequireAuth><SavedClientsPage /></RequireAuth>
            } />
            <Route path="/blocked/entertainers" element={
              <RequireAuth><BlockedEntertainersPage /></RequireAuth>
            } />
            <Route path="/blocked/clients" element={
              <RequireAuth><BlockedClientsPage /></RequireAuth>
            } />
            <Route path="/profile/public/:id" element={<PublicProfileRedirect />} />
            <Route path="/booking/:bookingId" element={
              <RequireAuth><BookingStatus /></RequireAuth>
            } />
            <Route path="/bookings/history" element={
              <RequireAuth><BookingHistory /></RequireAuth>
            } />

            {/* Talent auth pages (kept for direct signup flow) */}
            <Route path="/talent/login" element={
              <RedirectIfAuth to="/talent"><TalentLogin /></RedirectIfAuth>
            } />
            <Route path="/talent/signup" element={
              <RedirectIfEntertainer><TalentSignup /></RedirectIfEntertainer>
            } />

            {/* Talent protected pages */}
            <Route path="/talent" element={
              <RequireEntertainer><TalentDashboard /></RequireEntertainer>
            } />
            <Route path="/listings" element={
              <RequireEntertainer><TalentListings /></RequireEntertainer>
            } />
            <Route path="/talent/activity" element={
              <RequireEntertainer><TalentActivity /></RequireEntertainer>
            } />
            <Route path="/talent/edit" element={
              <RequireEntertainer><EditProfile /></RequireEntertainer>
            } />
            <Route path="/talent/edit-profile" element={
              <RequireEntertainer><EditProfile /></RequireEntertainer>
            } />
            <Route path="/finances" element={
              <RequireEntertainer><Finances /></RequireEntertainer>
            } />
            <Route path="/talent/bookings/:bookingId/accept" element={
              <RequireEntertainer><AcceptBooking /></RequireEntertainer>
            } />

            {/* Client auth pages (kept for direct signup flow) */}
            <Route path="/client/login" element={
              <RedirectIfAuth to="/"><ClientLogin /></RedirectIfAuth>
            } />
            <Route path="/client/signup" element={
              <RedirectIfAuth to="/"><ClientSignup /></RedirectIfAuth>
            } />

            {/* Client protected pages */}
            <Route path="/client" element={
              <RequireClient><ClientDashboard /></RequireClient>
            } />
            <Route path="/client/listings/new" element={
              <RequireClient><CreateListing /></RequireClient>
            } />
            <Route path="/client/listings/:id" element={
              <RequireClient><ListingDetail /></RequireClient>
            } />
            <Route path="/book/:id" element={
              <RequireAuth><BookingRequest /></RequireAuth>
            } />
            <Route path="/my-requests" element={
              <RequireClient><UserPosts /></RequireClient>
            } />

            {/* Admin (RequireAdmin wraps layout) */}
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="entertainers" element={<AdminEntertainers />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="disputes" element={<AdminDisputes />} />
              <Route path="finances" element={<AdminFinances />} />
              <Route path="safety" element={<AdminSafety />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="leads/new" element={<AdminLeadsNew />} />
              <Route path="campaigns" element={<AdminCampaigns />} />
              <Route path="promotions" element={<AdminPromotions />} />
              <Route path="referrals" element={<AdminReferrals />} />
              <Route path="testimonials" element={<AdminTestimonials />} />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
