import { spawn } from "node:child_process";
import { delimiter, join } from "node:path";
import process from "node:process";

const workspaceRoot = process.cwd();
const toolsPath = join(workspaceRoot, "tools");
const pnpmBin =
  process.platform === "win32"
    ? join(toolsPath, "pnpm.cmd")
    : join(toolsPath, "pnpm");

const args = process.argv.slice(2);

const child = spawn(pnpmBin, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    PATH: `${toolsPath}${delimiter}${process.env.PATH ?? ""}`
  }
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
