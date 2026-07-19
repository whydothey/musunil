/// <reference types="vite/client" />

declare const __MUSUNIL_UI_DATA_MODE__: "fixture" | "production";

interface Window {
  MUSUNIL_WEB_CONFIG?: {
    apiBaseUrl?: string;
    mapStyleUrl?: string;
  };
  MUSUNIL_BUILD_INFO?: {
    commitSha?: string;
    builtAt?: string;
  };
}
