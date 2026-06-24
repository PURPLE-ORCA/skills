# Competition / Training-Material Intelligence Pipeline

Use when the user has source documents (PDFs, slide decks, training materials) from a **competition, hackathon, or institutional training** and needs to extract strategic intelligence — hooks to use in their pitch, positioning against other teams, and alignment with the organizers' known frameworks.

## When to Use

- Source PDFs are training/orientation materials for a hackathon or competition
- User says "analyze these like we did with the previous ones"
- Need to find competitive advantage from reading the same materials all teams have
- Organizers' own slides contain references to projects, tech analysis, or judging criteria

## Pipeline Stages

### Stage 1: Source Assessment & Format Detection

Before extracting, classify each source file:

| Property | Check | Action |
|----------|-------|--------|
| Text extractable? | `pymupdf` → `get_text()` | If yes → pymupdf route |
| Image-only? | `get_text()` returns empty | If yes → render + `vision_analyze` route |
| Mixed? | Some text, some image slides | Hybrid route (both) |
| Language | French, Arabic, English, mixed | Note for keyword mining |

**Pitfall:** Don't assume a large file size means text-rich content — 5MB presentation PDFs are often all image-based (design exports, webinar screenshots).

### Stage 2: Extraction

For text-extractable PDFs → use `references/pdf-text-extraction-pattern.md` (pymupdf).

For image-only PDFs → use the Hybrid Extraction method from that same reference (render slides to PNG + vision_analyze).

**Pitfall for vision analysis:** Don't analyze all 34 slides individually. Cover:
- Slides 1-3 (title, agenda, speaker → establishes credibility of source)
- Architecture/framework slides (diagrams → core models)
- Case study slides (real-world examples → reference projects)
- Criteria/methodology slides (how they'll judge → gold intel)
- Any slide mentioning your project by name

Skip: decorative slides, repeated headers/footers, reference links sections.

### Stage 3: Intelligence Harvesting

Ask these questions of every source:

**1. Are we mentioned?**
- Search for your project name in extracted text (`grep -i "your-project-name"`)
- In vision slides, scan for your project in tables, examples, case study lists
- **If found → this is the single most valuable finding.** The organizers pre-validated your project. Use it.

**2. What's the competitive landscape?**
- Look for slides analyzing ALL project types by technology or sector
- Identify over-represented approaches (everyone's doing pure AI → don't compete there)
- Identify under-represented approaches (few teams do crowdsourcing → double down there)
- **Result:** Position your project at the intersection of an under-used approach + an over-represented one you do differently

**3. What are the judging criteria?**
- Search for explicit statements about what the jury evaluates
- Common phrasing: "le jury évalue d'abord X avant Y", "critères de notation", "ce que nous attendons"
- **Result:** Structure your pitch to hit their criteria in order of importance

**4. What's their framework/language?**
- Identify recurring concepts (redevabilité sociale, intégrité, transparence, participation citoyenne)
- Note any specific models presented as "the way to think about this" (e.g. 5 axes, 3 pillars, 4 layers)
- **Result:** Mirror their framework in your pitch — it signals fluency

**5. What case studies do they cite?**
- List every real-world project they reference (Ushahidi, I Paid a Bribe, FixMyStreet, etc.)
- For each: what did it do, what country, what's the model
- **Result:** Reference these as "your inspirations" in your pitch

### Stage 4: Exploitation Synthesis

For each finding, produce a **pitch-ready exploit**:

| Finding Type | Raw Finding | Exploit | How to Use |
|-------------|-------------|---------|------------|
| Pre-validation | "Your project cited as health sector example" | "Votre propre présentation nous cite. Nous avons pris cette confiance au sérieux." | Pitch opening line |
| Competitive gap | "Crowdsourcing = medium count, AI = very high" | "La plupart des projets font de l'IA pure. Nous faisons IA + crowdsourcing — les deux ensembles." | Differentiation section |
| Judge criteria | "Le jury évalue d'abord le problème" | Start pitch with problem (50 MMDH/year, 68% affected), not tech | Pitch structure |
| Framework alignment | "5 axes stratégiques" | Map your project to their axis numbers (e.g., "Axe 2 + Axe 3") | Credibility section |
| Reference synergy | "Ushahidi + I Paid a Bribe cited" | "Comme Ushahidi pour la cartographie citoyenne, comme I Paid a Bribe pour l'anonymat..." | Context section |
| Anti-patterns | "3 frictions structurelles" | Show why your project avoids each friction | Competitive moat |

### Stage 5: Vault Output

Write to `PROJECTS/<project>/RESEARCHS/RESEARCH_<TOPIC>.md` following the format of the most recent analogous research doc in that directory.

**Required sections:**
1. Source file table (name, pages, language, presenter, key value)
2. Key revelations (highest-value findings first — lead with "we're cited" if true)
3. Framework mapping (their frameworks → your project)
4. Strategic exploitation (numbered Exploit sections with pitch lines)
5. Competitive positioning matrix (your project vs generic "other teams")
6. Action items (concrete, numbered, checkable)
7. Comparison to previous batch of sources (if cumulative)

**Pitfall:** Every exploit needs a concrete pitch line, not just a description. The user needs to be able to drop these into their deck verbatim. Write the quote in the appropriate language for the jury (e.g. French for French-speaking juries, Arabic for Arabic-speaking juries).

**Pitfall:** Tag with `#argumentation #juryprep` so the user can cross-reference when building their demo script.

## Example Flow

1. Detected: Governance PDF (100 pages, text-extractable) + Webinaire PDF (34 slides, image-only)
2. Extracted: pymupdf for Governance → vision_analyze for Webinaire (slides 1,6,11,12,13,20,22,32)
3. Found: your-project cited on slide 44, competitive tech landscape on slide 45, judging criteria on slide 22, 3 structural frictions on slide 11
4. Produced: 5 Exploit sections, Competitive Matrix, Comparison table, 9 Action Items
5. Output: `RESEARCH_<TOPIC>.md` with wikilinks to previous research
