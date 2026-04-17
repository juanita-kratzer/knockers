// src/pages/shared/EmergencyContactPage.jsx - route: /settings/emergency-contact

import SettingsSubPage from "./SettingsSubPage";

export default function EmergencyContactPage() {
  return (
    <SettingsSubPage
      title="Emergency Contact"
      emptyMessage="Set up a safety alert recipient. When you use the safety button during a booking, they'll receive your location and booking details."
    />
  );
}
