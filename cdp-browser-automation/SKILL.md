---
name: cdp-browser-automation
description: "Automate Chromium-based browsers (Brave, Chrome, Edge) via Chrome DevTools Protocol (CDP) — raw WebSocket JSON-RPC, not Puppeteer/Playwright. Profile copy, page interaction, network interception, screenshots, and video download."
tags: []
related_skills: []
---

# CDP Browser Automation

Test and control browsers through the Chrome DevTools Protocol — the **real** WebSocket protocol, not the macOS Accessibility API fallback.

## Critical Distinction: CDP vs Apple Events

This is the most common confusion. Both let you run JS in a browser tab. They are **not the same protocol**.

| | CDP (Chrome DevTools Protocol) | Apple Events / AX |
|---|---|---|
| **Transport** | WebSocket (`ws://127.0.0.1:9222/...`) | macOS Accessibility API |
| **How to enable** | `--remote-debugging-port=N` flag | "Allow JavaScript from Apple Events" in Develop menu |
| **Required flag** | `--remote-debugging-port=N` | None (always available on macOS) |
| **What you get** | Full CDP: Network, DOM, Input, Page, Runtime, Console, Debugger, etc. | Just `execute_javascript` |
| **Cua Driver mapping** | `insert_text`, `type_keystrokes` need CDP; `execute_javascript` goes through Apple Events | `execute_javascript` |
| **Network capture** | ✅ `Network.enable` captures all requests | ❌ Not available |
| **Screenshots** | ✅ `Page.captureScreenshot` | ❌ Not available |
| **Keyboard input** | ✅ `Input.dispatchKeyEvent` | ❌ Not available |
| **DOM tree** | ✅ `DOM.getDocument`, `DOM.querySelector` | ❌ Not available |

