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
  return resolveRuntimeDir().dir;
}

type RuntimeResolution = {
  dir: string;
  source: 'env' | 'workspace' | 'tmp-fallback';
  candidates: string[];
};

let cachedResolution: RuntimeResolution | null = null;

function resolveRuntimeDir(): RuntimeResolution {
  if (cachedResolution) return cachedResolution;

  const configured = process.env.MOLTPIT_RUNTIME_DIR?.trim();
  const workspaceDefault = path.join(process.cwd(), '.runtime', 'moltpit');
  const tmpFallback = path.join(os.tmpdir(), 'moltpit-runtime');

  const orderedCandidates = [configured, workspaceDefault, tmpFallback].filter(Boolean) as string[];
  const resolved = orderedCandidates.find((candidate) => isWritableDir(candidate));

  if (resolved === configured && configured) {
    cachedResolution = { dir: configured, source: 'env', candidates: orderedCandidates };
    return cachedResolution;
  }

  if (resolved === workspaceDefault) {
    cachedResolution = { dir: workspaceDefault, source: 'workspace', candidates: orderedCandidates };
    return cachedResolution;
  }

  // Last-resort fallback. If this fails later, callers can still handle write failures.
  cachedResolution = { dir: tmpFallback, source: 'tmp-fallback', candidates: orderedCandidates };
  return cachedResolution;
}

export function getRuntimeDirInfo() {
  return resolveRuntimeDir();
}

export function ensureRuntimeDir() {
  const runtimeDir = getRuntimeDir();
  fs.mkdirSync(runtimeDir, { recursive: true });
  return runtimeDir;
}

export function resolveRuntimePath(fileName: string) {
  return path.join(getRuntimeDir(), fileName);
}
