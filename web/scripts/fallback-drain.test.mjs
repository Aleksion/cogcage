import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cogcage-fallback-drain-'))
process.env.MOLTPIT_LOG_DIR = tmpDir
process.env.MOLTPIT_DB_PATH = path.join(tmpDir, 'moltpit.fallback.test.db')

const dbModPromise = import('../app/lib/waitlist-db.ts')
const drainModPromise = import('../app/lib/fallback-drain.ts')

test('fallback drain replays waitlist rows and clears drained lines', async (t) => {
  const db = await dbModPromise
  const drain = await drainModPromise
  const health = db.getStorageHealth()
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`)
    return
  }

  const fallbackFile = path.join(tmpDir, 'waitlist-fallback.ndjson')
  fs.writeFileSync(
    fallbackFile,
    `${JSON.stringify({
      route: '/api/waitlist',
      requestId: 'req_test',
      email: 'drain-test@pit.dev',
      game: 'The Molt Pit',
      source: 'fallback-test',
      userAgent: 'node-test',
      ipAddress: '127.0.0.1',
    })}\n`,
    'utf8',
  )

  const drained = await drain.drainFallbackQueues(10)
  assert.equal(drained.waitlist.inserted, 1)
  assert.equal(drained.waitlist.kept, 0)

  const counts = db.getFunnelCounts()
  assert.equal(counts.waitlistLeads, 1)
})
