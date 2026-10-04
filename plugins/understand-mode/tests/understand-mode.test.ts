import { expect, test } from 'claude-code/testing'


const INPUT = { model: 'claude-sonnet-5-5', promptModel: 'claude-sonnet-5-5', surfaces: [], tools: [], outputStyle: null, traits: [] } as const
test('adds the policy section to the system prompt', async ($, on) => {
  // Stand in for the engine: it answers with one section
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'hi', scope: 'shared' }] }))
  const r = await $.prompt.compose(INPUT)
  const ids = r.sections.map((s) => s.id)
  expect(ids[ids.length - 1]).toBe('understand-mode:policy')
})

test('tells Claude to draw terminal diagrams as box-drawing text, not Mermaid', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'hi', scope: 'shared' }] }))
  const r = await $.prompt.compose(INPUT)
  const policy = r.sections[r.sections.length - 1].text
  expect(policy).toContain('In the terminal, draw diagrams with box-drawing text')
  expect(policy).not.toContain('Prefer Mermaid')
})

test('/understand forces a format, and off removes the section', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'hi', scope: 'shared' }] }))

  const set = await $.command.run({ command: 'understand', args: 'diagram' })
  expect(set.text).toContain('diagram')
  const forcedPrompt = await $.prompt.compose(INPUT)
  const last = forcedPrompt.sections[forcedPrompt.sections.length - 1]
  expect(last.text).toContain('forced the format')

  await $.command.run({ command: 'understand', args: 'off' })
  const offPrompt = await $.prompt.compose(INPUT)
  expect(offPrompt.sections.map((s) => s.id)).toEqual(['intro'])
})
