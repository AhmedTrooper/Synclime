import { invoke } from "@tauri-apps/api/core";

/**
 * Persists application errors directly to the SQLite error_logs database.
 * Completely replaces simple console.log/console.error with persistent database tracking.
 */
export async function logErrorToDb(errorMsg: string, context: string = "app_error", jobSlug: string = "app_fallback") {
  try {
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      await invoke("insert_error_log", {
        downloadJobSlug: jobSlug,
        commandExecuted: context,
        errorMessage: errorMsg,
      });
    }
  } catch (err) {
    // Silent safety fallback
  }
}

/**
 * Persists metadata discovery transactions to the SQLite parse_logs database.
 */
export async function logParseToDb(
  parsedFileSlug: string,
  status: "running" | "success" | "failed",
  startedAt: string,
  finishedAt: string | null,
  durationMs: number,
  commandExecuted: string,
  exitCode: number | null,
  bytesReturned: number
) {
  try {
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      await invoke("insert_parse_log", {
        parsedFileSlug,
        status,
        startedAt,
        finishedAt,
        durationMs,
        commandExecuted,
        exitCode,
        bytesReturned,
      });
    }
  } catch (err) {
    // Silent safety fallback
  }
}
