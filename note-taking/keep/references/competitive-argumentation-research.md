# Competitive Argumentation Research Workflow

Use when the user wants to research a topic not just for understanding, but to **convince someone** — a jury, investor, jury panel, or decision-maker. Combines multi-source research with argumentation engineering.

## When to Use

- "Research how we'd defend this against jury questions"
- "Find proof that our approach works in the real world"
- "I need ammunition for the pitch / presentation"
- The user says "this is for X competition / hackathon"
- Researching for a "how do you handle X" objection

## Phase 1: Coverage Map (before search)

Identify the **objection landscape** before searching:

| Objection Type | Example | Evidence Needed |
|----------------|---------|----------------|
| Feasibility | "Has this been done before?" | Real-world case studies |
| Integrity | "How do you prevent cheating?" | Anti-gaming/academic papers |
| Privacy | "What about user data?" | Legal frameworks + technical design |
| Sustainability | "How does this survive?" | Business model analogs |
| Impact | "Does this actually help?" | Metrics from similar platforms |

Skip this if the user already gave you the exact question to research.

## Phase 2: Iterative Search Pattern

### Round 1 — Scatter (domain coverage)
Fire 3-6 parallel searches covering different angles of the topic. Collect URLs.

### Round 2 — Depth (targeted extraction)
Extract the 3-5 most promising URLs. Identify which are richest — these are candidates for second-round digging.

### Round 3 — Paper/Blog Extraction
For each rich source from round 2:
- If it's an academic paper: search for the exact paper title, try `arxiv.org`/PDF links via `web_extract`
- If it's an engineering blog: `web_extract` the actual post (e.g. `uber.com/blog/...`)
- If it's a transparency report: extract the full press release or PDF summary
- Extract quantitative claims (metrics, percentages, accuracy rates) — these are gold for argumentation

**Pitfall:** Stop at 3 rounds. Each round should add ~2-3 major sources at most. Beyond 5 rounds you're optimizing instead of synthesizing.

## Phase 3: Evidence Table

After extraction, build an evidence table mapping every source to an objection:

| Objection | Evidence Source | Key Metric/Quote | Confidence |
|-----------|-----------------|------------------|------------|
| "This can be gamed" | Yelp AAAI paper | 86% accuracy with behavioral features alone, 100% top-50 on Flipkart BIRDNEST | HIGH (peer-reviewed) |
| "No one does this" | Uber RADAR blog | Two-dimension maturity model, human-in-the-loop architecture | HIGH (production) |
| "Scale impossible" | Google Maps 2024 | 240M fake reviews blocked/year | HIGH (production) |

Group by objection so you can quickly find the right counter-argument.

## Phase 4: Argumentation Engineering

### The Killer One-Liner

Distill the entire research into one sentence that:
- Acknowledges the objection (shows you're not naive)
- Transitions with a contrast
- States your evidence-backed position

Template:
> *"The question isn't 'can someone [objection]?' — [platform], [platform], and [platform] all [operate with same constraint]. The question is: do the signals they leave behind [list signals] reveal them? The answer is yes, with validated [X]–[Y]% precision."*

Example from session:
> *"The question isn't 'can someone game an anonymous system?' — Uber, Yelp, TripAdvisor all operate anonymous systems. The question is: do the signals they leave behind (timing, volume, pattern) reveal them? The answer is yes, with validated 86–100% precision."*

### Analogies (2-3 max)

Each analogy should have:
- The familiar platform/system being analogized
- The specific feature being compared
- The key difference (shows you understand the limits of the analogy)

Pattern: "We work like X's [feature], but adapted for [our constraint]."

Examples:
- "Like Uber RADAR, we use Bayesian time-series to detect anomalies — but adapted for hospital audit data instead of payment data."
- "Like Yelp's behavioral filter, we track review velocity and rating deviation — but without needing accounts."
- "Like BIRDNEST, we model rating distributions with Bayesian priors — but for Moroccan hospital audits instead of e-commerce."

### Q&A Pre-Answers

For each foreseeable objection, draft a 2-sentence defense:
- Sentence 1: Acknowledge the concern and state your response
- Sentence 2: Cite evidence (the strongest from Phase 3)

Template:
> **Q:** [Objection as a question]
> **A:** > *"[Sentence 1 — direct claim]. [Sentence 2 — evidence citation, ideally with a number or platform name]."*

## Phase 5: Vault Output

The vault paper should include a dedicated **Argumentation Appendix** with:
1. Killer one-liner (standalone, prominently marked)
2. Evidence table (objection → source → metric)
3. Q&A section (question → answer)
4. Analogies section (platform + feature + difference)

**File naming:** `PROJECTS/<project>/RESEARCH_<TOPIC>.md` with `#argumentation #juryprep` tags.

**Cross-reference:** Add a `## Related` section at the bottom of the paper linking to any earlier research files that fed into the argumentation (e.g. earlier legal research, technical architecture).

## Phase 6: Post-Research Cleanup

When research files accumulate (10+ in a project folder), the vault becomes hard to navigate during active dev:
1. Create a `RESEARCHS/` subdirectory
2. `mv RESEARCH_*.md RESEARCHS/`
3. Update wikilinks in parent files: `[[RESEARCH_X]]` → `[[RESEARCHS/RESEARCH_X]]`
4. Update the research master index to reflect the new path
5. Offer this as a service, don't auto-do — the user may want to keep certain files at root

---

**Related:** `keep` skill's Multi-Source Topic Research Mode, `obsidian` skill's Vault Restructure section.
