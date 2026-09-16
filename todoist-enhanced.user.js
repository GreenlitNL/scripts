// ==UserScript==
// @name         Todoist: Enhanced (Day Planning, Quick Wins & Auto-Today)
// @namespace    https://github.com/GreenlitNL/scripts
// @version      1.0.0
// @description  All-in-one productivity enhancements for Todoist: Time-based section headings (Ochtend/Middag/Avond/Wachten), Quick Wins size headings (XS-XL), and automatic 'Vandaag' default date when opening task editor on designated filter pages.
// @author       GreenlitNL
// @match        https://app.todoist.com/*
// @updateURL    https://raw.githubusercontent.com/GreenlitNL/scripts/main/todoist-enhanced.user.js
// @downloadURL  https://raw.githubusercontent.com/GreenlitNL/scripts/main/todoist-enhanced.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Singleton guard: ensures only one instance of the script runs
    if (document.documentElement.dataset.todoistEnhancedActive) return;
    document.documentElement.dataset.todoistEnhancedActive = 'true';

    /* ==========================================================================
       CONFIGURATION & TARGET PATHS
       ========================================================================== */

    // Feature 1: Time-based day planning headings
    const DAY_PLANNING_PATHS = [
        '/app/filter/taken-2339790468',
        '/app/filter/habits-2368797274',
        '/app/filter/routines-2368800307'
    ];

    // Feature 2: Quick Wins label/size headings
    const QUICK_WINS_SLUG = '/quick-wins-2368845556';

    // Feature 3: Filter pages where opening task editor defaults due date to 'Vandaag'
    const AUTO_TODAY_PATHS = new Set([
        '/app/filter/taken-2339790468',
        '/app/filter/habits-2368797274',
        '/app/filter/routines-2368800307',
        '/app/filter/quick-wins-2368845556',
        '/app/filter/vandaag-persoonlijk-2328932541',
        '/app/filter/vandaag-post-nl-2325666375'
    ]);

    const CUSTOM_HEADER_ATTR = 'data-sid-custom-section-header';
    const ORIGINAL_HEADER_ATTR = 'data-sid-original-header-hidden';

    const MORNING_END_MINUTES = 12 * 60;   // 12:00
    const AFTERNOON_END_MINUTES = 18 * 60; // 18:00

    const DEBUG = false;
    function log(...args) {
        if (DEBUG) console.log('[Todoist: Enhanced]', ...args);
    }

    function normalize(text) {
        return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function isVisible(el) {
        return !!(el && el.offsetParent !== null);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function nextFrame() {
        return new Promise(resolve => requestAnimationFrame(resolve));
    }

    /* ==========================================================================
       FEATURE 1: DAY PLANNING TIME-BASED SECTION HEADINGS
       ========================================================================== */

    function isDayPlanningPage() {
        return DAY_PLANNING_PATHS.some(path => location.pathname.startsWith(path));
    }

    function cleanupDayPlanningHeaders() {
        document.querySelectorAll(`[${CUSTOM_HEADER_ATTR}="true"]`).forEach(el => el.remove());
        document.querySelectorAll(`[${ORIGINAL_HEADER_ATTR}="true"]`).forEach(el => {
            el.removeAttribute(ORIGINAL_HEADER_ATTR);
            el.style.display = '';
        });
    }

    function getDayPlanningSections() {
        return Array.from(document.querySelectorAll('main section.section')).filter(section => {
            if (!isVisible(section)) return false;
            const label = normalize(section.getAttribute('aria-label') || '');
            const text = normalize(section.textContent || '');

            return text.includes('vandaag') &&
                /(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)/.test(text) &&
                !!label;
        });
    }

    function getSectionText(section) {
        const listHolder = section.querySelector('.list_holder');
        return normalize(listHolder ? listHolder.textContent : section.textContent);
    }

    function parseTimeString(raw) {
        if (!raw) return null;
        const text = String(raw);
        const match = text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
        if (!match) return null;
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        return (hours * 60) + minutes;
    }

    function collectTimesFromSection(section) {
        const times = new Set();
        const selectors = [
            'time',
            '[datetime]',
            '[aria-label]',
            '[title]',
            '[data-testid]',
            '[class]'
        ];

        selectors.forEach(selector => {
            section.querySelectorAll(selector).forEach(el => {
                const candidates = [
                    el.textContent,
                    el.getAttribute('datetime'),
                    el.getAttribute('aria-label'),
                    el.getAttribute('title'),
                    el.getAttribute('data-testid'),
                    el.className
                ];

                candidates.forEach(value => {
                    const parsed = parseTimeString(value || '');
                    if (parsed !== null) times.add(parsed);
                });
            });
        });

        return Array.from(times).sort((a, b) => a - b);
    }

    function classifyDayPlanningSection(section) {
        const text = getSectionText(section);

        if (text.includes('wachten')) return 'Wachten';
        if (text.includes('ochtend')) return 'Ochtend';
        if (text.includes('middag')) return 'Middag';
        if (text.includes('avond')) return 'Avond';

        const times = collectTimesFromSection(section);

        if (!times.length) return 'Hele dag';
        if (times.every(t => t < MORNING_END_MINUTES)) return 'Ochtend';
        if (times.every(t => t >= MORNING_END_MINUTES && t < AFTERNOON_END_MINUTES)) return 'Middag';
        if (times.every(t => t >= AFTERNOON_END_MINUTES)) return 'Avond';

        return 'Hele dag';
    }

    function buildNativeHeader(title, referenceHeader) {
        const header = document.createElement('header');
        header.setAttribute(CUSTOM_HEADER_ATTR, 'true');

        if (referenceHeader) {
            referenceHeader.classList.forEach(cls => {
                if (cls) header.classList.add(cls);
            });
        }

        const overflow = document.createElement('div');
        overflow.className = 'section_head__overflow_actions';

        const content = document.createElement('div');
        content.className = 'section_header_content _19abae45 a7c6de33 _194d8611 _8ad6a17c _9e8363f8 bfa58fdf';

        const h2 = document.createElement('h2');
        const inner = document.createElement('div');
        inner.className = '_19abae45 a7c6de33 _194d8611 _1e964f8a';

        const span = document.createElement('span');
        span.textContent = title;

        inner.appendChild(span);
        h2.appendChild(inner);
        content.appendChild(h2);

        header.appendChild(overflow);
        header.appendChild(content);

        return header;
    }

    function renderDayPlanningHeaders() {
        if (!isDayPlanningPage()) {
            cleanupDayPlanningHeaders();
            return;
        }

        const sections = getDayPlanningSections();
        if (!sections.length) return;

        sections.forEach(section => {
            const originalHeader = section.querySelector(':scope > header:not([' + CUSTOM_HEADER_ATTR + '])');
            if (!originalHeader) return;

            const existingCustom = section.querySelector(`:scope > header[${CUSTOM_HEADER_ATTR}="true"]`);
            const title = classifyDayPlanningSection(section);

            if (existingCustom) {
                const span = existingCustom.querySelector('h2 span');
                if (span && span.textContent === title) return;
                existingCustom.remove();
            }

            const customHeader = buildNativeHeader(title, originalHeader);
            section.insertBefore(customHeader, originalHeader);
            originalHeader.setAttribute(ORIGINAL_HEADER_ATTR, 'true');
            originalHeader.style.display = 'none';
        });
    }

    /* ==========================================================================
       FEATURE 2: QUICK WINS SECTION HEADINGS (SIZE / PRIORITY)
       ========================================================================== */

    function isQuickWinsPage() {
        return location.pathname.includes(QUICK_WINS_SLUG) || location.href.includes(QUICK_WINS_SLUG);
    }

    function getQuickWinsSections() {
        return Array.from(document.querySelectorAll('main section')).filter(section => {
            if (!isVisible(section)) return false;
            return !!section.querySelector('header h2');
        });
    }

    function classifyQuickWinsSection(section) {
        const listHolder = section.querySelector('.list_holder');
        const source = listHolder || section;
        const text = normalize(source.textContent || '');

        if (text.includes('wachten') || text.includes('⏳')) return 'Wachten';
        if (text.includes('xs') || text.includes('🟢')) return 'XS';
        if (text.includes('xl') || text.includes('🔴')) return 'XL';
        if (text.includes('🟠 l') || text.includes('@🟠 l') || text.includes(' l ')) return 'L';
        if (text.includes('🟡 m') || text.includes('@🟡 m') || text.includes(' m ')) return 'M';
        if (text.includes('🔵 s') || text.includes('@🔵 s') || text.includes(' s ')) return 'S';

        return null;
    }

    function setQuickWinsHeaderText(section, newTitle) {
        const header = section.querySelector('header');
        if (!header) return;

        const target =
            header.querySelector('h2 span') ||
            header.querySelector('h2 div') ||
            header.querySelector('h2');

        if (!target) return;
        if (target.textContent === newTitle) return;

        target.textContent = newTitle;
    }

    function renderQuickWinsHeaders() {
        if (!isQuickWinsPage()) return;

        const sections = getQuickWinsSections();
        if (!sections.length) return;

        sections.forEach(section => {
            const title = classifyQuickWinsSection(section);
            if (!title) return;
            setQuickWinsHeaderText(section, title);
        });
    }

    /* ==========================================================================
       FEATURE 3: AUTO-SET TODAY ('VANDAAG') ON TASK EDITOR OPEN
       ========================================================================== */

    let isApplyingDate = false;
    let lastHandledEditor = null;

    function isAutoTodayPage() {
        return AUTO_TODAY_PATHS.has(location.pathname);
    }

    function getTaskEditor() {
        return document.querySelector(
            'div[contenteditable="true"][aria-label="Taaknaam "], div[contenteditable="true"][aria-label="Task name"]'
        );
    }

    function getDateButton() {
        return document.querySelector('[aria-label="Datum instellen"], [aria-label="Set due date"]');
    }

    function hasDateSelected() {
        const btn = getDateButton();
        if (!btn) return false;
        const text = (btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        return text.length > 0;
    }

    function findVandaagButton() {
        const labels = Array.from(document.querySelectorAll('.scheduler-suggestions-item-label'));
        const label = labels.find(el => {
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            return text === 'vandaag' || text === 'today';
        });

        if (!label) return null;

        return (
            label.closest('button') ||
            label.closest('[role="button"]') ||
            label.closest('[role="option"]') ||
            label.parentElement
        );
    }

    function fireFullClick(el) {
        if (!el) return false;
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.click();
        return true;
    }

    function rectSignature(el) {
        if (!el || !document.contains(el)) return null;
        const r = el.getBoundingClientRect();
        return `${Math.round(r.top)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}`;
    }

    async function waitForStablePosition(el, maxChecks = 3) {
        let last = null;
        for (let i = 0; i < maxChecks; i++) {
            await nextFrame();
            if (!el || !document.contains(el)) return false;
            const current = rectSignature(el);
            if (!current) return false;
            if (current === last) return true;
            last = current;
        }
        return true;
    }

    async function chooseVandaag() {
        const dateButton = getDateButton();
        if (!dateButton) return false;

        await waitForStablePosition(dateButton, 3);
        dateButton.click();

        for (let i = 0; i < 14; i++) {
            await sleep(20);
            const vandaagButton = findVandaagButton();
            if (vandaagButton) {
                fireFullClick(vandaagButton);
                await sleep(35);
                return true;
            }
        }
        return false;
    }

    async function applyDefaultDateIfNeeded() {
        if (!isAutoTodayPage()) return;
        if (isApplyingDate) return;

        const editor = getTaskEditor();
        if (!editor) return;
        if (editor === lastHandledEditor) return;

        lastHandledEditor = editor;
        isApplyingDate = true;

        try {
            await nextFrame();
            if (!isAutoTodayPage()) return;
            if (hasDateSelected()) return;

            await chooseVandaag();
        } finally {
            setTimeout(() => {
                isApplyingDate = false;
            }, 50);
        }
    }

    /* ==========================================================================
       CENTRAL LIFECYCLE & ROUTE ENGINE
       ========================================================================== */

    let renderTimer = null;
    let lastPathname = location.pathname;

    function scheduleUpdates() {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => {
            if (isDayPlanningPage()) {
                renderDayPlanningHeaders();
            } else {
                cleanupDayPlanningHeaders();
            }

            if (isQuickWinsPage()) {
                renderQuickWinsHeaders();
            }

            applyDefaultDateIfNeeded();
        }, 80);
    }

    function onRouteChanged() {
        if (location.pathname !== lastPathname) {
            lastPathname = location.pathname;
            lastHandledEditor = null;
            isApplyingDate = false;
            scheduleUpdates();
        }
    }

    function init() {
        // Intercept SPA navigation
        const origPushState = history.pushState;
        history.pushState = function (...args) {
            const ret = origPushState.apply(this, args);
            onRouteChanged();
            return ret;
        };

        const origReplaceState = history.replaceState;
        history.replaceState = function (...args) {
            const ret = origReplaceState.apply(this, args);
            onRouteChanged();
            return ret;
        };

        window.addEventListener('popstate', onRouteChanged);
        window.addEventListener('hashchange', onRouteChanged);
        window.addEventListener('load', scheduleUpdates);

        // Fallback periodic route checker
        setInterval(() => {
            if (location.pathname !== lastPathname) {
                onRouteChanged();
            }
        }, 300);

        // Single debounced MutationObserver
        const observer = new MutationObserver(() => {
            scheduleUpdates();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Initial trigger
        scheduleUpdates();
    }

    init();
})();
