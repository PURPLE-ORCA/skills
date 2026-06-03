---
name: hyperframes-promo
description: Structure promotional product/app videos with HyperFrames — storyboard-first workflow, scene pacing guidelines, mid-scene motion patterns, and quality gates. Companion to the core hyperframes skill; does not replace it.
version: 1.0.0
author: purpleorca
tags: [creative, video, promotion, motion-graphics, gsap]
related_skills: [creative/hyperframes]
---

# HyperFrames Promo Video Production

Companion to `creative/hyperframes`. This skill fills the gap between "make a promo video" and the raw HyperFrames composition skill: **scene structure, pacing, mid-scene motion, and quality gates** for product/app promos.

Load both: load `creative/hyperframes` first, then load this one.

---

## Workflow (Do This Every Time)

```
1. STORYBOARD.md   → scene-by-scene beat sheet with timings
2. DESIGN.md       → colors, typography, motion rules, anti-patterns
3. assets/         → copy app icons, logos, media into project
4. index.html      → build composition (static hero frames first, then GSAP)
5. npm run check   → lint + validate + inspect
6. npx hyperframes render --quality draft --output draft.mp4  → timing check
7. ffprobe + ffmpeg frame grab → verify duration + visuals
8. npx hyperframes render --quality standard --output final.mp4 → final delivery
```

**Never skip step 1 or 2.** Writing HTML before a storyboard produces bloated scenes and bad pacing.

---

## Scene Template: 30s Promo (7 Scenes)

| # | Time | Scene | Duration | Content |
|---|------|-------|----------|---------|
| 1 | 0–3.5s | **Brand Hook** | 3.5s | App icon + brand name + tagline + divider. Aggressive entrance. |
| 2 | 3.5–7.5s | **The Problem** | 4s | Provocative headline. Counter animation showing fake vs real numbers. |
| 3 | 7.5–11.5s | **The Solution** | 4s | Key metric with animated counter. Stat breakdown rows below. |
| 4 | 11.5–16s | **Urgency** | 4.5s | Survival/time clock. Progress bar filling. Warning colors. |
| 5 | 16–21s | **Features** | 5s | 4-card grid staggered in. Each card: number + label + description. |
| 6 | 21–25s | **Differentiator** | 4s | 3 bullet lines with dot markers. Each staggers in from left. |
| 7 | 25–30s | **CTA** | 5s | App icon + brand + tagline + platform availability. Breathe out. |

### Scene Duration Reference
| Content Density | Duration |
|----------------|----------|
| Visual only (icon/hero) | 1.5–2s |
| 1–3 words | 2–3s |
| 4–10 words | 3–4s |
| 11–20 words | 4–6s |
| 21–35 words | 6–8s |
| **Hard ceiling** | **5s** (unless justified) |

---

## Mid-Scene Motion (Never Static)

Every scene must have **continuous motion** through its full duration. Bare minimum: Ken Burns zoom.

### 1. Ken Burns Zoom
Slow zoom on the scene container over its full duration:
```js
tl.to("#s1", { scale: 1.02, transformOrigin: "center center", duration: 3.5, ease: "none" }, 0);
```
**Rule:** Every scene gets one. Scale 1→1.02 for text-heavy, 1→1.03 for visual-heavy.

### 2. Number Counters
Animate a number from 0 to target using GSAP's onUpdate:
```js
tl.to({}, { duration: 1.8, ease: "power1.out", onUpdate: function() {
  const val = Math.round(12480 * this.progress());
  document.getElementById("amount").textContent = "$" + val.toLocaleString();
}}, startTime);
```
**Trigger:** Always use for dollar amounts, days, percentages. Ease: `power1.out` for natural feel, `power1.in` for "loss" (slowing down hurts more).

### 3. Breathing Pulse
Subtle opacity pulse on the hero number:
```js
tl.to("#amount", { opacity: 0.85, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: 1, overwrite: "auto" }, startTime);
```

