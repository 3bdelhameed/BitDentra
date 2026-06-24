(function () {
    'use strict';

    const SESSION_KEY = 'clinicAuthSession';
    const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
    const HASH_PREFIX = 'pbkdf2_sha256';
    const HASH_ITERATIONS = 120000;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function encodeBase64(bytes) {
        let binary = '';
        bytes.forEach(byte => { binary += String.fromCharCode(byte); });
        return btoa(binary);
    }

    function decodeBase64(value) {
        const binary = atob(value);
        return Uint8Array.from(binary, ch => ch.charCodeAt(0));
    }

    function randomBytes(length) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return bytes;
    }

    async function deriveBits(password, saltBytes, iterations = HASH_ITERATIONS) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );
        const bits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations },
            key,
            256
        );
        return new Uint8Array(bits);
    }

    async function hashPassword(password) {
        const salt = randomBytes(16);
        const hash = await deriveBits(password, salt, HASH_ITERATIONS);
        return [HASH_PREFIX, HASH_ITERATIONS, encodeBase64(salt), encodeBase64(hash)].join('$');
    }

    function isStoredPasswordHashed(stored) {
        return typeof stored === 'string' && stored.startsWith(HASH_PREFIX + '$');
    }

    async function verifyPassword(password, storedValue) {
        const stored = String(storedValue || '');
        if (!stored) return false;

        if (!isStoredPasswordHashed(stored)) {
            return password === stored;
        }

        const parts = stored.split('$');
        if (parts.length !== 4) return false;

        const iterations = Number(parts[1]) || HASH_ITERATIONS;
        const salt = decodeBase64(parts[2]);
        const expected = parts[3];
        const actual = encodeBase64(await deriveBits(password, salt, iterations));
        return actual === expected;
    }

    function resolveUserField(user, primaryKey, fallbackKey, defaultValue = '') {
        if (!user || typeof user !== 'object') return defaultValue;
        if (user[primaryKey] != null && user[primaryKey] !== '') return user[primaryKey];
        if (fallbackKey && user[fallbackKey] != null && user[fallbackKey] !== '') return user[fallbackKey];
        return defaultValue;
    }

    function normalizePermissions(value) {
        if (Array.isArray(value)) {
            return value.filter(Boolean).map(item => String(item));
        }

        if (typeof value !== 'string' || !value.trim()) return [];

        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.filter(Boolean).map(item => String(item)) : [];
        } catch (_) {
            return [];
        }
    }

    function normalizeSessionUser(user, lang = (localStorage.getItem('clinicLang') || 'ar')) {
        const username = resolveUserField(user, 'username', '', '');
        const nameAr = resolveUserField(user, 'name_ar', 'nameAr', '');
        const nameEn = resolveUserField(user, 'name_en', 'nameEn', '');
        const permissionsConfigured = !!(
            user?.permissionsConfigured === true ||
            Array.isArray(user?.permissions) ||
            (typeof user?.permissions === 'string' && user.permissions.trim())
        );
        const displayName = resolveUserField(
            user,
            'displayName',
            '',
            lang === 'ar' ? (nameAr || nameEn || username || '') : (nameEn || nameAr || username || '')
        );
        const hasSnakeActive = user && Object.prototype.hasOwnProperty.call(user, 'is_active');
        const hasCamelActive = user && Object.prototype.hasOwnProperty.call(user, 'isActive');
        const isActive = hasSnakeActive ? user.is_active !== false : (hasCamelActive ? user.isActive !== false : true);

        return {
            id: user?.id,
            username,
            role: resolveUserField(user, 'role', '', 'doctor'),
            displayName,
            nameAr,
            nameEn,
            isActive,
            permissions: normalizePermissions(user?.permissions),
            permissionsConfigured
        };
    }

    function buildSessionUser(user, lang) {
        return normalizeSessionUser(user, lang);
    }

    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem('clinicLoggedIn');
        sessionStorage.removeItem('clinicUsername');
        sessionStorage.removeItem('clinicRole');
        sessionStorage.removeItem('clinicUserName');
        sessionStorage.removeItem('clinicPermissions');
    }

    function persistLegacySessionFields(user) {
        sessionStorage.setItem('clinicLoggedIn', '1');
        sessionStorage.setItem('clinicUsername', user.username || '');
        sessionStorage.setItem('clinicRole', user.role || '');
        sessionStorage.setItem('clinicUserName', user.displayName || '');
        sessionStorage.setItem('clinicPermissions', JSON.stringify(normalizePermissions(user.permissions)));
    }

    function setSession(user) {
        const sessionUser = normalizeSessionUser(user);
        const now = Date.now();
        const payload = {
            version: 2,
            issuedAt: now,
            expiresAt: now + SESSION_TTL_MS,
            user: sessionUser
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
        persistLegacySessionFields(sessionUser);
        return payload;
    }

    function getSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.user || !parsed.expiresAt || Date.now() > parsed.expiresAt) {
                clearSession();
                return null;
            }
            parsed.user = normalizeSessionUser(parsed.user);
            persistLegacySessionFields(parsed.user);
            return parsed;
        } catch (_) {
            clearSession();
            return null;
        }
    }

    function isAuthenticated() {
        return !!getSession();
    }

    function getCurrentUser() {
        const session = getSession();
        return session ? session.user : null;
    }

    function getCurrentRole() {
        return getCurrentUser()?.role || 'doctor';
    }

    function getCurrentUsername() {
        return getCurrentUser()?.username || '';
    }

    function getCurrentDisplayName() {
        return getCurrentUser()?.displayName || '';
    }

    function getCurrentPermissions() {
        return normalizePermissions(getCurrentUser()?.permissions);
    }

    function requireSession(redirectUrl = 'login.html') {
        if (!isAuthenticated()) {
            window.location.replace(redirectUrl);
            return false;
        }
        return true;
    }

    async function migrateLegacyUserPasswords(sb, users) {
        if (!sb || !Array.isArray(users) || !users.length) return 0;

        let migrated = 0;
        for (const user of users) {
            const stored = String(user.password || '').trim();
            if (!stored || isStoredPasswordHashed(stored)) continue;

            try {
                const hashed = await hashPassword(stored);
                const { error } = await sb.from('clinic_users').update({ password: hashed }).eq('id', user.id);
                if (error) throw error;
                user.password = hashed;
                migrated += 1;
            } catch (err) {
                console.warn('[Auth] Password migration failed for user', user.id, err.message);
            }
        }
        return migrated;
    }

    window.escapeHtml = escapeHtml;
    window.clinicAuth = {
        buildSessionUser,
        clearSession,
        getCurrentDisplayName,
        getCurrentPermissions,
        getCurrentRole,
        getCurrentUser,
        getCurrentUsername,
        getSession,
        hashPassword,
        isAuthenticated,
        isStoredPasswordHashed,
        migrateLegacyUserPasswords,
        requireSession,
        setSession,
        verifyPassword
    };
})();
