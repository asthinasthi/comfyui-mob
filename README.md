# ComfyUI Mobile

A tiny, dependency-free web app for driving your ComfyUI instance from your iPhone over
Tailscale. It's a static site (`index.html` / `style.css` / `app.js`) — no build step,
no backend of its own. It just calls ComfyUI's existing HTTP API directly from the phone's
browser.

It shows a simplified form (prompt, negative prompt, size, steps, cfg, sampler, seed,
checkpoint) built from a workflow you export from ComfyUI, and a gallery of results. Anything
the auto-detection can't map to a field is still editable as raw JSON under "Advanced".

It also installs as a PWA (Add to Home Screen), and there's an optional native iOS
wrapper in [`ios/`](ios/) that hosts this same web app in a `WKWebView` — see
[ios/README.md](ios/README.md).

**Limitation:** the auto-detected fields assume a standard single-`KSampler` txt2img graph
(`CheckpointLoaderSimple` → `CLIPTextEncode` ×2 → `KSampler`/`KSamplerAdvanced` →
`EmptyLatentImage` → `VAEDecode` → `SaveImage`). More exotic workflows (img2img, ControlNet,
multiple samplers, LoRA stacks) will still load and generate, but you'll likely need to edit
the raw JSON for anything beyond what's auto-detected.

## 1. Enable CORS on ComfyUI

This app is served from a different port than ComfyUI, so the browser treats calls to the
ComfyUI API as cross-origin. Start ComfyUI with:

```bash
python main.py --enable-cors-header
```

Add that flag to whatever script/shortcut you normally use to launch ComfyUI (`run_nvidia_gpu.bat`,
a shell alias, etc.) so it's always on.

## 2. Serve this folder on your PC

Any static file server works. From this directory:

```bash
python3 -m http.server 8189
```

Pick a port that isn't ComfyUI's (default `8188`). Keep this running alongside ComfyUI — e.g.
in its own terminal tab, `tmux`/`screen` session, or as a background service, so it survives
you closing the terminal.

## 3. Reach it over Tailscale

Find your PC's Tailscale hostname (`tailscale status`, or the MagicDNS name shown in the
Tailscale admin console — looks like `my-pc.tailXXXX.ts.net`). On your iPhone (with Tailscale
connected), open Safari to:

```
http://my-pc.tailXXXX.ts.net:8189
```

## 4. Add to Home Screen

In Safari: Share button → **Add to Home Screen**. This gives you a full-screen app icon with
no browser chrome.

## 5. Point the app at ComfyUI

Open the app, tap the ⚙️ gear, and enter ComfyUI's address, e.g.:

```
http://my-pc.tailXXXX.ts.net:8188
```

Tap **Test connection**. If it fails, double check step 1 (CORS flag) and that the port is
right.

## 6. Import a workflow

In ComfyUI on your PC:

1. Settings → enable **Dev mode**.
2. Build/load the workflow you want (a simple txt2img graph works best, see the limitation
   above).
3. Menu → **Export (API Format)** → save the `.json`.

Get that file onto your iPhone (AirDrop to the phone, or save into iCloud Drive/Files) and use
**Import…** in the app to pick it. You can import several and switch between them from the
Workflow dropdown; they're stored in the browser (`localStorage`), not on any server.

## Notes

- Generated images open in a lightbox with an "Open full size" link — long-press the image
  there to Save to Photos (iOS won't let a web page silently write to your camera roll).
- Random seed is on by default; untick it to reuse/set a specific seed.
- Nothing here modifies ComfyUI itself — it's a pure API client. If you outgrow the
  auto-detected fields, use the raw JSON editor under Advanced.
