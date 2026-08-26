import { cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../src/profiles/registry-pr-1404/", import.meta.url));
const destination = fileURLToPath(new URL("../dist/profiles/registry-pr-1404/", import.meta.url));
await cp(source, destination, { recursive: true });
