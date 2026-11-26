// =========================================================================
// ROUTER, COMMAND PALETTE (CMD+K) & APP BOOTSTRAP
// =========================================================================

const CommandPaletteModule = (() => {
    const TOOLS = [
        { route: '/de-ai-text', cat: 'Текст', ru: 'Анти-ИИ очистка текста', en: 'De-AI Text Cleaner', descRu: 'Удалить водяные знаки, тире, клише', descEn: 'Strip watermarks, dashes, clichés', kw: 'анти ии ai watermark zwsp bom тире клише нейросеть chatgpt' },
        { route: '/blur-screenshot', cat: 'Фото', ru: 'Цензор фото + EXIF', en: 'Censor + EXIF Stripper', descRu: 'Замазать данные, пикселизация, удаление EXIF', descEn: 'Blur, pixelate, strip EXIF metadata', kw: 'блюр цензор замазать скриншот фото exif gps приватность' },
        { route: '/resize-photo', cat: 'Фото', ru: 'Изменение размера фото', en: 'Photo Resize Presets', descRu: 'Telegram, Ozon/WB, 3×4, YouTube 1280×720', descEn: 'Telegram, 3×4, YouTube presets', kw: 'размер ресайз фото озон wb ozon telegram стикер 3x4 youtube' },
        { route: '/clean-pdf-text', cat: 'Текст', ru: 'Очистка текста из PDF', en: 'PDF Text Cleaner', descRu: 'Склеить переносы и рваные строки', descEn: 'Join hyphenated words & line breaks', kw: 'pdf пдф текст переносы строки очистить' },
        { route: '/compare-documents', cat: 'Текст', ru: 'Сравнение текстов (Diff)', en: 'Compare Documents (Diff)', descRu: 'Отличия по строкам и словам', descEn: 'Line & word comparison', kw: 'diff сравнить договор версии отличия текст' },
        { route: '/tables-converter', cat: 'Текст', ru: 'Конвертер таблиц (Excel/CSV)', en: 'Tables Converter', descRu: 'Конвертация, сортировка, удаление дубликатов', descEn: 'CSV ↔ JSON ↔ Excel cleaner', kw: 'таблицы excel эксель xlsx csv json дубликаты сортировка' },
        { route: '/video-to-gif', cat: 'Медиа', ru: 'Конвертер видео в GIF', en: 'Video to GIF', descRu: 'Отрезок 1–10с с локальным LZW-кодером', descEn: '1–10s local GIF89a encoder', kw: 'видео гиф gif mp4 webm конвертер' },
        { route: '/audio-surgeon', cat: 'Медиа', ru: 'Удаление пауз в аудио', en: 'Audio Surgeon & Recorder', descRu: 'Запись голоса и авто-вырезание тишины', descEn: 'Voice recorder & silence trimmer', kw: 'аудио диктофон микрофон тишина паузы вырезать волна wav' },
        { route: '/audio-to-text', cat: 'Медиа', ru: 'Транскрибация аудио в текст', en: 'Audio to Text (Whisper)', descRu: 'Живая диктовка и офлайн нейросеть', descEn: 'Live dictation & offline Whisper', kw: 'транскрибация голос текст whisper диктовка речь расшифровка' },
        { route: '/compress-video-discord', cat: 'Медиа', ru: 'Сжатие видео до 10 МБ', en: 'Discord 10 MB Compressor', descRu: 'Расчёт битрейта и извлечение WAV', descEn: 'Bitrate calculator & WAV extract', kw: 'discord дискорд сжать видео 10 мб битрейт ffmpeg wav' },
        { route: '/quick-utils', cat: 'Утилиты', ru: 'Утилиты (цвет, хеш, px)', en: 'Quick Utilities', descRu: 'Пипетка с лупой, пароли, SHA-256, px ↔ мм', descEn: 'Color loupe, passwords, SHA-256, px↔mm', kw: 'пипетка цвет hex rgb hsl пароль sha256 хеш пиксели мм см dpi' },
        { route: '/compress-photo', cat: 'Фото', ru: 'Пакетное сжатие фото (ZIP)', en: 'Batch Photo Compressor', descRu: 'Сжать до 50 фото в WebP / JPG и скачать ZIP', descEn: 'Compress up to 50 photos to WebP/JPG ZIP', kw: 'сжать фото webp jpg png zip пакетное конвертер вес' },
        { route: '/pdf-tools', cat: 'Текст', ru: 'PDF-комбайн (слить / разделить)', en: 'PDF Toolkit (Merge / Split)', descRu: 'Объединить, вырезать страницы, повернуть PDF', descEn: 'Merge, extract pages & rotate PDF locally', kw: 'pdf пдф объединить слить разделить повернуть страницы' },
        { route: '/stitch-screenshots', cat: 'Фото', ru: 'Склейка скриншотов / Коллаж', en: 'Stitch Screenshots', descRu: 'Склеить несколько скриншотов вертикально или в сетку', descEn: 'Combine multiple screenshots vertically or in a grid', kw: 'склейка скриншотов коллаж объединить фото вертикально сетка' },
        { route: '/remove-bg', cat: 'Фото', ru: 'Удаление фона с фото', en: 'Remove Image Background', descRu: 'Локальная нейросеть и мгновенное удаление однотонного фона', descEn: 'Local AI & instant solid background removal', kw: 'удалить фон вырезать png прозрачный фон background remover' },
        { route: '/code-formatter', cat: 'Текст', ru: 'Форматтер JSON / XML / SQL', en: 'JSON / XML / SQL Formatter', descRu: 'Красивое форматирование, валидация и минификация кода', descEn: 'Prettify, validate & minify JSON, XML, SQL', kw: 'json xml sql форматтер валидатор minify prettify код' },
        { route: '/qr-generator', cat: 'Утилиты', ru: 'Генератор QR-кодов (Wi-Fi / URL)', en: 'QR Code Generator', descRu: 'Реальные QR-коды для ссылок, Wi-Fi и Telegram (PNG/SVG)', descEn: 'Scannable QR codes for URL, Wi-Fi, Telegram', kw: 'qr кюар код генератор wifi ссылка telegram svg png' },
        { route: '/p2p-transfer', cat: 'Утилиты', ru: 'Передача файлов по QR', en: 'P2P QR Transfer', descRu: 'Отправить файл с ПК на телефон', descEn: 'Send files to phone via QR', kw: 'qr p2p передать файл телефон airdrop' }
    ];

    let isOpen = false;
    let activeIdx = 0;
    let filtered = [...TOOLS];

    function init() {
        const modal = document.getElementById('cmdk-modal');
        const backdrop = document.getElementById('cmdk-backdrop');
        const input = document.getElementById('cmdk-input');
        const trigger = document.getElementById('cmdk-trigger');

        if (!modal || !input) return;

        if (trigger) trigger.addEventListener('click', open);
        backdrop.addEventListener('click', close);

        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                isOpen ? close() : open();
            } else if (isOpen && e.key === 'Escape') {
                e.preventDefault();
                close();
            } else if (isOpen && e.key === 'ArrowDown') {
                e.preventDefault();
                activeIdx = (activeIdx + 1) % Math.max(1, filtered.length);
                render();
            } else if (isOpen && e.key === 'ArrowUp') {
                e.preventDefault();
                activeIdx = (activeIdx - 1 + Math.max(1, filtered.length)) % Math.max(1, filtered.length);
                render();
            } else if (isOpen && e.key === 'Enter') {
                e.preventDefault();
                if (filtered[activeIdx]) {
                    RouterModule.navigateSeo(filtered[activeIdx].route);
                    close();
                }
            }
        });

        input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            filtered = q
                ? TOOLS.filter((t) => `${t.ru} ${t.en} ${t.descRu} ${t.descEn} ${t.kw} ${t.route}`.toLowerCase().includes(q))
                : [...TOOLS];
            activeIdx = 0;
            render();
        });
    }

    function open() {
        isOpen = true;
        const modal = document.getElementById('cmdk-modal');
        const input = document.getElementById('cmdk-input');
        modal.classList.remove('hidden');
        input.value = '';
        filtered = [...TOOLS];
        activeIdx = 0;
        render();
        setTimeout(() => input.focus(), 10);
    }

    function close() {
        isOpen = false;
        document.getElementById('cmdk-modal').classList.add('hidden');
    }

    function render() {
        const list = document.getElementById('cmdk-list');
        const isRu = I18nModule.getLang() === 'ru';
        if (!filtered.length) {
            list.innerHTML = `<div class="py-8 text-center text-xs font-mono text-slate-500">${isRu ? 'Ничего не найдено' : 'No tools found'}</div>`;
            return;
        }
        list.innerHTML = filtered.map((t, i) => `
            <button type="button" data-idx="${i}" class="cmdk-item w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors ${i === activeIdx ? 'bg-black/[0.06] dark:bg-white/[0.10] text-zinc-900 dark:text-white border border-black/10 dark:border-white/15' : 'border border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'}">
                <div class="min-w-0">
                    <div class="text-xs font-semibold truncate">${isRu ? t.ru : t.en}</div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${isRu ? t.descRu : t.descEn}</div>
                </div>
                <span class="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400">${t.route}</span>
            </button>
        `).join('');
        list.querySelectorAll('.cmdk-item').forEach((btn) => {
            btn.addEventListener('click', () => {
                const item = filtered[Number(btn.dataset.idx)];
                if (item) {
                    RouterModule.navigateSeo(item.route);
                    close();
                }
            });
        });
    }

    return { init, open, close };
})();
document.addEventListener('DOMContentLoaded', () => CommandPaletteModule.init());

