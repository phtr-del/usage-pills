import { test, expect, mock } from 'claude-code/testing'

const NOW = Date.parse('2026-10-15T00:00:00Z')

for (const surface of ['terminal', 'desktop'] as const) {
  test(`draws usage pills on ${surface}`, async ($, on) => {
    on('session.measure', (_, e) => ({ changed: e.changed }))
    mock.clock(on, { now: NOW })
    await $.session.measure({
      context: { tokens: 128_400, window: 1_000_000, percent: 13 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 8, resetsAt: new Date(NOW + (3 * 60 + 18) * 60_000).toISOString() },
        { kind: 'seven_day', percentUsed: 41, resetsAt: new Date(NOW + 30 * 3_600_000).toISOString() },
      ],
      cost: { usd: 1.32 },
      changed: ['context', 'rateLimits', 'cost'],
    })
    const ui = await $.ui.mount({ plugin: 'usage-pills', surface, component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false } })
    const text = JSON.stringify(await ui.drawn())
    expect(text).toContain('8% │ ⏱ 3h 18m')
    expect(text).toContain('41% │ ⏱ 1d 6h')
    expect(text).toContain('128.4k/1M 13%')
    expect(text).toContain('$1.32')
  })
}
