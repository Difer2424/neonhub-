const StateModule = (() => {
    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
        return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const colors = {
            info: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
            success: 'bg-emerald-600 text-white',
            warn: 'bg-amber-500 text-slate-950'
        };
        const el = document.createElement('div');
        el.className = `pointer-events-auto px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg transition-all duration-300 ${colors[type] || colors.info}`;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(6px)';
            setTimeout(() => el.remove(), 250);
        }, 2600);
    }

    // Генерация полностью выдуманного демо-скриншота (фантастический заказ)
    function createDemoScreenshotBlob() {
        return new Promise((resolve) => {
            const c = document.createElement('canvas');
            c.width = 800;
            c.height = 480;
            const ctx = c.getContext('2d');

            // Тёмный современный фон в стиле Neon Hub
            ctx.fillStyle = '#131314';
            ctx.fillRect(0, 0, c.width, c.height);

            // Карточка заказа
            ctx.fillStyle = '#1E1F20';
            ctx.strokeStyle = 'rgba(255,255,255,0.10)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(32, 32, 736, 416, 20);
            ctx.fill();
            ctx.stroke();

            // Шапка карточки
            ctx.fillStyle = '#28292A';
            ctx.beginPath();
            ctx.roundRect(32, 32, 736, 66, [20, 20, 0, 0]);
            ctx.fill();

            ctx.fillStyle = '#E3E3E3';
            ctx.font = 'bold 18px "Golos Text", Inter, sans-serif';
            const isEn = window.I18nModule && I18nModule.getLang() === 'en';
            ctx.fillText(isEn ? 'Receipt #DEMO-0000  •  Fictional Order' : 'Квитанция #DEMO-0000  •  Вымышленный заказ', 58, 72);

            // Бейдж DEMO справа
            ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
            ctx.beginPath();
            ctx.roundRect(638, 50, 104, 30, 15);
            ctx.fill();
            ctx.fillStyle = '#34D399';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('TEST DATA', 657, 70);

            const rows = [
                [isEn ? 'Recipient:' : 'Получатель:', isEn ? 'Captain Orion Starlight' : 'Капитан Орион Звёздный'],
                [isEn ? 'Comm ID:' : 'Код связи:', '+0 (000) 000-00-00'],
                [isEn ? 'Mock Card:' : 'Карта-макет:', '0000 •••• •••• 0000'],
                [isEn ? 'Email:' : 'Почта:', 'orion.demo@fictional.local'],
                [isEn ? 'Address:' : 'Адрес доставки:', isEn ? 'Neo-City, 404 Cloud St, Apt 0' : 'г. Нео-Сити, ул. Облачная, д. 404, кв. 0'],
                [isEn ? 'Total:' : 'Итого:', isEn ? '42,000 credits (Fictional receipt)' : '42 000 кредитов (Вымышленный чек)']
            ];

            rows.forEach(([label, val], idx) => {
                const y = 148 + idx * 50;
                if (idx > 0) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(58, y - 30);
                    ctx.lineTo(742, y - 30);
                    ctx.stroke();
                }
                ctx.fillStyle = '#9E9E9E';
                ctx.font = '500 15px "Golos Text", Inter, sans-serif';
                ctx.fillText(label, 58, y);

                ctx.fillStyle = idx === 5 ? '#34D399' : '#F4F4F5';
                ctx.font = '600 15px "JetBrains Mono", monospace';
                ctx.fillText(val, 236, y);
            });

            c.toBlob((blob) => resolve(new File([blob], 'fictional-demo-order.png', { type: 'image/png' })), 'image/png');
        });
    }

    const PROCESSED_KEY = 'neonhub-processed-bytes';

    function getProcessedBytes() {
        try { return Number(localStorage.getItem(PROCESSED_KEY) || 0) || 0; } catch (e) { return 0; }
    }

    function updateProcessedBadge() {
        const el = document.getElementById('sidebar-processed-stat');
        if (!el) return;
        const total = getProcessedBytes();
        if (total > 0) {
            el.textContent = (window.I18nModule && I18nModule.getLang() === 'en') ? `Processed locally: ${formatBytes(total)}` : `Обработано локально: ${formatBytes(total)}`;
            el.classList.remove('hidden');
        }
    }

    function trackProcessed(bytes) {
        if (!bytes || bytes <= 0) return;
        try {
            const next = getProcessedBytes() + Number(bytes);
            localStorage.setItem(PROCESSED_KEY, String(next));
        } catch (e) {}
        updateProcessedBadge();
    }

    function trackEvent(goalName, params = {}) {
        try {
            if (typeof window.ym === 'function' && window.NEONHUB_YM_ID) {
                window.ym(window.NEONHUB_YM_ID, 'reachGoal', goalName, params);
            }
        } catch (e) {}
    }

    function refreshCounterLabel() { addProcessedBytes(0); }

    return { formatBytes, escapeHtml, toast, createDemoScreenshotBlob, trackProcessed, updateProcessedBadge, trackEvent };
})();
