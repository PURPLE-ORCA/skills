# Technology Options Research Template

Use this template when researching technology alternatives for a project stack. Never default to a single option — always compare.

## Research Workflow

1. **Identify architectural layers** that need decisions (AI, storage, maps, backend, auth, etc.)
2. **Search for alternatives per layer** — parallel web_search for each
3. **Extract pricing/capabilities** from official sources
4. **Cross-reference vault libraries** at `KNOWLEDGE/libraries/`
5. **Build comparison tables**
6. **Project cost at scale**
7. **Phased recommendation** (hackathon → MVP → scale)

---

## Output Structure

```markdown
# <Project> — Technology Options Research
## Research Report #<N> | Priority: <LEVEL>

**Date:** <date>
**Scope:** Evaluate all viable technology options for each layer
**Confidence:** HIGH / MEDIUM / LOW

---

## 1. EXECUTIVE SUMMARY

Key findings and recommended stack per phase.

---

## 2. <LAYER> OPTIONS (e.g. AI / Vision)

### 2.1 Option A: <Name>
| Factor | Details |
|--------|---------|
| **Pricing** | $X/1M tokens or $Y/month |
| **Capability** | Yes/No for vision, JSON mode, etc. |
| **Pros** | ... |
| **Cons** | ... |
| **Best for** | ... |

### 2.2 Option B: <Name>
[Same structure]

### Recommendation
| Phase | Choice | Rationale |
|-------|--------|-----------|
| Hackathon | ... | ... |
| Scale | ... | ... |

---

## 3. COST COMPARISON AT SCALE

Assuming <usage scenario>:

| Layer | Cheap Option | Cost | Premium Option | Cost |
|-------|-------------|------|----------------|------|
| AI | ... | ... | ... | ... |
| Storage | ... | ... | ... | ... |
| **Total** | | **~$X/month** | | **~$Y/month** |

---

## 4. VAULT LIBRARIES CROSS-REFERENCE

| Library | Use in Project | Why |
|---------|---------------|-----|
| `<lib-name>` | ... | ... |

Search: `search_files(target='files', path='${OBSIDIAN_VAULT_PATH}/LLM/KNOWLEDGE/libraries/')`

---

## 5. FINAL RECOMMENDED STACK

| Layer | Hackathon | Scale |
|-------|-----------|-------|
| ... | ... | ... |

---

## SOURCES

1. <url> — <description>
2. ...
```

---

## Pitfalls to Avoid

- **Defaulting to the most popular tool** without comparing (Gemini, Mapbox, R2, etc.)
- **Ignoring cost-at-scale** — what works for a hackathon may bankrupt at 50k users
- **Forgetting vault libraries** — the user may already have researched relevant tools
- **Presenting a single recommendation** — always give a shortlist with trade-offs
- **Not separating mobile vs web** — the best tool for RN may differ from web dashboard
- **Ignoring the user's known preferences** — check memory for stated priorities (cost, privacy, speed, etc.)
