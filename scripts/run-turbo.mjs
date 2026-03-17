import { spawn } from "node:child_process";
import { delimiter, join } from "node:path";
import process from "node:process";

const workspaceRoot = process.cwd();
const turboBin = process.platform === "win32"
  ? join(workspaceRoot, "node_modules", ".bin", "turbo.CMD")
  : join(workspaceRoot, "node_modules", ".bin", "turbo");

const toolsPath = join(workspaceRoot, "tools");
const args = process.argv.slice(2);

const child = spawn(
  turboBin,
  ["run", ...args],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      PATH: `${toolsPath}${delimiter}${process.env.PATH ?? ""}`
    }
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
