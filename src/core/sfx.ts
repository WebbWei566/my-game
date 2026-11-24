// WebAudio 合成音效：不需音檔，離線可用
type Sfx = 'tap' | 'success' | 'fail' | 'thunder' | 'hit' | 'craft' | 'coin' | 'unlock'

let ctx: AudioContext | null = null
let muted = false
try { muted = localStorage.getItem('wendao-muted') === '1' } catch { /* ignore */ }

export const isMuted = () => muted
export function setMuted(m: boolean) {
  muted = m
  try { localStorage.setItem('wendao-muted', m ? '1' : '0') } catch { /* ignore */ }
}

function ac(): AudioContext | null {
  if (muted) return null
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.15) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + start
  const o = c.createOscillator()
  const gn = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  gn.gain.setValueAtTime(0, t)
  gn.gain.linearRampToValueAtTime(vol, t + 0.01)
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(gn).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, vol = 0.3, lowpass = 1200) {
  const c = ac()
  if (!c) return
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = lowpass
  const gn = c.createGain()
  gn.gain.value = vol
  src.connect(f).connect(gn).connect(c.destination)
  src.start()
}

// 五聲音階（宮商角徵羽）讓音效帶點古風
const PENTA = [523.25, 587.33, 659.25, 783.99, 880]

export function play(s: Sfx) {
  switch (s) {
    case 'tap': tone(PENTA[Math.floor(Math.random() * 5)] / 2, 0, 0.25, 'sine', 0.06); break
    case 'success': PENTA.forEach((f, i) => tone(f, i * 0.08, 0.5, 'triangle', 0.12)); break
    case 'fail': tone(196, 0, 0.5, 'sawtooth', 0.08); tone(147, 0.15, 0.6, 'sawtooth', 0.08); break
    case 'thunder': noise(0.8, 0.5, 900); break
    case 'hit': noise(0.12, 0.25, 2500); break
    case 'craft': tone(659.25, 0, 0.3, 'triangle', 0.1); tone(987.77, 0.1, 0.5, 'triangle', 0.1); break
    case 'coin': tone(1318.5, 0, 0.15, 'square', 0.04); tone(1760, 0.06, 0.2, 'square', 0.04); break
    case 'unlock': [0, 2, 4].forEach((k, i) => tone(PENTA[k] * 1.5, i * 0.1, 0.4, 'sine', 0.1)); break
  }
}
