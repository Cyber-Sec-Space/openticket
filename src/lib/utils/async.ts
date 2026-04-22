/**
 * Safely executes a background task asynchronously.
 * 
 * In a Next.js App Router context (e.g., API Route, Server Action), this utilizes 
 * `after()` to ensure the task runs *after* the HTTP response has been sent to the 
 * client, preventing blocking or starvation.
 * 
 * If called outside a Request Context (e.g., in a cron job or standalone script),
 * it gracefully falls back to a standard disconnected Promise.
 */
export function runAsync(task: () => Promise<void> | void): any {
  if (process.env.NODE_ENV === "test") {
    return task();
  }

  try {
    const nextServer = require("next/server");
    if (nextServer && typeof nextServer.after === "function") {
      // Note: next/server after() will synchronously throw if used outside 
      // of an active Request Context. We catch this immediately.
      nextServer.after(task);
      return;
    }
  } catch (err) {
    // If we are not in a Next.js Request Context, fallback to standard Promise
    // No-op the error itself, as it's an expected invariant violation from Next.
  }

  // Fallback for non-Edge/non-Request environments
  Promise.resolve().then(async () => {
    try {
      await task();
    } catch (err) {
      console.error("[runAsync] Fallback execution failed:", err);
    }
  });
}
