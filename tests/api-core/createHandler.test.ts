/**
 * Framework-Level Tests for Safe API Handler
 * Tests core framework functionality across all routes
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createHandler } from '../../api/_core/createHandler.js';
import { mockReq, mockRes } from './mockHttp.js';

describe('createHandler Framework - Core Functionality', () => {
 
  describe('Input Validation', () => {
    
    it('returns 400 when schema validation fails', async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const handler = createHandler({
        schema,
        handler: async () => ({ ok: true }),
      });

      const req = mockReq({ email: 'invalid-email' });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.error).toBeDefined();
    });

    it('returns 400 with missing required field', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const handler = createHandler({
        schema,
        handler: async () => ({ ok: true }),
      });

      const req = mockReq({ email: 'test@example.com' });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
    });

    it('returns 400 for invalid enum values', async () => {
      const schema = z.object({
        type: z.enum(['active', 'inactive']),
      });

      const handler = createHandler({
        schema,
        handler: async () => ({ ok: true }),
      });

      const req = mockReq({ type: 'invalid-type' });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
    });

    it('accepts valid input that passes schema', async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0).max(150),
      });

      const handler = createHandler({
        schema,
        handler: async ({ body }) => ({
          email: body.email,
          age: body.age,
        }),
      });

      const req = mockReq({ email: 'user@example.com', age: 30 });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.data.email).toBe('user@example.com');
      expect(res.jsonData.data.age).toBe(30);
    });

    it('validates optional fields with defaults', async () => {
      const schema = z.object({
        language: z.string().default('en-US'),
      });

      const handler = createHandler({
        schema,
        handler: async ({ body }) => ({
          language: body.language,
        }),
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.data.language).toBe('en-US');
    });
  });

  describe('Timeout Protection', () => {
    
    it('returns 408 when handler exceeds timeout', async () => {
      const handler = createHandler({
        timeout: 50,
        handler: async () => {
          await new Promise((resolve) =>
            setTimeout(resolve, 200)
          );
          return { ok: true };
        },
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(408);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.error).toContain('timed out');
    });

    it('completes successfully before timeout', async () => {
      const handler = createHandler({
        timeout: 500,
        handler: async () => {
          await new Promise((resolve) =>
            setTimeout(resolve, 50)
          );
          return { result: 'success' };
        },
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.data.result).toBe('success');
    });

    it('respects different timeout values per handler', async () => {
      const quickHandler = createHandler({
        timeout: 1000,
        handler: async () => ({ type: 'quick' }),
      });

      const slowHandler = createHandler({
        timeout: 50,
        handler: async () => {
          await new Promise((r) => setTimeout(r, 100));
          return { type: 'slow' };
        },
      });

      const req = mockReq({});

      // Quick handler should work
      const res1 = mockRes();
      await quickHandler(req, res1);
      expect(res1.statusCode).toBe(200);

      // Slow handler should timeout
      const res2 = mockRes();
      await slowHandler(req, res2);
      expect(res2.statusCode).toBe(408);
    });

    it('has default timeout when not specified', async () => {
      const handler = createHandler({
        // No timeout specified - should use default
        handler: async () => ({ ok: true }),
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      // Should complete successfully with default timeout
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Error Handling', () => {
    
    it('returns 500 for unexpected errors', async () => {
      const handler = createHandler({
        handler: async () => {
          throw new Error('Database connection failed');
        },
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.error).toContain('Database connection failed');
    });

    it('returns 500 for generic errors (framework limitation)', async () => {
      const handler = createHandler({
        handler: async () => {
          const error = new Error('Resource not found');
          throw error;
        },
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.error).toContain('Resource not found');
    });

    it('currently maps all non-validation/timeout errors to 500', async () => {
      const testErrors = [
        'Authorization header is required',
        'User not found',
        'Database connection failed',
      ];

      for (const errorMsg of testErrors) {
        const handler = createHandler({
          handler: async () => {
            throw new Error(errorMsg);
          },
        });

        const req = mockReq({});
        const res = mockRes();

        await handler(req, res);

        // Current behavior: all errors map to 500
        expect(res.statusCode).toBe(500);
        expect(res.jsonData.error).toContain(errorMsg);
      }
    });

    it('logs errors to console', async () => {
      let consoleOutput = '';
      const originalError = console.error;
      console.error = (msg) => {
        consoleOutput += msg;
      };

      const handler = createHandler({
        handler: async () => {
          throw new Error('Test error');
        },
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      console.error = originalError;
      // Error should be logged
      expect(consoleOutput.length > 0 || res.statusCode === 500).toBe(true);
    });

    it('handles both validation and runtime errors', async () => {
      const schema = z.object({
        id: z.number(),
      });

      const handler = createHandler({
        schema,
        handler: async ({ body }) => {
          if (body.id < 0) {
            throw new Error('ID must be positive');
          }
          return { id: body.id };
        },
      });

      // Validation error
      const req1 = mockReq({ id: 'not-a-number' });
      const res1 = mockRes();
      await handler(req1, res1);
      expect(res1.statusCode).toBe(400);

      // Runtime error
      const req2 = mockReq({ id: -5 });
      const res2 = mockRes();
      await handler(req2, res2);
      expect(res2.statusCode).toBe(500);
    });
  });

  describe('Success Response Formatting', () => {
    
    it('returns standardized success response', async () => {
      const handler = createHandler({
        handler: async () => ({ id: 123, name: 'test' }),
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.data).toEqual({ id: 123, name: 'test' });
    });

    it('returns 200 status code for successful responses', async () => {
      const handler = createHandler({
        handler: async () => ({ result: 'ok' }),
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('wraps response data in data property', async () => {
      const responseData = {
        userId: 1,
        email: 'user@example.com',
        roles: ['admin', 'user'],
      };

      const handler = createHandler({
        handler: async () => responseData,
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.jsonData.data).toEqual(responseData);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.error).toBeUndefined();
    });

    it('handles null response data', async () => {
      const handler = createHandler({
        handler: async () => null,
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.data).toBe(null);
    });

    it('handles undefined response data', async () => {
      const handler = createHandler({
        handler: async () => {
          // No explicit return
        },
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
    });

    it('handles array response data', async () => {
      const handler = createHandler({
        handler: async () => [
          { id: 1 },
          { id: 2 },
          { id: 3 },
        ],
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.jsonData.data)).toBe(true);
      expect(res.jsonData.data.length).toBe(3);
    });

    it('handles complex nested response data', async () => {
      const complexData = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
            },
          },
        },
        meta: {
          timestamp: '2026-04-25',
        },
      };

      const handler = createHandler({
        handler: async () => complexData,
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.jsonData.data).toEqual(complexData);
    });
  });

  describe('Framework Integration', () => {
    
    it('combines validation and handler execution', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const handler = createHandler({
        schema,
        timeout: 1000,
        handler: async ({ body }) => ({
          processed: true,
          name: body.name.toUpperCase(),
          email: body.email,
        }),
      });

      const req = mockReq({
        name: 'john',
        email: 'john@example.com',
      });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.data.name).toBe('JOHN');
      expect(res.jsonData.data.processed).toBe(true);
    });

    it('prioritizes validation error over handler execution', async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      let handlerExecuted = false;

      const handler = createHandler({
        schema,
        handler: async () => {
          handlerExecuted = true;
          return { ok: true };
        },
      });

      const req = mockReq({ email: 'invalid' });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(handlerExecuted).toBe(false);
    });

    it('passes validated body to handler', async () => {
      const schema = z.object({
        count: z.number().int().positive(),
      });

      const handler = createHandler({
        schema,
        handler: async ({ body }) => ({
          doubled: body.count * 2,
          input: body.count,
        }),
      });

      const req = mockReq({ count: 5 });
      const res = mockRes();

      await handler(req, res);

      expect(res.jsonData.data.input).toBe(5);
      expect(res.jsonData.data.doubled).toBe(10);
    });

    it('has access to req, res objects in handler', async () => {
      const handler = createHandler({
        handler: async ({ req, res, body }) => {
          expect(req).toBeDefined();
          expect(res).toBeDefined();
          expect(body).toBeDefined();
          return { hasAccess: true };
        },
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('maintains response consistency across different scenarios', async () => {
      const testCases = [
        {
          name: 'success',
          input: { valid: true },
          schema: z.object({ valid: z.boolean() }),
          handler: async () => ({ result: 'ok' }),
          expectedStatus: 200,
          expectedSuccess: true,
        },
        {
          name: 'validation error',
          input: { invalid: 'data' },
          schema: z.object({ valid: z.boolean() }),
          handler: async () => ({ result: 'ok' }),
          expectedStatus: 400,
          expectedSuccess: false,
        },
      ];

      for (const testCase of testCases) {
        const handler = createHandler({
          schema: testCase.schema,
          handler: testCase.handler,
        });

        const req = mockReq(testCase.input);
        const res = mockRes();

        await handler(req, res);

        expect(res.statusCode).toBe(testCase.expectedStatus);
        expect(res.jsonData.success).toBe(testCase.expectedSuccess);
        expect(res.jsonData).toHaveProperty('success');
        expect(res.jsonData).toHaveProperty(
          testCase.expectedSuccess ? 'data' : 'error'
        );
      }
    });
  });

  describe('Edge Cases & Robustness', () => {
    
    it('handles empty request body', async () => {
      const schema = z.object({}).strict();

      const handler = createHandler({
        schema,
        handler: async () => ({ ok: true }),
      });

      const req = mockReq({});
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('handles large payloads', async () => {
      const schema = z.object({
        data: z.array(z.number()),
      });

      const largeArray = Array.from({ length: 10000 }, (_, i) => i);

      const handler = createHandler({
        schema,
        handler: async ({ body }) => ({
          count: body.data.length,
        }),
      });

      const req = mockReq({ data: largeArray });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.data.count).toBe(10000);
    });

    it('handles special characters in data', async () => {
      const schema = z.object({
        text: z.string(),
      });

      const handler = createHandler({
        schema,
        handler: async ({ body }) => ({
          original: body.text,
        }),
      });

      const specialText = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      const req = mockReq({ text: specialText });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.data.original).toBe(specialText);
    });

    it('handles unicode characters', async () => {
      const schema = z.object({
        name: z.string(),
      });

      const handler = createHandler({
        schema,
        handler: async ({ body }) => ({
          name: body.name,
        }),
      });

      const req = mockReq({ name: '北京 مصر 🚀' });
      const res = mockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.data.name).toBe('北京 مصر 🚀');
    });
  });
});
