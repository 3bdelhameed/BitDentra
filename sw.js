// ✅ غيّر الرقم هنا كل ما تعمل تحديث لأي ملف JS
const CACHE_NAME = 'clinic-app-v8';

const LOCAL_FILES = [
    'login.html',
    'index.html',
    'app.js',
    'manifest.json',
    'supabase-config.js',
    'startup_preload.js',
    'offline_first_patch.js',
    'offline_sync_patch.js',
    'session_payments.js',
    'doctors_module.js',
    'doctors_and_patient_fix.js',
    'appointments_upgrade.js',
    'app_optimized_patch.js',
    'app_performance_patch.js',
    'tooth_picker_patch.js',
    'fix_patch.js',
    'fix_tooth_display.js',
    'logo_patch.js',
    'payment_update.js',
];

const CDN_PATTERNS = [
    'cdn.tailwindcss.com',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'cdn.sheetjs.com',
];

// ── Install ───────────────────────────────────────────────────────
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(
                LOCAL_FILES.map(url =>
                    cache.add(url).catch(err =>
                        console.warn('[SW] Could not cache:', url, err.message)
                    )
                )
            )
        )
    );
});

// ── Activate — امسح كل الـ caches القديمة ────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => {
                    console.log('[SW] Deleting old cache:', k);
                    return caches.delete(k);
                })
            ))
            .then(() => self.clients.claim())
    );
});

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = request.url;

    if (request.method !== 'GET') return;
    if (url.startsWith('chrome-extension://')) return;
    if (url.includes('supabase.co')) return; // never cache API calls

    const isLocal = LOCAL_FILES.some(f => url.endsWith('/' + f) || url.endsWith(f + '?') || url.endsWith(f));
    const isCDN   = CDN_PATTERNS.some(p => url.includes(p));

    if (isLocal) {
        // Network-first للـ JS files عشان التحديثات تتحمل فوراً
        // لو النت قطع → fallback للـ cache
        event.respondWith(
            fetch(request)
                .then(res => {
                    if (res && res.status === 200) {
                        // ✅ clone قبل الاستخدام
                        const resClone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(request, resClone));
                    }
                    return res;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    if (isCDN) {
        // Stale-while-revalidate للـ CDN
        event.respondWith(
            caches.open(CACHE_NAME).then(cache =>
                cache.match(request).then(cached => {
                    const fetchPromise = fetch(request).then(res => {
                        if (res && res.status === 200) cache.put(request, res.clone());
                        return res;
                    }).catch(() => cached);
                    return cached || fetchPromise;
                })
            )
        );
        return;
    }

    // Everything else: network with cache fallback
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});
