import assert from "node:assert/strict";
import { readNotificationWorkerRuntime } from "./runtime.ts";

const runtime = readNotificationWorkerRuntime({
  MUSUNIL_API_BASE_URL: "http://localhost:4999/",
  MUSUNIL_INTERNAL_API_KEY: "test_internal_key"
});

assert.equal(runtime.apiBaseUrl, "http://localhost:4999");
assert.equal(runtime.internalApiKey, "test_internal_key");

const hostportRuntime = readNotificationWorkerRuntime({
  MUSUNIL_API_HOSTPORT: "musunil-api:10000",
  MUSUNIL_INTERNAL_API_KEY: "test_internal_key"
});
assert.equal(hostportRuntime.apiBaseUrl, "http://musunil-api:10000");

assert.throws(() => readNotificationWorkerRuntime({}, "/tmp/musunil-config-missing"));
