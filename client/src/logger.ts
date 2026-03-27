type LogContext = Record<string, unknown>;

function emitDevLog(
  level: "error" | "warn" | "info",
  message: string,
  context?: LogContext,
) {
  if (!import.meta.env.DEV) return;
  const payload = context ? { message, ...context } : { message };
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export function logClientError(message: string, context?: LogContext) {
  emitDevLog("error", message, context);
}
