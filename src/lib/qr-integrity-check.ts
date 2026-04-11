import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Server-side startup guard: verifies that the QR images on disk
 * match the expected hashes from environment variables.
 *
 * Logs a critical warning on mismatch — does NOT crash the server.
 * Called once from the root layout (server component).
 */
let checked = false;

export function runQrIntegrityCheck() {
  if (checked) return;
  checked = true;

  const files: Record<string, string> = {
    NEXT_PUBLIC_QR_HASH_GCASH: "public/qr/gcash.jpg",
    NEXT_PUBLIC_QR_HASH_BPI: "public/qr/bpi.png",
  };

  for (const [envKey, relPath] of Object.entries(files)) {
    const expected = process.env[envKey];
    if (!expected) {
      console.warn(`[SECURITY] ${envKey} not set — skipping QR integrity check for ${relPath}`);
      continue;
    }

    const abs = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(abs)) {
      console.error(`[SECURITY] QR image missing: ${relPath}`);
      continue;
    }

    const buf = fs.readFileSync(abs);
    const hash = "sha256-" + crypto.createHash("sha256").update(buf).digest("base64");

    if (hash !== expected) {
      console.error(
        `[SECURITY] QR image hash mismatch detected on server! ` +
          `file=${relPath} expected=${expected} actual=${hash}`,
      );
    }
  }
}
