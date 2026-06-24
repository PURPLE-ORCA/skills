---
name: keep
description: "Research a URL (library/package/tool/website/blog/X/YouTube) or external codebase and document it to the vault — how it fits the tech stack, comparison to existing tools, architecture patterns, and where it'd be useful. For codebase deep-dives, see references/remote-codebase-research.md."
trigger: "/keep <url>"
tools: [web_extract, web_search, browser_navigate, search_files, read_file, write_file, patch, session_search, terminal]
---

# /keep Skill — Save & Evaluate a Tool

Trigger: `/keep <url>` or `/keep <url> — <optional context>`

## URL Type Detection

The skill auto-detects the content type from the URL pattern and routes to the best tool:

| URL Pattern | Handler | Requires |
|---|---|---|---|
| `youtube.com/*`, `youtu.be/*` | Transcribe via `youtube-content` skill | `youtube-transcript-api` (pip) |
| `reddit.com/*` | `web_extract` post + `web_search` more threads; **if blocked → `opencli reddit` via [[Agent Reach]]** | Agent Reach installed + OpenCLI for desktop |
| `x.com/*`, `twitter.com/*` | **`twitter search` CLI via [[Agent Reach]] (primary)** → `browser_navigate` fallback → `web_search` last resort | Agent Reach installed + cookies configured (see [[CORE/hermes-setup#17. Agent Reach]]); verify GitHub links separately |
| anything else | `web_extract` site + `web_search` | — |

After extracting the tool name, **always** search Reddit for real human discussions:
- Primary: `web_search("site:reddit.com <tool-name>")`
- Fallback if web_search yields nothing: `opencli reddit search "<tool-name>" --limit 10 -f yaml` (via Agent Reach)

## Workflow

### 1. Accept URL
User says `/keep https://...`

### 2. Detect URL Type & Extract Info

#### If YouTube:
1. Load the `youtube-content` skill with `skill_view` — note its `skill_dir` path from the output (that's where the transcript script lives, NOT in the keep skill's directory)
2. Ensure `youtube-transcript-api` is installed (try `pip3 install youtube-transcript-api` if script fails)
3. Run: `python3 <youtube-content-skill-dir>/scripts/fetch_transcript.py "URL" --text-only --timestamps`
   — where `<youtube-content-skill-dir>` is the `skill_dir` from step 1 (typically something like `/Users/<user>/.hermes/skills/media/youtube-content`)
4. If transcript succeeds: summarize the video → extract the tool/product name from the content
5. If transcript disabled/unavailable → fall back to `web_extract` on the page

#### If Reddit:
1. `web_extract` on the URL — get the post content and comments
2. If `web_extract` returns empty or blocked (Reddit increasingly blocks scrapers), **fall back to Agent Reach's Reddit access**:
   ```bash
   opencli reddit view "POST_ID" --limit 50 -f yaml
   ```
   - Extract the post ID from the URL (`reddit.com/r/<sub>/comments/<id>/...`)
3. Extract tool name from the discussion

#### If X/Twitter:
1. **Use Agent Reach's `twitter search` CLI first** (requires [[Agent Reach]] installed + cookies configured — see [[CORE/hermes-setup#17. Agent Reach]]):
   - Extract auth tokens from `~/.agent-reach/config.json`:
     ```bash
     export TWITTER_AUTH_TOKEN=*** TWITTER_CT0="..." twitter search "query" -n 20 --type latest --full-text --yaml
     ```
   - `--yaml` gives structured output with full text, metrics, author info
   - For a single tweet by URL: extract tweet ID from URL and search for it
   - **Pitfall:** `twitter` CLI reads `TWITTER_AUTH_TOKEN` and `TWITTER_CT0` env vars. If stored cookies fail, export them from `~/.agent-reach/config.json` directly. Run `agent-reach doctor` if auth fails.
2. If `twitter search` is unavailable or fails, **fall back to `browser_navigate`** — the `title` field contains full tweet text. Do not wait for `browser_snapshot`; the title is enough.
   - **Pitfall:** `browser_navigate` can succeed while `browser_snapshot` times out. Extract from title and move on.
3. **Last resort:** `web_search` — search `site:x.com <handle> <partial text>`.
4. `web_extract` on X URLs almost always fails due to JS/bot blocking. Skip it.
5. **Pitfall: X articles (`x.com/*/article/*`) require login.** Even `browser_navigate` redirects to onboarding. These are not extractable. Workaround: search for the article title + author to find cached/reposted versions on Medium, dev.to, Reddit, or blog mirrors. If no mirror exists, extract what you can from the tweet preview (title + description) and search for related community discussion to reconstruct the key points. Never claim you read the full article when you only got the preview.
6. Extract the tool/product name and any linked URLs from the tweet text.
6. **Pitfall: GitHub links in tweets are often wrong.** The tweet may link to a shortened or incorrect repo URL (e.g. `ai-av` when the real repo is `ai-avatar-system`). Always `web_search` for the tool name + "github" to find the correct repo, and verify with `web_extract` or `curl -sL` before documenting. A 404 on the linked URL is common — don't stop there.

#### Generic URL:
1. `web_extract` on the URL to get the page content
2. `web_search` for the tool to get GitHub, docs, alternatives

**Pitfall: GitHub raw URLs (`raw.githubusercontent.com/...`) often fail with `web_extract` (returns "Interrupted").** When that happens, fall back to `curl -sL <url>` via `terminal`. This also works for any plain-text endpoint.

**Pitfall: t.co / shortened links from tweets always fail with `web_extract`** — they redirect through Twitter's link wrapper and return empty. Don't waste a round-trip on them. Instead, skip the t.co URL entirely and search for the tool name directly on GitHub/npm (e.g. `web_search("<tool-name> github")`).

**Pitfall: GitHub repos get renamed.** The URL in a tweet may match the old name while the README title/description already shows the new name. When the README title differs from the URL path segment, verify with `curl -sI -o /dev/null -w '%{http_code} %{redirect_url}' <repo-url>` via terminal to detect redirects, and use the canonical (redirect-target) URL in the vault note and links.

**Pitfall: `web_extract` on GitHub repo pages often fails** (JS-heavy, DOM-dependent). When a repo page won't extract:
   - Try `browser_navigate` directly — the snapshot usually returns the README content + file tree
   - For raw file content, use `curl -sL "https://raw.githubusercontent.com/<user>/<repo>/<branch>/<path>"` via terminal
   - For the README specifically, the browser snapshot alone is often enough to document the tool

### 3. Research (always runs after extraction)
- `web_extract` the tool's site/docs
- `web_search` for: GitHub stars, adoption, key features, comparable tools
- `web_search("site:reddit.com <tool-name>")` for real user opinions and critiques
- If Agent Reach's `twitter` CLI is available, also search X/Twitter for real-time community discussion: `twitter search "<tool-name>" -n 15 --type latest`
- If YouTube source: the transcript summary gives additional context
- **Pitfall: newer tools (under ~200 commits) often have zero Reddit threads.** Empty Reddit results don't mean the tool is bad — just note "no Reddit discussion found yet" in the report and move on. Search for the underlying technology instead (e.g. search "MuseTalk" instead of "ai-avatar-system") to find adjacent community sentiment.

### 4. Analyze Fit with User's Stack

**Read active projects from:** `${OBSIDIAN_VAULT_PATH}/PROJECTS/ACTIVE/ACTIVEPROJECTS.md`

Read that file to get the current active projects with their tech stacks and status. For each project, assess:
- Does this tool replace or complement something already in the stack?
- Would adoption require significant migration or just a new dependency?
- Does the project's current stage justify it?

If `ACTIVEPROJECTS.md` doesn't exist, fall back to `ls PROJECTS/ACTIVE/` for directory names and [[CORE/tech-stack.md]] for stack context.

### 5. Compare to Existing Stack Equivalents

Cross-reference against tools the user already uses in their stack:
- Check the user's backend framework, UI library, auth solution, storage layer, and mobile framework
- If the tool overlaps with an existing dependency, explain where the existing solution is better vs where the new tool adds value
- Check if a Hermes skill already covers the use case before recommending a new tool

### 6. Write to Vault

**Check first:** `search_files(pattern="<tool-name>", path="${OBSIDIAN_VAULT_PATH}/LLM/KNOWLEDGE/libraries/")` — if a note already exists, read it and only update if new info was found (e.g. new version, changed features). Don't overwrite with stale data.

Document to: `KNOWLEDGE/libraries/<tool-name>.md`

Template:
```markdown
# <Tool Name> — Potential Use

**Source:** <url> | [GitHub](<repo-link>)

## What It Is

Brief description.

## Why It Exists

Problem it solves, context.

## Key API / Usage

```ts
// concise code snippet
```

## Best Fit For

- Scenario A
- Scenario B

## Links

- <docs>
- <repo>
```

Add `#library #keep` and relevant tag lines at the end.

**Do NOT include Stack Alignment or project-fit tables in the vault note** — those go stale. They belong only in the live response to the user (section 7).

### UX / Feature Pattern Research Mode

When the user asks about UI/UX patterns, design features, product conventions, or "what features should we build" — use this mode. Covers command palettes, dashboards, filters, power features, onboarding patterns, etc.

1. **Parallel web_search** — fire 2-4 queries: pattern + "how it works", pattern + "examples", pattern + "implementation"
2. **Extract key sources** — prioritize design system docs (shadcn, Cloudscape), UX pattern libraries (uxpatterns.dev, Mobbin), implementation guides (blog posts with code)
3. **Synthesize** — for each feature: what it is, how it works technically, real examples table, libraries, architecture diagram, anti-patterns
4. **Write to vault** — `LLM/RAW/<topic-slug>.md` with frontmatter (type: raw-research, tags, related wikilinks)
5. **Cross-reference** — wikilink related raw notes

See `references/ux-feature-research-workflow.md` for full templates (single feature, multi-feature taxonomy, deep dive formats).

**Pitfall:** Don't confuse with technology options research. UX research produces pattern documentation (what it is, how it works, examples). Technology options research produces comparison tables (which tool to pick). Different output shapes.

### Multi-Source Topic Research Mode

When the user asks to research a **broad topic** (not a single URL or tool) — e.g. "how do platforms secure video", "audit our security posture", "research payment options" — use this mode instead of single-URL flow:

1. **Parallel web_search** — fire 3-6 searches covering different angles:
   - Official docs / how major players do it
   - Technology breakdowns / comparisons
   - Reddit / community sentiment
   - Pricing / alternatives
   - Best practices / checklists
2. **Extract key sources** — `web_extract` the top 3-5 most relevant URLs in parallel
3. **Iterative deepening** — after extraction, identify the 1-2 most promising sources (richest content, most authoritative). Fire second-round targeted searches:
   - Search for the exact paper/blog title to get the full document
   - Search for related terms the first round's extraction revealed as important
   - Extract the full paper/blog post from the second round
   - Repeat if third-round leads appear (but cap at 3 rounds to avoid scope creep)
4. **Codebase audit** (if applicable) — `search_files` + `read_file` to evaluate the user's current state against research findings
5. **Write structured output** — create tables, checklists, and a phased roadmap
6. **Argumentation synthesis** (for presentation/jury/pitch contexts) — distill findings into:
   - Killer one-liner: a single punchy sentence answering the core question
   - 2-3 key analogies (e.g. "we work like Uber RADAR, not like a black box")
   - Q&A pre-answers: for every foreseeable objection, draft a 2-sentence defense rooted in the research
   - Add these as a dedicated section at the end of the vault paper
7. **Log to vault** — write to `PROJECTS/<project>/<topic>-research.md` (project-specific) or `OUTPUT/reports/<topic>-report.md` (general)
8. **Restructure if cluttered** — if the project folder has 10+ research files, offer to move them into a `RESEARCHS/` subdirectory and update wikilinks across parent files

**Pitfall:** Do not use the single-URL `keep` template for multi-source research. The output format is different — multi-source produces audit tables and roadmaps, not tool evaluations.

**Pitfall:** One pass of search → extract is rarely enough for multi-source research. The richest findings always surface after you've read 2-3 sources and know what to ask next. Always budget for at least 2 rounds.

**Pitfall:** Argumentation synthesis (step 6) is not fluff — it's the reason the user asked for the research. If they need to convince a jury, investor, or jury, include it. If they're purely exploring, skip it.

**Reference:** See `references/competitive-argumentation-research.md` for the full workflow template including paper extraction, evidence tables, and Q&A preparation.
**Reference:** See `references/competition-intelligence-pipeline.md` for extraction-to-exploitation analysis of hackathon/competition training materials — finding competitive hooks, judging criteria, framework alignment, and pre-validation signals.

### Technology Stack Options Research Mode

When the user asks to research technologies for a new project or evaluate alternatives for an existing stack — e.g. "what AI model should we use", "compare storage options", "what's the best map library" — **never default to a single option**. Present alternatives with trade-offs.

**Critical rule:** The user may know options you don't (DeepSeek, Bunny.net, MapLibre, etc.). Defaulting to the most popular tool (Gemini, Mapbox, R2) without comparing alternatives is a failure mode. Always research options.

Workflow:
1. **Identify the layer** — AI/vision, storage/CDN, maps, backend, auth, mobile UI, etc.
2. **Parallel web_search** — search for alternatives per layer:
   - `best <layer> alternative 2026`
   - `<option-A> vs <option-B> pricing`
   - `site:reddit.com <technology> production`
3. **Extract pricing and capabilities** — `web_extract` official pricing pages, benchmark comparisons
4. **Cross-reference vault libraries** — `search_files(target='files', path='${OBSIDIAN_VAULT_PATH}/LLM/KNOWLEDGE/libraries/')` for relevant libraries already captured
5. **Build comparison tables** per layer:
   | Option | Pricing | Pros | Cons | Best For |
   |--------|---------|------|------|----------|
6. **Add cost-at-scale projection** — estimate monthly cost at predicted usage (e.g. 50k audits/month)
7. **Phased recommendation** — what to use for hackathon/MVP vs what to migrate to at scale
8. **Log to vault** — `PROJECTS/<status>/<project>/RESEARCH_<TOPIC>.md` or `OUTPUT/reports/<topic>-options.md`

**Pitfall:** Presenting a single "recommended" stack without showing alternatives assumes the user's constraints. They may prioritize cost (DeepSeek over Gemini), sovereignty (self-hosted over cloud), or simplicity (react-native-maps over Mapbox). Let them choose from a curated shortlist.

**Reference:** See `references/technology-options-research-template.md` for the full options research template.
**Reference:** See `references/agent-planning-formats.md` for the HTML vs markdown vs MDX vs Excalidraw vs Headroom landscape (token costs, tradeoffs, recommendations for budget coding).
**Reference:** See `references/cli-coding-agent-evaluation.md` for the checklist and methodology when evaluating free/cheap CLI coding agents for the Hermes delegation pipeline (headless mode, free tiers, tammability, GLM-5.2 access paths).

### Codebase Deep-Dive Mode

When the user asks to "research how X works" or "study Y's architecture" for an entire repo (not a single URL):

1. **Load** `references/remote-codebase-research.md` for the full workflow
2. **Get the file tree** via GitHub API (`/git/trees/{branch}?recursive=1`)
3. **Read key files** via raw URLs (`raw.githubusercontent.com/...`)
4. **Synthesize** patterns into vault research notes + Excalidraw diagrams
5. **Log** the research as a decision in the active project's `decisions.md`

Save output to the active project folder (not `KNOWLEDGE/libraries/`), since codebase research is project-specific.

## 7. Report Back to User

Brief summary (caveman-mode friendly):
- What is it (and where the info came from — web / YouTube transcript / Reddit)
- Fits which projects ✅/❌/⚠️
- Key comparison to existing stack
- Reddit sentiment if found
- Saved at `KNOWLEDGE/libraries/<name>.md`
