import fs from 'node:fs';
import path from 'node:path';

export function getRuntimeDir() {
  const configured = process.env.COGCAGE_RUNTIME_DIR?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), '..', 'ops', 'runtime');
}

export function ensureRuntimeDir() {
  const runtimeDir = getRuntimeDir();
  fs.mkdirSync(runtimeDir, { recursive: true });
  return runtimeDir;
}

export function resolveRuntimePath(fileName: string) {
  return path.join(ensureRuntimeDir(), fileName);
}
