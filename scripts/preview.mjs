import { spawn } from "node:child_process";
import { createServer } from "node:net";
export async function startNextServer() {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {stdio: "ignore"});
  const close = () => child.kill("SIGTERM");
  process.once("exit", close);
  for (let n = 0; n < 120; n++) {
    if (child.exitCode !== null) throw new Error("Preview exited before it was ready.");
    try { if ((await fetch(origin)).ok) return {origin, server: {close}}; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  close();
  throw new Error("Preview did not start.");
}
