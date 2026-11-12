import { test, expect } from 'claude-code/testing'

const OPTIONS = { api_key: 'test-key', model: 'grok-4' }

test('asks Grok and returns its answer', { options: OPTIONS }, async ($, on) => {
  const seen: { url: string; auth?: string; body?: string }[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('http.fetch', (_, e) => {
    seen.push({ url: e.url, auth: e.init?.headers?.authorization, body: e.init?.body as string })
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify({ choices: [{ message: { content: '42' } }] }) } } as never
  })
  await $.session.start({ cwd: '/tmp', surface: null, isInteractive: true })
  const r = await $.tool.call({ tool: 'mcp__grok__ask_grok', prompt: 'meaning of life?' } as never)
  expect(JSON.stringify(r)).toContain('42')
  expect(seen[0].url).toBe('https://api.x.ai/v1/chat/completions')
  expect(seen[0].auth).toBe('Bearer test-key')
  expect(JSON.parse(seen[0].body!).model).toBe('grok-4')
})

test('reports an HTTP error', { options: OPTIONS }, async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('http.fetch', () => ({ value: { status: 401, ok: false, headers: {}, text: 'bad key' } }) as never)
  await $.session.start({ cwd: '/tmp', surface: null, isInteractive: true })
  const r = await $.tool.call({ tool: 'mcp__grok__ask_grok', prompt: 'hi' } as never)
  expect(JSON.stringify(r)).toContain('HTTP 401')
})
