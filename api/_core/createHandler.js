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
        return errorResponse(res, error.message, 400);
      }

      // Step 5: Handle timeout errors
      if (error.message === "Request timed out") {
        return errorResponse(res, error.message, 408);
      }

      // Step 6: Generic fallback
      return errorResponse(
        res,
        error.message || "Internal Server Error",
        500
      );
    }
  };
}
