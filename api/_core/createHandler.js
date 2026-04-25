import { ZodError } from "zod";
import { withTimeout } from "./timeout.js";
import { successResponse, errorResponse } from "./response.js";

export function createHandler({
  schema,
  timeout = 5000,
  handler,
}) {
  return async function safeHandler(req, res) {
    try {
      // Step 1: Validate input safely
      const body = schema ? schema.parse(req.body) : req.body;

      // Step 2: Run handler with timeout protection
      const result = await withTimeout(
        handler({ body, req, res }),
        timeout
      );

      // Step 3: Unified success response
      return successResponse(res, result);

    } catch (error) {

      // Step 4: Handle validation errors properly
      if (error instanceof ZodError) {
        return errorResponse(res, "Invalid request payload", 400);
      }

      // Step 5: Handle timeout errors
      if (error.message === "Request timed out") {
        return errorResponse(res, "Request timeout", 408);
      }

      // Step 6: Preserve custom status codes from handlers
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 600) {
        // Log full error for debugging
        console.error(`API Error [${error.statusCode}]:`, error);
        // Return generic message based on status code
        const statusMessages = {
          400: "Invalid request",
          401: "Unauthorized",
          403: "Forbidden",
          404: "Not found",
          409: "Conflict",
          422: "Unprocessable entity",
        };
        const message = statusMessages[error.statusCode] || "Request failed";
        return errorResponse(res, message, error.statusCode);
      }

      // Step 7: Handle common HTTP error patterns
      if (error.code === "AUTH_REQUIRED" || error.name === "AuthenticationError") {
        return errorResponse(res, "Unauthorized", 401);
      }

      if (error.code === "NOT_FOUND" || error.name === "NotFoundError") {
        return errorResponse(res, "Not found", 404);
      }

      if (error.code === "FORBIDDEN" || error.name === "ForbiddenError") {
        return errorResponse(res, "Forbidden", 403);
      }

      // Step 8: Generic fallback for unexpected errors
      // Log the full error for debugging purposes
      console.error("Internal Server Error:", error);
      return errorResponse(
        res,
        "Internal Server Error",
        500
      );
    }
  };
}
