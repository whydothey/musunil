import { readNotificationWorkerRuntime } from "./runtime.ts";

const runtime = readNotificationWorkerRuntime();
const response = await fetch(`${runtime.apiBaseUrl}/internal/notifications/dispatch`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-musunil-internal-key": runtime.internalApiKey
  },
  body: "{}"
});

const body = await response.json();
if (!response.ok) {
  console.error(JSON.stringify({ status: response.status, body }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(body, null, 2));
