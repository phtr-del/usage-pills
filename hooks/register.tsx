import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Usage } from '../types'

const usage = atom({ plugin: 'usage-pills', key: 'usage' } as const, null)

type Colors = { bg: string; fg: string }

const PILL: Record<'five' | 'model' | 'seven' | 'ctx' | 'cost', Colors> = {
  five: { bg: '#d9eedf', fg: '#3d6b4f' },
  model: { bg: '#d5dcf5', fg: '#3f4c8f' },
  seven: { bg: '#e3d8f5', fg: '#5c3fa0' },
  ctx: { bg: '#d2ebf0', fg: '#2f6670' },
  cost: { bg: '#f6e7b0', fg: '#7a5a12' },
}

// Lucide-style icons on a 24-unit grid, drawn as strokes.
const ICONS = {
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  layers:
    '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  coin: '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>',
}

type Part =
  | { kind: 'icon'; name: keyof typeof ICONS }
  | { kind: 'text'; text: string }
  | { kind: 'bar'; percent: number }
  | { kind: 'divider' }

const H = 34
const PAD = 14
const GAP = 8
const ICON = 16
const CHAR = 7.9
const BAR = 56

const partWidth = (p: Part) =>
  p.kind === 'icon' ? ICON : p.kind === 'text' ? p.text.length * CHAR : p.kind === 'bar' ? BAR : 1

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const pillSvg = (c: Colors, parts: Part[]) => {
  const width = Math.ceil(PAD * 2 + parts.reduce((w, p) => w + partWidth(p), 0) + GAP * (parts.length - 1))
  const mid = H / 2
  let x = PAD
  const body = parts
    .map(p => {
      const at = x
      x += partWidth(p) + GAP
      if (p.kind === 'icon') {
        const s = ICON / 24
        return `<g transform="translate(${at} ${mid - ICON / 2}) scale(${s})" fill="none" stroke="${c.fg}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.name]}</g>`
      }
      if (p.kind === 'text') {
        return `<text x="${at}" y="${mid}" dominant-baseline="central" fill="${c.fg}" font-family="SF Mono, Menlo, Consolas, monospace" font-size="13.5" font-weight="700">${escape(p.text)}</text>`
      }
      if (p.kind === 'bar') {
        const fill = Math.max(0, Math.min(BAR, (p.percent / 100) * BAR))
        return (
          `<rect x="${at}" y="${mid - 3}" width="${BAR}" height="6" rx="3" fill="${c.fg}" fill-opacity="0.22"/>` +
          `<rect x="${at}" y="${mid - 3}" width="${fill.toFixed(1)}" height="6" rx="3" fill="${c.fg}" fill-opacity="0.85"/>` +
          `<rect x="${(at + Math.max(0, fill - 1.5)).toFixed(1)}" y="${mid - 7}" width="3" height="14" rx="1.5" fill="${c.fg}"/>`
        )
      }
      return `<rect x="${at}" y="${mid - 9}" width="1" height="18" fill="${c.fg}" fill-opacity="0.3"/>`
    })
    .join('')
  return {
    width,
    source: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}"><rect width="${width}" height="${H}" rx="${H / 2}" fill="${c.bg}"/>${body}</svg>`,
  }
}

const bar = (percent: number, width = 6) => {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))
  return '━'.repeat(filled) + '─'.repeat(width - filled)
}

const tokens = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : `${n}`

const countdown = (resetsAt: string | undefined, now: number) => {
  if (!resetsAt) return ''
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60_000))
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`
}

const pick = (u: Usage): Usage => ({ context: u.context, rateLimits: u.rateLimits, cost: u.cost })

type Pill = { key: keyof typeof PILL; text: string; parts: Part[] }

const pillsOf = (u: Usage, now: number): Pill[] => {
  const pills: Pill[] = []
  const limit = (kind: string, key: 'five' | 'seven', label: string, icon: 'gauge' | 'calendar') => {
    const r = u.rateLimits.find(x => x.kind === kind)
    if (!r) return
    const pct = `${Math.round(r.percentUsed)}%`
    const left = countdown(r.resetsAt, now)
    const parts: Part[] = [
      { kind: 'icon', name: icon },
      { kind: 'text', text: label },
      { kind: 'bar', percent: r.percentUsed },
      { kind: 'text', text: pct },
    ]
    if (left) parts.push({ kind: 'divider' }, { kind: 'icon', name: 'clock' }, { kind: 'text', text: left })
    pills.push({ key, text: `${label} ${bar(r.percentUsed)} ${pct}${left ? ` │ ⏱ ${left}` : ''}`, parts })
  }

  const { tokens: used, window, percent } = u.context
  const ctxPercent = percent ?? (used ? Math.round((used / window) * 100) : 0)
  const ctxText = `${tokens(used ?? 0)}/${tokens(window)} ${ctxPercent}%`

  limit('five_hour', 'five', '5h', 'gauge')
  pills.push({ key: 'model', text: `≋ ${tokens(window)}`, parts: [{ kind: 'icon', name: 'layers' }, { kind: 'text', text: tokens(window) }] })
  limit('seven_day', 'seven', '7d', 'calendar')
  pills.push({
    key: 'ctx',
    text: `ctx ${bar(ctxPercent)} ${ctxText}`,
    parts: [{ kind: 'icon', name: 'file' }, { kind: 'text', text: 'ctx' }, { kind: 'bar', percent: ctxPercent }, { kind: 'text', text: ctxText }],
  })
  if (u.cost) {
    const usd = `$${u.cost.usd.toFixed(2)}`
    pills.push({ key: 'cost', text: usd, parts: [{ kind: 'icon', name: 'coin' }, { kind: 'text', text: usd }] })
  }
  return pills
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const u = await $.session.usage()
    await update($, usage, () => pick(u))
    return result
  })

  on('session.measure', async ($, e, next) => {
    await update($, usage, () => pick(e))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const u = await read($, usage)
    if (e.props.hasSurvey || u === null) return next(e)

    const now = await $.clock.now()
    const pills = pillsOf(u, now)

    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          {pills.map(p => (
            <Box key={p.key} backgroundColor={PILL[p.key].bg} paddingX={1}>
              <Text color={PILL[p.key].fg} bold mono>{p.text}</Text>
            </Box>
          ))}
        </Box>
      )
    }

    const { Box, Svg } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" flexWrap="wrap" gap="sm" alignItems="center" backgroundColor="#262626" padding="sm">
        {pills.map(p => {
          const svg = pillSvg(PILL[p.key], p.parts)
          return <Svg key={p.key} source={svg.source} alt={p.text} width={svg.width} height={H} />
        })}
      </Box>
    )
  })
}
