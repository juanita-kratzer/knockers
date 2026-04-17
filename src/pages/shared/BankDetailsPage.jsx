// src/pages/shared/BankDetailsPage.jsx - route: /settings/bank

import SettingsSubPage from "./SettingsSubPage";

export default function BankDetailsPage() {
  return (
    <SettingsSubPage
      title="Bank Details"
      emptyMessage="Update your payout account. Enter your bank details to receive payments from completed bookings."
    />
  );
}
