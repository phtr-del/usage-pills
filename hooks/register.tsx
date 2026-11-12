import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Usage } from '../types'

const usage = atom({ plugin: 'usage-pills', key: 'usage' } as const, null)

const PILL = {
  five: { bg: '#d8eedf', fg: '#2f6b47' },
  model: { bg: '#d6dcf5', fg: '#3b4a8f' },
  seven: { bg: '#e3d9f5', fg: '#5b3f99' },
  ctx: { bg: '#d3ecf0', fg: '#2f6670' },
  cost: { bg: '#f7e7b4', fg: '#7a5a12' },
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

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()

    const pill = (key: string, c: { bg: string; fg: string }, text: string) => (
      <Box key={key} backgroundColor={c.bg} paddingX={1}>
        <Text color={c.fg} bold mono>{text}</Text>
      </Box>
    )
    const limit = (r: Usage['rateLimits'][number] | undefined, label: string) => {
      if (!r) return null
      const left = countdown(r.resetsAt, now)
      return `${label} ${bar(r.percentUsed)} ${Math.round(r.percentUsed)}%${left ? ` │ ⏱ ${left}` : ''}`
    }

    const five = limit(u.rateLimits.find(r => r.kind === 'five_hour'), '5h')
    const seven = limit(u.rateLimits.find(r => r.kind === 'seven_day'), '7d')
    const { tokens: used, window, percent } = u.context
    const ctxPercent = percent ?? (used ? Math.round((used / window) * 100) : 0)

    return (
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {five && pill('five', PILL.five, five)}
        {pill('model', PILL.model, `≋ ${tokens(window)}`)}
        {seven && pill('seven', PILL.seven, seven)}
        {pill('ctx', PILL.ctx, `ctx ${bar(ctxPercent)} ${tokens(used ?? 0)}/${tokens(window)} ${ctxPercent}%`)}
        {u.cost && pill('cost', PILL.cost, `$${u.cost.usd.toFixed(2)}`)}
      </Box>
    )
  })
}