### 4. Staggered Grid
Cards enter with stagger:
```js
tl.from(".card", { opacity: 0, y: 25, duration: 0.35, stagger: 0.1, ease: "power2.out" }, startTime);
```

### 5. Progress Bar Fill
```js
tl.to("#bar-fill", { width: "100%", duration: 3, ease: "power1.in" }, startTime);
```

### 6. Bullet Points with Dot Markers
```js
tl.from("#row1", { opacity: 0, x: -30, duration: 0.35, ease: "power2.out" }, startTime);
tl.from("#row1 .dot", { scale: 0, duration: 0.2, ease: "back.out(2)" }, startTime);
// Repeat for each row with +0.6s stagger
```

---

## Transitions

- **80% hard cuts** — clean, fast, professional
- **Flash-through-white** for the key energy shift (build-up to climax)
- Install shaders: `npx hyperframes add <name>`
- Mood-to-shader mapping: **calm** → `cross-warp-morph`, **professional** → `cinematic-zoom`, **aggressive** → `chromatic-split`

**Rule:** Never animate exit tweens before a transition — the transition IS the exit.

---

## GSAP Ease Vocabulary

Use this table when translating user direction to GSAP:

| Natural Language | GSAP Ease |
|-----------------|-----------|
| Smooth | power2.out |
| Snappy | power4.out |
| Bouncy | back.out (back.out(2) for extra pop) |
| Springy | elastic.out |
| Aggressive fall | power1.in |

---

## Contrast Rules

Muted text needs 4.5:1 contrast ratio on dark surfaces:
- `#18181b` card bg → min `#878787` for 13px text, `#7c7c82` for 18px+
- `#0a0a0a` bg → min `#a1a1aa` for 14px+ text
- `#27272a` border → not suitable for text
- `#52525b` on `#18181b` = 2.56:1 — **too low**. Use `#71717a` minimum or `#878787` for 13px.
- `#52525b` on `#0a0a0a` = 2.56:1 — bump to `#a1a1aa`.

The `sub-muted` pattern (`color: #52525b`, 18px) is a common trap — 18px is "large text" (≥18px) so it only needs 3:1, but the validator flags it. Use `#7c7c82` to stay safe.

Run `npx hyperframes validate` before rendering and fix contrast warnings.

---

## Pitfalls

- **Two clips referencing the same `src` image** triggers duplicate-media warnings. Copy the asset to a second filename if it appears in multiple scenes.
- **GSAP `to()` and `from()` on the same element at overlapping times** needs `overwrite: "auto"` on the later tween.
- **Scene `position: absolute; inset: 0`** on clip containers prevents layout overflow from bleeding across scenes.
- **No `Math.random()` or `Date.now()`** — breaks deterministic rendering.
- **No `repeat: -1`** — compute finite repeat: `Math.ceil(duration / cycleDuration) - 1`.
- **GSAP tween overlap on opacity:** When a `from()` entrance and a `to()` breathing/animation target the same element, the timeline's `overwrite: "auto"` is not the default. Add it explicitly: `tl.to("#el", { opacity: 0.85, overwrite: "auto" }, time)`.
- **Duplicate media discovery:** HyperFrames warns when the same `src` (img, video, audio) appears in multiple clip elements. Copy the asset file with a different name per usage (e.g. `icon.png` and `icon-cta.png`).
- **Draft quality != final quality:** CRF 28 draft renders are great for timing checks but colors and text will look worse. Don't judge visual polish on draft.

---

## Verification (After Every Render)

```bash
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 final.mp4     # duration check
ffmpeg -i final.mp4 -ss 00:00:05 -vframes 1 preview.png                              # visual frame check
ffprobe -v error -show_streams -select_streams a -of default=nw=1:nk=1 final.mp4 | head -1  # audio check
```

---

## References

- `references/scene-timing.md` — detailed scene duration table + rationale
- `references/gsap-patterns.md` — reusable animation code blocks
- `templates/storyboard.md` — blank storyboard template to copy
- `templates/design.md` — blank DESIGN.md template with motion rules section
