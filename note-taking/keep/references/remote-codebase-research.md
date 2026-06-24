# Remote Codebase Research (No Clone)

> Workflow for deep-diving into an external GitHub repo's source to extract architecture patterns, design decisions, and UI/UX inspiration — without cloning.

## When to Use
- Studying a closed-source or large repo for inspiration (e.g., Codex UX → HERMESA)
- Extracting patterns from an open-source project to adapt to a different tech stack
- Architecture reconnaissance before building a similar feature

## Technique: Read via Raw URLs + GitHub API

### 1. Get the File Tree (No Clone Needed)
```
GET https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1
```
- Returns the full directory structure as JSON
- Filter to `packages/`, `src/`, `app/` directories of interest
- Identify key files by name patterns: `sidebar*`, `session*`, `diff*`, `vcs*`, `layout*`

### 2. Read Source Files via Raw URLs
```
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
```
- Use `web_extract` on raw URLs — returns full source code as markdown
- Works for any text file (`.ts`, `.tsx`, `.js`, `.py`, `.rs`, etc.)
- No authentication needed for public repos

### 3. Navigate Directory Listings
```
https://github.com/{owner}/{repo}/tree/{branch}/{path}
```
- `web_extract` on directory pages returns file listings with last commit info
- Use to discover subdirectories and file names before reading

### 4. Extract Patterns
Read files in this order for architecture understanding:
1. **Entry points** — `layout.tsx`, `app.tsx`, `main.ts`, `index.ts`
2. **Context/state** — `context/`, `store/`, `state/` directories
3. **Components** — feature-specific directories (`sidebar/`, `session/`, `panel/`)
4. **Services** — `server/`, `api/`, `services/` directories
5. **Core logic** — `core/`, `lib/`, `utils/` directories

### 5. Synthesize and Document
Write findings to vault as:
- **Research notes** — raw findings with code references
- **Architecture diagrams** — Excalidraw showing data flow and component relationships
- **Decision log entry** — what to steal, adapt, or skip for the target project

## Pitfalls

- **Clone timeouts**: Large repos (>100MB) will timeout on `git clone`. Always prefer raw URL reading.
- **GitHub API rate limits**: Unauthenticated API calls are limited to 60/hour. The tree endpoint is the most efficient single call.
- **Branch naming**: Default branch may be `main`, `dev`, or `master`. Check the repo page first.
- **File size**: Very large files (>1MB) may not render well in `web_extract`. Focus on source code, not generated files.
- **404s on raw URLs**: Branch names with `/` or special chars need encoding. Try the GitHub web UI first to confirm the path exists.

## Example Output Pattern
```
RESEARCH/
├── {project}-sidebar.md        — component hierarchy, data flow, key patterns
├── {project}-right-panel.md    — feature deep-dive with code references
├── {project}-architecture.md   — overall system design and comparison
EXCALIDRAW/
├── {project}-architecture.excalidraw
├── {project}-component-flow.excalidraw
```
