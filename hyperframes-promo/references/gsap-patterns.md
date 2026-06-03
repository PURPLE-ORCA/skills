# Reusable GSAP Animation Patterns

All patterns assume: `window.__timelines["main"] = gsap.timeline({ paused: true })` and `const tl = ...`

---

## 1. Ken Burns Zoom

Slow zoom on the scene container. Apply to every scene.

```js
tl.to("#scene-id", { scale: 1.02, transformOrigin: "center center", duration: SCENE_DURATION, ease: "none" }, SCENE_START);
```

Variants:
- Text-heavy scene: 1→1.02 (subtle)
- Visual-heavy scene: 1→1.03 (more dramatic)
- Tighter crop: 1.05→1.08

---

## 2. Number Counter

Animate a displayed number from 0 (or a start value) to target.

**Dollar amount:**
```js
tl.to({}, { duration: 1.8, ease: "power1.out", onUpdate: function() {
  const val = Math.round(12480 * this.progress());
  document.getElementById("amount").textContent = "$" + val.toLocaleString();
}}, startTime);
```

**Integer (days, count):**
```js
tl.to({}, { duration: 1.5, ease: "power1.out", onUpdate: function() {
  const val = Math.round(187 * this.progress());
  document.getElementById("counter").textContent = val.toLocaleString();
}}, startTime);
```

**Loss animation (counting down / shrinking — use power1.in so it decelerates):**
```js
tl.to({}, { duration: 2, ease: "power1.in", onUpdate: function() {
  const p = this.progress();
  const val = Math.round(10000 - (10000 - 6280) * p);
  document.getElementById("fake-income").textContent = "$" + val.toLocaleString();
}}, startTime);
```

---

## 3. Breathing Pulse

Subtle opacity oscillation on a hero element.

```js
tl.to("#hero-number", { opacity: 0.85, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: 1, overwrite: "auto" }, startTime);
```

- `repeat: 1` = one full cycle (there-and-back). For longer scenes use `repeat: Math.ceil(remainingTime / 3) - 1`.
- Always add `overwrite: "auto"` if any other tween (especially `from()`) targets the same element earlier.

---

## 4. Staggered Card Grid

```js
tl.from(".card", {
  opacity: 0,
  y: 25,
  duration: 0.35,
  stagger: 0.1,
  ease: "power2.out"
}, startTime);
```

**Variants:**
- Faster pop: `duration: 0.2, stagger: 0.06, ease: "back.out(1.5)"`
- Left-to-right slide: `x: -30` instead of `y: 25`
- Cascading delay: stagger 0.15 for more dramatic reveal

---

## 5. Progress Bar Fill

```js
tl.to("#bar-fill", { width: "100%", duration: 3, ease: "power1.in" }, startTime);
```

- `power1.in` = starts fast, decelerates (feels like something running out)
- `power1.out` = starts slow, accelerates (feels like something building up)
- `none` = linear (neutral)

---

## 6. Bullet Points with Dot Markers

```js
// Row 1
tl.from("#row1", { opacity: 0, x: -30, duration: 0.35, ease: "power2.out" }, startTime);
tl.from("#row1 .dot", { scale: 0, duration: 0.2, ease: "back.out(2)" }, startTime);

// Row 2 (+0.6s)
tl.from("#row2", { opacity: 0, x: -30, duration: 0.35, ease: "power2.out" }, startTime + 0.6);
tl.from("#row2 .dot", { scale: 0, duration: 0.2, ease: "back.out(2)" }, startTime + 0.6);

// Row 3 (+1.2s)
tl.from("#row3", { opacity: 0, x: -30, duration: 0.35, ease: "power2.out" }, startTime + 1.2);
tl.from("#row3 .dot", { scale: 0, duration: 0.2, ease: "back.out(2)" }, startTime + 1.2);
```

---

## 7. Divider Line Width Reveal

```js
tl.from("#divider", { scaleX: 0, transformOrigin: "left center", duration: 0.3, ease: "power1.out" }, startTime);
```

---

## 8. Scale Pop (Icon or Brand)

```js
tl.from("#icon", { opacity: 0, scale: 0.7, duration: 0.5, ease: "power2.out" }, startTime);
tl.from("#brand", { opacity: 0, y: 30, duration: 0.4, ease: "power2.out" }, startTime + 0.6);

// Bouncier variant for CTA:
tl.from("#cta-icon", { opacity: 0, scale: 0.6, duration: 0.4, ease: "back.out(1.7)" }, startTime);
```

---

## 9. Tag / Badge Stagger

```js
tl.from(".badge", { opacity: 0, y: 20, duration: 0.3, stagger: 0.08, ease: "power1.out" }, startTime);
```

---

## 10. Full Scene Entrance (Headline + Everything Below)

```js
tl.from("#headline", { opacity: 0, y: 30, duration: 0.4, ease: "power2.out" }, sceneStart + 0.2);
tl.from("#subtitle", { opacity: 0, y: 15, duration: 0.3, ease: "power1.out" }, sceneStart + 0.7);
tl.from("#main-element", { opacity: 0, y: 20, duration: 0.4, ease: "power2.out" }, sceneStart + 1.2);
tl.from("#supporting", { opacity: 0, y: 15, duration: 0.3, stagger: 0.08, ease: "power1.out" }, sceneStart + 1.8);
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `from()` and `to()` on same element overlapping | Add `overwrite: "auto"` to the later tween |
| Counter not updating | Use `onUpdate`, not `onComplete` |
| Stagger too slow | `stagger: 0.08` for 3 items, `0.05` for 4+ |
| Ken Burns zooming text out of frame | Keep `transformOrigin: "center center"` |
| Breathing stops early | Calculate `repeat` dynamically: `Math.ceil(sceneDuration / cycleTime) - 1` |
