// Lance Vitest en normalisant la lettre de lecteur sous Windows.
//
// Quand le répertoire courant commence par "c:\" (minuscule, cas fréquent avec
// VS Code ou Git Bash), Vitest charge deux instances de son propre module et
// tous les tests échouent avec « failed to find the current suite ».
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const toUpperDrive = (p) =>
  process.platform === "win32" && /^[a-z]:/.test(p)
    ? p[0].toUpperCase() + p.slice(1)
    : p;

const cwd = toUpperDrive(process.cwd());
const require = createRequire(path.join(cwd, "package.json"));
const vitestBin = toUpperDrive(
  path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs"),
);

const result = spawnSync(
  process.execPath,
  [vitestBin, ...process.argv.slice(2)],
  { cwd, stdio: "inherit" },
);

process.exit(result.status ?? 1);
