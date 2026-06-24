# PDF Text Extraction for Vault Research

Pattern for extracting text from local PDFs (including Arabic/Unicode) and converting to structured markdown for vault research pipelines.

## When to Use

- User provides local PDFs, presentations, or documents for research/analysis
- Source documents are in Arabic, French, or mixed languages with Unicode
- Need to extract structured text for keyword mining, strategic analysis, or competitive intelligence
- Documents are outside the allowed workspace (e.g., `~/Downloads/`)

## Tool Setup

```bash
# Install PyMuPDF (fitz) — handles Arabic, complex layouts, multi-page docs
pip3 install pymupdf --break-system-packages
```

**Pitfall:** `fitz` is the module name for PyMuPDF. `import fitz` works after `pip install pymupdf`.

**Pitfall:** On macOS with Python 3.14, the sandboxed `execute_code` may not find the package even after install. Use `terminal` with `python3 -c "..."` instead — it uses the system Python where the package is available.

## Extraction Script

```python
import fitz
import os

files = [
    ('/path/to/file1.pdf', 'output_name_1'),
    ('/path/to/file2.pdf', 'output_name_2'),
]

output_dir = '/resolved/vault/path/LLM/RAW/<topic>_PDF_EXTRACTS'
os.makedirs(output_dir, exist_ok=True)

for path, name in files:
    doc = fitz.open(path)
    full_text = f'# {name}\n\n'
    for i in range(len(doc)):
        text = doc[i].get_text()
        full_text += f'\n--- Page {i+1} ---\n{text}\n'
    doc.close()

    out_path = os.path.join(output_dir, f'{name}.md')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(full_text)
    print(f'Saved: {out_path} ({len(full_text)} chars)')
```

## Key Techniques

### Arabic/Unicode PDFs
- PyMuPDF handles Arabic text extraction natively — no special encoding needed
- Output is UTF-8; write with `encoding='utf-8'`
- Some Arabic PDFs use visual glyph ordering; PyMuPDF normalizes this automatically

### Multi-Document Batch
- Process all PDFs in one loop
- Name outputs descriptively (not the original filename if it contains spaces/Unicode)
- Print char counts for quick validation

### Verification
- Read back the first extracted file to verify text quality
- Check for empty pages (some PDFs are image-based; `get_text()` returns empty)
- For image-based PDFs, use OCR (Tesseract + pytesseract) instead

### Hybrid Extraction: pymupdf Text + vision_analyze for Image-Only Slides

When a PDF has **no extractable text** (all pages are image-based — common for design/webinar presentations):

1. **Render each page to PNG** with pymupdf:
   ```python
   import pymupdf
   doc = pymupdf.open(path)
   for i, page in enumerate(doc):
       pix = page.get_pixmap(dpi=200)
       pix.save(f"/tmp/slides/slide_{i+1:02d}.png")
   ```
2. **Analyze with `vision_analyze`** — pass each slide's `file://` path as `image_url` with a specific question: `"Read all visible text. What is on this slide?"`
3. **Batch strategically**: Cover slides 1-3 (title + agenda + speaker), then sample thematic slides (architecture diagrams, case studies, frameworks). Don't analyze all 34 slides individually — pick the structural ones.
4. **Synthesize across slides** — vision gives you text + visual context (diagrams, photos) that pymupdf can't capture

**Pitfall:** `get_pixmap()` can produce very large PNGs (3125x1759 at 200dpi for a 16:9 slide). This is fine — vision_analyze handles it, but batch rendering takes ~2s per slide. Set `dpi=150` for faster extraction when quality isn't critical.

**Pitfall:** Close the document after extracting (`doc.close()`) before using the outputs — accessing `len(doc)` after close raises `ValueError: document closed`.

**Pitfall:** Image-only PDFs are common for design/UX presentations (Figma exports, Canva decks, webinar screenshots). Don't assume `get_text() == ""` means the PDF is corrupted — it just means no text layer exists. Vision is the correct fallback.

### Template-Following for Vault Research Docs

When the user asks you to analyze documents and produce a research doc **"like the one before"** — find the closest existing doc and use its structure as a template:

1. **Find the template** — `read_file` the most recent analogous research doc in the same directory (e.g. `RESEARCH_INPPLC_ORGANIZATION_PDFS.md`)
2. **Preserve the format** — copy the section hierarchy, table patterns, heading levels, pitch-line callout style, and tag conventions
3. **Only add structure the content demands** — if the new PDFs introduce genuinely new patterns (e.g. project pre-validated, competitive tech landscape), create new sections that mirror the template's style
4. **Add a Comparison section** at the end contrasting the new sources vs the old ones — judges (and the user) value seeing how findings compound

**Pitfall:** Don't blindly copy the template's content — copy its **structure**. Research topics differ; what carries over is the format (exploitation tables, pitch lines, action items), not the specific keywords or frameworks.

## Vault Integration

After extraction, the research pipeline continues:

1. **Read extracted markdown** with `read_file` to understand content
2. **Mine for keywords** — identify professional terminology, frameworks, and strategic concepts
3. **Map to your product** — create a table: their term → how your product uses it
4. **Write strategic report** — `PROJECTS/<project>/RESEARCH_<topic>.md`
5. **For competition/hackathon materials:** after extraction, follow `references/competition-intelligence-pipeline.md` for the full exploitation pipeline — finding competitive hooks, judging criteria, and pre-validation signals
6. **Update master index** — add the new research report to the project's index

## Example: Competitive Intelligence from Training Materials

This pattern was used to extract strategic intelligence from INPPLC's own Nazahathon training PDFs:

- Extracted 3 PDFs (8 + 23 + 41 pages)
- Mined 7 professional Arabic terms (e.g., "غياب آثار الجريمة", "تطبيع المواطنين")
- Mapped each term to TAHAQAQ's value proposition
- Wrote `RESEARCH_INPPLC_ORGANIZATION_PDFS.md` with exploitation strategies
- Updated `RESEARCH_MASTER_INDEX.md`

The result: pitch language that mirrors the jury's own framework, creating instant credibility.

## Pitfalls

- **Do not use `web_extract` for local file URLs** — `file://` URLs are blocked by `web_extract`
- **Do not use `execute_code` for fitz on macOS** if the sandbox can't find the package — use `terminal` with `python3 -c`
- **Image-based PDFs** need OCR — `get_text()` returns empty for scanned documents
- **Large PDFs** (>100 pages) — extract in chunks to avoid memory issues
