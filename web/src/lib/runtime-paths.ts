import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function isWritableDir(dirPath: string) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const probe = path.join(dirPath, '.write-probe');
    fs.writeFileSync(probe, 'ok', 'utf8');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

export function getRuntimeDir() {
  const configured = process.env.COGCAGE_RUNTIME_DIR?.trim();
  const appDefault = path.join(process.cwd(), '..', 'ops', 'runtime');
  const tmpFallback = path.join(os.tmpdir(), 'cogcage-runtime');

  const candidates = [configured, appDefault, tmpFallback].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (isWritableDir(candidate)) {
      return candidate;
    }
  }

  // Last-resort fallback. If this fails later, callers can still handle write failures.
  return tmpFallback;
}

export function ensureRuntimeDir() {
  const runtimeDir = getRuntimeDir();
  fs.mkdirSync(runtimeDir, { recursive: true });
  return runtimeDir;
}

export function resolveRuntimePath(fileName: string) {
  return path.join(getRuntimeDir(), fileName);
}
