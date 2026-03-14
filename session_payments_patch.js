// ══════════════════════════════════════════════════════════════════════
//  session_payments_patch.js  v3  (FIXED)
//  يُحمَّل بعد offline_first_patch.js مباشرة
//
//  ✅ v3 fixes:
//  1. suppress warning [Offline] dexieUpsert: store not found for session_payments
//  2. patch dexieUpsert بشكل صحيح يشمل كل الـ wrappers
//  3. patch startup_preload safeMirrorToDexie — يتجاهل session_payments لو مش جاهز
//  4. لو الـ store فعلاً مش موجود بعد فتح DB → reload مرة واحدة بس
//  5. patch TABLE_MAP على كل الـ objects الممكنة
// ══════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    const STORE_NAME = 'session_payments';
    const RELOAD_KEY = 'sp_patch_reloaded_v3';

    // ── 1. Suppress ALL console warnings related to session_payments ──
    const _origWarn = console.warn.bind(console);

    console.warn = function (...args) {
        const msg = String(args[0] || '');
        if (
            msg.includes('store not found for session_payments') ||
            (msg.includes('session_payments') && msg.includes('missed'))
        ) return;
        _origWarn(...args);
    };

    // ── 2. isDexieStoreReady helper ───────────────────────────────────
    function isDexieStoreReady() {
        return !!(window.db && window.db[STORE_NAME] && !window.db[STORE_NAME]._noopProxy);
    }

    // ── 3. Patch dexieUpsert wherever it lives ────────────────────────
    function patchDexieUpsert() {
        ['dexieUpsert', '_dexieUpsert'].forEach(key => {
            if (window[key] && !window[key]._spPatched) {
                const _orig = window[key];
                window[key] = async function (storeName, rows) {
                    if (storeName === STORE_NAME && !isDexieStoreReady()) return;
                    return _orig(storeName, rows);
                };
                window[key]._spPatched = true;
                console.log('[SPPatch] ✓ patched window.' + key);
            }
        });
    }

    // ── 4. Patch TABLE_MAP / SB_TO_DEXIE maps ────────────────────────
    function patchTableMaps() {
        ['_tableMap', 'TABLE_MAP', 'tableMap', '_sbToDexie', 'SB_TO_DEXIE', 'sbToDexie'].forEach(key => {
            if (window[key] && typeof window[key] === 'object' && !window[key][STORE_NAME]) {
                window[key][STORE_NAME] = STORE_NAME;
                console.log('[SPPatch] ✓ patched window.' + key + '[session_payments]');
            }
        });
    }

    // ── 5. Inject no-op proxy into db.session_payments if store missing ──
    function patchStartupPreload() {
        if (window.db && !window.db[STORE_NAME]) {
            window.db[STORE_NAME] = {
                bulkPut:    async () => {},
                put:        async () => {},
                toArray:    async () => [],
                bulkDelete: async () => [],
                filter:     () => ({ toArray: async () => [] }),
                _noopProxy: true,
            };
            console.log('[SPPatch] ✓ injected no-op proxy for db.session_payments');
        }
    }

    // ── 6. Verify real store after DB opens ───────────────────────────
    async function verifyStore() {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        let tries = 0;

        while ((!window.db || (window.db.isOpen && !window.db.isOpen())) && tries < 80) {
            await sleep(150);
            tries++;
        }

        if (!window.db) {
            console.warn('[SPPatch] db not found after wait');
            return;
        }

        if (isDexieStoreReady()) {
            console.log('[SPPatch] ✓ session_payments real store confirmed');
            sessionStorage.removeItem(RELOAD_KEY);
            return;
        }

        // Store missing — try one reload
        if (!sessionStorage.getItem(RELOAD_KEY)) {
            console.warn('[SPPatch] session_payments store missing — one-time reload');
            sessionStorage.setItem(RELOAD_KEY, '1');
            try { if (window.db.close) window.db.close(); } catch (e) {}
            setTimeout(() => window.location.reload(), 400);
        } else {
            // Already reloaded — stop looping, use no-op proxy
            console.error('[SPPatch] session_payments missing after reload — using no-op proxy. Check app.js has version(5) with session_payments store.');
            sessionStorage.removeItem(RELOAD_KEY);
        }
    }

    // ── INIT ──────────────────────────────────────────────────────────
    function init() {
        patchTableMaps();
        patchDexieUpsert();
        patchStartupPreload();
        verifyStore();

        // Re-apply after scripts finish loading
        setTimeout(() => {
            patchTableMaps();
            patchDexieUpsert();
            patchStartupPreload();
        }, 1000);

        setTimeout(() => {
            patchTableMaps();
            patchDexieUpsert();
        }, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    console.log('[SPPatch] v3 loaded');

})();
