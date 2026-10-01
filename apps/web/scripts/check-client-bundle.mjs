/**
 * Fails if the Supabase secret key ended up in files sent to browsers.
 * CI builds with a fake secret, then runs this. See the `secrets` CI job.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const secret = process.env.SUPABASE_SECRET_KEY;
if (!secret) {
  console.error("Set SUPABASE_SECRET_KEY to the value used for the build.");
  process.exit(2);
}

const found = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (readFileSync(p, "latin1").includes(secret)) found.push(p);
  }
}
walk(path.join(import.meta.dirname, "..", ".next", "static"));

if (found.length) {
  console.error("The secret key is in browser files:\n" + found.join("\n"));
  process.exit(1);
}
console.log("OK: the secret key is not in any browser file.");
