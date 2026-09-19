# Userscripts

Personal collection of custom Tampermonkey userscripts for web enhancements and productivity.

---

## ⚡ Quick Install

| Script | Target | Direct Install | Dev Loader |
| :--- | :--- | :--- | :--- |
| **Plex: Enhanced Player** | Plex Web (`app.plex.tv`, local servers) | [Install Script ➔](https://raw.githubusercontent.com/GreenlitNL/scripts/main/plex-enhanced-player/plex-enhanced-player.user.js) | [`plex-enhanced-player.dev.user.js`](./plex-enhanced-player/plex-enhanced-player.dev.user.js) |
| **Todoist: Enhanced** | Todoist Web (`app.todoist.com`) | [Install Script ➔](https://raw.githubusercontent.com/GreenlitNL/scripts/main/todoist-enhanced/todoist-enhanced.user.js) | [`todoist-enhanced.dev.user.js`](./todoist-enhanced/todoist-enhanced.dev.user.js) |

*Clicking an **Install Script** link above will automatically open Tampermonkey's installation dialog in Chrome.*

---

## 📖 Scripts Overview

### 1. Plex: Enhanced Player
Adds missing player controls, custom aspect-ratio cropping, 5-second skips, and an on-screen display (OSD) HUD.

| Shortcut | Action |
| :--- | :--- |
| <kbd>C</kbd> | Cycle aspect ratio crop presets (16:9, 21:9, 2.35:1, Fill, Original) |
| <kbd>→</kbd> / <kbd>←</kbd> | Jump forward / backward by **5 seconds** (with on-screen badge) |
| <kbd>[</kbd> / <kbd>]</kbd> | Decrease / increase playback speed (0.5x – 2.0x) |
| <kbd>I</kbd> | Toggle persistent player status HUD (crop mode, speed, status) |

*Also enforces a true cinema-black theater backdrop to eliminate white/grey letterbox flashes.*

---

### 2. Todoist: Enhanced
All-in-one productivity enhancements combining modular day-planning section classification, quick-wins sizing, automatic default due dates, and a complete Daily Main Goal focus system.

* **Module 1 — Day Planning Headings:** Groups sections into **Ochtend**, **Middag**, **Avond**, **Hele dag**, and **Wachten** based on task times and keywords on planning filters (`taken`, `habits`, `routines`).
* **Module 2 — Quick Wins Size Headings:** Dynamically labels sections according to task size and priority tags (**XS**, **S**, **M**, **L**, **XL**, **Wachten**) on the Quick Wins page.
* **Module 3 — Auto-Default "Vandaag":** Automatically sets the due date to "Vandaag" when opening the task editor on planning and filter views if no date is set.
* **Module 4 — Daily Main Goal & Streaks:**
  * **Hero Focus Card:** Prominently pinned at the top of the Today view (`/app/today`) and day-planning views. Displays today's primary focus, completion checkbox, and active streak.
  * **One-Click Task Selection:** Hover over any task in Todoist and click the Lucide Target icon to set it as today's single main goal (enforces the Rule of One).
  * **Task Highlighting:** The active daily goal task is styled with an accent border and "Hoofddoel" badge across any view.
  * **Auto-Completion & Tracking:** Checking off the task in Todoist automatically marks the daily goal as complete, increments your streak, and logs history in persistent storage.
  * **History & Streaks Modal (<kbd>Shift</kbd> + <kbd>G</kbd>):** Displays current streak, best streak, 30-day activity square grid, chronological history, and JSON export.
* **Unified Engine:** Single debounced DOM observer and SPA router that prevents performance overhead with zero external dependencies and native Lucide SVG iconography.

---

## 💻 Local Development Setup (Instant Reload)

Test local changes instantly in your browser without committing or waiting for GitHub caches:

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Details** on **Tampermonkey** and switch ON **"Allow access to file URLs"**.
4. In Tampermonkey dashboard, create a new script and paste the contents of the matching `.dev.user.js` file:
   * [`plex-enhanced-player.dev.user.js`](./plex-enhanced-player/plex-enhanced-player.dev.user.js)
   * [`todoist-enhanced.dev.user.js`](./todoist-enhanced/todoist-enhanced.dev.user.js)
5. Save. Any edits you make to the `.user.js` file in your editor will now take effect immediately upon browser refresh (`Cmd + R`).

---

## 🔄 Releasing Updates

All scripts use `@updateURL` and `@downloadURL` pointing to this repository.

1. Make your code changes in `*.user.js`.
2. Bump `@version` in the userscript header (e.g. `1.0.0` → `1.1.0`).
3. Commit and push to `main`.
4. Tampermonkey will automatically detect and install the update for users.
