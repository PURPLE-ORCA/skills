# Multi-Source Security Research Workflow

Workflow for broad topic research + codebase audit + vault output.

## Phase 1: Parallel Research (fire 3-6 queries simultaneously)

Cover different angles:
- How major players solve the problem (e.g. "how does Udemy secure videos")
- Technology breakdowns (e.g. "video DRM solutions for e-learning")
- Platform-specific docs (e.g. "Bunny.net DRM features")
- Community sentiment (e.g. "site:reddit.com securing course videos")
- Pricing/comparisons (e.g. "affordable video DRM alternatives")
- Best practices/checklists (e.g. "Laravel security checklist")

**Pitfall:** Reddit web_extract often fails — use web_search snippets as fallback.

## Phase 2: Extract Key Sources (3-5 URLs in parallel)

Pick the most authoritative/complete sources from Phase 1. Batch extract.

**Pitfall:** PDFs extract fine via web_extract (no need for browser). But some sites (Reddit, X) block extraction — fall back to search snippets.

## Phase 3: Codebase Audit (if applicable)

- `search_files` for relevant patterns (config, middleware, service classes)
- `read_file` on key files
- Build audit tables: Check | Status | Risk
- Categorize findings: what exists vs what's missing

## Phase 3.5: Competitor Site Inspection (when analyzing platforms)

To identify a competitor's actual video player / tech stack without their docs saying it:

1. `browser_navigate` to the competitor's site
2. `browser_console` with expression to extract iframe sources:
   ```js
   const iframes = Array.from(document.querySelectorAll('iframe')).map(i => ({src: i.src, id: i.id}));
   const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
   const playerScripts = scripts.filter(s => s.includes('player') || s.includes('video') || s.includes('wistia') || s.includes('vimeo'));
   JSON.stringify({iframes, playerScripts});
   ```
3. Iframe `src` domains reveal the video host (e.g. `player.vimeo.com` = Vimeo, `fast.wistia.com` = Wistia)
4. Cross-reference with `web_search("<platform> video hosting technology")` for confirmation

**Pitfall:** Some sites require login to see video pages. If the homepage iframes don't show video players, note that and rely on search-based confirmation instead.

## Phase 4: Structured Output

Write vault doc with:
1. Research summary (how major players do it)
2. Technology breakdown (comparison table of approaches)
3. Current state audit (what we have vs what's available)
4. Competitor analysis matrix (our platform vs competitors)
5. Open-source alternatives (what's free vs what costs money)
6. Cost comparison table
7. Phased roadmap (quick wins → enterprise upgrades)
8. Sources list with URLs

**Document structure for security/feature research:**

```markdown
# <Topic> Research — <Project> v<version>

> Date, project link, trigger, status

## 1. How Major Players Solve This
## 2. Technology Breakdown
## 3. Current Security/Feature Audit
## 4. Competitor Analysis (platform-by-platform)
## 5. Open-Source & Self-Hosted Alternatives
## 6. Cost Comparison
## 7. Recommended Roadmap
## 8. Sources
```

**Pitfall:** For security research specifically, always include a "What NOT to waste time on" section. Users appreciate knowing the dead ends so they don't explore them.

## Phase 4.5: Open-Source Alternatives Follow-Up

When researching paid solutions (DRM, video hosting, etc.), users often ask "are there open-source alternatives?" This is a natural follow-up — handle it in the same research session, not a new one.

1. Search for: `open source <technology> alternative self-hosted github`
2. Search for: `self-hosted <technology> free alternative reddit`
3. Check GitHub repos directly — look at stars, last commit date, commit count, license
4. **Classify by tier:** production-ready vs research/academic vs abandoned
5. **Be honest about limitations** — e.g. "Real Widevine DRM cannot be self-hosted (requires CWIP certification)"
6. Add to the same vault doc as a new section, not a separate file

**Key pattern:** Open-source DRM projects (OpenCDM, OpenDRM) are almost always academic/research-stage. Real DRM requires certification from Google/Apple. Document this clearly so the user doesn't waste weeks exploring a dead end.

## Vault Path

- Project-specific: `PROJECTS/ACTIVE/<project>/<topic>-research.md`
- General: `OUTPUT/reports/<topic>-report.md`
- Use wikilinks to related project notes
