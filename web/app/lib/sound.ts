/** Web Audio API sound engine — no files needed */

let ctx: AudioContext | null = null
let ambientOsc: OscillatorNode | null = null
let ambientGain: GainNode | null = null
let muted = false

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(m: boolean) {
  muted = m
  if (ambientGain) ambientGain.gain.value = m ? 0 : 0.04
}

export function isMuted() {
  return muted
}

export function playAttackSound(type: 'melee' | 'ranged' | 'guard' | 'dash') {
  if (muted) return
  const c = getCtx()
  const now = c.currentTime

  if (type === 'melee') {
    // Burst of noise with pitch drop
    const bufferSize = c.sampleRate * 0.1
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const src = c.createBufferSource()
    src.buffer = buffer
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2000, now)
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.1)
    src.connect(filter).connect(gain).connect(c.destination)
    src.start(now)
    src.stop(now + 0.12)
  } else if (type === 'ranged') {
    // High-pitched tone
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.15)
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
    osc.connect(gain).connect(c.destination)
    osc.start(now)
    osc.stop(now + 0.15)
  } else if (type === 'guard') {
    // Low hum
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 120
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
    osc.connect(gain).connect(c.destination)
    osc.start(now)
    osc.stop(now + 0.3)
  } else if (type === 'dash') {
    // Whoosh - filtered noise sweep
    const bufferSize = c.sampleRate * 0.2
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI)
    }
    const src = c.createBufferSource()
    src.buffer = buffer
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
    const filter = c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(500, now)
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.2)
    src.connect(filter).connect(gain).connect(c.destination)
    src.start(now)
    src.stop(now + 0.22)
  }
}

export function playHitSound(damage: number) {
  if (muted) return
  const c = getCtx()
  const now = c.currentTime
  // Low thud, pitch based on damage
  const freq = 60 + Math.min(damage, 30) * 3
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, now)
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.2)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.4, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
  osc.connect(gain).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.25)
}

export function playKOSound() {
  if (muted) return
  const c = getCtx()
  const now = c.currentTime
  // Descending tone + reverb tail
  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(600, now)
  osc.frequency.exponentialRampToValueAtTime(80, now + 1.0)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2)
  const conv = c.createConvolver()
  // Simple reverb via noise impulse
  const len = c.sampleRate * 0.8
  const impulse = c.createBuffer(1, len, c.sampleRate)
  const d = impulse.getChannelData(0)
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.2))
  }
  conv.buffer = impulse
  osc.connect(gain).connect(conv).connect(c.destination)
  osc.connect(gain).connect(c.destination) // dry signal too
  osc.start(now)
  osc.stop(now + 1.3)
}

export function startAmbient() {
  if (muted) return
  const c = getCtx()
  if (ambientOsc) return
  ambientOsc = c.createOscillator()
  ambientOsc.type = 'sawtooth'
  ambientOsc.frequency.value = 40
  ambientGain = c.createGain()
  ambientGain.gain.value = muted ? 0 : 0.04
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 100
  ambientOsc.connect(filter).connect(ambientGain).connect(c.destination)
  ambientOsc.start()
}

export function stopAmbient() {
  if (ambientOsc) {
    ambientOsc.stop()
    ambientOsc.disconnect()
    ambientOsc = null
  }
  if (ambientGain) {
    ambientGain.disconnect()
    ambientGain = null
  }
}
