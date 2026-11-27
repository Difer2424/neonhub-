// =========================================================================
// REAL QR CODE GENERATOR (URL / WI-FI / TELEGRAM -> PNG & SVG)
// =========================================================================

const QrGenModule = (() => {
    let mode = 'url';
    let lastSvg = '';

    function init() {
        const preview = document.getElementById('qrgen-preview');
        if (!preview) return;

        document.querySelectorAll('.qrgen-mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                mode = btn.dataset.qrmode;
                document.querySelectorAll('.qrgen-mode-btn').forEach((b) => {
                    const active = b.dataset.qrmode === mode;
                    b.classList.toggle('bg-white', active);
                    b.classList.toggle('dark:bg-white/10', active);
                    b.classList.toggle('text-slate-900', active);
                    b.classList.toggle('dark:text-white', active);
                    b.classList.toggle('shadow-sm', active);
                    b.classList.toggle('subtab-active', active);
                    b.classList.toggle('text-slate-500', !active);
                });
                ['url', 'wifi', 'tg'].forEach((m) => {
                    document.getElementById(`qrgen-panel-${m}`).classList.toggle('hidden', m !== mode);
                });
                render();
            });
        });

        ['qrgen-url-input', 'qrgen-wifi-ssid', 'qrgen-wifi-pass', 'qrgen-wifi-enc', 'qrgen-tg-user', 'qrgen-fg', 'qrgen-bg'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', render);
        });

        document.getElementById('qrgen-dl-svg').addEventListener('click', () => {
            if (!lastSvg) return;
            const blob = new Blob([lastSvg], { type: 'image/svg+xml;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'neonhub-qr.svg';
            a.click();
            URL.revokeObjectURL(a.href);
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'QR-код сохранён в SVG!' : 'QR code saved as SVG!', 'success');
        });

        document.getElementById('qrgen-dl-png').addEventListener('click', () => {
            if (!lastSvg) return;
            const img = new Image();
            const svgBlob = new Blob([lastSvg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = 1024;
                c.height = 1024;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, 1024, 1024);
                URL.revokeObjectURL(url);
                c.toBlob((blob) => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'neonhub-qr.png';
                    a.click();
                    URL.revokeObjectURL(a.href);
                    StateModule.toast(I18nModule.getLang() === 'ru' ? 'QR-код сохранён в PNG (1024px)!' : 'QR code saved as PNG (1024px)!', 'success');
                }, 'image/png');
            };
            img.src = url;
        });

        render();
    }

    function getPayload() {
        if (mode === 'wifi') {
            const ssid = document.getElementById('qrgen-wifi-ssid').value.trim();
            const pass = document.getElementById('qrgen-wifi-pass').value;
            const enc = document.getElementById('qrgen-wifi-enc').value;
            if (!ssid) return 'WIFI:T:WPA;S:MyWiFi;P:password;;';
            const esc = (s) => s.replace(/([\\;,:"])/g, '\\$1');
            return enc === 'nopass'
                ? `WIFI:T:nopass;S:${esc(ssid)};;`
                : `WIFI:T:${enc};S:${esc(ssid)};P:${esc(pass)};;`;
        }
        if (mode === 'tg') {
            const u = document.getElementById('qrgen-tg-user').value.trim().replace(/^@/, '');
            return `https://t.me/${u || 'neonhub'}`;
        }
        return document.getElementById('qrgen-url-input').value.trim() || 'https://neon-hub.ru';
    }

    function render() {
        const preview = document.getElementById('qrgen-preview');
        const fg = document.getElementById('qrgen-fg').value || '#131314';
        const bg = document.getElementById('qrgen-bg').value || '#ffffff';
        preview.style.backgroundColor = bg;

        if (typeof qrcode === 'undefined') {
            preview.innerHTML = `<span class="text-xs text-zinc-400">${I18nModule.getLang() === 'ru' ? 'QR-библиотека загружается...' : 'Loading QR library...'}</span>`;
            return;
        }
        try {
            const qr = qrcode(0, 'M');
            qr.addData(unescape(encodeURIComponent(getPayload())));
            qr.make();
            const count = qr.getModuleCount();
            const pad = 2;
            const size = count + pad * 2;
            let rects = `<rect width="${size}" height="${size}" fill="${bg}"/>`;
            for (let r = 0; r < count; r++) {
                for (let c = 0; c < count; c++) {
                    if (qr.isDark(r, c)) {
                        rects += `<rect x="${c + pad}" y="${r + pad}" width="1" height="1" fill="${fg}"/>`;
                    }
                }
            }
            lastSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects}</svg>`;
            preview.innerHTML = lastSvg.replace('<svg ', '<svg class="w-full h-full" ');
        } catch (e) {
            preview.innerHTML = `<span class="text-xs text-rose-500">${I18nModule.getLang() === 'ru' ? 'Слишком длинный текст для QR' : 'Text is too long for QR'}</span>`;
        }
    }

    return { init };
})();
