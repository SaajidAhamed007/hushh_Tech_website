/**
 * Mock HTTP Request/Response Helpers
 * For testing handlers without a real server
 */

interface MockReqOptions {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
}

interface MockReq {
  method: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
}

interface MockRes {
  readonly statusCode: number;
  readonly jsonData: any;
  readonly headers: Record<string, string>;
  status(code: number): MockRes;
  json(data: any): MockRes;
  setHeader(key: string, value: string): MockRes;
  send(data: any): MockRes;
  end(): MockRes;
}

/**
 * Mock Express Request object
 */
export function mockReq(
  body: any = {},
  options: MockReqOptions = {}
): MockReq {
  return {
    method: options.method || 'POST',
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    query: options.query || {},
    body,
  };
}

/**
 * Mock Express Response object
 */
export function mockRes(): MockRes {
  let statusCode = 200;
  let jsonData: any = null;
  const headers: Record<string, string> = {};

  return {
    get statusCode() {
      return statusCode;
    },
    get jsonData() {
      return jsonData;
    },
    get headers() {
      return headers;
    },

    status(code: number) {
      statusCode = code;
      return this;
    },

    json(data: any) {
      jsonData = data;
      return this;
    },

    setHeader(key: string, value: string) {
      headers[key] = value;
      return this;
    },

    send(data: any) {
      jsonData = data;
      return this;
    },

    end() {
      return this;
    },
  };
}
