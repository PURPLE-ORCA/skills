# Gemini File Upload via HTMLInputElement Interceptor — July 13, 2026 (Revised)

## Problem

Gemini's Angular UI (Arabic interface) creates a **dynamic `<input type="file">`** and calls `.click()` on it when you press "Upload files". It does NOT expose one in the static DOM — the input is created fresh each time by Angular's file picker directive. It does NOT use `window.showOpenFilePicker()` (File System Access API) — this was the original mistaken diagnosis. The correct intercept point is `HTMLInputElement.prototype.click`.

## Failed approaches (do not retry)

| Approach | Result | Root cause |
|---|---|---|
| `DOM.setFileInputFiles` | No file inputs in static DOM | Gemini creates the input dynamically on click via `.click()`, not as a static DOM element |
| Synthetic drop event on `xap-uploader-dropzone` | `prevented: true` | Angular calls `preventDefault()` on programmatic drops |
| `navigator.clipboard.write()` + `execCommand('paste')` | `Clipboard: Document is not focused` | CDP `Runtime.evaluate` runs in privileged context but document lacks focus; `Page.bringToFront` + `Input.dispatchMouseEvent` fixes focus but Quill's paste still rejects synthetic ClipboardEvents |
| `Input.dispatchKeyEvent` Cmd+V | No paste | Quill intercepts paste at DOM level; CDP synthetic key events don't produce trusted ClipboardEvent |
| `Runtime.evaluate` + `.click()` on menu buttons | Menu doesn't open | Angular's `cdk-overlay` treats synthetic clicks as untrusted |

## Working approach (proven July 13, 2026)

### Step 1: Create hidden input, set file, patch .click()

Run this **before** clicking any upload button:

```python
# Step 1a: Create a hidden file input via Runtime.evaluate
await send(ws, "Runtime.evaluate", {
    "expression": """
        var o=document.getElementById('_cdp_hid_up');if(o)o.remove();
        var e=document.createElement('input');e.type='file';e.id='_cdp_hid_up';
        e.accept='image/*';e.style.display='none';document.body.appendChild(e);
    """,
    "returnByValue": True
})

# Step 1b: Get the DOM nodeId and set the file
doc = await send(ws, "DOM.getDocument")
q = await send(ws, "DOM.querySelector", {
    "nodeId": doc["result"]["root"]["nodeId"],
    "selector": "#_cdp_hid_up"
})
nid = q["result"]["nodeId"]
await send(ws, "DOM.setFileInputFiles", {
    "nodeId": nid,
    "files": ["/absolute/path/to/start_keyframe.png"]
})

# Step 1c: Install interceptors (both for safety)
await send(ws, "Runtime.evaluate", {
    "expression": """
    (function(){
        var hid = document.getElementById('_cdp_hid_up');
        
        window.showOpenFilePicker = function(opts) {
            return Promise.resolve([{
                name: hid.files[0].name, kind: 'file',
                getFile: async function() { return hid.files[0]; }
            }]);
        };
        
        var origClick = HTMLInputElement.prototype.click;
        HTMLInputElement.prototype.click = function() {
            if (this.type === 'file' && this !== hid && this.id !== '_cdp_hid_up') {
                var dt = new DataTransfer();
                if (hid && hid.files.length > 0) dt.items.add(hid.files[0]);
                Object.defineProperty(this, 'files', {writable:true, configurable:true, value:dt.files});
                this.dispatchEvent(new Event('change', {bubbles:true}));
                return;
            }
            return origClick.apply(this, arguments);
        };
    })();
    """,
    "returnByValue": True
})
```

**Why this works:** Gemini's Angular upload directive creates a fresh `<input type=file>`, sets it as a property of `HTMLInputElement.prototype`, and calls `.click()` on it. The `HTMLInputElement.prototype.click` override intercepts this. Instead of opening the OS file picker, it copies the file from our hidden input and dispatches a `change` event. Angular picks this up and renders the attachment preview.

### Step 2: Click the upload button via `Input.dispatchMouseEvent`