const RouterModule = (() => {
    let currentRoute = '/';
    const BREADCRUMBS = {
        '/': { ru: 'Главная', en: 'Home' },
        '/blur-screenshot': { ru: 'Фото / Цензор фото + EXIF', en: 'Photo / Censor + EXIF' },
        '/remove-exif': { ru: 'Фото / Цензор фото + EXIF', en: 'Photo / Censor + EXIF' },
        '/resize-photo': { ru: 'Фото / Изменение размера фото', en: 'Photo / Resize Presets' },
        '/de-ai-text': { ru: 'Текст / Анти-ИИ очистка текста', en: 'Text / De-AI Cleaner' },
        '/clean-pdf-text': { ru: 'Текст / Очистка текста из PDF', en: 'Text / PDF Cleaner' },
        '/compare-documents': { ru: 'Текст / Сравнение текстов (Diff)', en: 'Text / Compare (Diff)' },
        '/tables-converter': { ru: 'Текст / Конвертер таблиц (Excel)', en: 'Text / Tables' },
        '/video-to-gif': { ru: 'Медиа / Конвертер видео в GIF', en: 'Media / Video → GIF' },
        '/audio-surgeon': { ru: 'Медиа / Удаление пауз в аудио', en: 'Media / Audio Surgeon' },
        '/audio-to-text': { ru: 'Медиа / Транскрибация аудио в текст', en: 'Media / Audio → Text' },
        '/compress-video-discord': { ru: 'Медиа / Сжатие видео до 10 МБ', en: 'Media / Discord 10 MB' },
        '/quick-utils': { ru: 'Утилиты / Утилиты (цвет, хеш, px)', en: 'Utils / Quick Utilities' },
        '/compress-photo': { ru: 'Фото / Пакетное сжатие фото', en: 'Photo / Batch Compress' },
        '/pdf-tools': { ru: 'Текст / PDF-комбайн', en: 'Text / PDF Toolkit' },
        '/stitch-screenshots': { ru: 'Фото / Склейка скриншотов', en: 'Photo / Stitch Screenshots' },
        '/remove-bg': { ru: 'Фото / Удаление фона фото', en: 'Photo / Remove Background' },
        '/code-formatter': { ru: 'Текст / Форматтер JSON / XML / SQL', en: 'Text / Code Formatter' },
        '/qr-generator': { ru: 'Утилиты / Генератор QR-кодов', en: 'Utils / QR Generator' },
        '/p2p-transfer': { ru: 'Утилиты / Передача файлов по QR', en: 'Utils / P2P QR Transfer' }
    };

    function setSidebarOpen(open) {
        const sidebar = document.getElementById('app-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (!sidebar || !backdrop) return;
        sidebar.classList.toggle('-translate-x-full', !open);
        backdrop.classList.toggle('hidden', !open);
    }


    function showView(viewName) {
        ['home', 'photo', 'text', 'media', 'transfer', 'utils', 'qrgen'].forEach((v) => {
            document.getElementById(`view-${v}`).classList.toggle('hidden', v !== viewName);
        });
        const activeGroup = viewName === 'transfer' ? 'utils' : viewName;
        document.querySelectorAll('.nav-group-btn').forEach((btn) => {
            const active = btn.dataset.navGroup === activeGroup;
            btn.classList.toggle('bg-black/5', active);
            btn.classList.toggle('dark:bg-white/10', active);
            btn.classList.toggle('text-slate-900', active);
            btn.classList.toggle('dark:text-white', active);
        });
    }

    function setPhotoSubtab(tab) {
        document.getElementById('subview-censor').classList.toggle('hidden', tab !== 'censor');
        document.getElementById('subview-resizer').classList.toggle('hidden', tab !== 'resizer');
        document.getElementById('subview-photo-compress').classList.toggle('hidden', tab !== 'compress');
        document.getElementById('subview-photo-stitch').classList.toggle('hidden', tab !== 'stitch');
        document.getElementById('subview-photo-rmbg').classList.toggle('hidden', tab !== 'rmbg');
        document.querySelectorAll('.photo-subtab').forEach((b) => {
            const active = b.dataset.subtab === tab;
            b.classList.toggle('bg-white', active);
            b.classList.toggle('dark:bg-white/10', active);
            b.classList.toggle('text-slate-900', active);
            b.classList.toggle('dark:text-white', active);
            b.classList.toggle('shadow-sm', active);
            b.classList.toggle('text-slate-500', !active);
        });
    }

    function setTextSubtab(tab) {
        document.getElementById('subview-cleaner').classList.toggle('hidden', tab !== 'cleaner');
        document.getElementById('subview-diff').classList.toggle('hidden', tab !== 'diff');
        document.getElementById('subview-deai').classList.toggle('hidden', tab !== 'deai');
        document.getElementById('subview-tables').classList.toggle('hidden', tab !== 'tables');
        document.getElementById('subview-pdf').classList.toggle('hidden', tab !== 'pdf');
        document.getElementById('subview-codefmt').classList.toggle('hidden', tab !== 'codefmt');
        document.querySelectorAll('.text-subtab').forEach((b) => {
            const active = b.dataset.subtab === tab;
            b.classList.toggle('bg-white', active);
            b.classList.toggle('dark:bg-white/10', active);
            b.classList.toggle('text-slate-900', active);
            b.classList.toggle('dark:text-white', active);
            b.classList.toggle('shadow-sm', active);
            b.classList.toggle('text-slate-500', !active);
        });
    }

    function setMediaSubtab(tab) {
        document.getElementById('subview-media-compress').classList.toggle('hidden', tab !== 'compress');
        document.getElementById('subview-media-gif').classList.toggle('hidden', tab !== 'gif');
        document.getElementById('subview-media-surgeon').classList.toggle('hidden', tab !== 'surgeon');
        document.getElementById('subview-media-transcribe').classList.toggle('hidden', tab !== 'transcribe');
        document.querySelectorAll('.media-subtab').forEach((b) => {
            const active = b.dataset.subtab === tab;
            b.classList.toggle('bg-white', active);
            b.classList.toggle('dark:bg-white/10', active);
            b.classList.toggle('text-slate-900', active);
            b.classList.toggle('dark:text-white', active);
            b.classList.toggle('shadow-sm', active);
            b.classList.toggle('text-slate-500', !active);
        });
    }

    function refreshSeoHeader() {
        const meta = I18nModule.getRouteMeta(currentRoute);
        document.title = meta.title[I18nModule.getLang()] || meta.title.ru;
        document.getElementById('seo-route-pill').textContent = currentRoute;
        const bc = document.getElementById('topbar-breadcrumb');
        if (bc) {
            const label = BREADCRUMBS[currentRoute] || BREADCRUMBS['/'];
            bc.textContent = label[I18nModule.getLang()] || label.ru;
        }
        const normalizedRoute = currentRoute === '/remove-exif' ? '/blur-screenshot' : currentRoute;
        document.querySelectorAll('.sidebar-item').forEach((btn) => {
            btn.classList.toggle('is-active', btn.dataset.seoRoute === normalizedRoute);
        });
        renderFavorites();
        renderRecent();
        updateFavButton();
        renderSeoFaq();
    }

    const FAV_KEY = 'neonhub-favorites';

    const SEO_FAQS = {
        '/': [
            ['Отправляются ли мои файлы на сервер?', 'Нет. Все 18 инструментов Neon Hub работают исключительно внутри вашего браузера через Canvas API, Web Audio и WebAssembly. В сеть передаётся ровно 0 байт ваших данных.'],
            ['Можно ли пользоваться сайтом без интернета?', 'Да, Neon Hub поддерживает режим PWA — вы можете установить его как приложение и открывать локальные инструменты даже в офлайне.']
        ],
        '/blur-screenshot': [
            ['Удаляются ли GPS-координаты и модель камеры при сохранении?', 'Да. При экспорте в PNG изображение перерисовывается через Canvas, что на 100% стирает EXIF-метаданные, дату съёмки и геолокацию.'],
            ['Есть ли горячие клавиши?', 'Вы можете вставить скриншот прямо из буфера обмена (Ctrl+V), а отменить последнюю рамку, стрелку или блюр — сочетанием Ctrl+Z.']
        ],
        '/de-ai-text': [
            ['Какие скрытые следы нейросетей находит Анти-ИИ?', 'Инструмент выявляет невидимые Unicode-маркеры (ZWSP, ZWNJ, BOM, NBSP, мягкие переносы), длинные типографские тире, кавычки-ёлочки, Markdown-разметку, эмодзи и вводные клише.'],
            ['Сохраняется ли текст на сервере?', 'Нет, весь анализ и очистка выполняются локально в вашем браузере в реальном времени.']
        ],
        '/pdf-tools': [
            ['Безопасно ли объединять договоры и паспорта в PDF-комбайне?', 'Да, сборка и разделение страниц выполняются локально библиотекой pdf-lib без загрузки документов в облако.'],
            ['Как вытащить только нужные страницы?', 'Укажите диапазон в поле «Диапазон страниц», например: 1-3, 5 — в итоговый файл попадут только они.']
        ],
        '/compress-photo': [
            ['Сколько фотографий можно сжать за один раз?', 'Вы можете перетащить сразу 20–50 снимков, выбрать формат WebP или JPEG и скачать результат одним ZIP-архивом.']
        ],
        '/remove-bg': [
            ['Чем отличается нейросеть от быстрого режима?', 'Нейросеть точно вырезает сложные объекты и портреты (загружает модель в браузер один раз), а быстрый режим мгновенно убирает однотонный белый или цветной фон.']
        ]
    };

    function getFavs() {
        try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; }
    }

    function toggleFav(path) {
        if (!path || path === '/') return;
        let list = getFavs();
        if (list.includes(path)) {
            list = list.filter((p) => p !== path);
            StateModule.toast('Убрано из Избранного', 'info');
        } else {
            list = [path, ...list].slice(0, 6);
            StateModule.toast('Закреплено в Избранном!', 'success');
        }
        try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) {}
        renderFavorites();
        updateFavButton();
    }

    function updateFavButton() {
        const btn = document.getElementById('topbar-fav-btn');
        const icon = document.getElementById('topbar-fav-icon');
        if (!btn || !icon) return;
        const shareBtn = document.getElementById('topbar-share-btn');
        if (currentRoute === '/') {
            btn.classList.add('hidden');
            if (shareBtn) shareBtn.classList.add('hidden');
            return;
        }
        btn.classList.remove('hidden');
        if (shareBtn) shareBtn.classList.remove('hidden');
        const isFav = getFavs().includes(currentRoute);
        btn.classList.toggle('text-amber-400', isFav);
        btn.classList.toggle('text-zinc-400', !isFav);
        icon.setAttribute('fill', isFav ? 'currentColor' : 'none');
    }

    function renderFavorites() {
        const wrap = document.getElementById('sidebar-fav-wrap');
        const box = document.getElementById('sidebar-fav-list');
        if (!wrap || !box) return;
        const list = getFavs();
        if (!list.length) {
            wrap.classList.add('hidden');
            return;
        }
        wrap.classList.remove('hidden');
        const lang = I18nModule.getLang();
        box.innerHTML = list.map((route) => {
            const meta = BREADCRUMBS[route];
            if (!meta) return '';
            const full = meta[lang] || meta.ru;
            const shortName = full.includes(' / ') ? full.split(' / ')[1] : full;
            const active = route === currentRoute ? 'is-active' : '';
            return `<button type="button" data-seo-route="${route}" class="fav-link-btn sidebar-item ${active}">
                <svg class="text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>
                <span class="truncate">${shortName}</span>
            </button>`;
        }).join('');
        box.querySelectorAll('.fav-link-btn').forEach((btn) => {
            btn.addEventListener('click', () => navigateSeo(btn.dataset.seoRoute));
        });
    }

    function renderSeoFaq() {
        const body = document.getElementById('seo-faq-body');
        if (!body) return;
        const pairs = SEO_FAQS[currentRoute] || SEO_FAQS['/'];
        body.innerHTML = pairs.map(([q, a]) => `
            <div>
                <div class="font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">${q}</div>
                <div>${a}</div>
            </div>
        `).join('');

        // Обновляем JSON-LD FAQPage для поисковых систем
        let ld = document.getElementById('ld-faq-schema');
        if (!ld) {
            ld = document.createElement('script');
            ld.id = 'ld-faq-schema';
            ld.type = 'application/ld+json';
            document.head.appendChild(ld);
        }
        ld.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": pairs.map(([q, a]) => ({
                "@type": "Question",
                "name": q,
                "acceptedAnswer": { "@type": "Answer", "text": a }
            }))
        });
    }

    const RECENT_KEY = 'neonhub-recent';

    function pushRecent(path) {
        if (!path || path === '/') return;
        try {
            let list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
            list = [path, ...list.filter((p) => p !== path)].slice(0, 4);
            localStorage.setItem(RECENT_KEY, JSON.stringify(list));
            renderRecent();
        } catch (e) {}
    }

    function renderRecent() {
        const wrap = document.getElementById('sidebar-recent-wrap');
        const box = document.getElementById('sidebar-recent-list');
        if (!wrap || !box) return;
        let list = [];
        try { list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) {}
        if (!list.length) {
            wrap.classList.add('hidden');
            return;
        }
        wrap.classList.remove('hidden');
        const lang = I18nModule.getLang();
        box.innerHTML = list.map((route) => {
            const meta = BREADCRUMBS[route];
            if (!meta) return '';
            const full = meta[lang] || meta.ru;
            const shortName = full.includes(' / ') ? full.split(' / ')[1] : full;
            const active = route === currentRoute ? 'is-active' : '';
            return `<button type="button" data-seo-route="${route}" class="recent-link-btn sidebar-item ${active}">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                <span class="truncate">${shortName}</span>
            </button>`;
        }).join('');
        box.querySelectorAll('.recent-link-btn').forEach((btn) => {
            btn.addEventListener('click', () => navigateSeo(btn.dataset.seoRoute));
        });
    }

    function navigateSeo(path, skipHistory = false) {
        currentRoute = path;
        const meta = I18nModule.getRouteMeta(path);
        showView(meta.view);
        if (meta.view === 'photo') setPhotoSubtab(meta.subtab || 'censor');
        if (meta.view === 'text') setTextSubtab(meta.subtab || 'deai');
        if (meta.view === 'media') setMediaSubtab(meta.subtab || 'gif');
        setSidebarOpen(false);
        document.querySelectorAll('.nav-dropdown.is-open').forEach((el) => el.classList.remove('is-open'));
        pushRecent(path);
        refreshSeoHeader();
        if (path !== '/') StateModule.trackEvent('open_tool', { route: path });
        // Реальные SEO URL через history.pushState (безопасно для file://)
        if (!skipHistory && window.location.protocol !== 'file:' && window.history && window.history.pushState) {
            try {
                if (window.location.pathname !== path) {
                    window.history.pushState({ path }, '', path);
                }
            } catch (e) {}
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function init() {
        document.querySelectorAll('.nav-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const map = {
                    home: '/',
                    photo: '/blur-screenshot',
                    text: '/de-ai-text',
                    media: '/video-to-gif',
                    transfer: '/p2p-transfer',
                    utils: '/quick-utils'
                };
                navigateSeo(map[btn.dataset.nav] || '/');
            });
        });

        // Клик по заголовку категории в шапке (удобно и для тач-экранов)
        document.querySelectorAll('.nav-group-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const parent = btn.closest('.nav-dropdown');
                const wasOpen = parent.classList.contains('is-open');
                document.querySelectorAll('.nav-dropdown.is-open').forEach((el) => el.classList.remove('is-open'));
                if (!wasOpen) parent.classList.add('is-open');
            });
        });
        document.addEventListener('click', () => {
            document.querySelectorAll('.nav-dropdown.is-open').forEach((el) => el.classList.remove('is-open'));
        });

        const drawerBtn = document.getElementById('mobile-drawer-btn');
        const closeBtn = document.getElementById('sidebar-close-btn');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (drawerBtn) drawerBtn.addEventListener('click', () => setSidebarOpen(true));
        if (closeBtn) closeBtn.addEventListener('click', () => setSidebarOpen(false));
        if (backdrop) backdrop.addEventListener('click', () => setSidebarOpen(false));
        const favBtn = document.getElementById('topbar-fav-btn');
        if (favBtn) favBtn.addEventListener('click', () => toggleFav(currentRoute));
        const shareBtn = document.getElementById('topbar-share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const url = window.location.protocol === 'file:'
                    ? `https://neon-hub.ru${currentRoute}`
                    : `${window.location.origin}${currentRoute}`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url).then(() => StateModule.toast('Ссылка скопирована!', 'success')).catch(() => {});
                } else {
                    StateModule.toast(url, 'info');
                }
            });
        }

        document.querySelectorAll('.seo-link-btn').forEach((btn) => {
            btn.addEventListener('click', () => navigateSeo(btn.dataset.seoRoute));
        });

        document.querySelectorAll('.photo-subtab').forEach((btn) => {
            btn.addEventListener('click', () => {
                const pmap = { censor: '/blur-screenshot', resizer: '/resize-photo', compress: '/compress-photo', stitch: '/stitch-screenshots', rmbg: '/remove-bg' };
                navigateSeo(pmap[btn.dataset.subtab] || '/blur-screenshot');
            });
        });

        document.querySelectorAll('.text-subtab').forEach((btn) => {
            btn.addEventListener('click', () => {
                const map = {
                    cleaner: '/clean-pdf-text',
                    diff: '/compare-documents',
                    deai: '/de-ai-text',
                    tables: '/tables-converter',
                    pdf: '/pdf-tools',
                    codefmt: '/code-formatter'
                };
                navigateSeo(map[btn.dataset.subtab] || '/clean-pdf-text');
            });
        });

        document.querySelectorAll('.media-subtab').forEach((btn) => {
            btn.addEventListener('click', () => {
                const map = {
                    compress: '/compress-video-discord',
                    gif: '/video-to-gif',
                    surgeon: '/audio-surgeon',
                    transcribe: '/audio-to-text'
                };
                navigateSeo(map[btn.dataset.subtab] || '/compress-video-discord');
            });
        });

        const normalizePath = (raw) => {
            if (!raw || raw === '/') return '/';
            const clean = raw.replace(/\/index\.html$/i, '').replace(/\/+$/, '');
            return BREADCRUMBS[clean] ? clean : '/';
        };

        window.addEventListener('popstate', () => {
            navigateSeo(normalizePath(window.location.pathname), true);
        });

        const hasRoomParam = new URLSearchParams(window.location.search).has('room');
        let initialPath = '/';
        if (hasRoomParam) {
            initialPath = '/p2p-transfer';
        } else if (window.NEONHUB_INITIAL_ROUTE && BREADCRUMBS[window.NEONHUB_INITIAL_ROUTE]) {
            initialPath = window.NEONHUB_INITIAL_ROUTE;
        } else if (window.location.protocol !== 'file:') {
            initialPath = normalizePath(window.location.pathname);
        }
        navigateSeo(initialPath, true);
    }

    return { init, navigateSeo, refreshSeoHeader };
})();
window.RouterModule = RouterModule;

