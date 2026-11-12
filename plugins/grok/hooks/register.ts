import type { Register } from 'claude-code'

const TOOL = 'mcp__grok__ask_grok'
const ENDPOINT = 'https://api.x.ai/v1/chat/completions'

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.tool.register({
      name: 'ask_grok',
      description:
        "Ask xAI's Grok model a question and return its answer. Use when the user asks for Grok's opinion or a second model's view. Do not send secrets or confidential data unless the user asked to.",
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The question or task for Grok' },
          system: { type: 'string', description: 'Optional system instruction for Grok' },
        },
        required: ['prompt'],
      },
    })
    return result
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const { prompt, system } = e as unknown as { prompt: string; system?: string }
    const messages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt },
    ]

    const res = await $.http.fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${options.api_key}`,
      },
      body: JSON.stringify({ model: options.model, messages }),
    })

    if (!res.ok) {
      return { result: `Grok request failed (HTTP ${res.status}): ${res.text.slice(0, 500)}`, isError: true } as never
    }

    const answer = JSON.parse(res.text)?.choices?.[0]?.message?.content ?? '(Grok returned no text)'
    return { result: answer }
  }).catch(($, e, next) => ({ result: 'Grok tool failed inside the plugin', isError: true }) as never)
}
