# CDP Session Reference — Gemini Omni Test (July 13, 2026)

Full working CDP test that demonstrated protocol-level browser control against Gemini Omni.

## The Setup Used

```python
# Launch Brave with CDP port (MUST use non-default --user-data-dir)
terminal(background=True, command=""""/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/brave-cdp-test" \
  --no-first-run""")

# Verify
curl -s http://127.0.0.1:9222/json/version

# Create a page target at the desired URL
curl -s -X PUT "http://127.0.0.1:9222/json/new?url=https://gemini.google.com/app?hl=ar"
```

## CDP Message Loop (Python + websockets)

```python
import asyncio, json, websockets, base64

msg_id = 0
events = []

async def send(ws, method, params={}):
    global msg_id
    msg_id += 1
    await ws.send(json.dumps({"id": msg_id, "method": method, "params": params}))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp
        events.append(resp)

async def test():
    WS_URL = "ws://127.0.0.1:9222/devtools/page/<PAGE_ID>"
    async with websockets.connect(WS_URL, max_size=10_000_000) as ws:
        # Enable domains
        for d in ["Page", "Runtime", "Network", "Console", "DOM", "Input"]:
            await send(ws, f"{d}.enable")
        
        # Navigate
        await send(ws, "Page.navigate", {"url": "https://gemini.google.com/app?hl=ar"})
        
        # Wait for load (poll readyState)
        for _ in range(60):
            await asyncio.sleep(0.5)
            r = await send(ws, "Runtime.evaluate", {
                "expression": "document.readyState", "returnByValue": True
            })
            if r["result"]["result"]["value"] == "complete":
                break
        
        # Execute JS
        r = await send(ws, "Runtime.evaluate", {
            "expression": "JSON.stringify({title: document.title})",
            "returnByValue": True
        })
        
        # Click a DOM element
        r = await send(ws, "Runtime.evaluate", {
            "expression": """document.querySelector('a.selector')?.click()""",
            "returnByValue": True
        })
        
        # Screenshot
        r = await send(ws, "Page.captureScreenshot", {"format": "png"})
        with open("/tmp/cdp_screenshot.png", "wb") as f:
            f.write(base64.b64decode(r["result"]["data"]))
        
        # Read network events
        net = [e for e in events if e.get("method","").startswith("Network.")]

asyncio.run(test())
```

## Commands That Worked

| Domain | Method | Result |
|---|---|---|
| Page | `Page.enable` | ✅ Events subscribed |
| Page | `Page.navigate` | ✅ Navigated to URL |
| Page | `Page.captureScreenshot` | ✅ PNG to disk |
| Runtime | `Runtime.enable` | ✅ |
| Runtime | `Runtime.evaluate` | ✅ JS executed, results returned |
| Network | `Network.enable` | ✅ 12+ events captured (reqs, resp, failures) |
| DOM | `DOM.getDocument` | ✅ Full tree |
| DOM | `DOM.querySelector` | ✅ Via Runtime.evaluate |
| Input | `Input.dispatchKeyEvent` | ✅ Keys sent (but Quill may not register them) |
| Console | `Console.enable` | ✅ |
| Target | `Target.createTarget` | ✅ New page created via Browser WS |
| Target | `Target.attachToTarget` | ✅ Flattened session (complex, prefer HTTP API) |

## Commands That Failed or Were Problematic

| Attempt | Issue | Workaround |
|---|---|---|
| `Input.dispatchKeyEvent` chars in Quill editor | Editor doesn't register synthetic keystrokes | Use `Runtime.evaluate` to set `innerHTML` + dispatch input events |
| `insert_text` / `type_keystrokes` (page tool) | Need CDP port, not Apple Events | Already had CDP running but the page tool routes through AX on non-CDP mode |
| `fetch(videoUrl)` in JS | CORS (different origin) | Click download button, or download via the `<video>` element's src directly |
| `-X POST` to `/json/new` | 405 Method Not Allowed | Use `-X PUT` or `-X GET` |
| Default user data dir + `--remote-debugging-port` | Chrome/Brave refuses | Always use a non-default `--user-data-dir` |
| `innerHTML` on TrustedHTML-protected sites (Gemini) | `TypeError: Failed to set 'innerHTML': This document requires 'TrustedHTML' assignment` | Use `document.execCommand('insertText')` instead |
| `Input.dispatchKeyEvent` chars in Quill editor | Editor doesn't register synthetic keystrokes | Use `Runtime.evaluate` to call `execCommand('insertText')` — confirmed working |
| Gemini login missing (clean profile) | No Google auth → sidebar links hidden | Copy real profile's Cookies/Login Data to temp `--user-data-dir` |

