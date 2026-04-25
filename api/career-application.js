import { createHandler } from "./_core/createHandler.js";
import { careerApplicationSchema, careerApplicationResponseSchema } from "./schemas/career-application.schema.js";

const REQUIRED_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'collegeEmail',
  'officialEmail',
  'phone',
  'resumeLink',
  'college',
];

const ALLOWED_COLLEGES = new Set(['LPU', 'MIT']);

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const isValidUrl = (value) => {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host);
  } catch (error) {
    return false;
  }
};

export default createHandler({
  schema: careerApplicationSchema,
  timeout: 10000, // External Google Apps Script call
  handler: async ({ body, res }) => {
    const {
      firstName,
      lastName,
      email,
      collegeEmail,
      officialEmail,
      phone,
      resumeLink,
      college,
      collegeValue,
      jobTitle,
      jobLocation,
      submittedAt: providedSubmittedAt,
    } = body;

    // Double-check college is valid
    const actualCollege = collegeValue || college;
    if (!ALLOWED_COLLEGES.has(actualCollege)) {
      const error = new Error('Invalid college selection');
      error.statusCode = 400;
      throw error;
    }

    // Validate resume URL
    if (!isValidUrl(resumeLink)) {
      const error = new Error('Invalid resume link');
      error.statusCode = 400;
      throw error;
    }

    const submittedAt = providedSubmittedAt || new Date().toISOString();
    const appsScriptUrl = sanitizeString(process.env.GOOGLE_APPS_SCRIPT_URL);

    if (!appsScriptUrl) {
      throw new Error('Missing GOOGLE_APPS_SCRIPT_URL');
    }

    const scriptResponse = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        collegeEmail,
        officialEmail,
        phone,
        resumeLink,
        college: actualCollege,
        jobTitle,
        jobLocation,
        submittedAt,
      }),
    });

    const responseText = await scriptResponse.text();
    let scriptResult;

    try {
      scriptResult = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.warn('Unable to parse Apps Script response as JSON:', parseError);
    }

    const scriptSucceeded = scriptResponse.ok && (scriptResult?.success ?? true);

    if (!scriptSucceeded) {
      const message =
        scriptResult?.error ||
        scriptResult?.message ||
        (!scriptResponse.ok ? responseText : '') ||
        'Apps Script request failed';
      throw new Error(message);
    }

    return {
      success: true,
      message: 'Application received and saved',
      data: {
        firstName,
        lastName,
        email,
        collegeEmail,
        officialEmail,
        phone,
        resumeLink,
        college: actualCollege,
        jobTitle,
        jobLocation,
        submittedAt,
        appsScript: scriptResult,
      },
    };
  },
});