# Local PWA Testing Instructions

1. Start a local HTTP server in your `theme-builder/` directory (PWA won't work with `file://`).
    - With python3:  
      `python3 -m http.server 8000`
    - Or use `npx serve` or `live-server` as you prefer.

2. Open `http://localhost:8000/` in Chrome, Edge, or any PWA-capable browser.

3. You should see:
    - "Install App" button bar at the bottom (if not already installed)
    - Can install to home screen/device/app drawer
    - Offline support (try working with no internet after first page load)
    - Fullscreen and splash screen on mobile
    - Custom icons, theme color, and native look

4. To update cache version:
    - Change `CACHE_NAME` in `service-worker.js` and reload page.

5. To check offline:  
    - Load once, disconnect internet, refresh — app remains functional.