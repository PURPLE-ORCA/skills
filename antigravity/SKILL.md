---
name: antigravity
description: "Delegate coding to Google Antigravity CLI (agy). Use when the user asks to build, code, debug, or fix something and Antigravity is a better fit than Codex — or as a parallel coding agent alongside Codex."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [Coding-Agent, Antigravity, Google, Gemini, Delegation]
    related_skills: [codex, hermes-agent]
---

# Antigravity CLI

Delegate coding tasks to [Antigravity CLI](https://antigravity.google) (`agy`) via the Hermes terminal. Antigravity is Google's terminal-based autonomous coding agent (rebranded from Gemini CLI, May 2026). Uses Gemini 3.5 Flash by default on Google AI Pro.

## Workflow: Hermes Orchestrates, Antigravity Codes

Same pattern as Codex — Hermes handles orchestration, planning, and context. Antigravity does the actual coding.

Key rules:
1. **Delegate coding to Antigravity** — when the user asks to build/code/debug/fix, route through `agy` first. Do NOT code directly in the main session.
2. **Prompt narrowly** — scope each `agy -p` to one focused slice so results are verifiable.
3. **Inspect and report** — after Antigravity finishes, verify the diff and report results.
4. **Don't stall** — if Antigravity blocks, finish the slice with direct tools and note the limitation.

## When to Use Antigravity Over Codex

- User explicitly asks for Antigravity/Google/Gemini
- You want Google's Gemini models instead of OpenAI's
- You want built-in checkpointing (`/restore`) before file changes
- You want sandboxing via macOS Seatbelt (lightweight, no Docker needed)
- You want Plan Mode (read-only research before implementation)
- Parallel work — run Antigravity alongside Codex for batch tasks
- **Deslop/clean tasks** — see [[code-clean]] skill
- **LinkedIn content** — see [[linkedin-post-writer]] skill (Gemini models for writing)

## Prerequisites

- `agy` installed and authenticated (`agy` in terminal, Google OAuth)
- Must run inside a project directory (agy auto-detects project root)
- Google AI Pro subscription (already configured)

## One-Shot Tasks (Headless Mode)

The `-p` flag runs non-interactively and prints the response:

```
terminal(command="agy -p 'Add dark mode toggle to settings'", workdir="~/project", timeout=300)
```

For longer tasks, use a generous timeout:
```
terminal(command="agy -p 'Refactor the auth module to use JWT'", workdir="~/project", timeout=600)
```

## Background Mode (Long Tasks)

```
# Start in background
terminal(command="agy -p 'Refactor the auth module'", workdir="~/project", background=true, timeout=600)

# Monitor progress
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")

# Kill if needed
process(action="kill", session_id="<id>")
```

## YOLO Mode (Auto-Approve All)

Skip all permission prompts — fastest mode, most dangerous:

```
terminal(command="agy --dangerously-skip-permissions -p 'Fix all linting errors'", workdir="~/project", timeout=300)
```

## Sandbox Mode (Isolated)

Run in macOS Seatbelt sandbox — restricts writes outside project:

```
terminal(command="agy --sandbox -p 'Run the test suite'", workdir="~/project", timeout=300)
```

Sandbox profiles: `permissive-open` (default), `restrictive-open`, `strict-open`. Set via `SEATBELT_PROFILE` env var.

## Plan Mode (Read-Only Research)

Research a codebase without making changes:

```
terminal(command="agy --approval-mode=plan -p 'Analyze the auth system and propose improvements'", workdir="~/project", timeout=300)
```

Or use `Shift+Tab` to cycle to Plan Mode interactively. Plan Mode only allows read tools — no file writes.

## Resume Sessions

Continue the most recent conversation:
```
terminal(command="agy --continue", workdir="~/project", pty=true)
```

Resume a specific conversation by ID:
```
terminal(command="agy --conversation <session-id>", workdir="~/project", pty=true)
```

## Include Files in Prompts

Use `@` syntax to inject file/directory content:
```
terminal(command="agy -p '@src/auth/login.py Review this file for security issues'", workdir="~/project", timeout=120)
```

## Run Shell Commands in Prompts

Use `!` syntax to execute shell commands:
```
terminal(command="agy -p '!npm test Fix any failing tests'", workdir="~/project", timeout=300)
```

## Custom Commands

Create reusable shortcuts as TOML files:

**Global:** `~/.gemini/commands/test.toml` → invoked as `/test`
**Project:** `.gemini/commands/fix.toml` → invoked as `/fix`

Example (`~/.gemini/commands/review.toml`):
```toml
description = "Review code for issues"
prompt = """
Review the following code for bugs, security issues, and improvements:
@{{args}}
"""
```

## GEMINI.md Context Files

Like CLAUDE.md — persistent instructions loaded every session. Hierarchy:

1. **Global:** `~/.gemini/GEMINI.md` (all projects)
2. **Project root:** `./GEMINI.md` (current repo)
3. **Subdirectory:** `./src/GEMINI.md` (specific folder)

Supports imports: `@./components/style-guide.md`

## Extensions

Install community extensions:
```bash
agy plugin install https://github.com/author/extension-name
agy plugin list
agy plugin enable/disable <name>
```

Extensions bundle prompts, MCP servers, custom commands, hooks, and skills.

## Built-in Subagents

Antigravity has 4 built-in specialist agents:

| Agent | Purpose | Invocation |
|-------|---------|------------|
| `codebase_investigator` | Analyze codebases, map dependencies | Auto or `@codebase_investigator` |
| `cli_help` | CLI commands and config help | Auto or `@cli_help` |
| `generalist` | Full tool access, broad subtasks | `@generalist` |
| `browser_agent` | Web automation via Chrome | `@browser_agent` (experimental) |

Force delegation with `@agent-name` prefix in your prompt.

## Hooks

Run scripts at specific points in the agent loop. Configure in `settings.json`:

```json
{
  "hooks": {
    "BeforeTool": [
      {
        "matcher": "write_file|replace",
        "hooks": [
          {
            "name": "lint-check",
            "type": "command",
            "command": "npx eslint --fix $FILE"
          }
        ]
      }
    ]
  }
}
```

Events: `SessionStart`, `BeforeAgent`, `AfterAgent`, `BeforeTool`, `AfterTool`, `BeforeModel`, `AfterModel`, `PreCompress`.

## Checkpointing

Auto-snapshots before file changes. Enable in `settings.json`:

```json
{
  "general": {
    "checkpointing": {
      "enabled": true
    }
  }
}
```

Restore with `/restore` command. Checkpoints stored in `~/.gemini/history/`.

## Model Selection

- `/model` — interactive model picker
- `--model <name>` — CLI flag
- Auto mode routes between Pro (complex) and Flash (fast)

### Available Models (as of 2026-06-19)

| Model | Best For |
|-------|----------|
| Gemini 3.5 Flash (Medium/High/Low) | Fast tasks, writing, brainstorming |
| Gemini 3.1 Pro (Low/High) | Reasoning, analysis, vision |
| Claude Sonnet 4.6 (Thinking) | Coding, refactoring, code review |
| Claude Opus 4.6 (Thinking) | Complex coding, architecture decisions |
| GPT-OSS 120B (Medium) | Alternative perspective, lighter tasks |

**Key insight:** Your Google Pro sub gives you free access to Claude and GPT models through Antigravity. Use Claude for coding (better than Gemini), Gemini for writing/brainstorming (fast and good at prose).

## Key Flags Reference

| Flag | Effect |
|------|--------|
| `-p "prompt"` | Headless one-shot, prints response |
| `--continue` | Resume most recent session |
| `--conversation <id>` | Resume specific session |
| `--dangerously-skip-permissions` | YOLO mode, no approvals |
| `--sandbox` | macOS Seatbelt sandbox |
| `--approval-mode=plan` | Read-only plan mode |
| `--model <name>` | Override model |
| `--add-dir <path>` | Add directory to workspace |

## Parallel Issue Fixing

```
# Launch Antigravity in worktrees
terminal(command="agy --dangerously-skip-permissions -p 'Fix issue #78: <desc>. Commit when done.'", workdir="/tmp/issue-78", background=true, timeout=600)
terminal(command="agy --dangerously-skip-permissions -p 'Fix issue #99: <desc>. Commit when done.'", workdir="/tmp/issue-99", background=true, timeout=600)

# Monitor
process(action="list")
```

## Checking Quota (Interactive Only)

- **`/usage`** — shows remaining quota, reset windows, and per-model limits. This is the command to check if you're rate-limited.
- **`/credits`** — this is for topping up / purchasing credits, NOT for checking usage.
- The statusline also shows remaining credit count (e.g. `AI Credits: 42`) but quota/rate-limit info is only in `/usage`.
- These are interactive slash commands — they do NOT work with `-p` headless mode. Run `agy` interactively to use them.

## Validated Workflows

### HyperFrames Promo Composition (Tested 2026-06-19)
Delegated HTML composition for a 20s promo video to Antigravity. The model has zero HyperFrames knowledge — ALL rules (GSAP patterns, clip structure, deterministic rendering, Ken Burns, transitions) had to be provided in the prompt.

**Pattern:** Load external skill rules into the prompt. Antigravity can't access Hermes skills. When delegating tasks that require domain-specific knowledge (video rendering, design systems, API patterns), you must paste the relevant rules directly into the `agy -p` prompt.

**Key learnings:**
- Prompts >2000 chars cause Antigravity to over-research (reads docs, checks files, runs npm check) and may timeout
- If Antigravity gets stuck researching, retry with a shorter, more direct prompt: "Write the file directly. Do not research first."
- Solid dark backgrounds (#0d2818) look better than gradients with glow effects for promo videos
- Use Poppins font (Google Fonts CDN) instead of system fonts for visual impact
- Screenshots should be zoomed into specific areas (map portion, not full phone screen) for more impact
- Check the output file even after timeout — Antigravity often writes the file before timing out

**Prompt structure for external skill delegation:**
1. State the output format (HTML file, specific path)
2. List critical rules (violations break rendering)
3. Provide reusable patterns (GSAP code blocks, CSS templates)
4. Specify the exact content (scenes, data, screenshots)
5. End with "Write the COMPLETE file. No explanations."

### `/clean` — Code Deslop (Tested 2026-06-19)
Validated on a 320-line React Native file. Results: 320 → 72 lines (77% reduction), extracted 6 files into nested `components/screens/map/` structure.

**Key learning:** Convention detection must be dynamic. First run hardcoded `screens/` and scattered files. Second run added "scan components/ directory first" instruction to the prompt — Antigravity detected `screens/` from the project and nested everything correctly. Never hardcode the convention in the prompt.

**Pattern:** Read file → detect project root → run `agy -p` with deslop rules + dynamic convention detection → verify diff → report.

**Pitfall:** File content with backticks/template literals causes bash syntax errors. Write prompt to temp file first, then pass via `$(cat /tmp/prompt.txt)`.

See [[code-clean]] skill for full workflow.

## Pitfalls

- **ACP delegation via delegate_task fails.** Passing `acp_command="agy"` to `delegate_task` fails because Agy's ACP transport isn't configured for Hermes subagent delegation. Always use Codex (`delegate_task` without `acp_command`) as the primary delegation path. Reserve Antigravity for direct `agy -p` terminal calls or interactive sessions. The `delegate_task` tool uses Hermes subagent transport, not ACP.
- **Monorepo package installation target.** When delegating `expo install` or `npm install` in a monorepo, agy may install at the repo root instead of the correct workspace package. Always specify the exact target in the prompt: `Install expo-location in apps/mobile/package.json using bunx expo install expo-location — run from apps/mobile directory.` Without explicit workspace targeting, Bun's hoisted linker may place the dependency at root, which does not help the native build.
- **PTY required for interactive mode.** Headless (`-p`) works without PTY. Interactive mode needs `pty=true`.
- **`--print-timeout` defaults to 5 minutes.** For large tasks, increase with `--print-timeout 10m` or use background mode.
- **Exit codes:** 0 = success, 1 = error, 42 = input error, 53 = turn limit exceeded.
- **Antigravity requires a project directory.** It auto-detects project root. For scratch work, `cd $(mktemp -d) && git init` first.
- **Checkpointing is off by default.** Enable it in settings.json before relying on it.
- **Extensions use `agy plugin` not `agy extensions`** (post-rebrand command name).
- **GEMINI.md is loaded automatically.** Don't repeat instructions in every prompt — put them in GEMINI.md.
- **`@file` syntax includes full file content.** Use sparingly for large files to avoid token bloat.
- **Inspect diffs after every run.** Antigravity may touch unrelated files. Verify the changes match the request.
- **Parallel runs are fine.** Multiple `agy` processes can run simultaneously in different directories.
- **Antigravity over-researches on long prompts.** When the prompt is >2000 chars, Antigravity spends most of its time reading docs, checking files, and running npm check before writing anything. It may timeout at 5 minutes without producing output. Fix: keep prompts concise (<1500 chars), add "Write the file directly. Do not research first." to the prompt, and set `--dangerously-skip-permissions` to skip approval loops.
- **Timeouts happen even with `--print-timeout 5m`.** For complex compositions (HTML, multi-file), Antigravity may timeout. It often writes the file BEFORE timing out — check the output file immediately after timeout. The composition may be complete even though the process timed out.
- **Background mode (`-p`) doesn't work with `--dangerously-skip-permissions`.** Use foreground for one-shots, background for long-running tasks without YOLO.
- **Monorepo package placement.** In Bun monorepos, `agy` may install packages at the workspace root instead of the intended sub-package. After agy finishes, always verify the dependency landed in the correct `package.json` (e.g. `apps/mobile/package.json`, not root). If it went to root: `git checkout -- package.json bun.lock`, then run `bunx expo install <pkg>` from the correct package directory.
- **Project root detection for file-specific tasks.** When given a file path (e.g. `src/app/(tabs)/map.tsx`), ALWAYS walk up from the file to find the project root (.git, package.json, composer.json). Run `agy` from the project root, NOT from the file's directory. See [[code-clean]] skill for the pattern.

## Rules

1. **Always delegate coding** — route through `agy` (or Codex) first. Only code directly if both fail or for trivial patches.
2. **Use `-p` for delegation** — headless mode is the cleanest integration path.
3. **Use `--dangerously-skip-permissions` for building** — avoids approval prompts blocking autonomous work.
4. **Use background mode for long tasks** — `background=true` + `process()` monitoring.
5. **Verify the diff** — always check what changed after Antigravity runs.
6. **Narrow prompts** — one focused slice per invocation, not broad mandates.
7. **Set generous timeouts** — `timeout=300` minimum, `timeout=600` for complex work.
