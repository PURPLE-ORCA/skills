---
name: library-fit-potential-use-capture
description: Evaluate a third-party library against the user's active stack and capture a reusable "Potential use" note in the Obsidian vault.
---

# Library Fit + Potential Use Capture

## When to use
- User asks: "does this library fit my stack?"
- User wants future-ready documentation even when the tool is not immediately adopted.

## Workflow
1. **Read the source docs first**
   - Pull official docs/release page/GitHub readme.
2. **Run alternatives comparison (when user asks X vs Y)**
   - Build a side-by-side matrix: purpose, strengths, limitations, setup friction, rendering/runtime model, and output quality controls.
   - Include current baseline tool already in the user's workflow (e.g., HyperFrames) as the reference column.
3. **Collect external signal quality**
   - Pull at least one official source + one community source (Reddit/GitHub discussions).
   - Prefer concrete practitioner reports over generic SEO listicles.
4. **Map against active stack**
   - Compare against each active project/runtime (e.g. Laravel, React Native, Convex, Next.js).
   - Mark fit as: `Strong fit`, `Conditional fit`, or `Skip for now`.
5. **Check skill/integration availability**
   - Confirm whether Hermes already has a reusable skill/integration for the candidate tool.
   - If missing, note bootstrap cost and whether creating a new skill is justified.
6. **Decide recommendation**
   - Recommend now vs later, with one sentence rationale per project.
7. **Capture in vault as durable knowledge**
   - Write a note under `LLM/KNOWLEDGE/libraries/` with title `<library>-potential-use.md`.
   - Include: summary, compatibility table, adoption trigger conditions, and implementation starter checklist.
8. **Verify write**
   - Re-read the exact file path and confirm key sections exist.

## Output template (for note)
- `# <Library> — Potential use`
- `## What it is`
- `## Compatibility with current stack`
- `## When to adopt`
- `## When to skip`
- `## Quick start checklist`

## Guardrails
- Do not force adoption when current stack already has a native equivalent.
- Keep recommendations reversible and explicit about assumptions.
- Store conclusions in knowledge notes so future agents can reference implementation context quickly.
