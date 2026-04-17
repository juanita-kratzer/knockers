/**
 * Phase 6: Apple In-App Purchase receipt validation.
 * Validates receipt with Apple and returns transaction info if valid.
 */

const PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

export interface AppleReceiptValidationResult {
  valid: boolean;
  productId?: string;
  transactionId?: string;
  error?: string;
}

/**
 * Verify receipt with Apple. Tries production first; if status 21007, retries sandbox.
 */
export async function verifyAppleReceipt(
  receiptDataBase64: string,
  sharedSecret: string
): Promise<AppleReceiptValidationResult> {
  const body = JSON.stringify({
    "receipt-data": receiptDataBase64,
    password: sharedSecret,
    "exclude-old-transactions": true,
  });

  const tryUrl = async (url: string): Promise<{ status: number; receipt?: unknown; latest_receipt_info?: unknown[] }> => {
    const https = await import("https");
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const options = {
        hostname: u.hostname,
        port: 443,
        path: u.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body, "utf8"),
        },
      };
      const req = https.request(options, (res: import("http").IncomingMessage) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve({
              status: parsed.status ?? -1,
              receipt: parsed.receipt,
              latest_receipt_info: parsed.latest_receipt_info ?? parsed.receipt?.in_app ?? [],
            });
          } catch {
            resolve({ status: -1 });
          }
        });
      });
      req.on("error", reject);
      req.write(body, "utf8");
      req.end();
    });
  };

  let result = await tryUrl(PRODUCTION_URL);
  if (result.status === 21007) {
    result = await tryUrl(SANDBOX_URL);
  }

  if (result.status !== 0) {
    return {
      valid: false,
      error: `Apple receipt status ${result.status}`,
    };
  }

  const inApp = result.latest_receipt_info ?? (result.receipt as { in_app?: unknown[] })?.in_app ?? [];
  const last = Array.isArray(inApp) && inApp.length > 0 ? inApp[inApp.length - 1] : null;
  const productId = last && typeof last === "object" && "product_id" in last ? (last as { product_id: string }).product_id : undefined;
  const transactionId = last && typeof last === "object" && "transaction_id" in last ? (last as { transaction_id: string }).transaction_id : undefined;

  return {
    valid: true,
    productId,
    transactionId,
  };
}
