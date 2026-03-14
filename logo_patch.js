
// ── LOGO PATCH ──────────────────────────────────────────────────
// Replaces the sidebar tooth icon with the real logo image
(function applyLogoPatch() {
    window.addEventListener('DOMContentLoaded', function() {
        // 1. Sidebar logo
        const sidebarLogoSpan = document.querySelector('aside .h-16 span.text-xl');
        if (sidebarLogoSpan) {
            const wrapper = sidebarLogoSpan.parentElement;
            const img = document.createElement('img');
            img.src = 'logo1.png';
            img.alt = 'BitDentra';
            img.style.cssText = 'height:50px;width:80;object-fit:contain;';
            img.onerror = function() {
                this.style.display = 'none';
                sidebarLogoSpan.style.display = 'flex';
            };
            sidebarLogoSpan.style.display = 'none';
            wrapper.insertBefore(img, sidebarLogoSpan);
        }

        // 2. Favicon / App icon
        const existingFavicon = document.querySelector('link[rel="icon"]');
        if (!existingFavicon) {
            const favicon = document.createElement('link');
            favicon.rel = 'icon';
            favicon.type = 'image/png';
            favicon.href = 'icon.png';
            document.head.appendChild(favicon);
        }

        const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
        if (appleTouchIcon) appleTouchIcon.href = 'icon.png';
    });
})();
