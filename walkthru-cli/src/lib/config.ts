import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";

const CONFIG_DIR = join(homedir(), ".walkthru");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface Config {
  token?: string;
}

async function read(): Promise<Config> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function write(config: Config): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function saveToken(token: string): Promise<void> {
  const config = await read();
  await write({ ...config, token });
}

export async function getToken(): Promise<string | undefined> {
  const config = await read();
  return config.token;
}
