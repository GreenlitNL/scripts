// ==UserScript==
// @name         Todoist: Enhanced (Day Planning, Quick Wins & Daily Main Goal)
// @namespace    https://github.com/GreenlitNL/scripts
// @version      2.6.1
// @description  All-in-one productivity enhancements for Todoist: Day Planning section headings, Quick Wins size headings, Auto-'Vandaag' default date, and Daily Main Goal tracking with streaks & stats.
// @author       GreenlitNL
// @match        https://app.todoist.com/*
// @updateURL    https://raw.githubusercontent.com/GreenlitNL/scripts/main/todoist-enhanced/todoist-enhanced.user.js
// @downloadURL  https://raw.githubusercontent.com/GreenlitNL/scripts/main/todoist-enhanced/todoist-enhanced.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Singleton guard: ensures only one instance of the script runs
    if (document.documentElement.dataset.todoistEnhancedActive) return;
    document.documentElement.dataset.todoistEnhancedActive = 'true';

    /* ==========================================================================
       CONFIGURATION & CONSTANTS
       ========================================================================== */

    // Module 1: Time-based day planning headings
    const DAY_PLANNING_PATHS = [
        '/app/filter/taken-2339790468',
        '/app/filter/habits-2368797274',
        '/app/filter/routines-2368800307'
    ];

    // Module 2: Quick Wins label/size headings
    const QUICK_WINS_SLUG = '/quick-wins-2368845556';

    // Module 3: Filter pages where opening task editor defaults due date to 'Vandaag'
    const AUTO_TODAY_PATHS = new Set([
        '/app/filter/taken-2339790468',
        '/app/filter/habits-2368797274',
        '/app/filter/routines-2368800307',
        '/app/filter/quick-wins-2368845556',
        '/app/filter/vandaag-persoonlijk-2328932541',
        '/app/filter/vandaag-post-nl-2325666375'
    ]);

    // Module 4: Daily Main Goal paths where hero banner is pinned
    const DAILY_GOAL_BANNER_PATHS = [
        '/app/today',
        '/app/filter/taken-2339790468',
        '/app/filter/habits-2368797274',
        '/app/filter/routines-2368800307'
    ];

    const CUSTOM_HEADER_ATTR = 'data-sid-custom-section-header';
    const ORIGINAL_HEADER_ATTR = 'data-sid-original-header-hidden';

    const MORNING_END_MINUTES = 12 * 60;   // 12:00
    const AFTERNOON_END_MINUTES = 18 * 60; // 18:00

    const STORAGE_KEY_DAILY_GOAL = 'todoist_enhanced_daily_goal';
    const STORAGE_KEY_GOAL_HISTORY = 'todoist_enhanced_goal_history';
    const STORAGE_KEY_MODAL_VIEW = 'todoist_enhanced_modal_view';

    const DEBUG = false;
    function log(...args) {
        if (DEBUG) console.log('[Todoist: Enhanced]', ...args);
    }

    function normalize(text) {
        return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function escapeHtml(str) {
        return (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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
       LUCIDE SVG ICONS (NO EMOJIS)
       ========================================================================== */

    const LUCIDE_ICONS = {
        target: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-target ${cls}">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
            </svg>
        `,
        flame: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flame ${cls}">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
            </svg>
        `,
        trophy: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trophy ${cls}">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path>
                <path d="M14 14.66V17c0 .55.45 1 1 1h2"></path>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
            </svg>
        `,
        check: (size = 14, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check ${cls}">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `,
        checkCircle2: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2 ${cls}">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m9 12 2 2 4-4"></path>
            </svg>
        `,
        circle: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle ${cls}">
                <circle cx="12" cy="12" r="10"></circle>
            </svg>
        `,
        history: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-history ${cls}">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M12 7v5l4 2"></path>
            </svg>
        `,
        x: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x ${cls}">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
            </svg>
        `,
        rotateCcw: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw ${cls}">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
            </svg>
        `,
        trash2: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2 ${cls}">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" x2="10" y1="11" y2="17"></line>
                <line x1="14" x2="14" y1="11" y2="17"></line>
            </svg>
        `,
        sparkles: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles ${cls}">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
                <path d="M5 3v4"></path>
                <path d="M19 17v4"></path>
                <path d="M3 5h4"></path>
                <path d="M17 19h4"></path>
            </svg>
        `,
        trendingUp: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-up ${cls}">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                <polyline points="16 7 22 7 22 13"></polyline>
            </svg>
        `,
        calendar: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar ${cls}">
                <path d="M8 2v4"></path>
                <path d="M16 2v4"></path>
                <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                <path d="M3 10h18"></path>
            </svg>
        `,
        download: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download ${cls}">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
        `,
        chevronLeft: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left ${cls}">
                <path d="m15 18-6-6 6-6"></path>
            </svg>
        `,
        chevronRight: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right ${cls}">
                <path d="m9 18 6-6-6-6"></path>
            </svg>
        `,
        layoutGrid: (size = 18, cls = '') => `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-grid ${cls}">
                <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                <rect width="7" height="7" x="3" y="14" rx="1"></rect>
            </svg>
        `
    };

    /* ==========================================================================
       PERSISTENT STORAGE ENGINE (TAMPERMONKEY EXTENSION STORAGE & LOCALSTORAGE FALLBACK)
       ========================================================================== */

    const hasGMStorage = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';

    function getStorageItem(key, defaultValue = null) {
        if (hasGMStorage) {
            try {
                const val = GM_getValue(key, null);
                if (val !== null && val !== undefined) {
                    return typeof val === 'string' ? JSON.parse(val) : val;
                }
            } catch (e) {
                log('GM_getValue parse error for key:', key, e);
            }
        }

        // Fallback / One-time automatic migration from localStorage
        try {
            const lsVal = localStorage.getItem(key);
            if (lsVal !== null && lsVal !== undefined) {
                const parsed = JSON.parse(lsVal);
                // Automatically migrate existing data to Tampermonkey persistent storage
                if (hasGMStorage) {
                    try {
                        GM_setValue(key, JSON.stringify(parsed));
                        log(`Migrated ${key} from localStorage to Tampermonkey persistent storage.`);
                    } catch (e) {}
                }
                return parsed;
            }
        } catch (e) {}

        return defaultValue;
    }

    function setStorageItem(key, value) {
        const serialized = JSON.stringify(value);
        if (hasGMStorage) {
            try {
                GM_setValue(key, serialized);
            } catch (e) {}
        }
        // Dual-write to localStorage so both stay synchronized
        try {
            localStorage.setItem(key, serialized);
        } catch (e) {}
    }

    function removeStorageItem(key) {
        if (hasGMStorage) {
            try {
                if (typeof GM_deleteValue === 'function') {
                    GM_deleteValue(key);
                } else {
                    GM_setValue(key, null);
                }
            } catch (e) {}
        }
        try {
            localStorage.removeItem(key);
        } catch (e) {}
    }

    function getLocalDateString(d = new Date()) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function loadDailyGoalState() {
        try {
            const parsed = getStorageItem(STORAGE_KEY_DAILY_GOAL, null);
            if (!parsed) return null;
            const todayStr = getLocalDateString();
            // Reset if day has rolled over
            if (parsed.date !== todayStr) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function saveDailyGoalState(state) {
        try {
            if (!state) {
                removeStorageItem(STORAGE_KEY_DAILY_GOAL);
            } else {
                setStorageItem(STORAGE_KEY_DAILY_GOAL, state);
            }
        } catch (e) {}
    }

    function loadGoalHistory() {
        try {
            const history = getStorageItem(STORAGE_KEY_GOAL_HISTORY, {});
            return (history && typeof history === 'object') ? history : {};
        } catch (e) {
            return {};
        }
    }

    function saveGoalHistory(history) {
        try {
            setStorageItem(STORAGE_KEY_GOAL_HISTORY, history || {});
        } catch (e) {}
    }

    function calculateStreaks(history, activeGoal) {
        const todayStr = getLocalDateString();
        let currentStreak = 0;
        let maxStreak = 0;
        let totalCompleted = 0;
        const dates = Object.keys(history).sort();

        dates.forEach(d => {
            if (history[d] && history[d].completed) totalCompleted++;
        });

        // Calculate maximum streak historically
        let tempStreak = 0;
        let prevDate = null;
        dates.forEach(d => {
            if (history[d] && history[d].completed) {
                if (!prevDate) {
                    tempStreak = 1;
                } else {
                    const diffDays = Math.round((new Date(d + 'T00:00:00') - new Date(prevDate + 'T00:00:00')) / 86400000);
                    if (diffDays === 1) {
                        tempStreak++;
                    } else {
                        tempStreak = 1;
                    }
                }
                prevDate = d;
                if (tempStreak > maxStreak) maxStreak = tempStreak;
            } else {
                tempStreak = 0;
                prevDate = null;
            }
        });

        // Calculate current streak
        const todayCompleted = (activeGoal && activeGoal.date === todayStr && activeGoal.completed) ||
                               (history[todayStr] && history[todayStr].completed);

        let checkDate = new Date();
        if (todayCompleted) {
            currentStreak = 1;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
            const str = getLocalDateString(checkDate);
            if (history[str] && history[str].completed) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        if (currentStreak > maxStreak) maxStreak = currentStreak;

        // Calculate completion rate (do not penalize if today's goal is still in progress)
        let eligibleDays = 0;
        let completedDays = 0;
        dates.forEach(d => {
            if (d === todayStr && (!history[d] || !history[d].completed)) {
                return; // Today is still ongoing
            }
            eligibleDays++;
            if (history[d] && history[d].completed) completedDays++;
        });
        const completionRate = eligibleDays > 0 ? Math.round((completedDays / eligibleDays) * 100) : 0;

        return { currentStreak, maxStreak, totalCompleted, totalDaysLogged: dates.length, completionRate };
    }

    // Resolves human UI priority (1, 2, 3, or 4) from a task item or its section
    function getTaskItemPriority(item) {
        if (!item) return 4;
        const cb = item.querySelector('button.task_checkbox, [role="checkbox"]');
        if (cb) {
            const cls = cb.className || '';
            if (cls.includes('priority_4')) return 1; // P1 (Red)
            if (cls.includes('priority_3')) return 2; // P2 (Orange)
            if (cls.includes('priority_2')) return 3; // P3 (Blue)
            if (cls.includes('priority_1')) return 4; // P4 (Grey)

            const dataPrio = cb.getAttribute('data-priority') || item.getAttribute('data-priority');
            if (dataPrio) {
                const p = parseInt(dataPrio, 10);
                if (p >= 1 && p <= 4) return 5 - p; // In Todoist API: 4=P1, 3=P2, 2=P3, 1=P4
            }

            const aria = cb.getAttribute('aria-label') || '';
            const ariaMatch = aria.match(/priorit(?:eit|y)\s*(\d)/i);
            if (ariaMatch) return parseInt(ariaMatch[1], 10);
        }
        const section = item.closest('section');
        const h2 = section?.querySelector('header h2, header');
        const hText = h2?.innerText || '';
        const m = hText.match(/priorit(?:eit|y)\s*(\d)/i);
        if (m) return parseInt(m[1], 10);
        return 4;
    }

    function clearDailyGoal(taskId) {
        const todayStr = getLocalDateString();
        const existingState = loadDailyGoalState();
        saveDailyGoalState(null);

        // Only delete today from history if it was NOT yet completed
        // This guarantees a user's completed streak for today is NEVER lost when clearing/switching
        if (!existingState || !existingState.completed) {
            const history = loadGoalHistory();
            delete history[todayStr];
            saveGoalHistory(history);
        }

        scheduleUpdates();
        const targetId = taskId || existingState?.taskId;
        if (targetId) {
            const taskItem = document.querySelector(`li.task_list_item[data-item-id="${targetId}"]`);
            if (taskItem) clearTaskFocus(taskItem);
        }
        return null;
    }

    function setDailyGoal(taskId, taskName, priority) {
        const todayStr = getLocalDateString();
        const existingState = loadDailyGoalState();

        // Toggle off if already the active goal
        if (existingState && existingState.taskId === taskId) {
            return clearDailyGoal(taskId);
        }

        const taskItem = document.querySelector(`li.task_list_item[data-item-id="${taskId}"]`);
        let finalPriority = priority;
        if (!finalPriority && taskItem) {
            finalPriority = getTaskItemPriority(taskItem);
        }
        if (!finalPriority) finalPriority = 4;

        const newState = {
            date: todayStr,
            taskId,
            taskName: taskName || 'Doel van vandaag',
            priority: finalPriority,
            completed: false,
            completedAt: null
        };
        saveDailyGoalState(newState);

        const history = loadGoalHistory();
        history[todayStr] = {
            taskId,
            taskName: newState.taskName,
            priority: finalPriority,
            completed: false,
            completedAt: null
        };
        saveGoalHistory(history);

        scheduleUpdates();
        if (taskItem) clearTaskFocus(taskItem);
        return newState;
    }

    function completeDailyGoal() {
        const todayStr = getLocalDateString();
        const state = loadDailyGoalState();
        if (!state) return;

        state.completed = true;
        state.completedAt = new Date().toISOString();
        saveDailyGoalState(state);

        const history = loadGoalHistory();
        if (history[todayStr]) {
            history[todayStr].completed = true;
            history[todayStr].completedAt = state.completedAt;
        } else {
            history[todayStr] = {
                taskId: state.taskId,
                taskName: state.taskName,
                completed: true,
                completedAt: state.completedAt
            };
        }
        saveGoalHistory(history);

        scheduleUpdates();
    }

    function uncompleteDailyGoal() {
        const todayStr = getLocalDateString();
        const state = loadDailyGoalState();
        if (!state) return;

        state.completed = false;
        state.completedAt = null;
        saveDailyGoalState(state);

        const history = loadGoalHistory();
        if (history[todayStr]) {
            history[todayStr].completed = false;
            history[todayStr].completedAt = null;
        }
        saveGoalHistory(history);

        scheduleUpdates();
    }

    // Marks a specific historical day as NOT completed. Used from the history
    // overview to correct a day that was mistakenly recorded as done.
    function resetGoalDay(dateStr) {
        if (!dateStr) return;
        const todayStr = getLocalDateString();

        const history = loadGoalHistory();
        if (history[dateStr]) {
            history[dateStr].completed = false;
            history[dateStr].completedAt = null;
        }
        saveGoalHistory(history);

        // If resetting today, also flip the active goal state so the hero card,
        // banner and checkbox reflect the change immediately.
        if (dateStr === todayStr) {
            const state = loadDailyGoalState();
            if (state && state.completed) {
                state.completed = false;
                state.completedAt = null;
                saveDailyGoalState(state);
            }
        }

        scheduleUpdates();
    }

    // Removes a day entirely from the goal history. Also resets today's active
    // goal state when the deleted day is today, so the page UI stays consistent.
    function deleteGoalDay(dateStr) {
        if (!dateStr) return;
        const todayStr = getLocalDateString();

        const history = loadGoalHistory();
        if (Object.prototype.hasOwnProperty.call(history, dateStr)) {
            delete history[dateStr];
        }
        saveGoalHistory(history);

        // If deleting today's entry, clear the active goal completely so the hero
        // card and banner no longer show a completed/active goal for today.
        if (dateStr === todayStr) {
            const state = loadDailyGoalState();
            if (state && state.date === todayStr) {
                saveDailyGoalState(null);
            }
        }

        scheduleUpdates();
    }

    /* ==========================================================================
       TODOIST SYNC API ENGINE (Bidirectional Task State Synchronization)
       ========================================================================== */

    function getTodoistApiToken() {
        try {
            const user = JSON.parse(localStorage.getItem('User') || '{}');
            if (user.api_token) return user.api_token;
            if (user.token) return user.token;
        } catch (e) {}
        try {
            const auth = JSON.parse(localStorage.getItem('auth_identity') || '{}');
            if (auth.token) return auth.token;
        } catch (e) {}
        return null;
    }

    function generateUuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    async function sendTodoistSyncCommands(commands) {
        const token = getTodoistApiToken();
        if (!token) return null;
        try {
            const res = await fetch('https://app.todoist.com/api/v1/sync', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ commands })
            });
            return await res.json();
        } catch (err) {
            console.error('[Todoist Enhanced] Sync API error:', err);
            return null;
        }
    }

    async function syncTaskComplete(taskId) {
        if (!taskId) return;
        return await sendTodoistSyncCommands([
            {
                type: 'item_close',
                uuid: generateUuid(),
                args: {
                    id: taskId
                }
            }
        ]);
    }

    async function syncTaskCompleteUndo(taskId) {
        if (!taskId) return;
        return await sendTodoistSyncCommands([
            {
                type: 'item_uncomplete',
                uuid: generateUuid(),
                args: {
                    id: taskId
                }
            }
        ]);
    }

    /* ==========================================================================
       STYLESHEET (TODOIST NATIVE DESIGN LANGUAGE)
       ========================================================================== */

    function ensureStyles() {
        if (document.getElementById('todoist-enhanced-styles')) return;
        const style = document.createElement('style');
        style.id = 'todoist-enhanced-styles';
        style.textContent = `
            /* Todoist: Enhanced Design System Tokens */
            :root {
                --te-accent: #dc4c3e;
                --te-accent-hover: #c3392c;
                --te-accent-subtle: rgba(220, 76, 62, 0.08);
                --te-streak-flame: #e5a00d;
                --te-success: #058527;
                --te-success-subtle: rgba(5, 133, 39, 0.08);
                --te-card-bg: var(--reactist-banner-background-color, #ffffff);
                --te-card-border: var(--product-library-border-idle-tint, #e6e6e6);
                --te-card-border-hover: var(--product-library-border-hover-tint, #ccc);
                --te-text-primary: var(--reactist-banner-main-copy-color, #202020);
                --te-text-secondary: var(--reactist-banner-secondary-copy-color, #666666);
                --te-surface-hover: rgba(0, 0, 0, 0.04);
            }

            [data-theme*="dark"], html.dark {
                --te-card-bg: #232326;
                --te-card-border: rgba(255, 255, 255, 0.12);
                --te-card-border-hover: rgba(255, 255, 255, 0.22);
                --te-text-primary: #f5f5f5;
                --te-text-secondary: #aaaaaa;
                --te-surface-hover: rgba(255, 255, 255, 0.06);
            }

            /* Module 4: Hero Focus Card (Centered to exact 800px task-list width) */
            .todoist-enhanced-hero-card {
                width: 100%;
                max-width: 800px;
                margin: 0 auto 24px auto;
                box-sizing: border-box;
                background: var(--te-card-bg);
                border: 1px solid var(--te-card-border);
                border-radius: 10px;
                padding: 12px 16px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                cursor: pointer;
                user-select: none;
                transition: background-color 0.15s ease;
            }
            .todoist-enhanced-hero-card:hover {
                background: var(--te-surface-hover);
            }
            .todoist-enhanced-hero-card.is-completed {
                border-color: rgba(36, 160, 95, 0.35);
                background: var(--te-success-subtle);
            }

            /* Resets the 30px margin Todoist applies to :not(:first-child) sections */
            .todoist-enhanced-hero-card + * {
                margin-top: 0 !important;
            }

            .todoist-enhanced-hero-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
            }

            .todoist-enhanced-hero-left {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 0;
                flex-grow: 1;
            }

            .todoist-enhanced-hero-icon-box {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                background: var(--te-accent-subtle);
                color: var(--te-accent);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .todoist-enhanced-hero-text-col {
                display: flex;
                flex-direction: column;
                gap: 1px;
                min-width: 0;
            }

            .todoist-enhanced-hero-title {
                font-size: 14px;
                font-weight: 700;
                line-height: 20px;
                letter-spacing: -0.15px;
                color: var(--te-text-primary);
                word-break: break-word;
            }
            .todoist-enhanced-hero-card.is-completed .todoist-enhanced-hero-title {
                text-decoration: line-through;
                opacity: 0.65;
            }

            .todoist-enhanced-hero-subtitle {
                font-size: 13px;
                font-weight: 400;
                line-height: 18px;
                color: var(--te-text-secondary);
            }

            /* Hero Checkbox with Dynamic Priority-Aware Styling */
            .todoist-enhanced-hero-checkbox {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: transparent;
                cursor: pointer;
                flex-shrink: 0;
                padding: 0;
                box-sizing: border-box;
                transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
            }
            .todoist-enhanced-hero-checkbox .hero-cb-hover-check {
                opacity: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.15s ease;
                pointer-events: none;
            }
            .todoist-enhanced-hero-checkbox:hover .hero-cb-hover-check {
                opacity: 1;
            }

            /* Priority 1 (Red / Urgent) */
            .todoist-enhanced-hero-checkbox.priority-1 {
                border: 2px solid var(--product-library-priorities-p1-primary-idle-fill, #d1453b);
                color: var(--product-library-priorities-p1-primary-idle-fill, #d1453b);
            }
            .todoist-enhanced-hero-checkbox.priority-1:hover {
                background: var(--product-library-priorities-p1-secondary-idle-fill, rgba(209, 69, 59, 0.12));
            }

            /* Priority 2 (Orange / High) */
            .todoist-enhanced-hero-checkbox.priority-2 {
                border: 2px solid var(--product-library-priorities-p2-primary-idle-fill, #eb8909);
                color: var(--product-library-priorities-p2-primary-idle-fill, #eb8909);
            }
            .todoist-enhanced-hero-checkbox.priority-2:hover {
                background: var(--product-library-priorities-p2-secondary-idle-fill, rgba(235, 137, 9, 0.12));
            }

            /* Priority 3 (Blue / Medium) */
            .todoist-enhanced-hero-checkbox.priority-3 {
                border: 2px solid var(--product-library-priorities-p3-primary-idle-fill, #246fe0);
                color: var(--product-library-priorities-p3-primary-idle-fill, #246fe0);
            }
            .todoist-enhanced-hero-checkbox.priority-3:hover {
                background: var(--product-library-priorities-p3-secondary-idle-fill, rgba(36, 111, 224, 0.12));
            }

            /* Priority 4 (Grey / Default) */
            .todoist-enhanced-hero-checkbox.priority-4 {
                border: 1px solid var(--product-library-priorities-p4-primary-idle-fill, #999999);
                color: var(--product-library-priorities-p4-primary-idle-fill, #999999);
            }
            .todoist-enhanced-hero-checkbox.priority-4:hover {
                background: var(--product-library-priorities-p4-secondary-idle-fill, rgba(153, 153, 153, 0.12));
            }

            /* Checked state (turns green for all priorities upon completion) */
            .todoist-enhanced-hero-checkbox.is-checked {
                background: var(--te-success) !important;
                border: 2px solid var(--te-success) !important;
                color: #ffffff !important;
            }
            .todoist-enhanced-hero-checkbox.is-checked .hero-cb-hover-check {
                opacity: 1 !important;
            }

            .todoist-enhanced-hero-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }

            .todoist-enhanced-icon-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 26px;
                height: 26px;
                border-radius: 6px;
                border: none;
                background: transparent;
                color: var(--te-text-secondary);
                cursor: pointer;
                transition: background-color 0.15s ease, color 0.15s ease;
                padding: 0;
            }
            .todoist-enhanced-icon-btn:hover {
                background: var(--te-surface-hover);
                color: var(--te-text-primary);
            }

            /* Ensure task row has relative positioning so absolute target button anchors reliably */
            li.task_list_item,
            [data-testid="task-list-item"],
            .task_list_item__body {
                position: relative;
            }

            /* Task Item Target Button (Mounted in .task_list_item__body, pixel-aligned with native actions) */
            .todoist-enhanced-task-goal-btn {
                position: absolute;
                right: 106px;
                top: 8px;
                display: none;
                align-items: center;
                justify-content: center;
                height: 24px;
                width: 24px;
                border-radius: 4px;
                border: none;
                background: transparent;
                color: var(--te-text-secondary);
                cursor: pointer;
                transition: background-color 0.15s ease, color 0.15s ease;
                padding: 0;
                margin: 0;
                z-index: 10;
                pointer-events: auto;
            }
            .todoist-enhanced-task-goal-btn svg {
                pointer-events: none;
                flex-shrink: 0;
            }
            .todoist-enhanced-task-goal-btn:hover {
                background: var(--te-surface-hover);
                color: var(--te-text-primary);
            }
            .todoist-enhanced-task-goal-btn.is-active {
                color: var(--te-accent);
            }
            .todoist-enhanced-task-goal-btn.is-active:hover {
                background: var(--te-accent-subtle);
                color: var(--te-accent);
            }

            /* Only display the target button strictly on task hover */
            li.task_list_item:hover .todoist-enhanced-task-goal-btn,
            [data-testid="task-list-item"]:hover .todoist-enhanced-task-goal-btn {
                display: inline-flex;
            }
            .todoist-enhanced-task-goal-btn:focus,
            .todoist-enhanced-task-goal-btn:focus-visible,
            .todoist-enhanced-task-goal-badge:focus,
            .todoist-enhanced-task-goal-badge:focus-visible {
                outline: none !important;
            }

            /* Inline Task Goal Badge (Directly beside task title) */
            .todoist-enhanced-task-goal-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                vertical-align: middle;
                margin-left: 8px;
                font-size: 11px;
                font-weight: 600;
                line-height: 1;
                padding: 2px 7px;
                border-radius: 4px;
                background: var(--te-accent-subtle);
                color: var(--te-accent);
                user-select: none;
                cursor: pointer;
                transition: background-color 0.15s ease, opacity 0.15s ease;
            }
            .todoist-enhanced-task-goal-badge:hover {
                background: rgba(228, 66, 54, 0.18);
            }
            .todoist-enhanced-task-goal-badge svg {
                flex-shrink: 0;
            }

            /* Header toolbar button */
            .todoist-enhanced-header-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                border: none;
                background: transparent;
                color: var(--te-text-secondary);
                cursor: pointer;
                transition: background-color 0.15s ease, color 0.15s ease;
                margin-right: 4px;
            }
            .todoist-enhanced-header-btn:hover {
                background: var(--te-surface-hover);
                color: var(--te-accent);
            }

            /* History & Streaks Modal */
            .todoist-enhanced-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: auto;
            }

            .todoist-enhanced-modal-content {
                background: var(--te-card-bg);
                border: 1px solid var(--te-card-border);
                border-radius: 12px;
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
                width: 640px;
                max-width: 94vw;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }

            .todoist-enhanced-modal-header {
                padding: 16px 20px;
                border-bottom: 1px solid var(--te-card-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .todoist-enhanced-modal-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                font-weight: 700;
                color: var(--te-text-primary);
            }
            .todoist-enhanced-modal-title svg {
                color: var(--te-accent);
            }

            .todoist-enhanced-modal-body {
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .todoist-enhanced-stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
            }
            .todoist-enhanced-stat-card {
                background: var(--te-surface-hover);
                border: 1px solid var(--te-card-border);
                border-radius: 8px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .todoist-enhanced-stat-header {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                font-weight: 600;
                color: var(--te-text-secondary);
            }
            .todoist-enhanced-stat-value {
                font-size: 20px;
                font-weight: 700;
                color: var(--te-text-primary);
            }

            /* Activity heat map (last 30 days) */
            .todoist-enhanced-section-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--te-text-primary);
                margin-bottom: 8px;
            }
            .todoist-enhanced-activity-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            .todoist-enhanced-activity-box {
                width: 24px;
                height: 24px;
                border-radius: 4px;
                background: var(--te-surface-hover);
                border: 1px solid var(--te-card-border);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                cursor: default;
                position: relative;
            }
            .todoist-enhanced-activity-box.is-completed {
                background: var(--te-success);
                border-color: var(--te-success);
                color: #ffffff;
            }
            .todoist-enhanced-activity-box.is-missed {
                background: var(--te-surface-hover);
                color: var(--te-text-secondary);
                opacity: 0.5;
            }
            .todoist-enhanced-activity-box.is-today {
                border: 2px solid var(--te-accent);
            }

            /* History list */
            .todoist-enhanced-history-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 220px;
                overflow-y: auto;
            }
            .todoist-enhanced-history-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                border-radius: 6px;
                background: var(--te-surface-hover);
                font-size: 13px;
            }
            .todoist-enhanced-history-left {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
            }
            .todoist-enhanced-history-title {
                font-weight: 500;
                color: var(--te-text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .todoist-enhanced-history-date {
                font-size: 11px;
                color: var(--te-text-secondary);
                flex-shrink: 0;
            }
            .todoist-enhanced-history-status {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                font-weight: 600;
                flex-shrink: 0;
            }
            .todoist-enhanced-history-status.is-completed {
                color: var(--te-success);
            }
            .todoist-enhanced-history-status.is-missed {
                color: var(--te-text-secondary);
            }
            .todoist-enhanced-history-right {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
            }
            .todoist-enhanced-history-action-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                padding: 0;
                border: none;
                border-radius: 5px;
                background: transparent;
                color: var(--te-text-secondary);
                cursor: pointer;
                transition: background-color 0.15s ease, color 0.15s ease;
            }
            .todoist-enhanced-history-action-btn:hover {
                background: var(--te-surface-hover);
                color: var(--te-text-primary);
            }
            .todoist-enhanced-history-action-btn.reset-day-btn:hover {
                color: var(--te-accent);
            }
            .todoist-enhanced-history-action-btn.delete-day-btn:hover {
                color: var(--te-accent);
            }
            .todoist-enhanced-history-action-btn:focus-visible {
                outline: 2px solid var(--te-accent);
                outline-offset: 1px;
            }

            .todoist-enhanced-modal-footer {
                padding: 12px 20px;
                border-top: 1px solid var(--te-card-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .todoist-enhanced-btn {
                padding: 6px 14px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                border: 1px solid var(--te-card-border);
                background: var(--te-card-bg);
                color: var(--te-text-primary);
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: background-color 0.15s ease;
            }
            .todoist-enhanced-btn:hover {
                background: var(--te-surface-hover);
            }
            .todoist-enhanced-btn.btn-primary {
                background: var(--te-accent);
                color: #ffffff;
                border-color: var(--te-accent);
            }
            .todoist-enhanced-btn.btn-primary:hover {
                background: var(--te-accent-hover);
            }
            .todoist-enhanced-btn.btn-sm {
                padding: 4px 10px;
                font-size: 12px;
                height: 28px;
            }
            .todoist-enhanced-btn.btn-icon-sm {
                padding: 0;
                width: 28px;
                height: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            /* Live View Switcher (Segmented Control) */
            .todoist-enhanced-view-switcher {
                display: inline-flex;
                align-items: center;
                background: var(--te-surface-hover);
                border: 1px solid var(--te-card-border);
                border-radius: 8px;
                padding: 3px;
                gap: 3px;
                align-self: flex-end;
            }
            .todoist-enhanced-view-tab {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 12px;
                border-radius: 6px;
                border: none;
                background: transparent;
                color: var(--te-text-secondary);
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
                user-select: none;
            }
            .todoist-enhanced-view-tab:hover {
                color: var(--te-text-primary);
            }
            .todoist-enhanced-view-tab.is-active {
                background: var(--te-card-bg);
                color: var(--te-text-primary);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            }
            .todoist-enhanced-view-tab svg {
                flex-shrink: 0;
            }

            /* View Panels */
            .todoist-enhanced-view-panel {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .todoist-enhanced-view-panel.is-hidden {
                display: none !important;
            }

            /* Calendar Component */
            .todoist-enhanced-cal-wrapper {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .todoist-enhanced-cal-nav-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 2px 0;
            }
            .todoist-enhanced-cal-month-title {
                font-size: 15px;
                font-weight: 700;
                color: var(--te-text-primary);
                letter-spacing: -0.2px;
            }
            .todoist-enhanced-cal-nav-actions {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .todoist-enhanced-cal-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 5px;
            }
            .todoist-enhanced-cal-day-header {
                font-size: 11px;
                font-weight: 600;
                text-align: center;
                color: var(--te-text-secondary);
                padding: 2px 0 6px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .todoist-enhanced-cal-cell {
                min-height: 62px;
                border: 1px solid var(--te-card-border);
                border-radius: 6px;
                padding: 4px 5px;
                display: flex;
                flex-direction: column;
                gap: 4px;
                background: var(--te-card-bg);
                transition: background-color 0.15s ease, border-color 0.15s ease;
                cursor: default;
                position: relative;
                box-sizing: border-box;
            }
            .todoist-enhanced-cal-cell:hover {
                background: var(--te-surface-hover);
            }
            .todoist-enhanced-cal-cell.is-other-month {
                opacity: 0.35;
            }
            .todoist-enhanced-cal-cell.is-today {
                border-color: var(--te-accent);
                background: rgba(220, 76, 62, 0.04);
            }
            .todoist-enhanced-cal-cell-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                line-height: 1;
            }
            .todoist-enhanced-cal-day-num {
                font-size: 11px;
                font-weight: 600;
                color: var(--te-text-secondary);
            }
            .todoist-enhanced-cal-cell.is-today .todoist-enhanced-cal-day-num {
                background: var(--te-accent);
                color: #ffffff;
                border-radius: 9999px;
                width: 17px;
                height: 17px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
            }
            .todoist-enhanced-cal-task-pill {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 3px 5px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                line-height: 1.2;
                background: var(--te-surface-hover);
                color: var(--te-text-primary);
                border-left: 2.5px solid transparent;
                overflow: hidden;
                box-sizing: border-box;
                width: 100%;
            }
            .todoist-enhanced-cal-task-pill.is-completed {
                background: var(--te-success-subtle);
                color: var(--te-success);
            }
            .todoist-enhanced-cal-task-pill.is-today-active {
                background: var(--te-accent-subtle);
                color: var(--te-accent);
            }
            .todoist-enhanced-cal-task-pill.priority-1 { border-left-color: var(--product-library-priorities-p1-primary-idle-fill, #d1453b); }
            .todoist-enhanced-cal-task-pill.priority-2 { border-left-color: var(--product-library-priorities-p2-primary-idle-fill, #eb8909); }
            .todoist-enhanced-cal-task-pill.priority-3 { border-left-color: var(--product-library-priorities-p3-primary-idle-fill, #246fe0); }
            .todoist-enhanced-cal-task-pill.priority-4 { border-left-color: var(--product-library-priorities-p4-primary-idle-fill, #999999); }
            .todoist-enhanced-cal-task-pill svg {
                flex-shrink: 0;
            }
            .todoist-enhanced-cal-task-title {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex-grow: 1;
                min-width: 0;
            }
        `;
        document.head.appendChild(style);
    }

    /* ==========================================================================
       MODULE 1: DAY PLANNING TIME-BASED SECTION HEADINGS
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
       MODULE 2: QUICK WINS SECTION HEADINGS (SIZE / PRIORITY)
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
       MODULE 3: AUTO-SET TODAY ('VANDAAG') ON TASK EDITOR OPEN
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
       MODULE 4: DAILY MAIN GOAL & STREAK TRACKING
       ========================================================================== */

    function isDailyGoalPage() {
        return DAILY_GOAL_BANNER_PATHS.some(path => location.pathname.startsWith(path));
    }

    const DUTCH_MONTH_NAMES = [
        'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
        'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
    ];

    function formatCompletionTime(completedAt) {
        if (!completedAt) return '';
        try {
            const d = new Date(completedAt);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    function renderCalendarCell(dateStr, dayNum, isOtherMonth, entry, activeGoal, todayStr) {
        const isToday = dateStr === todayStr;
        let taskName = '';
        let isCompleted = false;
        let isTodayActive = false;
        let priority = 4;
        let tooltip = '';

        if (isToday && activeGoal) {
            taskName = activeGoal.taskName || 'Hoofddoel';
            priority = activeGoal.priority || 4;
            if (activeGoal.completed) {
                isCompleted = true;
                const time = formatCompletionTime(activeGoal.completedAt);
                tooltip = `Vandaag: ✓ ${taskName} (Voltooid${time ? ` om ${time}` : ''})`;
            } else {
                isTodayActive = true;
                tooltip = `Vandaag: ${taskName} (Bezig)`;
            }
        } else if (entry) {
            taskName = entry.taskName || 'Hoofddoel';
            priority = entry.priority || 4;
            if (entry.completed) {
                isCompleted = true;
                const time = formatCompletionTime(entry.completedAt);
                tooltip = `${dateStr}: ✓ ${taskName} (Voltooid${time ? ` om ${time}` : ''})`;
            } else {
                tooltip = `${dateStr}: ${taskName} (Niet voltooid)`;
            }
        }

        if (![1, 2, 3, 4].includes(priority)) priority = 4;

        let taskHtml = '';
        if (taskName) {
            const statusIcon = isCompleted ? LUCIDE_ICONS.check(11) : LUCIDE_ICONS.circle(11);
            const statusClass = isCompleted ? 'is-completed' : (isTodayActive ? 'is-today-active' : '');
            taskHtml = `
                <div class="todoist-enhanced-cal-task-pill priority-${priority} ${statusClass}" title="${escapeHtml(tooltip)}">
                    ${statusIcon}
                    <span class="todoist-enhanced-cal-task-title">${escapeHtml(taskName)}</span>
                </div>
            `;
        }

        const cellClasses = [
            'todoist-enhanced-cal-cell',
            isOtherMonth ? 'is-other-month' : '',
            isToday ? 'is-today' : ''
        ].filter(Boolean).join(' ');

        return `
            <div class="${cellClasses}" data-date="${dateStr}">
                <div class="todoist-enhanced-cal-cell-header">
                    <span class="todoist-enhanced-cal-day-num">${dayNum}</span>
                </div>
                ${taskHtml}
            </div>
        `;
    }

    function buildGoalCalendarMarkup(year, month, history, activeGoal) {
        const todayStr = getLocalDateString();
        const monthTitle = `${DUTCH_MONTH_NAMES[month]} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1);
        const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        let cellsHtml = '';

        // 1. Trailing days from previous month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const dayNum = daysInPrevMonth - startingDayOfWeek + 1 + i;
            const prevD = new Date(year, month - 1, dayNum);
            const dStr = getLocalDateString(prevD);
            const entry = history[dStr];
            cellsHtml += renderCalendarCell(dStr, dayNum, true, entry, activeGoal, todayStr);
        }

        // 2. Days in current month
        for (let day = 1; day <= daysInMonth; day++) {
            const curD = new Date(year, month, day);
            const dStr = getLocalDateString(curD);
            const entry = history[dStr];
            cellsHtml += renderCalendarCell(dStr, day, false, entry, activeGoal, todayStr);
        }

        // 3. Leading days of next month to complete the grid
        const totalCellsSoFar = startingDayOfWeek + daysInMonth;
        const totalGridCells = totalCellsSoFar % 7 === 0 ? totalCellsSoFar : totalCellsSoFar + (7 - (totalCellsSoFar % 7));
        const trailingDaysNeeded = totalGridCells - totalCellsSoFar;
        for (let day = 1; day <= trailingDaysNeeded; day++) {
            const nextD = new Date(year, month + 1, day);
            const dStr = getLocalDateString(nextD);
            const entry = history[dStr];
            cellsHtml += renderCalendarCell(dStr, day, true, entry, activeGoal, todayStr);
        }

        const weekdayHeaders = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
            .map(d => `<div class="todoist-enhanced-cal-day-header">${d}</div>`)
            .join('');

        return `
            <div class="todoist-enhanced-cal-wrapper">
                <div class="todoist-enhanced-cal-nav-bar">
                    <div class="todoist-enhanced-cal-month-title">${monthTitle}</div>
                    <div class="todoist-enhanced-cal-nav-actions">
                        <button class="todoist-enhanced-btn btn-sm btn-icon-sm cal-prev-btn" type="button" title="Vorige maand" aria-label="Vorige maand">
                            ${LUCIDE_ICONS.chevronLeft(16)}
                        </button>
                        <button class="todoist-enhanced-btn btn-sm cal-today-btn" type="button" title="Huidige maand">
                            Vandaag
                        </button>
                        <button class="todoist-enhanced-btn btn-sm btn-icon-sm cal-next-btn" type="button" title="Volgende maand" aria-label="Volgende maand">
                            ${LUCIDE_ICONS.chevronRight(16)}
                        </button>
                    </div>
                </div>
                <div class="todoist-enhanced-cal-grid">
                    ${weekdayHeaders}
                    ${cellsHtml}
                </div>
            </div>
        `;
    }

    function updateCalendarView(modalOverlay, year, month) {
        const history = loadGoalHistory();
        const activeGoal = loadDailyGoalState();
        const panelCal = modalOverlay.querySelector('#todoist-enhanced-panel-calendar');
        if (!panelCal) return;

        modalOverlay.dataset.calYear = String(year);
        modalOverlay.dataset.calMonth = String(month);
        panelCal.innerHTML = buildGoalCalendarMarkup(year, month, history, activeGoal);
    }

    // Opens the History & Streaks Modal
    function openHistoryModal() {
        if (document.getElementById('todoist-enhanced-history-modal')) return;

        ensureStyles();
        const activeView = getStorageItem(STORAGE_KEY_MODAL_VIEW, 'grid');

        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'todoist-enhanced-history-modal';
        modalOverlay.className = 'todoist-enhanced-modal-overlay';
        modalOverlay.dataset.activeView = activeView;
        modalOverlay.dataset.calYear = String(curYear);
        modalOverlay.dataset.calMonth = String(curMonth);

        renderHistoryModalInner(modalOverlay);
        document.body.appendChild(modalOverlay);
    }

    // Builds (or rebuilds) the inner markup of the history modal, preserving the
    // currently selected view and navigated calendar month via the overlay's dataset.
    function renderHistoryModalInner(modalOverlay) {
        const history = loadGoalHistory();
        const activeGoal = loadDailyGoalState();
        const streaks = calculateStreaks(history, activeGoal);
        const todayStr = getLocalDateString();

        const activeView = modalOverlay.dataset.activeView || 'grid';
        let curYear = parseInt(modalOverlay.dataset.calYear, 10);
        let curMonth = parseInt(modalOverlay.dataset.calMonth, 10);
        if (isNaN(curYear) || isNaN(curMonth)) {
            const now = new Date();
            curYear = now.getFullYear();
            curMonth = now.getMonth();
        }

        // Build last 30 days grid
        const activitySquares = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = getLocalDateString(d);
            const entry = history[dStr];
            const isToday = dStr === todayStr;

            let statusCls = 'is-empty';
            let titleAttr = `${dStr}: Geen doel ingesteld`;

            if (entry) {
                if (entry.completed) {
                    statusCls = 'is-completed';
                    titleAttr = `${dStr}: ✓ ${entry.taskName || 'Doel behaald'}`;
                } else {
                    statusCls = 'is-missed';
                    titleAttr = `${dStr}: Niet voltooid (${entry.taskName})`;
                }
            } else if (isToday && activeGoal) {
                if (activeGoal.completed) {
                    statusCls = 'is-completed';
                    titleAttr = `Vandaag: ✓ ${activeGoal.taskName}`;
                } else {
                    statusCls = 'is-pending';
                    titleAttr = `Vandaag: Bezig met "${activeGoal.taskName}"`;
                }
            }

            activitySquares.push(`
                <div class="todoist-enhanced-activity-box ${statusCls}${isToday ? ' is-today' : ''}" title="${escapeHtml(titleAttr)}">
                    ${(entry && entry.completed) || (isToday && activeGoal && activeGoal.completed) ? LUCIDE_ICONS.checkCircle2(12) : ''}
                </div>
            `);
        }

        // Build past history rows
        const sortedDates = Object.keys(history).sort().reverse();
        const historyRows = sortedDates.map(date => {
            const item = history[date];
            const isDone = item.completed;
            const resetBtn = isDone ? `
                        <button class="todoist-enhanced-history-action-btn reset-day-btn" data-reset-date="${escapeHtml(date)}" type="button" title="Markeer als niet voltooid" aria-label="Markeer als niet voltooid">
                            ${LUCIDE_ICONS.rotateCcw(13)}
                        </button>
                    ` : '';
            return `
                <div class="todoist-enhanced-history-item">
                    <div class="todoist-enhanced-history-left">
                        <span class="todoist-enhanced-history-date">${date}</span>
                        <span class="todoist-enhanced-history-title">${escapeHtml(item.taskName || 'Hoofddoel')}</span>
                    </div>
                    <div class="todoist-enhanced-history-right">
                        <div class="todoist-enhanced-history-status ${isDone ? 'is-completed' : 'is-missed'}">
                            ${isDone ? LUCIDE_ICONS.checkCircle2(14) : LUCIDE_ICONS.circle(14)}
                            <span>${isDone ? 'Voltooid' : 'Niet voltooid'}</span>
                        </div>
                        ${resetBtn}
                        <button class="todoist-enhanced-history-action-btn delete-day-btn" data-delete-date="${escapeHtml(date)}" type="button" title="Verwijder dit item uit de geschiedenis" aria-label="Verwijder dit item uit de geschiedenis">
                            ${LUCIDE_ICONS.trash2(13)}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        modalOverlay.innerHTML = `
            <div class="todoist-enhanced-modal-content" role="dialog" aria-modal="true">
                <div class="todoist-enhanced-modal-header">
                    <div class="todoist-enhanced-modal-title">
                        ${LUCIDE_ICONS.target(20)}
                        <span>Hoofddoel Historie & Streaks</span>
                    </div>
                    <button class="todoist-enhanced-icon-btn close-modal-btn" aria-label="Sluiten" title="Sluiten">
                        ${LUCIDE_ICONS.x(18)}
                    </button>
                </div>
                <div class="todoist-enhanced-modal-body">
                    <div class="todoist-enhanced-stats-grid">
                        <div class="todoist-enhanced-stat-card">
                            <div class="todoist-enhanced-stat-header">
                                ${LUCIDE_ICONS.flame(14)}
                                <span>Streak</span>
                            </div>
                            <div class="todoist-enhanced-stat-value">${streaks.currentStreak} <span style="font-size:12px; font-weight:normal;">d</span></div>
                        </div>
                        <div class="todoist-enhanced-stat-card">
                            <div class="todoist-enhanced-stat-header">
                                ${LUCIDE_ICONS.trophy(14)}
                                <span>Beste</span>
                            </div>
                            <div class="todoist-enhanced-stat-value">${streaks.maxStreak} <span style="font-size:12px; font-weight:normal;">d</span></div>
                        </div>
                        <div class="todoist-enhanced-stat-card">
                            <div class="todoist-enhanced-stat-header">
                                ${LUCIDE_ICONS.checkCircle2(14)}
                                <span>Totaal</span>
                            </div>
                            <div class="todoist-enhanced-stat-value">${streaks.totalCompleted}</div>
                        </div>
                        <div class="todoist-enhanced-stat-card">
                            <div class="todoist-enhanced-stat-header">
                                ${LUCIDE_ICONS.trendingUp(14)}
                                <span>Succes</span>
                            </div>
                            <div class="todoist-enhanced-stat-value">${streaks.completionRate}%</div>
                        </div>
                    </div>

                    <div class="todoist-enhanced-view-switcher" role="tablist" aria-label="Kies weergave">
                        <button class="todoist-enhanced-view-tab ${activeView === 'grid' ? 'is-active' : ''}" data-view="grid" role="tab" aria-selected="${activeView === 'grid'}">
                            ${LUCIDE_ICONS.layoutGrid(14)}
                            <span>Raster</span>
                        </button>
                        <button class="todoist-enhanced-view-tab ${activeView === 'calendar' ? 'is-active' : ''}" data-view="calendar" role="tab" aria-selected="${activeView === 'calendar'}">
                            ${LUCIDE_ICONS.calendar(14)}
                            <span>Kalender</span>
                        </button>
                    </div>

                    <div id="todoist-enhanced-panel-grid" class="todoist-enhanced-view-panel ${activeView === 'grid' ? '' : 'is-hidden'}">
                        <div>
                            <div class="todoist-enhanced-section-title">Activiteit afgelopen 30 dagen</div>
                            <div class="todoist-enhanced-activity-grid">
                                ${activitySquares.join('')}
                            </div>
                        </div>

                        <div>
                            <div class="todoist-enhanced-section-title">Geschiedenis</div>
                            <div class="todoist-enhanced-history-list">
                                ${historyRows.length ? historyRows : '<div style="color:var(--te-text-secondary); font-size:13px; text-align:center; padding:16px;">Nog geen eerdere doelen vastgelegd.</div>'}
                            </div>
                        </div>
                    </div>

                    <div id="todoist-enhanced-panel-calendar" class="todoist-enhanced-view-panel ${activeView === 'calendar' ? '' : 'is-hidden'}">
                        ${buildGoalCalendarMarkup(curYear, curMonth, history, activeGoal)}
                    </div>
                </div>
                <div class="todoist-enhanced-modal-footer">
                    <button class="todoist-enhanced-btn export-json-btn">
                        ${LUCIDE_ICONS.download(14)}
                        <span>Exporteren (JSON)</span>
                    </button>
                    <button class="todoist-enhanced-btn btn-primary close-modal-btn">
                        Sluiten
                    </button>
                </div>
            </div>
        `;
    }

    // Re-renders the open history modal in place (preserves view + calendar month).
    function refreshHistoryModal() {
        const modalOverlay = document.getElementById('todoist-enhanced-history-modal');
        if (modalOverlay) renderHistoryModalInner(modalOverlay);
    }

    function closeHistoryModal() {
        const modal = document.getElementById('todoist-enhanced-history-modal');
        if (modal) modal.remove();
    }

    function toggleHistoryModal() {
        if (document.getElementById('todoist-enhanced-history-modal')) {
            closeHistoryModal();
        } else {
            openHistoryModal();
        }
    }

    // Injects the top toolbar goal history button in Todoist view header
    function renderHeaderGoalButton() {
        const viewHeaderActions = document.querySelector('main header [role="toolbar"], main header .view_header__actions, main header [data-testid="view-header-actions"], main header .zkDMrSj');
        if (!viewHeaderActions) return;

        if (viewHeaderActions.contains(document.getElementById('todoist-enhanced-header-goal-btn'))) return;

        const existingBtn = document.getElementById('todoist-enhanced-header-goal-btn');
        if (existingBtn) existingBtn.remove();

        const btn = document.createElement('button');
        btn.id = 'todoist-enhanced-header-goal-btn';
        btn.className = 'todoist-enhanced-header-btn';
        btn.setAttribute('type', 'button');
        btn.setAttribute('aria-label', 'Hoofddoel Historie & Streaks');
        btn.title = 'Hoofddoel Historie & Streaks';
        btn.innerHTML = LUCIDE_ICONS.target(18);

        viewHeaderActions.insertBefore(btn, viewHeaderActions.firstChild);
    }

    // Opens the native Todoist task detail view/overlay for a given task id.
    // Prefers clicking the actual task row (identical to a normal click and keeps
    // Todoist's own overlay behavior); falls back to SPA navigation to the task URL
    // when the task is not present in the current DOM (e.g. scrolled out or filtered).
    function openTaskDetail(taskId) {
        if (!taskId) return;

        const taskItem = document.querySelector(
            `li.task_list_item[data-item-id="${taskId}"], [data-item-id="${taskId}"]`
        );
        if (taskItem && isVisible(taskItem)) {
            const clickable = taskItem.querySelector(
                '.task_content, [class*="task_content"], .task_item__content, [data-testid="task-content"]'
            ) || taskItem;
            clickable.click();
            return;
        }

        // Fallback: navigate the SPA router to the task URL.
        const url = `/app/task/${taskId}`;
        try {
            history.pushState({}, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (e) {
            window.location.assign(url);
        }
    }

    // True when the current route is a Todoist task detail view (opened as an
    // overlay on top of the current page, e.g. /app/today/task/<id> or /app/task/<id>).
    function isTaskDetailRoute() {
        return /\/task\/[^/]+$/.test(location.pathname);
    }

    // Renders the Hero Focus Card inside view_content, matching the exact 800px task-column width
    function renderHeroFocusCard() {
        const main = document.querySelector('main');
        if (!main) return;

        const existingCard = document.getElementById('todoist-enhanced-hero-card');

        if (!isDailyGoalPage()) {
            // When a task detail view opens on top of a daily-goal page, the route
            // changes to a task route but the daily-goal view stays behind it
            // (blurred). Keep the existing hero card in place so it doesn't flicker
            // out and back in. Only remove it when we've actually left the page.
            if (isTaskDetailRoute() && existingCard) return;
            if (existingCard) existingCard.remove();
            return;
        }

        const viewContent = main.querySelector('.view_content');
        if (!viewContent) return;

        const activeGoal = loadDailyGoalState();

        // State caching signature to prevent DOM thrashing and flickering
        const isCompleted = Boolean(activeGoal && activeGoal.completed);

        let priority = activeGoal?.priority;
        if (activeGoal && activeGoal.taskId) {
            const taskItem = document.querySelector(`li.task_list_item[data-item-id="${activeGoal.taskId}"]`);
            if (taskItem) {
                let changed = false;

                // Keep the stored priority in sync with the live task.
                const detected = getTaskItemPriority(taskItem);
                if (detected && detected !== priority) {
                    priority = detected;
                    activeGoal.priority = detected;
                    changed = true;
                }

                // Keep the stored task name in sync in case it was renamed in Todoist.
                const liveName = getTaskItemTitle(taskItem);
                if (liveName && liveName !== activeGoal.taskName) {
                    activeGoal.taskName = liveName;
                    changed = true;

                    // Mirror the rename into today's history entry so the history
                    // list and calendar stay consistent.
                    const todayStr = getLocalDateString();
                    const history = loadGoalHistory();
                    if (history[todayStr] && history[todayStr].taskId === activeGoal.taskId) {
                        history[todayStr].taskName = liveName;
                        saveGoalHistory(history);
                    }
                }

                if (changed) saveDailyGoalState(activeGoal);
            }
        }
        if (!priority) priority = 4;

        const currentSignature = `${isDailyGoalPage()}|${activeGoal ? activeGoal.taskId : 'none'}|${activeGoal ? activeGoal.taskName : ''}|${priority}|${isCompleted}`;

        if (existingCard && existingCard.dataset.renderSignature === currentSignature) {
            return; // DOM already reflects active state, do not rebuild
        }

        const card = existingCard || document.createElement('div');
        card.id = 'todoist-enhanced-hero-card';
        card.dataset.renderSignature = currentSignature;
        card.className = `todoist-enhanced-hero-card${isCompleted ? ' is-completed' : ''}`;

        if (activeGoal) {
            card.innerHTML = `
                <div class="todoist-enhanced-hero-row">
                    <div class="todoist-enhanced-hero-left">
                        <button class="todoist-enhanced-hero-checkbox priority-${priority}${isCompleted ? ' is-checked' : ''}" title="${isCompleted ? 'Als niet voltooid markeren' : 'Als voltooid markeren'}">
                            ${isCompleted ? LUCIDE_ICONS.check(13) : `<span class="hero-cb-hover-check">${LUCIDE_ICONS.check(12)}</span>`}
                        </button>
                        <div class="todoist-enhanced-hero-text-col">
                            <div class="todoist-enhanced-hero-title">${activeGoal.taskName || 'Hoofddoel'}</div>
                            <div class="todoist-enhanced-hero-subtitle">${isCompleted ? 'Doel van vandaag voltooid' : 'Hoofddoel van vandaag'}</div>
                        </div>
                    </div>
                    <div class="todoist-enhanced-hero-actions">
                        <button class="todoist-enhanced-icon-btn hero-clear-btn" title="Doel van vandaag resetten" aria-label="Doel van vandaag resetten">
                            ${LUCIDE_ICONS.rotateCcw(15)}
                        </button>
                    </div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="todoist-enhanced-hero-row">
                    <div class="todoist-enhanced-hero-left">
                        <div class="todoist-enhanced-hero-icon-box">
                            ${LUCIDE_ICONS.target(18)}
                        </div>
                        <div class="todoist-enhanced-hero-text-col">
                            <div class="todoist-enhanced-hero-title">Focus van de Dag</div>
                            <div class="todoist-enhanced-hero-subtitle">Nog geen doel geselecteerd</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (!existingCard) {
            viewContent.insertBefore(card, viewContent.firstChild);
        }
    }

    function getTaskItemTitle(item) {
        const contentEl = item?.querySelector('.task_content, [class*="task_content"], .task_item__content, [data-testid="task-content"]');
        if (!contentEl) return (item?.textContent || '').trim();
        const clone = contentEl.cloneNode(true);
        clone.querySelectorAll('.todoist-enhanced-task-goal-badge').forEach(b => b.remove());
        return clone.textContent.trim();
    }

    // Completely clears focus and active keyboard shortcut state on a task row
    function clearTaskFocus(item) {
        const doClear = () => {
            if (!item) return;
            const body = item.querySelector('.task_list_item__body');
            const btn = item.querySelector('.todoist-enhanced-task-goal-btn');
            if (btn) btn.blur();
            if (body) body.blur();
            item.blur();
            item.classList.remove('task_list_item--keyboard_shortcuts_active');
            if (document.activeElement && document.activeElement !== document.body) {
                document.activeElement.blur();
            }
        };
        doClear();
        requestAnimationFrame(doClear);
        setTimeout(doClear, 40);
    }

    // Mounts inline badge beside task name and hover button in actions row
    function ensureTaskGoalButton(item, currentActiveGoal) {
        const itemId = item.getAttribute('data-item-id') || item.dataset.itemId;
        if (!itemId) return;

        const activeGoal = currentActiveGoal !== undefined ? currentActiveGoal : loadDailyGoalState();
        const isCurrentGoal = Boolean(activeGoal && activeGoal.taskId === itemId);

        // 1. Manage the persistent inline badge beside the task name
        const contentEl = item.querySelector('.task_content, [class*="task_content"], .task_item__content, [data-testid="task-content"]');
        if (contentEl) {
            let badge = contentEl.querySelector('.todoist-enhanced-task-goal-badge');
            if (isCurrentGoal) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'todoist-enhanced-task-goal-badge';
                    badge.innerHTML = `${LUCIDE_ICONS.target(13)} <span>Hoofddoel</span>`;
                    badge.title = 'Hoofddoel van vandaag (klik om te wissen)';
                    badge.tabIndex = -1;
                    contentEl.appendChild(badge);
                }
            } else if (badge) {
                badge.remove();
            }
        }

        // 2. Mount hover button into .task_list_item__body (outside React actions container)
        const body = item.querySelector('.task_list_item__body') || item;
        if (body) {
            let btn = body.querySelector('.todoist-enhanced-task-goal-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.className = 'todoist-enhanced-task-goal-btn';
                btn.type = 'button';
                btn.tabIndex = -1;
                btn.setAttribute('data-enhanced-item-id', itemId);
                body.appendChild(btn);
            }

            // Only update DOM when state changes (zero DOM or innerHTML thrashing)
            const wasCurrentGoal = btn.dataset.isCurrentGoal === 'true';
            if (isCurrentGoal !== wasCurrentGoal || !btn.dataset.initialized) {
                btn.dataset.isCurrentGoal = String(isCurrentGoal);
                btn.dataset.initialized = 'true';
                if (isCurrentGoal) {
                    btn.classList.add('is-active');
                    btn.setAttribute('aria-label', 'Hoofddoel van vandaag (klik om te wissen)');
                    btn.title = 'Hoofddoel van vandaag (klik om te wissen)';
                } else {
                    btn.classList.remove('is-active');
                    btn.setAttribute('aria-label', 'Instellen als hoofddoel van vandaag');
                    btn.title = 'Instellen als hoofddoel van vandaag';
                }
                btn.innerHTML = LUCIDE_ICONS.target(16);
            }
        }
    }

    function renderTaskGoalButtons() {
        const taskItems = document.querySelectorAll('li.task_list_item, [data-testid="task-list-item"]');
        if (!taskItems.length) return;
        let activeGoal = loadDailyGoalState();
        // Reconcile the stored task id with the DOM in case Todoist swapped a
        // freshly-created task's placeholder id for its real server id after sync.
        activeGoal = reconcileGoalTaskId(activeGoal, taskItems) || activeGoal;
        taskItems.forEach(item => ensureTaskGoalButton(item, activeGoal));
    }

    // When a task is set as goal immediately after creation, Todoist stores a
    // temporary placeholder id in the DOM which is later replaced by the real
    // server id once sync completes. That leaves our stored goal.taskId stale, so
    // the task no longer appears highlighted even though it is still the goal.
    // This heals the stored id by matching on the (unique) task title.
    function reconcileGoalTaskId(activeGoal, taskItems) {
        if (!activeGoal || !activeGoal.taskId || !activeGoal.taskName) return activeGoal;

        // If a row with the stored id already exists in the DOM, nothing to fix.
        for (const item of taskItems) {
            const id = item.getAttribute('data-item-id') || item.dataset.itemId;
            if (id && id === activeGoal.taskId) return activeGoal;
        }

        // No id match. Look for a unique title match to heal the id.
        const goalTitle = normalize(activeGoal.taskName);
        if (!goalTitle) return activeGoal;

        let matchId = null;
        let matchCount = 0;
        for (const item of taskItems) {
            const id = item.getAttribute('data-item-id') || item.dataset.itemId;
            if (!id) continue;
            if (normalize(getTaskItemTitle(item)) === goalTitle) {
                matchCount++;
                matchId = id;
            }
        }

        // Only heal on an unambiguous single match.
        if (matchCount !== 1 || !matchId || matchId === activeGoal.taskId) return activeGoal;

        const oldId = activeGoal.taskId;
        activeGoal.taskId = matchId;
        saveDailyGoalState(activeGoal);

        // Keep today's history entry id in sync as well.
        const todayStr = getLocalDateString();
        const history = loadGoalHistory();
        if (history[todayStr] && history[todayStr].taskId === oldId) {
            history[todayStr].taskId = matchId;
            saveGoalHistory(history);
        }

        log(`Reconciled goal task id: ${oldId} -> ${matchId}`);
        return activeGoal;
    }

    // Listens for native task completions to update Daily Goal state
    function attachGlobalEventListeners() {
        if (document.documentElement.dataset.todoistEnhancedListenersActive) return;
        document.documentElement.dataset.todoistEnhancedListenersActive = 'true';

        // Hover listener to instantly mount target button into task actions
        document.addEventListener('pointerenter', (e) => {
            const item = e.target.closest && e.target.closest('li.task_list_item, [data-testid="task-list-item"]');
            if (item) ensureTaskGoalButton(item);
        }, true);

        // Intercept pointerdown and mousedown so task body/row never gains focus or keyboard shortcut active border
        document.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.todoist-enhanced-task-goal-btn, .todoist-enhanced-task-goal-badge')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);

        document.addEventListener('mousedown', (e) => {
            if (e.target.closest('.todoist-enhanced-task-goal-btn, .todoist-enhanced-task-goal-badge')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);

        // Robust delegated click handler
        document.addEventListener('click', (e) => {
            // 1. Close modal button
            if (e.target.closest('.close-modal-btn')) {
                e.preventDefault();
                e.stopPropagation();
                closeHistoryModal();
                return;
            }

            // 2. Click outside modal content (overlay backdrop)
            const modalOverlay = document.getElementById('todoist-enhanced-history-modal');
            if (modalOverlay && e.target === modalOverlay) {
                e.preventDefault();
                e.stopPropagation();
                closeHistoryModal();
                return;
            }

            // 2b. View switcher tab click
            const viewTab = e.target.closest('.todoist-enhanced-view-tab');
            if (viewTab) {
                e.preventDefault();
                e.stopPropagation();
                const targetView = viewTab.dataset.view;
                if (!targetView) return;

                const modal = viewTab.closest('#todoist-enhanced-history-modal');
                if (!modal) return;

                setStorageItem(STORAGE_KEY_MODAL_VIEW, targetView);
                modal.dataset.activeView = targetView;

                modal.querySelectorAll('.todoist-enhanced-view-tab').forEach(tab => {
                    const isActive = tab.dataset.view === targetView;
                    tab.classList.toggle('is-active', isActive);
                    tab.setAttribute('aria-selected', String(isActive));
                });

                const panelGrid = modal.querySelector('#todoist-enhanced-panel-grid');
                const panelCal = modal.querySelector('#todoist-enhanced-panel-calendar');
                if (panelGrid) panelGrid.classList.toggle('is-hidden', targetView !== 'grid');
                if (panelCal) panelCal.classList.toggle('is-hidden', targetView !== 'calendar');
                return;
            }

            // 2c. Calendar month navigation
            const calNavBtn = e.target.closest('.cal-prev-btn, .cal-next-btn, .cal-today-btn');
            if (calNavBtn) {
                e.preventDefault();
                e.stopPropagation();
                const modal = calNavBtn.closest('#todoist-enhanced-history-modal');
                if (!modal) return;

                let year = parseInt(modal.dataset.calYear, 10);
                let month = parseInt(modal.dataset.calMonth, 10);
                if (isNaN(year) || isNaN(month)) {
                    const now = new Date();
                    year = now.getFullYear();
                    month = now.getMonth();
                }

                if (calNavBtn.classList.contains('cal-prev-btn')) {
                    month--;
                    if (month < 0) {
                        month = 11;
                        year--;
                    }
                } else if (calNavBtn.classList.contains('cal-next-btn')) {
                    month++;
                    if (month > 11) {
                        month = 0;
                        year++;
                    }
                } else if (calNavBtn.classList.contains('cal-today-btn')) {
                    const now = new Date();
                    year = now.getFullYear();
                    month = now.getMonth();
                }

                updateCalendarView(modal, year, month);
                return;
            }

            // 2d. Reset a day from the history overview
            const resetDayBtn = e.target.closest('.reset-day-btn');
            if (resetDayBtn) {
                e.preventDefault();
                e.stopPropagation();
                const dateStr = resetDayBtn.dataset.resetDate;
                if (!dateStr) return;
                resetGoalDay(dateStr);
                refreshHistoryModal();
                return;
            }

            // 2e. Delete a day entirely from the history overview
            const deleteDayBtn = e.target.closest('.delete-day-btn');
            if (deleteDayBtn) {
                e.preventDefault();
                e.stopPropagation();
                const dateStr = deleteDayBtn.dataset.deleteDate;
                if (!dateStr) return;
                deleteGoalDay(dateStr);
                refreshHistoryModal();
                return;
            }

            // 3. Export JSON button
            if (e.target.closest('.export-json-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const history = loadGoalHistory();
                const todayStr = getLocalDateString();
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `todoist-daily-goals-${todayStr}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                return;
            }

            // 4. Open history modal (from header button or hero history icon)
            if (e.target.closest('#todoist-enhanced-header-goal-btn, .hero-history-btn')) {
                e.preventDefault();
                e.stopPropagation();
                openHistoryModal();
                return;
            }

            // 5. Clear daily goal
            if (e.target.closest('.hero-clear-btn')) {
                e.preventDefault();
                e.stopPropagation();
                clearDailyGoal();
                return;
            }

            // 6. Complete / Uncomplete from Hero Card
            if (e.target.closest('.todoist-enhanced-hero-checkbox')) {
                e.preventDefault();
                e.stopPropagation();
                const activeGoal = loadDailyGoalState();
                if (activeGoal) {
                    if (activeGoal.completed) {
                        // UNCOMPLETE GOAL
                        uncompleteDailyGoal();

                        // 1. If native Todoist Undo button in action toast is currently active on screen, click it
                        let undoneViaToast = false;
                        const undoBtn = document.querySelector('.global-toasts-provider-container button, [role="alert"] button');
                        if (undoBtn && (undoBtn.innerText.includes('Ongedaan') || undoBtn.innerText.includes('Undo'))) {
                            try {
                                undoBtn.click();
                                undoneViaToast = true;
                            } catch (err) {}
                        }

                        // 2. If toast was not active/clickable (e.g. expired after several seconds/minutes),
                        // send uncomplete command via Sync API and reload page to restore fresh task state
                        if (!undoneViaToast && activeGoal.taskId) {
                            const heroCb = document.querySelector('.todoist-enhanced-hero-checkbox');
                            if (heroCb) heroCb.style.opacity = '0.5';

                            syncTaskCompleteUndo(activeGoal.taskId).then(() => {
                                window.location.reload();
                            }).catch(() => {
                                window.location.reload();
                            });
                        }
                    } else {
                        // COMPLETE GOAL
                        let clickedNative = false;
                        if (activeGoal.taskId) {
                            const nativeItem = document.querySelector(`[data-item-id="${activeGoal.taskId}"]`);
                            const nativeCb = nativeItem?.querySelector('button.task_checkbox, [data-action-hint="task-complete"]');
                            if (nativeCb) {
                                nativeCb.click();
                                clickedNative = true;
                            }
                        }
                        if (!clickedNative && activeGoal.taskId) {
                            syncTaskComplete(activeGoal.taskId);
                        }
                        completeDailyGoal();
                    }
                }
                return;
            }

            // 7. Click anywhere on Hero Card to open history & streaks modal
            if (e.target.closest('.todoist-enhanced-hero-card')) {
                e.preventDefault();
                e.stopPropagation();
                const activeGoal = loadDailyGoalState();
                if (activeGoal && activeGoal.taskId) {
                    openTaskDetail(activeGoal.taskId);
                } else {
                    // No goal chosen yet: fall back to the history & streaks modal.
                    openHistoryModal();
                }
                return;
            }

            // 8. Click target button on task item
            const taskGoalBtn = e.target.closest('.todoist-enhanced-task-goal-btn');
            if (taskGoalBtn) {
                e.preventDefault();
                e.stopPropagation();
                const item = taskGoalBtn.closest('li.task_list_item, [data-item-id]');
                const itemId = taskGoalBtn.getAttribute('data-enhanced-item-id') || item?.getAttribute('data-item-id');
                const taskName = getTaskItemTitle(item);
                const taskPriority = getTaskItemPriority(item);
                if (itemId) setDailyGoal(itemId, taskName, taskPriority);
                clearTaskFocus(item);
                return;
            }

            // 9. Click inline goal badge beside task name
            const taskGoalBadge = e.target.closest('.todoist-enhanced-task-goal-badge');
            if (taskGoalBadge) {
                e.preventDefault();
                e.stopPropagation();
                const item = taskGoalBadge.closest('li.task_list_item, [data-item-id]');
                const itemId = item?.getAttribute('data-item-id') || item?.dataset.itemId;
                const taskName = getTaskItemTitle(item);
                const taskPriority = getTaskItemPriority(item);
                if (itemId) setDailyGoal(itemId, taskName, taskPriority);
                clearTaskFocus(item);
                return;
            }

            // 10. Native task completion checkbox listener
            const nativeCheckbox = e.target.closest('button.task_checkbox, [data-action-hint="task-complete"]');
            if (nativeCheckbox) {
                const taskItem = nativeCheckbox.closest('li.task_list_item, [data-item-id]');
                if (taskItem) {
                    const itemId = taskItem.getAttribute('data-item-id') || taskItem.dataset.itemId;
                    const activeGoal = loadDailyGoalState();
                    if (activeGoal && activeGoal.taskId === itemId) {
                        if (!activeGoal.completed) {
                            completeDailyGoal();
                        } else {
                            uncompleteDailyGoal();
                        }
                    }
                }
            }

            // 11. Native Undo toast button listener (when clicking 'Ongedaan maken' in Todoist)
            const undoToastBtn = e.target.closest('.global-toasts-provider-container button, [role="alert"] button');
            if (undoToastBtn && (undoToastBtn.innerText.includes('Ongedaan') || undoToastBtn.innerText.includes('Undo'))) {
                const activeGoal = loadDailyGoalState();
                if (activeGoal && activeGoal.completed) {
                    uncompleteDailyGoal();
                }
            }
        }, true);

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeHistoryModal();
            }
            if (e.shiftKey && (e.key === 'G' || e.key === 'g')) {
                const tag = (e.target.tagName || '').toLowerCase();
                if (tag !== 'input' && tag !== 'textarea' && !e.target.isContentEditable) {
                    e.preventDefault();
                    toggleHistoryModal();
                }
            }
        });
    }

    /* ==========================================================================
       CENTRAL LIFECYCLE & ROUTE ENGINE
       ========================================================================== */

    let renderTimer = null;
    let lastPathname = location.pathname;

    function scheduleUpdates() {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => {
            ensureStyles();

            // Module 1: Day Planning Headings
            if (isDayPlanningPage()) {
                renderDayPlanningHeaders();
            } else {
                cleanupDayPlanningHeaders();
            }

            // Module 2: Quick Wins Headings
            if (isQuickWinsPage()) {
                renderQuickWinsHeaders();
            }

            // Module 3: Auto-Default Date
            applyDefaultDateIfNeeded();

            // Module 4: Daily Main Goal
            renderHeaderGoalButton();
            renderHeroFocusCard();
            renderTaskGoalButtons();
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
        ensureStyles();
        attachGlobalEventListeners();

        // Intercept SPA navigation (both sandbox and page window)
        const pageHistory = (typeof unsafeWindow !== 'undefined' && unsafeWindow.history) ? unsafeWindow.history : history;
        const origPushState = pageHistory.pushState;
        if (typeof origPushState === 'function') {
            pageHistory.pushState = function (...args) {
                const ret = origPushState.apply(this, args);
                onRouteChanged();
                return ret;
            };
        }

        const origReplaceState = pageHistory.replaceState;
        if (typeof origReplaceState === 'function') {
            pageHistory.replaceState = function (...args) {
                const ret = origReplaceState.apply(this, args);
                onRouteChanged();
                return ret;
            };
        }

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

        const target = document.body || document.documentElement;
        if (target) {
            observer.observe(target, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        // Initial trigger
        scheduleUpdates();

        log('Todoist: Enhanced v2.6.1 loaded.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
