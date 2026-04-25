/**
 * Apple Wallet Pass Proxy
 * Forwards requests to upstream wallet service and returns pkpass binary file
 * 
 * NOTE: This endpoint is NOT wrapped in createHandler because it returns binary data (pkpass)
 * The createHandler framework is designed for JSON responses and cannot handle streaming responses
 */

import { walletPassSchema } from './schemas/wallet-pass.schema.js';

const UPSTREAM_APPLE_WALLET_ENDPOINT =
  "https://hushh-wallet.vercel.app/api/passes/universal/create";

const resolvePayload = (body) => {
  if (!body) return null;
  if (typeof body.payload === "string") {
    try {
      return JSON.parse(body.payload);
    } catch {
      return null;
    }
  }

  return body;
};

export default async function handler(req, res) {
  // Separate try...catch for schema validation (returns 400)
  let body;
  try {
    body = walletPassSchema.parse(req.body);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: "Invalid request payload.",
      statusCode: 400,
    });
  }

  // Separate try...catch for business logic (returns 500)
  try {
    const payload = resolvePayload(body);
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet pass payload",
        statusCode: 400,
      });
    }

    const forward = await fetch(UPSTREAM_APPLE_WALLET_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!forward.ok) {
      const text = await forward.text();
      return res.status(forward.status).json({
        success: false,
        error: `Wallet pass generation failed (${forward.status})`,
        statusCode: forward.status,
        details: text,
      });
    }

    const buffer = Buffer.from(await forward.arrayBuffer());
    const contentDisposition =
      forward.headers.get("content-disposition") || 'attachment; filename="hushh-profile.pkpass"';
    const passSerial = forward.headers.get("x-pass-serial");
    const passType = forward.headers.get("x-pass-type");

    // Set response headers for binary file
    res.setHeader(
      "Content-Type",
      forward.headers.get("content-type") || "application/vnd.apple.pkpass"
    );
    res.setHeader("Content-Disposition", contentDisposition);
    if (passSerial) res.setHeader("X-Pass-Serial", passSerial);
    if (passType) res.setHeader("X-Pass-Type", passType);

    // Send binary response
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Wallet pass error:", error);
    return res.status(500).json({
      success: false,
      error: "Wallet pass generation failed",
      statusCode: 500,
    });
  }
}
