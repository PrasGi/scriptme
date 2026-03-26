/**
 * Debug session dd82dd — NDJSON to local ingest + console for Docker logs.
 * #region agent log
 */
const INGEST = 'http://127.0.0.1:7444/ingest/c52b058c-998f-46c8-a602-4c73a0ed7fc0';
const SESSION_ID = 'dd82dd';

export function agentDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
): void {
  const payload = {
    sessionId: SESSION_ID,
    location,
    message,
    data: { ...data, hypothesisId },
    timestamp: Date.now(),
    hypothesisId,
  };
  console.log('[agent-debug]', JSON.stringify(payload));
  fetch(INGEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION_ID },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
// #endregion