document.addEventListener('DOMContentLoaded', () => {
    // Переключатель темы
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        try { localStorage.setItem('neonhub-theme', isDark ? 'dark' : 'light'); } catch (e) {}
    });

    // Переключатель языка RU/EN
    document.getElementById('lang-toggle').addEventListener('click', () => {
        I18nModule.setLang(I18nModule.getLang() === 'ru' ? 'en' : 'ru');
    });

    let savedLang = 'ru';
    try { savedLang = localStorage.getItem('neonhub-lang') || 'ru'; } catch (e) {}

    DropzoneModule.init();
    CensorModule.init();
    ResizerModule.init();
    PhotoCompressModule.init();
    PdfToolsModule.init();
    QrGenModule.init();
    ScreenshotStitchModule.init();
    BgRemoveModule.init();
    CodeToolsModule.init();
    StateModule.updateProcessedBadge();
    TextToolsModule.init();
    DeAiModule.init();
    TablesModule.init();
    MediaModule.init();
    VideoGifModule.init();
    AudioSurgeonModule.init();
    TranscribeModule.init();
    QuickUtilsModule.init();
    TransferModule.init();
    RouterModule.init();
    UiEnhancementsModule.init();
    I18nModule.setLang(savedLang);

    // Регистрация PWA Service Worker (только на http/https)
    if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
});


