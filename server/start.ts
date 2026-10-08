import "dotenv/config";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env, // explicitly pass dotenv-populated env
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[START] ERROR: DATABASE_URL is not set — cannot run prisma db push");
    process.exit(1);
  }

  console.log("[START] Running prisma db push...");
  try {
    await run("npx", ["prisma", "db", "push", "--accept-data-loss"]);
    console.log("[START] Schema in sync.");
  } catch (err) {
    console.error("[START] prisma db push failed:", err);
    process.exit(1);
  }

  console.log("[START] Starting server...");
  const server = spawn("node", ["dist/server.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  server.on("close", (code) => process.exit(code ?? 0));
  server.on("error", (err) => {
    console.error("[START] Server error:", err);
    process.exit(1);
  });
}

main();
