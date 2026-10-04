// `npm start`: runs the server of this folder (`npm run server`) next to the helper of the repro (counter.mjs).
import { spawn } from "node:child_process";

const children = [
  spawn("node", ["counter.mjs"], { stdio: "inherit" }),
  spawn("npm", ["run", "server"], { stdio: "inherit", shell: true }),
];
const stop = () => children.forEach((child) => child.kill());
process.on("SIGINT", stop).on("SIGTERM", stop);
children.forEach((child) => child.on("exit", stop));
