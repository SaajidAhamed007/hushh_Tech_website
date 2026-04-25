/**
 * Apple Wallet Pass Proxy
 * Forwards requests to upstream wallet service and returns pkpass binary file
 */

import { createHandler } from './_core/createHandler.js';
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

export default createHandler({
  schema: walletPassSchema,
  timeout: 15000, // Wallet generation can take time
  handler: async ({ body, res }) => {
    const payload = resolvePayload(body);
    if (!payload || typeof payload !== "object") {
      throw new Error('Invalid wallet pass payload');
    }

    const forward = await fetch(UPSTREAM_APPLE_WALLET_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!forward.ok) {
      const text = await forward.text();
      const error = new Error(`Wallet pass generation failed (${forward.status})`);
      error.statusCode = forward.status;
      error.details = text;
      throw error;
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

    // Return buffer directly (Express will send it)
    res.status(200).send(buffer);
    
    // Signal successful response to prevent automatic JSON response
    return null;
  },
});
