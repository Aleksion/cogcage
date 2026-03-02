import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/agent/decide-stream')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const {
            gameState, actorId, systemPrompt, loadout, opponentIds,
            brainPrompt,
          } = body

          if (!gameState || !actorId || !loadout) {
            return new Response(
              `data: ${JSON.stringify({ type: 'error', msg: 'missing fields' })}\n\n`,
              { status: 200, headers: sseHeaders() },
            )
          }

          const apiKey = process.env.OPENAI_API_KEY || ''
          if (!apiKey) {
            const action = scriptedFallback(gameState, actorId, opponentIds || [], loadout)
            const reasoning = SCRIPTED_REASONING[action.type] || 'Processing...'
            return streamScripted(reasoning, action)
          }

          const temperature = parseFloat(request.headers.get('x-llm-temperature') || '0.7')
          const effectivePrompt = (brainPrompt || systemPrompt || 'You are a combat bot.').slice(0, 2000)
          const userMessage = formatBattleState(gameState, actorId, opponentIds || [], loadout)

          const messages = [
            { role: 'system', content: effectivePrompt },
            { role: 'user', content: userMessage },
          ]

          const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages,
              stream: true,
              max_tokens: 150,
              temperature,
            }),
          })

          if (!openaiRes.ok || !openaiRes.body) {
            const action = scriptedFallback(gameState, actorId, opponentIds || [], loadout)
            const reasoning = SCRIPTED_REASONING[action.type] || 'Processing...'
            return streamScripted(reasoning, action)
          }

          const encoder = new TextEncoder()
          const decoder = new TextDecoder()
          let accumulated = ''

          const readable = new ReadableStream({
            async start(controller) {
              const reader = openaiRes.body!.getReader()
              let buffer = ''
              try {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  buffer += decoder.decode(value, { stream: true })
                  const lines = buffer.split('\n')
                  buffer = lines.pop() || ''
                  for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const payload = line.slice(6).trim()
                    if (payload === '[DONE]') continue
                    try {
                      const parsed = JSON.parse(payload)
                      const delta = parsed.choices?.[0]?.delta?.content
                      if (delta) {
                        accumulated += delta
                        controller.enqueue(encoder.encode(
                          `data: ${JSON.stringify({ type: 'token', delta })}\n\n`
                        ))
                      }
                    } catch { /* skip parse errors */ }
                  }
                }
              } catch (err) {
                console.error('[decide-stream] stream error:', err)
              }

              let action: any = { type: 'NO_OP' }
              try {
                const jsonMatch = accumulated.match(/\{[^{}]*"type"\s*:\s*"[^"]+?"[^{}]*\}/)
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0])
                  if (parsed.type && VALID_ACTIONS.has(parsed.type.toUpperCase())) {
                    action = {
                      type: parsed.type.toUpperCase(),
                      dir: parsed.dir?.toUpperCase?.(),
                      targetId: parsed.targetId,
                      reasoning: parsed.reasoning?.slice?.(0, 200),
                    }
                  }
                }
              } catch { /* fallback to NO_OP */ }

              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'decision', action })}\n\n`
              ))
              controller.close()
            },
          })

          return new Response(readable, { headers: sseHeaders() })
        } catch (err) {
          console.error('[decide-stream] error:', err)
          return new Response(
            `data: ${JSON.stringify({ type: 'error', msg: 'internal error' })}\n\n`,
            { status: 200, headers: sseHeaders() },
          )
        }
      },
    },
  },
})

/* ── Helpers ────────────────────────────────────────────────── */

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  }
}

const VALID_ACTIONS = new Set([
  'MOVE', 'MELEE_STRIKE', 'RANGED_SHOT', 'GUARD', 'DASH', 'UTILITY', 'NO_OP',
])

const SCRIPTED_REASONING: Record<string, string> = {
  MELEE_STRIKE: 'Enemy in range — press the advantage!',
  RANGED_SHOT: 'Clear line of sight — taking the shot.',
  GUARD: 'Low resources — bracing for impact.',
  MOVE: 'Closing distance to engage.',
  DASH: 'Rushing into position!',
  UTILITY: 'Deploying tactical ability.',
  NO_OP: 'Conserving energy.',
}

const UNIT_SCALE = 10
const ENERGY_MAX = 1000
const MELEE_RANGE = 15
const RANGED_MIN = 20
const RANGED_MAX = 100
const TICK_RATE = 10
const MATCH_DURATION_SEC = 90
const OBJECTIVE_CENTER = { x: 100, y: 100 }

const ACTION_COST: Record<string, number> = {
  MOVE: 40, MELEE_STRIKE: 180, RANGED_SHOT: 140, GUARD: 100, DASH: 220, UTILITY: 200,
}

function distanceTenths(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y))
}

function compassDir(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 0 && dy === 0) return '--'
  const angle = Math.atan2(-dy, dx) * (180 / Math.PI)
  const norm = ((angle % 360) + 360) % 360
  const idx = Math.round(norm / 45) % 8
  return ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'][idx]
}

function formatBattleState(
  gameState: any, actorId: string, opponentIds: string[], loadout: string[],
): string {
  const me = gameState.actors[actorId]
  const tick = gameState.tick
  const timeRemaining = Math.max(0, MATCH_DURATION_SEC - tick / TICK_RATE)
  const lines: string[] = []
  lines.push(`=== BATTLE STATE (tick ${tick}) ===`)
  lines.push(`Time remaining: ${timeRemaining.toFixed(1)}s`)
  const myPos = `(${(me.position.x / UNIT_SCALE).toFixed(1)}, ${(me.position.y / UNIT_SCALE).toFixed(1)})`
  lines.push(`\n-- YOU --`)
  lines.push(`HP: ${me.hp}/100 | Energy: ${Math.round((me.energy / ENERGY_MAX) * 100)}% | Position: ${myPos} | Facing: ${me.facing}`)
  lines.push(`\n-- OPPONENTS --`)
  for (const oppId of opponentIds) {
    const opp = gameState.actors[oppId]
    if (!opp) continue
    const dist = distanceTenths(me.position, opp.position)
    const dir = compassDir(me.position, opp.position)
    lines.push(`  ${oppId} — HP: ${opp.hp}/100 | Dist: ${(dist / UNIT_SCALE).toFixed(1)} | Dir: ${dir}`)
  }
  lines.push(`\n-- ACTIONS --`)
  const closestDist = opponentIds.length > 0
    ? Math.min(...opponentIds.filter(id => gameState.actors[id]).map(id => distanceTenths(me.position, gameState.actors[id].position)))
    : Infinity
  for (const action of loadout) {
    const cost = ACTION_COST[action] ?? 0
    const cd = me.cooldowns?.[action] ?? 0
    const canAfford = me.energy >= cost
    const offCd = cd === 0
    let usable = 'USABLE'
    if (!offCd) usable = `CD ${(cd / TICK_RATE).toFixed(1)}s`
    else if (!canAfford) usable = 'NO ENERGY'
    else if (action === 'MELEE_STRIKE' && closestDist > MELEE_RANGE) usable = 'OUT OF RANGE'
    else if (action === 'RANGED_SHOT' && (closestDist < RANGED_MIN || closestDist > RANGED_MAX)) usable = 'OUT OF RANGE'
    const dirNote = (action === 'MOVE' || action === 'DASH') ? ' (needs dir)' : ''
    lines.push(`  ${action}${dirNote} — ${usable}`)
  }
  lines.push(`  NO_OP — USABLE`)
  lines.push(`\nRespond with JSON: {"type":"...","dir":"...","targetId":"...","reasoning":"..."}`)
  return lines.join('\n')
}

function scriptedFallback(
  gameState: any, actorId: string, opponentIds: string[], loadout: string[],
): any {
  const me = gameState?.actors?.[actorId]
  if (!me) return { type: 'NO_OP' }
  const opponentId = opponentIds.find(id => gameState?.actors?.[id])
  const opp = opponentId ? gameState.actors[opponentId] : undefined
  const energy = me.energy ?? 0
  const cooldowns = me.cooldowns ?? {}
  const dist = opp ? distanceTenths(me.position, opp.position) : Infinity

  if (loadout.includes('MELEE_STRIKE') && opp && dist <= MELEE_RANGE && energy >= ACTION_COST.MELEE_STRIKE && (cooldowns['MELEE_STRIKE'] ?? 0) === 0)
    return { type: 'MELEE_STRIKE', targetId: opponentId }
  if (loadout.includes('RANGED_SHOT') && opp && dist >= RANGED_MIN && dist <= RANGED_MAX && energy >= ACTION_COST.RANGED_SHOT && (cooldowns['RANGED_SHOT'] ?? 0) === 0)
    return { type: 'RANGED_SHOT', targetId: opponentId }
  if (loadout.includes('MOVE') && energy >= ACTION_COST.MOVE && opp) {
    const dir = compassDir(me.position, opp.position)
    if (dir !== '--') return { type: 'MOVE', dir }
  }
  if (loadout.includes('GUARD') && energy < 300 && me.hp < 50)
    return { type: 'GUARD' }
  if (loadout.includes('MOVE') && energy >= ACTION_COST.MOVE) {
    const dir = compassDir(me.position, OBJECTIVE_CENTER)
    if (dir !== '--') return { type: 'MOVE', dir }
  }
  return { type: 'NO_OP' }
}

function streamScripted(reasoning: string, action: any): Response {
  const encoder = new TextEncoder()
  const tokens = reasoning.split(' ')
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < tokens.length; i++) {
        const delta = (i > 0 ? ' ' : '') + tokens[i]
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'token', delta })}\n\n`
        ))
        await new Promise(r => setTimeout(r, 30 + Math.random() * 40))
      }
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'decision', action })}\n\n`
      ))
      controller.close()
    },
  })
  return new Response(stream, { headers: sseHeaders() })
}
