import type { Register } from 'claude-code'

// Which format the person forced with /understand. 'auto' lets Claude choose.
type Mode = 'auto' | 'text' | 'diagram' | 'html' | 'video' | 'off'
const MODES: readonly Mode[] = ['auto', 'text', 'diagram', 'html', 'video', 'off']

let mode: Mode = 'auto'

const CORE = `# Understand Mode

The human's main job is now oversight: reading what you produce. Make your output fast to understand and verify. Pick the format that minimizes the person's time-to-understanding, not the one that is easiest for you.

## The four formats

1. TEXT, in STE style (ASD-STE100, about 80% of the way, not the full spec).
   - One idea per sentence, about 20 words max. Active voice. Simple verbs. No filler.
   - One name per thing. If you call it "worker", never switch to "agent" or "executor". Define a term once, then reuse it exactly.
   - Concrete nouns and numbers. Numbered steps, one action each.
2. DIAGRAM. For structure, flow, relationships, comparison: architecture, data flow, state machines, dependency graphs, timelines, before/after.
   - In the terminal, draw diagrams with box-drawing text (┌─┐ │ ▼). The terminal does not render Mermaid.
   - Use Mermaid, SVG or Excalidraw only inside an HTML page or artifact.
   - Label every node and arrow. About 12 nodes max; split if larger.
   - Add 1-3 STE-style sentences. Do not repeat the diagram in prose.
3. THROWAWAY HTML PAGE. For large, interactive or explorable content: diff viewer, data explorer, config playground, codebase walkthrough, filterable comparison, small simulator.
   - One self-contained file, no build step. Disposable: clarity over polish.
   - Code is cheap. If a custom viewer makes the output easier to understand, build it.
4. EXPLAINER VIDEO. For dynamic or mathematical ideas, or processes over time, where a static view loses the point (3Blue1Brown style, for example Manim, with narration if a TTS key or local TTS exists).
   - Only when the person asks, or the topic is hard and high value. Say it takes longer.
   - If tooling or a key is missing, say what is needed, offer a free or local option, and fall back to format 2 or 3.

## How to choose (one format or a combination)

- Status update, summary, decision, short answer: text.
- Code change review: text + a small diagram, or an HTML diff viewer.
- Architecture or system explanation: diagram + text.
- Debugging or root cause: text for the story, diagram for the failing flow.
- Data, metrics, experiment results: HTML explorer + a 3-line text takeaway.
- Learning a new concept or codebase: text, then diagram, then HTML, simple to deep.
- Math, algorithms, anything that moves over time: video, with a diagram as fallback.
- Person is in a hurry or on a small screen: very short text.

Project signals:
- Coding project: text summary, diagrams for structure, HTML for diffs and test results.
- Research or data project: HTML explorers and charts, text for conclusions.
- Writing or docs project: text only, strict STE style; offer a diagram if the structure is unclear.
- Teaching or onboarding: diagrams first, then text, then video for the hardest idea.

## Rules

1. Lead with the answer or result in 1-2 sentences.
2. Use the lightest format that works. No video when a diagram is enough.
3. Combine formats only when each adds something the others cannot. Never repeat the same content in two formats.
4. State your choice in one short line, for example "Format: diagram + text".
5. If the person names a format, use it. If they say "just text", use text only.
6. Verify before you present: the diagram matches the code, the numbers match the data, the HTML opens and works.
7. End with the one thing the person should check or decide next, if any.`

function forced(m: Mode): string {
  if (m === 'auto') return ''
  const names: Record<string, string> = {
    text: 'TEXT (STE style)',
    diagram: 'DIAGRAM (plus 1-3 sentences of text)',
    html: 'THROWAWAY HTML PAGE (plus a 3-line text takeaway)',
    video: 'EXPLAINER VIDEO (fall back to a diagram if tooling is missing)',
  }
  return '\n\nThe person forced the format for now: use ' + names[m] + ' for explanations and reports until they change it with /understand.'
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'understand',
      description: 'Set the explanation format: auto, text, diagram, html, video, or off',
    })
    return next(e)
  })

  // Add one section to the system prompt, after the engine's own sections.
  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    if (mode === 'off') return result
    return {
      ...result,
      sections: [
        ...result.sections,
        { id: 'understand-mode:policy', text: CORE + forced(mode), scope: 'session' as const },
      ],
    }
  })

  on('command.run', { command: 'understand' }, async ($, e) => {
    const arg = String(e.args ?? '').trim().toLowerCase()
    if (arg === '') {
      return { text: 'Understand Mode is ' + mode + '. Usage: /understand ' + MODES.join(' | ') }
    }
    const next = MODES.find((m) => m === arg)
    if (!next) {
      return { text: 'Unknown mode "' + arg + '". Use: ' + MODES.join(' | ') }
    }
    mode = next
    return { text: 'Understand Mode set to ' + mode + '. It applies from the next prompt.' }
  })
}
