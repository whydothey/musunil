import { readFileSync, writeFileSync } from "node:fs";

const [, , mode, inputPath, outputPath] = process.argv;
if (!mode || !inputPath || !outputPath) {
  console.error("Usage: node scripts/redaction-smoke-fixture.mjs <redact|copy> <input> <output>");
  process.exit(2);
}

const input = readFileSync(inputPath, "utf8");
if (mode === "copy") {
  writeFileSync(outputPath, input);
} else if (mode === "redact") {
  writeFileSync(outputPath, input.replaceAll("sample face", "[masked face]").replaceAll("12가3456", "[masked plate]"));
} else {
  console.error(`Unsupported fixture mode: ${mode}`);
  process.exit(2);
}
