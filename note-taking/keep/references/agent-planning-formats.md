# Agent Planning Formats — Reference (June 2026)

## The Landscape

AI coding agents generate plans/specs/recaps in various formats. The choice affects token cost, visual clarity, and downstream tooling.

### Markdown (default)
- **Token cost:** Baseline (cheapest)
- **Pros:** Greppable, diffable, version-controllable, every tool reads it natively, Obsidian-compatible
- **Cons:** Walls of text — eyes glaze over on complex plans. Limited visual toolkit (bold, italics, headers, basic tables). ASCII diagrams are ugly.
- **Verdict:** Best for budget coding. The default for a reason.

### HTML (Anthropic/Claude Code camp)
- **Token cost:** 2-4x markdown (8-10x with CSS/JS)
- **Pros:** SVG diagrams, CSS styling, interactive elements, real images, spatial layouts. Leverages ~30% of cortex for visual processing.
- **Cons:** Verbose to generate, noisy diffs, XSS risk from embedded JS, doesn't look good in repos. Overkill for agent-to-agent communication.
- **Context:** Thariq Shihipar (Anthropic Claude Code team) + Andrej Karpathy backing. His argument: he stopped reading markdown plans, letting Claude make every choice.
- **Use case:** When a human needs to visually consume complex plans with embedded mockups.

### MDX (Markdown + JSX components)
- **Token cost:** Between markdown and HTML
- **Pros:** Reusable visual components (diagrams, wireframes, interactive API specs), consistent across agents/models, checkable into code.
- **Cons:** Still heavier than plain markdown. Requires MDX infrastructure.
- **Source:** "Visual Plan" skill (open source, GitHub). Generates plans + recaps as MDX with pan/zoom wireframes, interactive API specs, annotated code. Includes GitHub Action for PR visual reviews.
- **Video:** https://youtu.be/NE0aBuQF0HA

### Excalidraw (visual diagrams)
- **Token cost:** 4k-22k tokens per file (~10% actual info density)
- **Pros:** Beautiful hand-drawn style diagrams. MCP server available. Cole Medin built Claude Code skill with visual validation loops.
- **Cons:** JSON-heavy, token-expensive. Main agents should NEVER read .excalidraw files directly — delegate to subagents.
- **Use case:** Architecture diagrams, flowcharts, system design discussions.
- **Tool:** https://github.com/coleam00/excalidraw-diagram-skill

### Mermaid (text-based diagrams)
- **Token cost:** Low (it's just text)
- **Pros:** Renders in GitHub and Obsidian. Converts to Excalidraw via MCP. Good middle ground for inline diagrams.
- **Cons:** Limited visual polish compared to Excalidraw.
- **Verdict:** Best for inline architecture diagrams in markdown plans.

## Token Compression: Headroom

**Not a format choice — a middleware layer.** Open-source proxy by Tejas Chopra (Netflix engineer).

- Sits between agent and LLM API
- 6 compression algorithms (JSON, code/AST, text)
- 60-95% fewer tokens, claims ±0.000 accuracy regression
- Reversible — can retrieve original content
- Runs locally, Apache 2.0
- Works with Claude Code, Cursor, Copilot, Codex, Aider
- `pip install headroom-ai` + one env var
- 29.9k GitHub stars

**Key distinction:** Formats affect output readability. Headroom affects input compression. Different problem, potentially bigger impact on token budget.

## Recommendation for Budget Coding

1. **Markdown plans** for day-to-day agent work (cheap, fast, Obsidian-native)
2. **Mermaid** inline when you need diagrams (renders everywhere, token-light)
3. **Excalidraw** for architecture/design when you need real visuals (delegate to subagent)
4. **Headroom** as middleware to compress all agent I/O (biggest token savings)
5. **Skip HTML/MDX** unless you have 1M context windows and need interactive elements
