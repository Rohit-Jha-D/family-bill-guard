/**
 * services/payments.js
 *
 * Generates a direct hand-off link for paying a bill, using ONLY the
 * official biller's UPI VPA or official portal URL stored on the account.
 *
 * SECURITY NOTE:
 * - We never construct or embed any third-party payment-gateway URL.
 * - We never accept a VPA/URL from client input; both come exclusively
 *   from the trusted `accounts` table controlled by this backend.
 * - If neither a VPA nor a portal URL exists on the account, we refuse to
 *   generate a link rather than guessing one, to avoid ever misdirecting
 *   a payment.
 */

function sanitizeForUpiParam(value) {
  // Strip characters that have no business in a UPI query param.
  return String(value).replace(/[^a-zA-Z0-9 ._-]/g, "").trim();
}

/**
 * Builds a `upi://pay` deep link that opens the user's UPI app directly
 * with the official biller VPA pre-filled. Works with GPay/PhonePe/Paytm/etc.
 * without ever routing through a third-party aggregator page.
 */
function buildUpiIntentLink({ vpa, payeeName, amount, note, referenceId }) {
  const params = new URLSearchParams({
    pa: vpa, // payee address (official VPA only)
    pn: sanitizeForUpiParam(payeeName || "Biller"),
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: sanitizeForUpiParam(note || "Bill Payment"),
    tr: sanitizeForUpiParam(referenceId || `BILL${Date.now()}`),
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Given an account + bill (both trusted DB rows), returns the safest
 * available direct hand-off: UPI intent first, official portal URL as fallback.
 */
function generatePaymentHandoff(account, bill) {
  const totalDue = bill.amount + (bill.late_fine_amount > 0 && bill.status === "pending"
    ? bill.late_fine_amount
    : 0);

  if (account.provider_vpa) {
    return {
      type: "UPI_INTENT",
      url: buildUpiIntentLink({
        vpa: account.provider_vpa,
        payeeName: account.provider_name,
        amount: totalDue,
        note: `${account.category} bill - ${account.account_nickname}`,
        referenceId: `BILL${bill.id}`,
      }),
      warning: null,
    };
  }

  if (account.provider_portal_url) {
    return {
      type: "OFFICIAL_PORTAL",
      url: account.provider_portal_url,
      warning: "No UPI VPA on file for this biller; redirecting to the official provider portal only.",
    };
  }

  return {
    type: "UNAVAILABLE",
    url: null,
    warning: "No official payment destination is configured for this account. Refusing to generate a link.",
  };
}

module.exports = { buildUpiIntentLink, generatePaymentHandoff };