Get the button position via `Runtime.evaluate` then click via CDP `Input.dispatchMouseEvent`:

```python
# Get position
r = await send(ws, "Runtime.evaluate", {
    "expression": "var b = document.querySelector('button[aria-label=\"التحميل والأدوات\"]'); JSON.stringify({x: Math.round(b.getBoundingClientRect().left + b.getBoundingClientRect().width/2), y: Math.round(b.getBoundingClientRect().top + b.getBoundingClientRect().height/2)})",
    "returnByValue": True
})
pos = json.loads(r["result"]["result"]["value"])

# Click using CDP Input domain
await send(ws, "Input.dispatchMouseEvent", {"type": "mousePressed", "x": pos['x'], "y": pos['y'], "button": "left", "clickCount": 1})
await asyncio.sleep(0.05)
await send(ws, "Input.dispatchMouseEvent", {"type": "mouseReleased", "x": pos['x'], "y": pos['y'], "button": "left", "clickCount": 1})
await asyncio.sleep(1.5)
```

### Step 3: Click "Upload Files" in the menu

```python
r = await send(ws, "Runtime.evaluate", {
    "expression": """(function() {
    var pane = document.querySelector('.cdk-overlay-pane');
    if (!pane) return JSON.stringify({err: 'no pane'});
    var btns = pane.querySelectorAll('button');
    for (var b of btns) {
        if ((b.textContent || '').trim() === 'تحميل ملفات') {
            var rect = b.getBoundingClientRect();
            return JSON.stringify({x: Math.round(rect.left + rect.width/2), y: Math.round(rect.top + rect.height/2)});
        }
    }
})()""",
    "returnByValue": True
})
pos2 = json.loads(r["result"]["result"]["value"])
await send(ws, "Input.dispatchMouseEvent", {"type": "mousePressed", "x": pos2['x'], "y": pos2['y'], "button": "left", "clickCount": 1})
await asyncio.sleep(0.05)
await send(ws, "Input.dispatchMouseEvent", {"type": "mouseReleased", "x": pos2['x'], "y": pos2['y'], "button": "left", "clickCount": 1})
await asyncio.sleep(3)
```

### Step 4: Verify

```python
r = await send(ws, "Runtime.evaluate", {
    "expression": "JSON.stringify({blobImgs: document.querySelectorAll('img[src^=\"blob:\"]').length, attachmentEls: document.querySelectorAll('[class*=\"attachment\"]').length})",
    "returnByValue": True
})
```

Successful upload: `blobImgs >= 1` and `attachmentEls >= 1`.

### Gemini UI Structure (Arabic, July 2026)

| Element | Selector / text |
|---|---|
| Upload button | `button[aria-label="التحميل والأدوات"]` |
| Upload Files menu item | `button` with text `"تحميل ملفات"` |
| Menu overlay | `.cdk-overlay-pane` |
| File picker button | `button[data-test-id="local-images-files-uploader-button"]` |
| Model selector | Shows "Flash" by default |
| Aspect ratio | "أفقي (16:9)" — Landscape 16:9 |
| Prompt editor | `.ql-editor` (Quill single-line) |
| Submit button | `button[aria-label="إرسال رسالة"]` |
| Attachment preview | `.file-preview-chip` > `gem-media-attachment` |
| Drop zone (rejects drops) | `.xap-uploader-dropzone` |

### Quill editor prompt insertion

```python
r = await send(ws, "Runtime.evaluate", {
    "expression": """
    var ed = document.querySelector('.ql-editor');
    ed.focus();
    var sel = window.getSelection();
    var range = document.createRange();
    range.setStart(ed, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('insertText', false, 'YOUR_PROMPT');
    ed.classList.remove('ql-blank');
    ed.dispatchEvent(new Event('input', {bubbles: true}));
    """,
    "returnByValue": True
})
```

### Video generation monitoring

Poll every 5s checking `<video>` element presence. Generation typically takes 60–90s for an 8s clip. The resulting video URL is on Google's CDN (e.g. `https://contribution.usercontent.google.com/download?c=...`).
