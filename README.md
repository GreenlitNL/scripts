# Userscripts

A curated collection of custom Tampermonkey userscripts for personal web browsing enhancements, productivity, and automation.

---

## Available Scripts

### 1. Plex: Enhanced Player
> **File:** [`plex-enhanced-player.user.js`](./plex-enhanced-player.user.js)  
> **Install URL:** [Install via Tampermonkey](https://raw.githubusercontent.com/GreenlitNL/scripts/main/plex-enhanced-player.user.js)  
> **Dev Loader:** [`plex-enhanced-player.dev.user.js`](./plex-enhanced-player.dev.user.js)

All-in-one player enhancements for Plex Web (`app.plex.tv` and local Plex Web servers):

* **Aspect Ratio Crop (`C` key):** Cycle through crop presets (16:9, 21:9, 2.35:1, Fill, Original) to remove letterboxing/pillarboxing.
* **Cinema Black Theater Backdrop:** Ensures pitch-black pillarbox/letterbox bars with no grey/white flashes.
* **5-Second Skip (`ArrowLeft` / `ArrowRight`):** Precise 5-second skips with custom on-screen 5s indicator badges.
* **Playback Speed Controls (`[` and `]`):** Fine-grained speed increments from 0.5x to 2.0x.
* **Player HUD / OSD (`I` key):** Persistent toggleable on-screen display for video status, aspect ratio, and speed.

---

### 2. Todoist: Enhanced
> **File:** [`todoist-enhanced.user.js`](./todoist-enhanced.user.js)  
> **Install URL:** [Install via Tampermonkey](https://raw.githubusercontent.com/GreenlitNL/scripts/main/todoist-enhanced.user.js)  
> **Dev Loader:** [`todoist-enhanced.dev.user.js`](./todoist-enhanced.dev.user.js)

Consolidated productivity enhancements for Todoist Web (`app.todoist.com`):

* **Time-Based Day Planning Headings:** Automatically groups and labels sections as **Ochtend**, **Middag**, **Avond**, **Hele dag**, or **Wachten** based on task times and keywords on planning filters (`taken`, `habits`, `routines`).
* **Quick Wins Size Headings:** Dynamically renames section headers in the Quick Wins filter according to task size and priority tags (**XS**, **S**, **M**, **L**, **XL**, **Wachten**).
* **Auto-Default Due Date to "Vandaag":** When opening the new task editor on designated filter pages (`taken`, `habits`, `routines`, `quick-wins`, `vandaag-persoonlijk`, `vandaag-post-nl`), automatically selects "Vandaag" if no due date is currently set.
* **High-Efficiency Single Engine:** Replaces multiple independent observers and intervals with a unified SPA router and a single debounced DOM observer.

---

## Installation & Automatic Updates

### Standard Installation
1. Install [Tampermonkey](https://www.tampermonkey.net/) in Google Chrome.
2. Click the install link for whichever script you want above.
3. Tampermonkey will recognize the script and prompt you to click **Install**.

### Automatic Updates
Every script in this repository includes `@updateURL` and `@downloadURL` headers pointing to GitHub. Tampermonkey checks for updates automatically according to your Tampermonkey settings (or when you manually click **Check for script updates** in the dashboard).

To release an update:
1. Update the code in the script file.
2. Bump the `@version` number in the metadata header (e.g. `1.0.0` -> `1.1.0`).
3. Commit and push to `main`.

---

## Local Development Workflow (Instant Refresh)

Instead of committing and pushing to GitHub just to test a single code change:

1. Open Chrome and navigate to `chrome://extensions`.
2. Locate **Tampermonkey** and click **Details**.
3. Toggle ON **"Allow access to file URLs"**.
4. (Chrome MV3) Ensure **Developer mode** is enabled in `chrome://extensions` (toggle in the top-right corner).
5. In Tampermonkey, install the corresponding dev loader stub:
   * For Plex: [`plex-enhanced-player.dev.user.js`](./plex-enhanced-player.dev.user.js)
   * For Todoist: [`todoist-enhanced.dev.user.js`](./todoist-enhanced.dev.user.js)
6. Now you can edit the `.user.js` files on disk in your editor, save, and simply refresh the browser tab. Your changes will take effect immediately.
