import { realpathSync } from "node:fs";
// Normalize redirected Windows workspace paths before Next resolves build files.
process.chdir(realpathSync(process.cwd()));
await import("next/dist/bin/next");
