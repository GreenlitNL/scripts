// ==UserScript==
// @name         Plex: Enhanced Player (Video Crop, 5s Skip Forward & Backward, Speed Control)
// @namespace    https://github.com/GreenlitNL/scripts
// @version      6.0.0
// @description  All-in-one player enhancements for Plex Web: aspect ratio crop ('C' key), cinema black theater backdrop (no white bars), 5s skip forward & backward ('ArrowRight'/'ArrowLeft' + matching '5' icons), playback speed controls ('[' and ']'), and persistent dual-setting player status HUD ('I' key)
// @author       GreenlitNL
// @match        *://app.plex.tv/*
// @match        *://*.plex.tv/*
// @match        *://localhost:32400/web/*
// @match        *://127.0.0.1:32400/web/*
// @match        *://192.168.*:32400/web/*
// @match        *://10.*:32400/web/*
// @match        *://172.16.*:32400/web/*
// @match        *://*.plex.direct:32400/web/*
// @updateURL    https://raw.githubusercontent.com/GreenlitNL/scripts/main/plex-enhanced-player/plex-enhanced-player.user.js
// @downloadURL  https://raw.githubusercontent.com/GreenlitNL/scripts/main/plex-enhanced-player/plex-enhanced-player.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Singleton guard: ensures only one instance of the script runs if userscript manager re-injects
    if (document.documentElement.dataset.plexEnhancedPlayerActive) return;
    document.documentElement.dataset.plexEnhancedPlayerActive = 'true';

    /* ==========================================================================
       CONFIGURATION & CONSTANTS
       ========================================================================== */

    const SKIP_SECONDS = 5;
    const MIN_SKIP_INTERVAL_MS = 30;
    const OSD_DURATION_MS = 3000;
    const CYCLE_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

    // Crop presets (ratio = width / height, or 'fill' / 'default')
    const CROP_MODES = [
        { id: 'default', label: 'Original', subtitle: 'Original Aspect Ratio (No Crop)', badge: 'ORIGINAL', ratio: null },
        { id: '16:9', label: '16:9', subtitle: 'Standard Widescreen (1.78:1)', badge: '16:9', ratio: 16 / 9 },
        { id: '21:9', label: '21:9', subtitle: 'Ultrawide Cinema Display (2.37:1)', badge: '21:9', ratio: 64 / 27 },
        { id: '2.35:1', label: '2.35:1', subtitle: 'CinemaScope Anamorphic', badge: '2.35:1', ratio: 2.35 },
        { id: '2.39:1', label: '2.39:1', subtitle: 'Modern Theatrical Scope (Panavision)', badge: '2.39:1', ratio: 2.39 },
        { id: '1.85:1', label: '1.85:1', subtitle: 'US Theatrical Flat Widescreen', badge: '1.85:1', ratio: 1.85 },
        { id: '2.00:1', label: '2.00:1', subtitle: 'Univisium (Modern Streaming)', badge: '2.00:1', ratio: 2.0 },
        { id: '16:10', label: '16:10', subtitle: 'MacBook & Laptop Displays (1.60:1)', badge: '16:10', ratio: 16 / 10 },
        { id: '1.43:1', label: '1.43:1', subtitle: 'IMAX 70mm Full Frame', badge: 'IMAX', ratio: 1.43 },
        { id: 'fill', label: 'Fill Screen', subtitle: 'Stretch to Eliminate Bars', badge: 'FILL', ratio: null }
    ];

    // Geometric 5s Forward & Backward Skip Icons matching native Plex iconography
    const SKIP_FWD_5_SVG_INNER = `
        <path d="M39.25785 9L33.8788 3.62115L36 1.5L45 10.5L36 19.5L33.8788 17.3789L39.25785 12H9C7.34315 12 6 13.3431 6 15V33C6 34.6569 7.34315 36 9 36H21V39H9C5.68629 39 3 36.3137 3 33V15C3 11.6863 5.68629 9 9 9H39.25785Z" fill="currentColor"></path>
        <path d="M31 28H42V31H34V34.5H39C40.6569 34.5 42 35.8431 42 37.5V41C42 42.6569 40.6569 44 39 44H34C32.3431 44 31 42.6569 31 41V39H34V41H39V37.5H31V28Z" fill="currentColor"></path>
    `;

    const SKIP_BACK_5_SVG_INNER = `
        <path d="M8.74215 9L14.1212 3.62115L12 1.5L3 10.5L12 19.5L14.1212 17.3789L8.74215 12H39C40.6569 12 42 13.3431 42 15V33C42 34.6569 40.6569 36 39 36H27V39H39C42.3137 39 45 36.3137 45 33V15C45 11.6863 42.3137 9 39 9H8.74215Z" fill="currentColor"></path>
        <path d="M7 28H18V31H10V34.5H15C16.6569 34.5 18 35.8431 18 37.5V41C18 42.6569 16.6569 44 15 44H10C8.3431 44 7 42.6569 7 41V39H10V41H15V37.5H7V28Z" fill="currentColor"></path>
    `;

    const CROP_ICON_SVG = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
            <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path>
            <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path>
        </svg>
    `;

    const SPEED_ICON_SVG = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"></path>
            <path d="M12 12l3-3"></path>
            <path d="M6.5 12h.01"></path>
            <path d="M17.5 12h.01"></path>
            <path d="M12 6.5v.01"></path>
        </svg>
    `;

    /* ==========================================================================
       STATE MANAGEMENT
       ========================================================================== */

    let currentModeIndex = 0;       // Pointer to currently active preset in CROP_MODES
    let currentSpeed = 1.0;         // Target playback rate maintained across buffer underruns
    let actionOsdEl = null;         // Singleton DOM element for transient action toast HUD
    let actionOsdTimer = null;      // Auto-hide setTimeout handle for action toast
    let statusOsdEl = null;         // Singleton DOM element for persistent player status HUD
    let lastSkipTime = 0;           // Timestamp of last skip event for rate-limiting
    let domUpdateScheduled = false; // Flag to throttle DOM mutations via requestAnimationFrame

    /* ==========================================================================
       DOM & VIDEO DISCOVERY HELPERS
       ========================================================================== */

    // Finds the primary active video element (checks Plex player containers first)
    function getVideo() {
        const container = document.querySelector(
            '[class*="Player-videoContainer"], [class*="HTML5VideoPlayer"], [class*="Player-player"], [class*="VideoContainer"]'
        );
        if (container) {
            const v = container.querySelector('video');
            if (v && v.isConnected) return v;
        }
        const videos = Array.from(document.querySelectorAll('video')).filter(v => v.isConnected);
        if (!videos.length) return null;
        return videos.find(v => v.readyState >= 1 && !v.paused) || videos[videos.length - 1];
    }

    // Checks if video is in Plex's corner mini-player
    function isMiniPlayer(video) {
        return Boolean(video && video.closest('[class*="Player-miniPlayerContainer"]'));
    }

    // Resolves the layout container used for sizing and clipping bounds
    function getContainer(video) {
        if (!video) return null;
        return video.closest('[class*="Player-videoContainer"]') ||
               video.closest('[class*="HTML5VideoPlayer"]') ||
               video.closest('[class*="VideoContainer"]') ||
               video.closest('[class*="Player-player"]') ||
               video.parentElement ||
               document.body;
    }

    // Ignores hotkeys when typing in search, inputs, or sliders
    function shouldIgnoreKeyboardEvent(e) {
        const el = document.activeElement || e.target;
        if (!el) return false;
        const tag = (el.tagName || '').toLowerCase();
        const role = (el.getAttribute('role') || '').toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable ||
               role === 'slider' || role === 'textbox' || role === 'searchbox' || role === 'spinbutton';
    }

    /* ==========================================================================
       STYLESHEET (THEATER BLACK BACKDROP + UNIFIED OSD PILL)
       ========================================================================== */

    function ensureStyles() {
        if (document.getElementById('plex-enhanced-player-styles')) return;
        const style = document.createElement('style');
        style.id = 'plex-enhanced-player-styles';
        style.textContent = `
            /* Cinema black backdrop in theater mode (no white bars) */
            body:not(:has([class*="Player-miniPlayerContainer"])) :is(video, [class*="Player-videoContainer"], [class*="Player-player"]:not([class*="miniPlayer"]), [class*="HTML5VideoPlayer"]):not([class*="Controls"]):not([class*="controls"]):not([class*="BottomBar"]) {
                background: #000000 !important;
            }

            /* Unified Glassmorphic HUD OSD Pill */
            .plex-enhanced-osd {
                position: fixed;
                top: 75px;
                left: 50%;
                transform: translateX(-50%) translateY(-10px) scale(0.95);
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(18, 18, 22, 0.88);
                backdrop-filter: blur(18px) saturate(180%);
                -webkit-backdrop-filter: blur(18px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.14);
                box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55), 0 2px 10px rgba(0, 0, 0, 0.35);
                border-radius: 9999px;
                padding: 10px 20px;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                z-index: 2147483647;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease;
            }
            .plex-enhanced-osd.is-original {
                border-color: rgba(229, 160, 13, 0.45) !important;
                box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65), 0 0 24px rgba(229, 160, 13, 0.18) !important;
            }
            .plex-enhanced-osd.is-visible {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            .plex-enhanced-osd.is-pulse {
                animation: plex-osd-pulse 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            @keyframes plex-osd-pulse {
                0% { transform: translateX(-50%) translateY(0) scale(1); }
                50% { transform: translateX(-50%) translateY(0) scale(1.05); }
                100% { transform: translateX(-50%) translateY(0) scale(1); }
            }
            @keyframes plex-badge-pop {
                0% { transform: scale(1); }
                50% { transform: scale(1.18); }
                100% { transform: scale(1); }
            }
            .plex-osd-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                color: #e5a00d;
            }
            .plex-osd-content {
                display: flex;
                flex-direction: column;
                line-height: 1.25;
            }
            .plex-osd-title-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .plex-osd-title {
                font-size: 15px;
                font-weight: 700;
                letter-spacing: 0.2px;
                color: #ffffff;
            }
            .plex-osd-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: rgba(229, 160, 13, 0.12);
                color: #e5a00d;
                border: 1px solid rgba(229, 160, 13, 0.35);
                font-weight: 800;
                font-size: 10px;
                line-height: 1;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                padding: 3px 7px;
                border-radius: 6px;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                transition: all 0.2s ease;
            }
            .plex-osd-badge.is-original {
                background: linear-gradient(135deg, #e5a00d 0%, #cc8800 100%) !important;
                color: #000000 !important;
                border: 1px solid transparent !important;
                box-shadow: 0 2px 10px rgba(229, 160, 13, 0.45) !important;
            }
            .plex-osd-badge.is-updated {
                animation: plex-badge-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .plex-osd-subtitle {
                font-size: 12px;
                font-weight: 400;
                color: rgba(255, 255, 255, 0.7);
                margin-top: 2px;
            }

            /* Persistent dual-setting Status HUD (stays open until 'I' pressed again) */
            .plex-enhanced-osd.plex-status-osd {
                gap: 20px;
                padding: 10px 24px;
            }
            .plex-osd-section {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .plex-osd-divider {
                width: 1px;
                height: 32px;
                background: rgba(255, 255, 255, 0.16);
            }
        `;
        document.head.appendChild(style);
    }

    // Enforces black background on video ancestors to eliminate white/gray theater bars
    function ensureBlackBackground(video) {
        if (!video || isMiniPlayer(video)) return;
        try {
            video.style.setProperty('background', '#000000', 'important');
            let el = video.parentElement;
            let depth = 0;
            while (el && el !== document.body && depth < 8) {
                const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
                const tid = (el.getAttribute('data-testid') || '').toLowerCase();
                if (cls.includes('control') || cls.includes('bar') || tid.includes('control') || tid.includes('bar')) break;

                const hasControls = el.querySelector('[class*="BottomBar"], [class*="PlayerControls"], [data-testid="playerControlsContainer"]');
                el.style.setProperty('background', '#000000', 'important');
                if (hasControls) break;
                el = el.parentElement;
                depth++;
            }
        } catch (e) {}
    }

    /* ==========================================================================
       OSD HUD & STATUS DISPLAYS
       ========================================================================== */

    // Resolves fullscreen element or body for proper OSD layering
    function attachToOsdParent(el) {
        if (!el) return;
        const parent = document.fullscreenElement || document.webkitFullscreenElement || document.body;
        if (el.parentElement !== parent) parent.appendChild(el);
    }

    // Checks if the persistent status HUD is currently visible on screen
    function isStatusOsdVisible() {
        return Boolean(statusOsdEl && statusOsdEl.isConnected && statusOsdEl.classList.contains('is-visible'));
    }

    // Formats aspect ratio subtitle with source dimensions or mode description
    function getCropSubtitle(mode, video = getVideo()) {
        if (mode.id === 'default') {
            return (video && video.videoWidth && video.videoHeight)
                ? `✓ Original Source • ${video.videoWidth}×${video.videoHeight} (${(video.videoWidth / video.videoHeight).toFixed(2)}:1)`
                : '✓ Original Aspect Ratio (No Crop)';
        }
        return mode.subtitle || '';
    }

    // Formats playback speed subtitle description
    function getSpeedSubtitle(speed) {
        if (speed === 1) return '✓ Original Playback Speed (Normal)';
        return speed > 1 ? 'Faster Playback' : 'Slow Motion';
    }

    // Displays the transient action toast HUD (auto-dismisses after 3s, suppressed if status HUD is visible)
    function showActionOsd({ iconSvg, title, badge, subtitle, isOriginal }) {
        if (isStatusOsdVisible()) return;
        ensureStyles();

        if (!actionOsdEl || !actionOsdEl.isConnected) actionOsdEl = document.createElement('div');
        attachToOsdParent(actionOsdEl);

        actionOsdEl.className = `plex-enhanced-osd plex-action-osd${isOriginal ? ' is-original' : ''}`;
        actionOsdEl.innerHTML = `
            <div class="plex-osd-icon">${iconSvg}</div>
            <div class="plex-osd-content">
                <div class="plex-osd-title-row">
                    <span class="plex-osd-title">${title}</span>
                    <span class="plex-osd-badge${isOriginal ? ' is-original' : ''}">${badge}</span>
                </div>
                <div class="plex-osd-subtitle">${subtitle}</div>
            </div>
        `;

        actionOsdEl.classList.remove('is-pulse');
        void actionOsdEl.offsetWidth;
        actionOsdEl.classList.add('is-pulse', 'is-visible');

        clearTimeout(actionOsdTimer);
        actionOsdTimer = setTimeout(() => {
            if (actionOsdEl) actionOsdEl.classList.remove('is-visible');
        }, OSD_DURATION_MS);
    }

    // Updates the content of the persistent status HUD in real time
    function updateStatusOsdContent(changedSection = null) {
        if (!statusOsdEl) return;
        const cropMode = CROP_MODES[currentModeIndex];
        const isCropOrig = cropMode.id === 'default';
        const isSpeedOrig = currentSpeed === 1;
        const speedBadge = isSpeedOrig ? '1.0x ORIGINAL' : `${currentSpeed}x`;
        const cropUpdated = changedSection === 'crop' ? ' is-updated' : '';
        const speedUpdated = changedSection === 'speed' ? ' is-updated' : '';

        statusOsdEl.innerHTML = `
            <div class="plex-osd-section">
                <div class="plex-osd-icon">${CROP_ICON_SVG}</div>
                <div class="plex-osd-content">
                    <div class="plex-osd-title-row">
                        <span class="plex-osd-title">Aspect Ratio</span>
                        <span class="plex-osd-badge${isCropOrig ? ' is-original' : ''}${cropUpdated}">${cropMode.badge || cropMode.label}</span>
                    </div>
                    <div class="plex-osd-subtitle">${getCropSubtitle(cropMode)}</div>
                </div>
            </div>
            <div class="plex-osd-divider"></div>
            <div class="plex-osd-section">
                <div class="plex-osd-icon">${SPEED_ICON_SVG}</div>
                <div class="plex-osd-content">
                    <div class="plex-osd-title-row">
                        <span class="plex-osd-title">Playback Speed</span>
                        <span class="plex-osd-badge${isSpeedOrig ? ' is-original' : ''}${speedUpdated}">${speedBadge}</span>
                    </div>
                    <div class="plex-osd-subtitle">${getSpeedSubtitle(currentSpeed)}</div>
                </div>
            </div>
        `;
    }

    // Toggles the persistent Player Status HUD on or off ('I' hotkey)
    function toggleStatusOsd() {
        if (!getVideo()) return;
        ensureStyles();

        if (!statusOsdEl || !statusOsdEl.isConnected) {
            statusOsdEl = document.createElement('div');
            statusOsdEl.className = 'plex-enhanced-osd plex-status-osd';
        }
        attachToOsdParent(statusOsdEl);

        if (isStatusOsdVisible()) {
            statusOsdEl.classList.remove('is-visible');
        } else {
            if (actionOsdEl) {
                actionOsdEl.classList.remove('is-visible');
                clearTimeout(actionOsdTimer);
            }
            updateStatusOsdContent();
            statusOsdEl.classList.remove('is-pulse');
            void statusOsdEl.offsetWidth;
            statusOsdEl.classList.add('is-pulse', 'is-visible');
        }
    }

    /* ==========================================================================
       MODULE 1: VIDEO CROPPING & ASPECT RATIOS
       ========================================================================== */

    // Displays the HUD for current aspect ratio mode
    function showCropOsd(mode) {
        showActionOsd({
            iconSvg: CROP_ICON_SVG,
            title: 'Aspect Ratio',
            badge: mode.badge || mode.label,
            subtitle: getCropSubtitle(mode),
            isOriginal: mode.id === 'default'
        });
    }

    // Calculates zoom scale and clip-path insets to eliminate bars without overflowing controls
    function applyCrop(mode) {
        const video = getVideo();
        if (!video) return;

        ensureStyles();
        if (isMiniPlayer(video)) {
            video.style.transform = '';
            video.style.clipPath = '';
            video.style.objectFit = 'contain';
            return;
        }

        ensureBlackBackground(video);
        const container = getContainer(video);
        if (!container) return;

        // Reset to original unscaled state
        if (mode.id === 'default') {
            video.style.transform = '';
            video.style.clipPath = '';
            video.style.objectFit = 'contain';
            video.style.transition = 'transform 0.18s ease-out, clip-path 0.18s ease-out';
            if (container.dataset.plexOriginalOverflow !== undefined) {
                container.style.overflow = container.dataset.plexOriginalOverflow;
                delete container.dataset.plexOriginalOverflow;
            }
            if (video.parentElement && video.parentElement !== container) {
                video.parentElement.style.overflow = '';
            }
            return;
        }

        if (container.dataset.plexOriginalOverflow === undefined) {
            container.dataset.plexOriginalOverflow = container.style.overflow || '';
        }
        container.style.overflow = 'hidden';
        if (video.parentElement && video.parentElement !== container) {
            video.parentElement.style.overflow = 'hidden';
        }

        const cw = container.clientWidth || window.innerWidth;
        const ch = container.clientHeight || window.innerHeight;
        if (cw <= 0 || ch <= 0) return;

        const rc = cw / ch;
        const vw = video.videoWidth || 1920;
        const vh = video.videoHeight || 1080;
        const rv = vw / vh;

        const worig = (rv >= rc) ? cw : ch * rv;
        const horig = (rv >= rc) ? cw / rv : ch;
        const sOrig = worig / vw;

        let scale = 1, clipX = 0, clipY = 0;

        if (mode.id === 'fill') {
            scale = Math.max(cw / worig, ch / horig);
        } else if (typeof mode.ratio === 'number') {
            const rTarget = mode.ratio;
            const wCrop = (rTarget >= rv) ? vw : vh * rTarget;
            const hCrop = (rTarget >= rv) ? vw / rTarget : vh;
            const wDisp = (rTarget >= rc) ? cw : ch * rTarget;
            const hDisp = (rTarget >= rc) ? cw / rTarget : ch;

            scale = wDisp / (wCrop * sOrig);
            const wScaled = worig * scale;
            const hScaled = horig * scale;
            const mx = Math.max(0, (wScaled - wDisp) / 2);
            const my = Math.max(0, (hScaled - hDisp) / 2);

            if (wScaled > 0) clipX = (mx / wScaled) * 100;
            if (hScaled > 0) clipY = (my / hScaled) * 100;
        }

        video.style.transformOrigin = 'center center';
        video.style.transition = 'transform 0.18s ease-out, clip-path 0.18s ease-out';
        video.style.transform = `scale(${scale.toFixed(4)})`;
        video.style.clipPath = (clipX > 0.05 || clipY > 0.05)
            ? `inset(${clipY.toFixed(2)}% ${clipX.toFixed(2)}% ${clipY.toFixed(2)}% ${clipX.toFixed(2)}%)`
            : '';
    }

    // Applies crop mode by index and updates HUD
    function setCropMode(index, showToast = true) {
        currentModeIndex = ((index % CROP_MODES.length) + CROP_MODES.length) % CROP_MODES.length;
        const mode = CROP_MODES[currentModeIndex];
        applyCrop(mode);
        if (isStatusOsdVisible()) {
            updateStatusOsdContent('crop');
        } else if (showToast) {
            showCropOsd(mode);
        }
        console.log(`[Plex Enhanced Player] Aspect Ratio: ${mode.label} (${mode.subtitle})`);
    }

    // Cycles crop modes ('C' forward, 'Shift+C' backward)
    function cycleCrop(direction = 1, video = getVideo()) {
        if (!video || isMiniPlayer(video)) return;
        setCropMode(currentModeIndex + direction, true);
    }

    /* ==========================================================================
       MODULE 2: 5-SECOND SKIP FORWARD & BACKWARD (KEYBOARD & BUTTONS)
       ========================================================================== */

    // Seeks video by deltaSeconds (clamped to duration, debounced)
    function applyCustomSkip(source, deltaSeconds = SKIP_SECONDS, video = getVideo()) {
        const nowTs = Date.now();
        if (nowTs - lastSkipTime < MIN_SKIP_INTERVAL_MS) return;
        lastSkipTime = nowTs;

        if (!video || video.readyState < 1) return;

        const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
        const target = Math.max(0, Math.min(video.currentTime + deltaSeconds, duration));
        video.currentTime = target;
        console.log(`[Plex Enhanced Player] 5s skip ${deltaSeconds > 0 ? 'forward' : 'backward'} from ${source}. target=${target.toFixed(1)}s`);
    }

    // Patches native Plex skip button with 5s icon, localized tooltips, and click interceptor
    function patchSkipButton(btn, isForward) {
        const delta = isForward ? SKIP_SECONDS : -SKIP_SECONDS;
        const iconSvg = isForward ? SKIP_FWD_5_SVG_INNER : SKIP_BACK_5_SVG_INNER;
        const defaultText = isForward ? 'Forward 5s' : 'Backward 5s';
        const dutchText = isForward ? '5s vooruit' : '5s achteruit';

        ['aria-label', 'title'].forEach(attr => {
            const val = btn.getAttribute(attr);
            if (val && !val.includes('5')) {
                btn.setAttribute(attr, val.replace(/30|10/g, '5')
                    .replace(/forward/i, defaultText)
                    .replace(/backward|step back|skip back/i, defaultText)
                    .replace(/vooruit/i, dutchText)
                    .replace(/achteruit/i, dutchText));
            }
        });

        const svg = btn.querySelector('svg');
        if (svg && svg.dataset.plexIcon5 !== 'true') {
            svg.setAttribute('viewBox', '0 0 48 48');
            svg.setAttribute('fill', 'currentColor');
            svg.innerHTML = iconSvg;
            svg.dataset.plexIcon5 = 'true';
        }

        if (btn.dataset.plexSkip5Bound !== 'true') {
            btn.dataset.plexSkip5Bound = 'true';
            const prevent = e => { e.stopPropagation(); e.stopImmediatePropagation(); };
            btn.addEventListener('pointerdown', prevent, true);
            btn.addEventListener('mousedown', prevent, true);
            btn.addEventListener('click', e => {
                prevent(e);
                e.preventDefault();
                applyCustomSkip('button', delta);
            }, true);
        }
    }

    // Finds and patches all forward and backward skip buttons in the DOM
    function patchSkipButtons() {
        // Forward buttons (Plex uses skipForwardButton or generic forward labels)
        document.querySelectorAll(
            'button[data-testid*="forward"], button[aria-label*="forward" i], button[aria-label*="vooruit" i], button[title*="forward" i]'
        ).forEach(btn => patchSkipButton(btn, true));

        // Backward buttons (Plex uses skipBackButton or generic backward labels)
        document.querySelectorAll(
            'button[data-testid*="skipBack" i], button[data-testid*="backward" i], button[aria-label*="achteruit" i], button[title*="achteruit" i], button[aria-label*="skip back" i], button[aria-label*="step back" i], button[title*="skip back" i], button[title*="step back" i]'
        ).forEach(btn => patchSkipButton(btn, false));
    }

    /* ==========================================================================
       MODULE 3: PLAYBACK SPEED CONTROL (BUFFER-SAFE)
       ========================================================================== */

    // Displays the HUD for current playback speed
    function showSpeedOsd(speed) {
        showActionOsd({
            iconSvg: SPEED_ICON_SVG,
            title: 'Playback Speed',
            badge: speed === 1 ? '1.0x ORIGINAL' : `${speed}x`,
            subtitle: getSpeedSubtitle(speed),
            isOriginal: speed === 1
        });
    }

    // Sets video playbackRate and updates HUD
    function setVideoSpeed(speed, video = getVideo()) {
        currentSpeed = speed;
        if (video && video.readyState >= 2) {
            try { video.playbackRate = currentSpeed; } catch (e) {}
        }
        if (isStatusOsdVisible()) {
            updateStatusOsdContent('speed');
        } else {
            showSpeedOsd(speed);
        }
        console.log(`[Plex Enhanced Player] Playback speed: ${speed}x`);
    }

    // Keeps playbackRate locked to currentSpeed across Plex quality switches & buffering
    function syncVideoSpeed() {
        if (currentSpeed === 1.0) return;
        const v = getVideo();
        if (v && v.readyState >= 3 && !v.paused && !v.seeking && v.playbackRate !== currentSpeed) {
            try { v.playbackRate = currentSpeed; } catch (e) {}
        }
    }

    // Returns next speed preset from CYCLE_SPEEDS
    function getNextCycleSpeed(direction, speed) {
        if (direction === 'slowdown') {
            return CYCLE_SPEEDS.findLast(s => s < speed) ?? CYCLE_SPEEDS[0];
        }
        return CYCLE_SPEEDS.find(s => s > speed) ?? CYCLE_SPEEDS[CYCLE_SPEEDS.length - 1];
    }

    // Cycles playback speed ('[' slower, ']' faster)
    function cycleSpeed(direction, video = getVideo()) {
        if (!video) return;
        setVideoSpeed(getNextCycleSpeed(direction, currentSpeed), video);
    }

    /* ==========================================================================
       KEYBOARD SHORTCUTS HANDLER
       ========================================================================== */

    // Keyboard shortcuts handler ('C' crop, arrows 5s skip, '[' / ']' speed)
    function handleKeyDown(e) {
        if (shouldIgnoreKeyboardEvent(e)) return;
        if (e.altKey || e.ctrlKey || e.metaKey) return;

        const v = getVideo();
        if (!v) return;

        const key = e.key;
        const code = e.code;

        // 'I' : Toggle persistent Player Status HUD (Aspect Ratio & Playback Speed)
        if (key === 'i' || key === 'I' || code === 'KeyI') {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            toggleStatusOsd();
            return;
        }

        // 'C' / 'Shift+C' : Cycle aspect ratio crop modes
        if (key === 'c' || key === 'C' || code === 'KeyC') {
            if (isMiniPlayer(v)) return;
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            cycleCrop(e.shiftKey ? -1 : 1, v);
            return;
        }

        // 'ArrowRight' : 5s Skip forward
        if ((key === 'ArrowRight' || code === 'ArrowRight') && !e.shiftKey) {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            applyCustomSkip('keyboard', SKIP_SECONDS, v);
            return;
        }

        // 'ArrowLeft' : 5s Skip backward
        if ((key === 'ArrowLeft' || code === 'ArrowLeft') && !e.shiftKey) {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            applyCustomSkip('keyboard', -SKIP_SECONDS, v);
            return;
        }

        // '[' : Slower
        if ((key === '[' || code === 'BracketLeft') && !e.shiftKey) {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            cycleSpeed('slowdown', v);
            return;
        }

        // ']' : Faster
        if ((key === ']' || code === 'BracketRight') && !e.shiftKey) {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            cycleSpeed('speedup', v);
        }
    }

    /* ==========================================================================
       DOM MUTATION & LIFECYCLE SCHEDULER
       ========================================================================== */

    // Throttled DOM update loop to keep buttons and theater backdrop patched
    function handleDomUpdate() {
        if (domUpdateScheduled) return;
        domUpdateScheduled = true;

        requestAnimationFrame(() => {
            domUpdateScheduled = false;
            try {
                patchSkipButtons();

                const v = getVideo();
                if (v && !isMiniPlayer(v)) ensureBlackBackground(v);
            } catch (err) {}
        });
    }

    /* ==========================================================================
       EVENT LISTENERS & OBSERVERS INITIALIZATION
       ========================================================================== */

    // Capturing keydown listener to preempt native Plex hotkey handlers
    document.addEventListener('keydown', handleKeyDown, true);

    // Re-calculates and re-applies crop transformation whenever viewport size changes
    const reapplyCrop = () => {
        const v = getVideo();
        if (v && !isMiniPlayer(v)) {
            ensureBlackBackground(v);
            if (currentModeIndex !== 0) applyCrop(CROP_MODES[currentModeIndex]);
            if (isStatusOsdVisible()) updateStatusOsdContent();
        }
    };

    window.addEventListener('resize', reapplyCrop);
    document.addEventListener('fullscreenchange', () => {
        setTimeout(() => {
            reapplyCrop();
            attachToOsdParent(statusOsdEl);
            attachToOsdParent(actionOsdEl);
        }, 100);
    });
    document.addEventListener('loadedmetadata', e => {
        if (e.target && e.target.tagName === 'VIDEO') setTimeout(reapplyCrop, 150);
    }, true);
    document.addEventListener('play', e => {
        if (e.target && e.target.tagName === 'VIDEO') {
            reapplyCrop();
            syncVideoSpeed();
        }
    }, true);

    // MutationObserver watches for Plex SPA page navigations and control-bar re-renders
    new MutationObserver(handleDomUpdate).observe(document.documentElement, { childList: true, subtree: true });
    // Periodic fallback to guarantee playback speed stays locked
    setInterval(syncVideoSpeed, 1500);

    // Initial run on script injection
    handleDomUpdate();

    console.log('[Plex Enhanced Player] Script v6.0 loaded.');
})();