**Bottom line:** If the user says "test CDP" or "use CDP", you must launch the browser with `--remote-debugging-port`. `execute_javascript` alone (through Cua Driver's `page` tool) is **not** CDP — it's the macOS Accessibility bridge.

## When to Use

- User asks to **test** CDP specifically
- User wants to **capture network requests** from a browser tab
- User wants to **debug a browser automation failure** (missing element, failed navigation, network errors)
- User wants to **take screenshots** programmatically via CDP
- User needs to **intercept or block** specific network requests
- User is confused about CDP vs Apple Events and needs clarification

## Setup

### 1. Launch the browser with CDP enabled

Chrome and Brave **refuse** `--remote-debugging-port` on the default user data directory. You MUST use a custom profile path:

```bash
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/brave-cdp-test" \
  --no-first-run \
  --new-window "https://example.com"
```

Use `terminal(background=true)` for the browser process, then run health checks in follow-up terminal calls.

For Chrome:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/chrome-cdp-test" \
  --no-first-run
```

### 2. Verify the port

```bash
curl -s http://127.0.0.1:9222/json/version
```

Expected response includes `"Protocol-Version": "1.3"` and a `webSocketDebuggerUrl`.

### 3. List existing page targets

```bash
curl -s http://127.0.0.1:9222/json/list
```

### 4. Create a new page target (to a specific URL)

```bash
curl -s -X PUT "http://127.0.0.1:9222/json/new?url=https://gemini.google.com/app?hl=ar"
```

Returns the page's `id` and `webSocketDebuggerUrl`.

## Client Libraries

Python with `websockets` is the preferred CDP client on this setup:

```bash
pip3 install websockets  # if not already installed
```

Node.js with `ws` module is an alternative:

```bash
npm install -g ws         # install globally
```

## Key CDP Commands

All commands are JSON-RPC messages sent over the page's WebSocket.

### Enable domains (subscribe to events)

```python
await send(ws, "Page.enable")
await send(ws, "Runtime.enable")
await send(ws, "Network.enable")
await send(ws, "Console.enable")
await send(ws, "DOM.enable")
await send(ws, "Input.enable")
```

### Run JavaScript in page context

```python
r = await send(ws, "Runtime.evaluate", {
    "expression": "JSON.stringify({title: document.title, url: location.href})",
    "returnByValue": True
})
val = json.loads(r["result"]["result"]["value"])
```

### Navigate to a URL

```python
r = await send(ws, "Page.navigate", {"url": "https://example.com"})
```

### Take a screenshot

```python
r = await send(ws, "Page.captureScreenshot", {"format": "png"})
with open("/path/to/output.png", "wb") as f:
    f.write(base64.b64decode(r["result"]["data"]))
```

### Send keyboard input

```python
# Single character
await send(ws, "Input.dispatchKeyEvent", {
    "type": "rawKeyDown",
    "windowsVirtualKeyCode": 13,
    "key": "Enter",
    "code": "Enter"
})
await send(ws, "Input.dispatchKeyEvent", {
    "type": "keyUp",
    "windowsVirtualKeyCode": 13,
    "key": "Enter",
    "code": "Enter"
})
```

**Pitfall:** `Input.dispatchKeyEvent` characters often don't register in rich text editors (Quill, ProseMirror, ContentEditable). These editors need DOM focus management.

**Three approaches for Quill/rich-text editors, in order of reliability:**

1. **`document.execCommand('insertText')`** (most reliable for contenteditable — confirmed working on Gemini Omni): Focus the editor via JS, then call `execCommand`:
   ```python
   r = await send(ws, "Runtime.evaluate", {
       "expression": """
       var ed = document.querySelector('.ql-editor');
       ed.focus();
       var sel = window.getSelection();
       var range = document.createRange();
       range.setStart(ed, 0);
       sel.removeAllRanges();
       sel.addRange(range);
       document.execCommand('insertText', false, 'your text here');
       ed.classList.remove('ql-blank');
       ed.dispatchEvent(new Event('input', {bubbles: true}));
       """,
       "returnByValue": True
   })
   ```

2. **`textContent` + dispatch events** — Works on some editors. Set the text content directly and dispatch input/change events.

3. **`innerHTML` is blocked by TrustedHTML** — Sites like Gemini use TrustedHTML CSP which throws `TypeError: Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML' assignment`. Do NOT use `innerHTML` on TrustedHTML-protected sites. Use `execCommand` instead.

### Query the DOM

```python
r = await send(ws, "DOM.getDocument")
root = r["result"]["root"]
print(root["nodeId"], root["childNodeCount"])
```

### Find and click elements

```python
r = await send(ws, "Runtime.evaluate", {
    "expression": """document.querySelector('a.selector').click()""",
    "returnByValue": True
})
```

## Creating and Attaching Page Targets Programmatically

### Method 1: HTTP API (simplest)

```python
import urllib.request, json
resp = urllib.request.urlopen("http://127.0.0.1:9222/json/new?url=" + urllib.parse.quote(URL))
page_info = json.loads(resp.read())
page_ws = page_info["webSocketDebuggerUrl"]
```

### Method 2: CDP `Target.createTarget` (via browser WebSocket)

1. Connect to the **browser** WebSocket URL (from `/json/version`)
2. Send `Target.createTarget` with `url` and optional `width`/`height`
3. Send `Target.attachToTarget` with `flatten: True` to get a `sessionId`
4. Send commands via `Target.sendMessageToTarget` with the `sessionId`

## Authenticated CDP Access (Launching with the Real Profile)

**⚠️ Selective file copy is broken on modern Brave/macOS 26.4+:** copying only `Cookies`, `Login Data`, `Local State`, etc. does NOT preserve auth. The `os_crypt.encrypted_key` in `Local State` is empty — modern Brave/Chrome stores the encryption key solely in the macOS Keychain. Without it, cookie decryption fails and all sites require re-login. Do not waste time on the selective-copy approach.

**Two approaches — only the first is reliable:**

### Approach A (the ONLY reliable approach): Launch directly on the real profile

Kill any existing Brave, then launch with `--remote-debugging-port` using the **real** profile (default location):

```bash
# Kill existing Brave
pkill -f "Brave Browser" 2>/dev/null; sleep 2

# Launch with remote debugging on the real profile
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  --remote-debugging-port=9222 \
  --no-first-run \
  --new-window "https://gemini.google.com/app?hl=ar"
```

This opens the user's **real** browser with full auth. Auth survives because the Keychain lookup succeeds from the real profile path. The session persists across invocations — as long as the browser stays open, CDP can reconnect without re-auth.

**Warning:** `pkill -f "Brave Browser"` may kill the wrong instance if the user has other Brave windows open. Prefer finding the exact PID of the CDP session and using `kill <PID>` instead.

### Approach B (unreliable — copy full profile directory, auth likely lost)

If Approach A is not viable, copying even the full `Default/` directory still fails to preserve auth on macOS 26.4+ because the macOS Keychain binding is tied to the original profile path:

```bash
# 1. Kill the browser first
pkill -f "Brave Browser" 2>/dev/null; sleep 2

# 2. Copy the entire Default directory
rm -rf /tmp/brave-cdp-real
mkdir -p /tmp/brave-cdp-real
cp ~/Library/Application\ Support/BraveSoftware/Brave-Browser/Local\ State /tmp/brave-cdp-real/
cp -R ~/Library/Application\ Support/BraveSoftware/Brave-Browser/Default /tmp/brave-cdp-real/

# 3. Launch with the copied profile (WILL LIKELY LOSE AUTH)
terminal(background=True, command=""""/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/brave-cdp-real" \
  --no-first-run \
  --new-window "https://gemini.google.com/app"
""")
```

The full copy includes Session Storage, Service Workers, and other state files. **However, the Keychain issue still applies** — the encryption key is bound to the original profile path. Auth will likely be lost. Only use this if Approach A is literally impossible, and expect to handle re-login.

**Brave profile path:** `~/Library/Application Support/BraveSoftware/Brave-Browser/`
**Chrome profile path:** `~/Library/Application Support/Google/Chrome/`
**Edge profile path:** `~/Library/Application Support/Microsoft Edge/`

## Downloading Videos/Files via CDP

If the browser has a `<video>` element loaded, use the page's authenticated fetch context:

```python
dl_js = '''
(async function() {
  var v = document.querySelector('video');
  if (!v || !v.currentSrc) return 'no video';
  var resp = await fetch(v.currentSrc, {credentials: 'include'});
  var blob = await resp.blob();
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'video.mp4';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded ' + blob.size + ' bytes';
})()
'''
r = await send(ws, "Runtime.evaluate", {"expression": dl_js, "returnByValue": True, "awaitPromise": True})
```

Note: CORS may block fetch on cross-origin video CDNs. Fallback: click the native download button via `Runtime.evaluate` + `.click()`.

## Attaching Images / File Uploads via CDP

File upload is a CDP superpower — you can set a file on a hidden `<input type="file">` without triggering the native OS file picker. Useful for uploading images to Gemini, ChatGPT, social media, design tools, etc.

### Method 1: `DOM.setFileInputFiles` (most reliable)

Find the file input element (even if hidden), get its `nodeId`, and set files directly:

```python
# Step 1: Find the file input element
r = await send(ws, "Runtime.evaluate", {
    "expression": """
(function() {
  // Common selectors for file upload inputs
  var input = document.querySelector('input[type="file"]');
  if (!input) return JSON.stringify({found: false});
  var rect = input.getBoundingClientRect();
  return JSON.stringify({
    found: true,
    tagName: input.tagName,
    accept: input.getAttribute('accept'),
    hidden: rect.width === 0 || rect.height === 0,
    id: input.id,
    className: input.className?.substring(0, 60)
  });
})()
""",
    "returnByValue": True
})

# Step 2: Get the element's DOM nodeId
r = await send(ws, "DOM.querySelector", {
    "nodeId": 1,  # document nodeId from DOM.getDocument
    "selector": "input[type=\"file\"]"
})
file_node_id = r["result"]["nodeId"]

# Step 3: Set the file (absolute path on disk)
await send(ws, "DOM.setFileInputFiles", {
    "nodeId": file_node_id,
    "files": ["/absolute/path/to/image.png"]
})
```

If the app uses a styled button that triggers a hidden input, click the button first, then set the file:

```python
# Click upload button
await send(ws, "Runtime.evaluate", {
    "expression": "document.querySelector('.upload-button').click()",
    "returnByValue": True
})
await asyncio.sleep(0.5)

# Now the hidden input should be ready — set the file
r = await send(ws, "DOM.querySelector", {
    "nodeId": 1,
    "selector": "input[type=\"file\"]"
})
if r["result"].get("nodeId"):
    await send(ws, "DOM.setFileInputFiles", {
        "nodeId": r["result"]["nodeId"],
        "files": ["/absolute/path/to/image.png"]
    })
```

### Method 2: Clipboard paste (for contenteditable/rich editors)

For editors that support paste (Quill, ProseMirror, Gemini, etc.), put the image on the clipboard and dispatch a paste event:

```python
# Fetch image, put on clipboard, then paste
paste_js = '''
(async function() {
  var resp = await fetch('/absolute/path/to/image.png');
  var blob = await resp.blob();
  await navigator.clipboard.write([
    new ClipboardItem({[blob.type]: blob})
  ]);
  // Now paste into the focused editor
  document.execCommand('paste');
  return 'pasted';
})()
'''
```

But for local files, this needs a file → blob conversion first. A cleaner approach uses a FileReader:

```python
paste_js = '''
(async function() {
  // Convert local file to blob via fetch (if served by the page's origin)
  // OR use a data URL embedded in the script
  var resp = await fetch('data:image/png;base64,iVBOR...);  // inline your base64
  var blob = await resp.blob();
  await navigator.clipboard.write([
    new ClipboardItem({[blob.type]: blob})
  ]);
  // Focus the editor and paste
  document.querySelector('.ql-editor')?.focus();
  document.execCommand('paste');
  return 'done';
})()
'''
```

### Method 3: File Reader + drag-and-drop dataTransfer

For apps that accept drag-and-drop rather than file inputs or clipboard:

```python
drop_js = '''
(function() {
  var target = document.querySelector('.drop-zone');
  if (!target) return 'no drop zone';
  var dt = new DataTransfer();
  var file = new File(['...'], 'image.png', {type: 'image/png'});
  dt.items.add(file);
  target.dispatchEvent(new DragEvent('drop', {bubbles: true, dataTransfer: dt}));
  return 'dropped';
})()
'''
```

⚠️ **Pitfall:** Many Angular/SPA dropzones (Gemini's `xap-uploader-dropzone`) call `preventDefault()` on programmatic drops — the event's `prevented` field is `true` and the file is silently discarded. Do not rely on this for SPA uploads.

### Method 4: Intercepting dynamic file inputs (for SPAs with no static file input in the DOM)

Some apps (Gemini, Google Photos, Angular sites) create a **dynamic `<input type="file">`** and call `.click()` on it when you press "Upload". They do NOT expose one in the static DOM — which is why `DOM.setFileInputFiles` finds nothing. `showOpenFilePicker` (File System Access API) is NOT typically the mechanism; the hidden input + `.click()` is.

**The fix:** Create your own hidden `<input type="file">` (e.g. `#_cdp_hid_up`), inject the file via `DOM.setFileInputFiles`, then monkey-patch `HTMLInputElement.prototype.click` to intercept Gemini's dynamically-created input and copy the file over. Use **real CDP mouse events** (`Input.dispatchMouseEvent`) for the button clicks.

**Why this works:** Gemini's Angular upload directive creates a fresh `<input type=file>`, sets it as a property of `HTMLInputElement.prototype`, and calls `.click()` on it. The `HTMLInputElement.prototype.click` override intercepts this — instead of opening the OS file picker, it copies the file from our hidden input and dispatches a `change` event. Angular picks this up and renders the attachment preview.

**Key principles:**
- `Input.dispatchMouseEvent` is essential. `Runtime.evaluate` + `.click()` dispatches a synthetic event — Angular's zone.js treats it as untrusted and its overlays won't respond.
- Patch `HTMLInputElement.prototype.click` — this is the primary intercept point. Optionally patch `showOpenFilePicker` too as a safety net.
- `DOM.setFileInputFiles` on a pre-created hidden input (`#_cdp_hid_up`) is the file source. The hidden input holds the file; the interceptor copies it to Gemini's dynamic input.
- Wait **1.5s** after clicking the menu button for the Angular overlay to render, then **3s** after clicking "Upload files" for Gemini's pipeline to process.
- Verify via `blob:` URL images and attachment class elements (`blobImgs >= 1`, `fileChips >= 1`).
- For **dual upload**: replace the file in `#_cdp_hid_up` via a fresh `DOM.setFileInputFiles`, re-install the interceptor (the previous one captured the first file's reference), and repeat the upload sequence. On success: `blobImgs >= 2, fileChips >= 2`.

See `references/gemini-file-upload-2026-07-13.md` for the worked example with exact CDP commands.

### Finding the file input

Many modern apps hide the `<input type="file">` and use a styled button instead. To find it:

```python
r = await send(ws, "Runtime.evaluate", {
    "expression": """
document.querySelectorAll('input[type="file"]').length
""",
    "returnByValue": True
})
print("file inputs:", r["result"]["result"]["value"])
```

If count is 0, the input may be dynamically created when the upload button is clicked. Click it first, then search.

### Pitfalls

- **File paths must be absolute** — `DOM.setFileInputFiles` requires absolute paths on disk. Relative paths will silently fail.
- **The browser process must have filesystem access** — files under `/tmp/` or your home directory work. Sandboxed files (e.g., inside app bundles) may not.
- **`DOM.querySelector` needs `nodeId`** — You need `DOM.getDocument` first to get the root `nodeId` (usually 1), then you can query from it.
- **Hidden inputs work fine** — `DOM.setFileInputFiles` works on `display:none` and `visibility:hidden` inputs.
- **Some apps reset the file input after each upload** — You may need to re-query and set the file each time.
- **Clipboard paste needs user gesture in newer browsers** — but CDP bypasses this since it runs in the privileged DevTools context. **However**, `navigator.clipboard.write()` still requires `document.hasFocus() === true`. Call `Page.bringToFront` + `Input.dispatchMouseEvent` (click on the page) before clipboard operations to grant focus.
- **`Input.dispatchKeyEvent` (Cmd+V) does not trigger paste in Quill editors** — Quill intercepts the `paste` event at the DOM level, and CDP's synthetic key events don't produce the trusted ClipboardEvent Quill expects. Use `navigator.clipboard.write()` + `document.execCommand('insertText')` for text, or the `showOpenFilePicker` patch for image uploads.
- **`Runtime.evaluate` + `.click()` may not work on Angular/CDK overlay menus** — Angular's `OverlayModule` uses `cdk-overlay` and trusted-event checks. Use `Input.dispatchMouseEvent` instead by computing the element's bounding rect and dispatching real mouse events at those coordinates.

## Network Interception

Block specific URLs:

```python
await send(ws, "Network.setBlockedURLs", {"urls": ["*google-analytics*", "*doubleclick*"]})
```

Capture response bodies:

```python
# Network.responseReceived events contain requestId
# Use Network.getResponseBody to read the body
await send(ws, "Network.getResponseBody", {"requestId": "<requestId>"})
```

## Pitfalls

- **Fresh profile = no auth.** The `--user-data-dir` serves a clean browser profile. Sites like Gemini, Gmail, etc. won't have your session.
- **Selective profile copy does NOT preserve auth on modern macOS.** Brave/Chrome stores the encryption key solely in the macOS Keychain — `os_crypt.encrypted_key` in `Local State` is empty when copied to a different path. Cookies cannot be decrypted. Use Approach A (launch with the real profile) instead of selective file copy.
- **Full profile copy (Default/) is also unreliable on modern macOS.** The Keychain issue applies regardless of which files you copy. Prefer Approach A.
- **Quill/rich-text editors** often reject `Input.dispatchKeyEvent` text. The editor needs DOM focus first, then the keystrokes. Try `focus()` via JS first, or use the editor's own API if accessible.
- **CORS on downloads.** Fetching blob/video URLs via JS from a different origin (`contribution.usercontent.google.com` vs `gemini.google.com`) triggers CORS. Use the `<video>` tag's `src` attribute directly, or click the native download button.
- **Page targets disappear** when the tab is closed. Re-create via `/json/new` or `Target.createTarget`.
- **`enable_javascript_apple_events` requires a restart** (it patches the browser's prefs file and relaunches). The new process may not come back automatically — you may need to `launch_app` after the restart.
- **Python 3.9 vs 3.11:** The system Python (3.9) and the Hermes venv Python (3.11) are different. Install `websockets` for the version you're running.

## Verification

After running a CDP test, confirm:
1. ✅ WebSocket connection to the page target succeeded
2. ✅ `Runtime.evaluate` returns results from the page
3. ✅ At least one domain produces events (Network, Page, Console)
4. ✅ `Page.captureScreenshot` produces a valid PNG
5. ✅ The test differentiates CDP from Apple Events — no accidental AX fallback
