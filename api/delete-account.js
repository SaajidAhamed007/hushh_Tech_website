/**
 * Delete Account Endpoint
 * Handles secure account deletion with authorization validation
 * Requires Authorization header with valid auth token
 */

import { createHandler } from './_core/createHandler.js';
import { deleteAccountSchema } from './schemas/delete-account.schema.js';
import {
  createDeleteAccountAdminClientFromEnv,
  executeDeleteAccount,
} from "./delete-account-service.js";

export default createHandler({
  schema: deleteAccountSchema,
  timeout: 30000, // Account deletion is a heavy operation (30s)
  handler: async ({ body, req, res }) => {
    // Get authorization header (can be Authorization or authorization)
    const authHeader = req.headers?.authorization || req.headers?.Authorization || null;
    
    if (!authHeader) {
      const error = new Error('Authorization header is required');
      error.statusCode = 401;
      throw error;
    }

    const { adminClient, auditSecret } = createDeleteAccountAdminClientFromEnv();
    const result = await executeDeleteAccount({
      adminClient,
      authHeader,
      auditSecret,
    });

    // ExecuteDeleteAccount returns { status, body }
    // For non-2xx responses, throw error so createHandler respects the status code
    if (result.status < 200 || result.status >= 300) {
      const error = new Error(result.body.error || "Account deletion failed");
      error.statusCode = result.status;
      throw error;
    }

    // For 2xx responses, return the body (status will be 200)
    return result.body;
  },
});
