# ComfyUI Mobile — native iOS wrapper

A thin native iOS app that hosts the ComfyUI Mobile web app in a `WKWebView`.
You get a real home-screen app (App Store / TestFlight distributable) while the
UI stays the same web app in the repo root. The web files are bundled inside the
app, so the shell loads offline and — because the page origin is `file://`, not
`https://` — calls to an `http://` ComfyUI server aren't blocked as mixed
content.

This wrapper does **not** reimplement any features; it loads `Web/index.html`,
which is a copy of the repo-root web app.

## Requirements

- **Full Xcode** (not just Command Line Tools) — install from the Mac App Store.
- An Apple ID for signing (free tier works; apps installed on a device with a
  free account expire after 7 days and must be re-run from Xcode).

## Open and run

```bash
open ios/ComfyUIMobile.xcodeproj
```

1. Select a Simulator (or your connected iPhone) as the run destination.
2. For a physical device: in the **ComfyUIMobile** target → **Signing &
   Capabilities**, pick your Team (Xcode will auto-manage a signing profile).
   You may also need to change the bundle identifier
   (`net.comfyuimob.ComfyUIMobile`) to something unique to you.
3. Press **Run** (⌘R).

On first launch, iOS will prompt for **Local Network** access — allow it, or the
app can't reach a ComfyUI server on your LAN (a `192.168.x.x` address). Tailscale
addresses work too.

Then tap ⚙️ in the app and enter your ComfyUI address (e.g. your Tailscale
hostname `:8188`), exactly like the web app.

## Regenerating the Xcode project

The `.xcodeproj` is checked in, so you don't normally need this. It's generated
from `project.yml` with [XcodeGen](https://github.com/yonaskolb/XcodeGen):

```bash
brew install xcodegen
cd ios && xcodegen generate
```

## Keeping the bundled web app in sync

The app bundles a copy of the web files under `ComfyUIMobile/Web/`. After editing
the web app at the repo root, re-sync before building:

```bash
ios/sync-web.sh
```

## Loading the hosted app instead of the bundle

`AppConfig.swift` loads the bundled copy by default. To point the WebView at the
hosted GitHub Pages copy, change `webAppURL` to return `hostedWebAppURL`. Note a
hosted `https://` page talking to an `http://` ComfyUI will hit mixed-content
blocking — the bundled (`file://`) default avoids that.
