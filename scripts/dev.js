const { spawn } = require("child_process");

const children = [];

function start(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code) => {
    if (code && code !== 0) process.stderr.write(`[${name}] exited with code ${code}\n`);
  });
}

function stopAll() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});

start("api", process.execPath, ["backend/server.js"], { APP_ORIGIN: "*" });
start("web", process.execPath, ["scripts/static-server.js"], {});

console.log("MallMaze dev is starting...");
console.log("Open http://localhost:8080 in your browser, or run: Start-Process http://localhost:8080");
