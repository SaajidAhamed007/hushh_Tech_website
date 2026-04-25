export function safeLog(message, metadata) {
  console.log("[LOG]", message, {
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

export function logError(message, error, metadata) {
  console.error("[ERROR]", message, {
    ...metadata,
    error: error?.message || error,
  });
}

export function logWarn(message, metadata) {
  console.warn("[WARN]", message, {
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}
