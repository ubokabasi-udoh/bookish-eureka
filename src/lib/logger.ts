type Fields = Record<string, unknown>;

function describeError(error: unknown): Fields {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      cause: error.cause instanceof Error ? error.cause.message : error.cause,
    };
  }
  return { error: String(error) };
}

function emit(level: "info" | "warn" | "error", event: string, fields: Fields = {}) {
  const { error, ...rest } = fields;
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...rest, ...(error ? describeError(error) : {}) });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

/** Server-side diagnostics only. Nothing logged here is ever shown to shoppers. */
export const logger = {
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};
