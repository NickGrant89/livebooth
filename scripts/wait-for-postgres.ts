/**
 * Wait until local Docker Postgres accepts connections.
 * Usage: npm run db:wait
 */
import net from "node:net";

const url = process.env.DATABASE_URL ?? "postgresql://livebooth:livebooth@localhost:5432/livebooth";
const parsed = new URL(url.replace("postgresql://", "http://").replace("postgres://", "http://"));
const host = parsed.hostname || "localhost";
const port = Number(parsed.port || 5432);
const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS ?? 60_000);
const started = Date.now();

function tryConnect(): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve();
    });
    socket.on("error", reject);
    socket.setTimeout(3000, () => {
      socket.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function main() {
  process.stdout.write(`Waiting for Postgres at ${host}:${port}…`);
  while (Date.now() - started < timeoutMs) {
    try {
      await tryConnect();
      console.log(" ready");
      return;
    } catch {
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  console.error("\nTimed out — is Docker running? Try: npm run db:up");
  process.exit(1);
}

main();
