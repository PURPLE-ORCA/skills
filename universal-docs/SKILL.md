---
name: universal-docs
description: 
  A ruthless, stack-agnostic documentation generator. Use when writing, reviewing, or updating READMEs, Architecture Decision Records (ADRs), API references, or system guides. Triggers on "write docs", "create a guide", "draft adr", "generate llms.txt", "document this component", or "update readme". MUST use this skill to prevent bloated, unstructured, or AI-hallucinated documentation.
---

# Universal Docs Architect

This skill enforces a strict, professional documentation workflow. It prevents the AI from instantly generating massive blocks of text by forcing a structured planning phase and adhering to the Diátaxis framework.

## The Execution Loop (MANDATORY)

You must NEVER immediately write the full documentation. You must follow these three phases in order:

### Phase 1: Interrogation & Categorization
When the user asks for documentation, you must first categorize the request using the **Diátaxis Framework**:
1. **Tutorials:** Learning-oriented. Hand-holding a beginner through a project.
2. **How-To Guides:** Goal-oriented. Step-by-step instructions to solve a specific problem.
3. **Reference:** Information-oriented. Dry, accurate technical descriptions (APIs, configs).
4. **Explanation:** Understanding-oriented. High-level architecture, design choices, and theory.

**Action:** Ask the user to confirm the category and provide any missing context (target audience, tech stack, key constraints).

### Phase 2: The Outline Hold
Once the category and context are confirmed, generate a strict, bulleted outline of the proposed documentation. 
**Action:** STOP. Ask the user: *"Does this outline look correct, or do we need to adjust the structure?"* Do not proceed to Phase 3 until explicit approval is given.

### Phase 3: Execution (The "February Guide" Standard)
Once approved, write the documentation. The output must match the elite quality standard established for "The Guide":
- **Formatting:** Heavy use of tables, code blocks, bold emphasis for critical paths, and collapsible sections if the markdown flavor supports it.
- **Tone:** Direct, rational, and unfiltered. Zero fluff. No introductory filler like "In the ever-evolving world of web development..."
- **Clarity:** Assume the reader is a competent developer who is just short on time. Give them the "what," the "how," and the "why," then get out of the way.

---

## Required Templates

If the user specifically requests an ADR or an `llms.txt` file, bypass the Diátaxis categorization and use these exact structures.

### Template 1: Architecture Decision Record (ADR)
Use this when documenting a major technical shift (e.g., migrating to Inertia v3, choosing Convex, abandoning a library).

```markdown
# ADR [Number]: [Short Noun Phrase describing the decision]

**Date:** YYYY-MM-DD
**Status:** [Proposed | Accepted | Deprecated | Superseded]

## Context
What is the technical or business problem? Why are we making a change now? Keep it objective and factual.

## Decision
What is the exact change we are making? Be precise. (e.g., "We will use the `@inertiajs/vite` plugin and remove Axios.")

## Consequences
**Positive:**
* [Benefit 1]
* [Benefit 2]

**Negative (Trade-offs):**
* [Cost/Risk 1]
* [Cost/Risk 2]
```

### Template 2: RAG-Optimized `llms.txt`
Use this when creating an AI-readable index for a repository.

```markdown
# [Project Name] - LLM Context

> Brief, one-sentence description of the project stack and purpose.

## Core Architecture
* **Frontend:** [e.g., React 19, Expo]
* **Backend:** [e.g., Laravel 12, PHP 8.5]
* **State/Data:** [e.g., Inertia v3, Convex]

## Directory Structure Guide
* `/src/actions` - Single-responsibility business logic.
* `/src/components` - UI components (No data fetching here).

## Hard Rules (Do Not Violate)
1. [e.g., Never use React Context for translations; use the event emitter hook.]
2. [e.g., Never write 'Fat Controllers'.]
```
