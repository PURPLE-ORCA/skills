# UX / Feature Pattern Research Workflow

Workflow for researching UI/UX patterns, design features, and product conventions — then writing structured raw notes to the vault.

## When to Use

- User asks "how does X feature work?" (command palette, drag-drop, etc.)
- User asks "what features should we build?" or "what are power features?"
- User asks for research on a UI pattern or product convention
- User wants a taxonomy or checklist of features for an app category

## Phase 1: Parallel Research (fire 2-4 queries simultaneously)

Cover different angles:
- **Pattern name + "how it works"** — technical implementation details
- **Pattern name + "UX design"** — design guidelines, best practices
- **Pattern name + "examples"** — real-world implementations in known apps
- **Pattern name + "library" or "implementation"** — code-level resources (npm packages, GitHub repos)

**Pitfall:** Don't just search for the pattern name alone — add year (2024/2025/2026) and context words like "implementation", "design system", "React" to get current, actionable results.

## Phase 2: Extract Key Sources (3-5 URLs in parallel)

Prioritize:
1. **Design system docs** (shadcn, Chakra, Radix, Cloudscape, Basis) — authoritative component patterns
2. **UX pattern libraries** (uxpatterns.dev, Mobbin, NNGroup) — design guidelines
3. **Implementation guides** (blog posts with code examples) — technical details
4. **Product analyses** (articles dissecting how specific apps implement the feature)
5. **Library docs** (cmdk, kbar, react-grid-layout) — ready-made solutions

## Phase 3: Synthesize Structure

For each feature/pattern, document:

### Single Feature Research (e.g., "Command Palette")
```markdown
# <Feature Name> — Research Notes

## What It Is
## How It Works (Technical)
### Core Mechanism
### Minimal Implementation (code example)
### State Management
## Use Cases
## Real-World Examples (table: app, shortcut, what it does)
## Key Libraries (table: name, size, notes)
## Architecture Pattern (ASCII diagram)
## Anti-Patterns
## For [Project Name] (project-specific recommendations)
## Sources
```

### Multi-Feature Taxonomy (e.g., "Power Features")
```markdown
# <Topic> — Research Notes

## Tier N: <Category Name> (Signal: <what users feel>)
| # | Feature | What It Is | Why It Matters |
## "Build Next" Decision Framework
## Anti-Feature List (what NOT to build)
## Sources
```

### Deep Dive on Specific Features
```markdown
# <Feature Name> — Deep Dive

## What It Is
## How It Works
### State Structure (TypeScript interface)
### Storage approach
### Key UX Patterns (numbered list)
## Real-World Examples (table: app, implementation)
## Implementation Pattern (numbered steps)
## Anti-Patterns (❌ list)
```

## Phase 4: Write to Vault

**Target:** `LLM/RAW/<topic-slug>.md`

**Required frontmatter:**
```yaml
---
type: raw-research
date: YYYY-MM-DD
topic: <descriptive title>
tags: [tag1, tag2, ...]
related: [[related-note-1]], [[related-note-2]]
---
```

**Key conventions:**
- Use wikilinks `[[like this]]` to cross-reference related raw notes
- Tables for comparisons (apps, libraries, features, effort vs. impact)
- Code examples in fenced blocks with language tags
- ASCII diagrams for architecture patterns
- Numbered anti-patterns with ❌ prefix
- Sources section at bottom with named links

## Phase 5: Report Back

Brief summary (caveman-friendly):
- What was researched (scope)
- Key findings (3-5 bullet points)
- Where it's saved (vault path)
- What to do with it (actionable next step)

## Output Path Rules

| Research Type | Vault Path |
|--------------|-----------|
| Single feature pattern | `LLM/RAW/<feature-slug>.md` |
| Feature taxonomy / checklist | `LLM/RAW/<topic-slug>.md` |
| Deep dive on multiple features | `LLM/RAW/<topic>-deep-dive.md` |
| Project-specific research | `LLM/PROJECTS/ACTIVE/<project>/<topic>-research.md` |

**Pitfall:** Don't write UX research to `KNOWLEDGE/libraries/` — that's for third-party tools/libraries. UX patterns go to `LLM/RAW/`.
