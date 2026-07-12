const [, , mode, packageName = "app.musunil.android"] = process.argv;

if (!mode) {
  console.error("Usage: node scripts/mobile-integrity-smoke-fixture.mjs <proof|marker|wrong-package|leak> [packageName]");
  process.exit(2);
}

if (mode === "marker") {
  console.log("mobile_integrity_provider_dry_run");
} else if (mode === "proof") {
  console.log(JSON.stringify({
    checked: "mobile_integrity_provider_dry_run",
    provider: "play_integrity",
    packageName,
    verdict: "ok"
  }));
} else if (mode === "wrong-package") {
  console.log(JSON.stringify({
    checked: "mobile_integrity_provider_dry_run",
    provider: "play_integrity",
    packageName: "app.other.android",
    verdict: "ok"
  }));
} else if (mode === "leak") {
  console.log("-----BEGIN PRIVATE KEY-----");
  console.log(JSON.stringify({
    checked: "mobile_integrity_provider_dry_run",
    provider: "play_integrity",
    packageName,
    verdict: "ok"
  }));
} else {
  console.error(`Unsupported fixture mode: ${mode}`);
  process.exit(2);
}
