# CLI Coding Agent Evaluation Checklist

Reusable methodology for evaluating free/cheap CLI coding agents for Hermes delegation pipeline. Captured from Freebuff + Z.ai research session (2026-06-20).

## Evaluation Questions (in order)

### 1. Is there a CLI?
- If web-only (like Z Code): dead end for automation. Note it, move on.
- If CLI exists: proceed to step 2.

### 2. Is there headless/non-interactive mode?
This is THE gate for Hermes delegation. Check for:
- `--print` / `-p` / `--prompt` flag (process and exit)
- `exec "prompt"` subcommand (like Codex)
- Stdin piping support
- SDK for programmatic access (`@tool/sdk` npm package)

**If no headless mode:** can only be driven via PTY (interactive terminal). Possible but hacky — spawn with `pty=true`, send task as input, capture output. Reserve for free tools where zero-cost justifies the friction.

### 3. What models does it support?
- Locked to one provider? (limits flexibility)
- OpenRouter / multi-provider? (best — can swap models)
- Custom endpoint support? (can plug in Z.ai, DeepSeek, etc.)

### 4. What's the cost model?
| Type | Pros | Cons |
|------|------|------|
| Ad-supported (Freebuff) | Zero cost | Ads in CLI, limited model choice |
| Free tier + paid (ZAI CLI) | Free to start, scale later | Need API key, rate limits |
| Subscription (Codex) | Best models, full features | Monthly cost |
| Open source + own API key | Full control | Must manage keys, costs |

### 5. Can it be tamed for Hermes delegation?
Checklist:
- [ ] Headless mode available OR PTY-drawable
- [ ] Can run from any working directory
- [ ] Doesn't require interactive auth on every run
- [ ] Output is parseable (text or JSON)
- [ ] Can accept narrow, focused prompts
- [ ] Doesn't require browser/GUI

### 6. Free tier specifics (if applicable)
- Daily/monthly token limits
- Rate limits (requests/minute)
- Model restrictions on free tier
- Whether API free tier differs from web free tier
- "Limited-time free" warnings (will it become paid?)

## Known Agent Inventory (update as discovered)

| Agent | CLI? | Headless? | Free? | Model | Hermes Integration |
|-------|------|-----------|-------|-------|-------------------|
| Codex | `codex exec` | Yes | Paid sub | Claude/GPT | `delegate_task` or `pty=true` |
| Antigravity | `agy -p` | Yes | Paid sub (Google AI Pro) | Gemini/Claude/GPT | `delegate_task` or direct `agy -p` |
| Freebuff | `freebuff` | No (PTY only) | Ad-supported | DeepSeek/Kimi/MiniMax | PTY hack, free fallback |
| ZAI CLI | `zai --prompt` | Yes | API key needed (free tier) | GLM-4.6+ | Direct `zai -p` delegation |
| Z Code | Web only | No | 5M tokens/day | GLM-5.2 | Not automatable |
| GLM-5.2 API | API direct | N/A | Limited-time free | GLM-5.2 | Via ZAI CLI or custom endpoint |

## GLM-5.2 Access Paths (June 2026)

GLM-5.2 (744B MoE, 1M context, MIT license) is accessible via:
1. **Z Code web** — 5M free tokens/day, browser only
2. **Z.ai API** — limited-time free tier (`GLM_API_KEY` env var)
3. **ZAI CLI** — `zai --prompt "task"` with API key
4. **Hermes native** — Z.AI is a supported provider (`GLM_API_KEY` in `.env`)
5. **OpenRouter** — $1.40/M input, $4.40/M output
6. **Route through Claude Code** — set `ANTHROPIC_BASE_URL` to Z.ai endpoint

**Best path for Hermes delegation:** Get free Z.ai API key → set `GLM_API_KEY` in `~/.hermes/.env` → use ZAI CLI headless (`zai -p`) for delegation OR set as Hermes model provider.

## Evaluation Template (for vault notes)

```markdown
# <Agent Name> — Delegation Evaluation

**Source:** <url> | [GitHub](<repo>)
**Date:** YYYY-MM-DD

## Delegation Verdict
- CLI: Yes/No
- Headless: Yes/No/PTY-only
- Free tier: Details
- Hermes integration: How

## What It Is
Brief description.

## How It Works
Architecture, models, key features.

## Can We Tame It?
| Check | Result |
|---|---|
| CLI headless mode | |
| Token budget control | |
| GLM-5.2 support | |
| API key needed | |

## Known Limitations
- ...

## Setup Steps
1. ...
```
