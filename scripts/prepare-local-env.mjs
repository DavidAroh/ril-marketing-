import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../.env", import.meta.url);
const source = readFileSync(path, "utf8");
const localOrigin = process.argv[2] || "http://localhost:3000";
if (!/^http:\/\/localhost:\d+$/.test(localOrigin)) throw new Error("Pass a localhost origin with a port, such as http://localhost:3000.");
const placeholder = (value) => !value || /your-|change-me|example/i.test(value);
const keys = ["CRON_SECRET", "AI_CONFIG_SECRET", "EMAIL_UNSUBSCRIBE_SECRET"];
let next = source;

for (const key of keys) {
  const line = new RegExp(`^${key}=(.*)$`, "m");
  const current = next.match(line)?.[1]?.trim();
  if (!placeholder(current)) continue;
  const value = randomBytes(32).toString("hex");
  next = line.test(next) ? next.replace(line, `${key}=${value}`) : `${next.trimEnd()}\n${key}=${value}\n`;
}

const originLine = /^NEXT_PUBLIC_SITE_URL=(.*)$/m;
const origin = next.match(originLine)?.[1]?.trim();
if (placeholder(origin)) {
  next = originLine.test(next)
    ? next.replace(originLine, `NEXT_PUBLIC_SITE_URL=${localOrigin}`)
    : `${next.trimEnd()}\nNEXT_PUBLIC_SITE_URL=${localOrigin}\n`;
}

if (next !== source) writeFileSync(path, next);
console.log("Local environment is configured.");