// =========================================================================
// HOVER TOOLTIP ENGINE (ПЛАШКА ПРИ НАВЕДЕНИИ НА ИНСТРУМЕНТ) & HOME FILTER
// =========================================================================
const UiEnhancementsModule = (() => {
    const TOOL_INFO = {
        '/': { ru: ['Главная', 'Умная загрузка файлов (Drag & Drop и Ctrl+V) и быстрый доступ ко всем 18 инструментам.'], en: ['Home', 'Smart file dropzone and quick access to all 18 local tools.'] },
        '/blur-screenshot': { ru: ['Цензор фото + EXIF', 'Замазывает личные данные блюром или пикселями, рисует рамки/стрелки и стирает GPS-метаданные.'], en: ['Censor + EXIF', 'Blur or pixelate sensitive info, draw frames/arrows, and strip EXIF metadata.'] },
        '/resize-photo': { ru: ['Изменение размера фото', 'Подгоняет фото под готовые пресеты: Telegram-стикеры, Ozon/WB, 3×4, YouTube 1280×720.'], en: ['Resize Presets', 'Resize images to Telegram, 3×4, YouTube, or custom dimensions.'] },
        '/compress-photo': { ru: ['Пакетное сжатие фото', 'Сжимает до 50 фото в WebP / JPG / PNG прямо в браузере и упаковывает в один ZIP.'], en: ['Batch Photo Compress', 'Compress up to 50 photos to WebP/JPG/PNG and download as a single ZIP.'] },
        '/stitch-screenshots': { ru: ['Склейка скриншотов', 'Объединяет несколько скриншотов в одну длинную картинку или аккуратную сетку-коллаж.'], en: ['Stitch Screenshots', 'Combine multiple screenshots vertically, horizontally, or in a 2-column grid.'] },
        '/remove-bg': { ru: ['Удаление фона фото', 'Вырезает объект нейросетью локально или мгновенно убирает однотонный фон в PNG.'], en: ['Remove Background', 'Local AI background removal plus instant solid-color background remover.'] },
        '/de-ai-text': { ru: ['Анти-ИИ очистка текста', 'Находит и удаляет скрытые водяные знаки нейросетей (ZWSP, BOM), длинные тире, Markdown и клише.'], en: ['De-AI Text Cleaner', 'Detects and strips invisible AI watermarks, long dashes, Markdown, and clichés.'] },
        '/clean-pdf-text': { ru: ['Очистка текста из PDF', 'Склеивает разорванные переносы слов, убирает лишние разрывы строк и номера страниц.'], en: ['PDF Text Cleaner', 'Fixes broken line breaks, hyphenated words, and stray page numbers from PDFs.'] },
        '/compare-documents': { ru: ['Сравнение текстов (Diff)', 'Наглядно показывает все отличия «Было / Стало» по строкам и отдельным словам.'], en: ['Compare Texts (Diff)', 'Side-by-side line and word comparison between two text versions.'] },
        '/tables-converter': { ru: ['Конвертер таблиц (Excel)', 'Конвертирует CSV ↔ JSON ↔ Excel (.xlsx), удаляет дубликаты и сортирует столбцы.'], en: ['Tables Converter', 'Convert CSV ↔ JSON ↔ Excel (.xlsx), deduplicate, trim, and sort columns.'] },
        '/pdf-tools': { ru: ['PDF-комбайн', 'Объединяет несколько PDF, вырезает нужные страницы по диапазону и поворачивает их.'], en: ['PDF Toolkit', 'Merge multiple PDFs, extract page ranges, and rotate pages locally.'] },
        '/code-formatter': { ru: ['Форматтер JSON / XML / SQL', 'Красиво форматирует, проверяет на ошибки синтаксиса и сжимает (Minify) код.'], en: ['Code Formatter', 'Prettify, validate syntax, and minify JSON, XML, and SQL locally.'] },
        '/video-to-gif': { ru: ['Конвертер видео в GIF', 'Вырезает отрезок 1–10 секунд из MP4/WebM и собирает GIF встроенным кодером.'], en: ['Video to GIF', 'Turn a 1–10s video clip into a looping GIF using the built-in local encoder.'] },
        '/audio-surgeon': { ru: ['Удаление пауз в аудио', 'Встроенный диктофон и автоматическое вырезание тишины и длинных пауз на звуковой волне.'], en: ['Audio Silence Trimmer', 'Record voice and automatically cut out silent pauses on the waveform.'] },
        '/audio-to-text': { ru: ['Транскрибация аудио в текст', 'Живая диктовка с микрофона и расшифровка аудио/видеофайлов офлайн-нейросетью Whisper.'], en: ['Audio Transcription', 'Live microphone dictation and offline Whisper AI file transcription.'] },
        '/compress-video-discord': { ru: ['Сжатие видео до 10 МБ', 'Рассчитывает точный битрейт под лимиты Discord/Почты и извлекает звук в WAV.'], en: ['Discord 10 MB', 'Calculates target video bitrate for Discord/Email limits and extracts WAV audio.'] },
        '/quick-utils': { ru: ['Утилиты (цвет, хеш, px)', 'Пипетка цвета с лупой, конвертер HEX/RGB/HSL, генератор паролей, SHA-256 и px ↔ мм.'], en: ['Quick Utilities', 'Color eyedropper with loupe, HEX/RGB/HSL, passwords, SHA-256, and px ↔ mm.'] },
        '/p2p-transfer': { ru: ['Передача файлов по QR', 'Быстрая отправка файлов с компьютера на телефон по QR-коду без облачных дисков.'], en: ['P2P QR Transfer', 'Send files directly from PC to phone via QR room without cloud uploads.'] },
        '/qr-generator': { ru: ['Генератор QR-кодов', 'Создаёт сканируемые QR-коды для ссылок, Wi-Fi сетей и Telegram с выгрузкой в PNG и SVG.'], en: ['QR Code Generator', 'Create scannable QR codes for URLs, Wi-Fi, and Telegram in PNG and SVG.'] }
    };

    function init() {
        const tooltip = document.getElementById('tool-hover-tooltip');
        const tTitle = document.getElementById('tooltip-title');
        const tDesc = document.getElementById('tooltip-desc');
        const sidebar = document.getElementById('app-sidebar');

        if (tooltip && sidebar) {
            let activeBtn = null;

            const showFor = (btn) => {
                if (window.innerWidth < 1024) return; // На мобильных не мешаем тапам
                const route = btn.dataset.seoRoute;
                const entry = TOOL_INFO[route];
                if (!entry) return;
                const lang = I18nModule.getLang();
                const [title, desc] = entry[lang] || entry.ru;
                tTitle.textContent = title;
                tDesc.textContent = desc;

                const rect = btn.getBoundingClientRect();
                const top = Math.max(12, Math.min(window.innerHeight - 96, rect.top - 4));
                tooltip.style.left = `${rect.right + 12}px`;
                tooltip.style.top = `${top}px`;
                tooltip.classList.add('is-visible');
                activeBtn = btn;
            };

            const hide = () => {
                tooltip.classList.remove('is-visible');
                activeBtn = null;
            };

            sidebar.addEventListener('mouseover', (e) => {
                const btn = e.target.closest('.sidebar-item[data-seo-route]');
                if (btn && btn !== activeBtn) showFor(btn);
                else if (!btn && activeBtn) hide();
            });
            sidebar.addEventListener('mouseleave', hide);
            sidebar.addEventListener('click', hide);
            sidebar.addEventListener('scroll', hide, true);
        }

        // Кнопка быстрого поиска в Hero на главной
        const homeCmdBtn = document.getElementById('home-cmdk-btn');
        if (homeCmdBtn) {
            homeCmdBtn.addEventListener('click', () => CommandPaletteModule.open());
        }

        // Интерактивный фильтр категорий на главной (по умолчанию — Главные функции)
        const applyHomeFilter = (filter) => {
            document.querySelectorAll('.home-filter-btn').forEach((b) => {
                const active = b.dataset.homeFilter === filter;
                b.classList.toggle('bg-white', active);
                b.classList.toggle('dark:bg-white/15', active);
                b.classList.toggle('text-slate-900', active);
                b.classList.toggle('dark:text-white', active);
                b.classList.toggle('font-semibold', active);
                b.classList.toggle('shadow-sm', active);
                b.classList.toggle('text-slate-600', !active);
                b.classList.toggle('dark:text-slate-400', !active);
            });
            document.querySelectorAll('.home-tool-card').forEach((card) => {
                let match = false;
                if (filter === 'featured') match = card.dataset.featured === 'true';
                else if (filter === 'all') match = true;
                else match = card.dataset.homeCat === filter;
                card.classList.toggle('hidden', !match);
            });
        };

        document.querySelectorAll('.home-filter-btn').forEach((btn) => {
            btn.addEventListener('click', () => applyHomeFilter(btn.dataset.homeFilter));
        });
        applyHomeFilter('featured');
    }

    return { init };
})();