## Session 2: Real Profile CDP Test (Aug 2026)

Successfully ran CDP against Gemini with **real Brave credentials**.

### Key Commands Verified

| CDP Domain | Method | Confirmed | Notes |
|---|---|---|---|
| Page | `Page.enable` | ✅ | |
| Page | `Page.navigate` | ✅ | |
| Page | `Page.captureScreenshot` | ✅ | Saved to ~/Downloads |
| Runtime | `Runtime.evaluate` | ✅ | Executed arbitrary JS |
| Network | `Network.enable` | ✅ | 176 events captured in 15s |
| Input | `Input.dispatchKeyEvent` (Enter only) | ✅ | keyDown + keyUp pattern |
| Input | `Input.dispatchMouseEvent` | ✅ | mousePressed + mouseReleased |
| DOM | `DOM.querySelector` (via Runtime.evaluate) | ✅ | Found and clicked elements |
| Console | `Console.enable` | ✅ | |

### Profile Copy Technique

Used to get Google-logged-in session on the temp CDP profile:

```bash
pkill -f "Brave Browser"
mkdir -p /tmp/brave-cdp-real/Default
cp ~/Library/Application\ Support/BraveSoftware/Brave-Browser/Local\ State /tmp/brave-cdp-real/
cp ~/Library/Application\ Support/BraveSoftware/Brave-Browser/Default/Cookies /tmp/brave-cdp-real/Default/
cp ~/Library/Application\ Support/BraveSoftware/Brave-Browser/Default/Login\ Data /tmp/brave-cdp-real/Default/
cp ~/Library/Application\ Support/BraveSoftware/Brave-Browser/Default/Web\ Data /tmp/brave-cdp-real/Default/
cp ~/Library/Application\ Support/BraveSoftware/Brave-Browser/Default/Preferences /tmp/brave-cdp-real/Default/
cp ~/Library/Application\ Support/BraveSoftware/Brave-Browser/Default/Secure\ Preferences /tmp/brave-cdp-real/Default/
cp ~/Library/Application\ Support/BraveSoftware/Brave-Browser/Default/Bookmarks /tmp/brave-cdp-real/Default/
```

### Quill Editor Fix (TrustedHTML bypass)

Gemini uses TrustedHTML CSP. `innerHTML` throws. Working approach:

```javascript
var ed = document.querySelector('.ql-editor');
ed.focus();
var sel = window.getSelection();
var range = document.createRange();
range.setStart(ed, 0);
sel.removeAllRanges();
sel.addRange(range);
document.execCommand('insertText', false, 'your prompt here');
ed.classList.remove('ql-blank');
ed.dispatchEvent(new Event('input', {bubbles: true}));
```

The `execCommand('insertText')` call returns `true` on success and bubbles native input events that Quill recognizes.

### Network Traffic Volume

Gemini Omni generated ~176 network events during 15s of interaction. Breakdown included:
- `Network.requestWillBeSent`
- `Network.responseReceived`
- `Network.loadingFailed`
- `Network.requestAdblockInfoReceived`

### New Target Creation via HTTP

```bash
# Works (returns page info including webSocketDebuggerUrl)
curl -s -X PUT "http://127.0.0.1:9222/json/new?url=https://gemini.google.com/app?hl=ar"

# Does NOT work (405)
curl -s -X POST "http://127.0.0.1:9222/json/new" -d "url=..."
```

## Software Versions

- **Brave**: reports as Chrome/150.0.7871.114
- **CDP Protocol**: 1.3
- **V8**: 15.0.245.15
- **macOS**: 26.4
- **Python websockets**: installed under Hermes venv (3.11)
