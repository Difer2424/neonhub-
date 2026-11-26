const DropzoneModule = (() => {
    function init() {
        const dz = document.getElementById('smart-dropzone');
        const input = document.getElementById('smart-file-input');
        const pickBtn = document.getElementById('smart-pick-btn');
        const demoImgBtn = document.getElementById('demo-image-btn');
        const demoDiffBtn = document.getElementById('demo-diff-btn');
        const resetBtn = document.getElementById('smart-reset-btn');

        pickBtn.addEventListener('click', () => input.click());
        input.addEventListener('change', (e) => {
            if (e.target.files.length) handleFiles(Array.from(e.target.files));
            input.value = '';
        });

        ['dragenter', 'dragover'].forEach((ev) => {
            dz.addEventListener(ev, (e) => {
                e.preventDefault();
                dz.classList.add('is-dragover');
            });
        });

        ['dragleave', 'drop'].forEach((ev) => {
            dz.addEventListener(ev, (e) => {
                e.preventDefault();
                dz.classList.remove('is-dragover');
            });
        });

        dz.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length) handleFiles(files);
        });

        // Вставка скриншота через Ctrl+V
        window.addEventListener('paste', (e) => {
            const items = Array.from(e.clipboardData?.items || []);
            const imgItem = items.find((it) => it.type.startsWith('image/'));
            if (imgItem) {
                const file = imgItem.getAsFile();
                if (file) {
                    handleFiles([file]);
                    StateModule.toast(I18nModule.getLang() === 'ru' ? 'Скриншот из буфера распознан!' : 'Screenshot pasted!', 'success');
                }
            }
        });

        demoImgBtn.addEventListener('click', async () => {
            const file = await StateModule.createDemoScreenshotBlob();
            handleFiles([file]);
        });

        demoDiffBtn.addEventListener('click', () => {
            RouterModule.navigateSeo('/compare-documents');
            TextToolsModule.loadDiffSample();
        });

        resetBtn.addEventListener('click', () => {
            document.getElementById('smart-suggestions').classList.add('hidden');
        });
        bindToolDropZones();
    }

    function bindToolDropZones() {
        // Предотвращаем открытие файла браузером при промахе
        window.addEventListener('dragover', (e) => e.preventDefault());
        window.addEventListener('drop', (e) => {
            if (!e.target.closest('#smart-dropzone, [data-drop-target]')) {
                e.preventDefault();
            }
        });

        document.querySelectorAll('[data-drop-target]').forEach((zone) => {
            let dragDepth = 0;
            zone.addEventListener('dragenter', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepth++;
                zone.classList.add('is-dragover');
            });
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            zone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepth = Math.max(0, dragDepth - 1);
                if (dragDepth === 0) zone.classList.remove('is-dragover');
            });
            zone.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepth = 0;
                zone.classList.remove('is-dragover');
                const files = Array.from(e.dataTransfer?.files || []);
                if (!files.length) return;

                const target = zone.dataset.dropTarget;
                const file = files[0];
                const isRu = I18nModule.getLang() === 'ru';

                if (target === 'censor') {
                    if (file.type.startsWith('image/')) {
                        CensorModule.loadImageFile(file);
                        StateModule.toast(isRu ? `Фото загружено: ${file.name}` : `Loaded: ${file.name}`, 'success');
                    } else {
                        StateModule.toast(isRu ? 'Перетащите изображение (PNG/JPG/WebP)' : 'Drop an image file', 'warn');
                    }
                } else if (target === 'resizer') {
                    if (file.type.startsWith('image/')) {
                        ResizerModule.loadImageFile(file);
                        StateModule.toast(isRu ? `Фото загружено: ${file.name}` : `Loaded: ${file.name}`, 'success');
                    } else {
                        StateModule.toast(isRu ? 'Перетащите изображение' : 'Drop an image file', 'warn');
                    }
                } else if (target === 'cleaner') {
                    const txt = await file.text();
                    TextToolsModule.setCleanerInput(txt);
                    StateModule.toast(isRu ? `Текст загружен: ${file.name}` : `Text loaded: ${file.name}`, 'success');
                } else if (target === 'deai') {
                    const txt = await file.text();
                    DeAiModule.setInput(txt);
                    StateModule.toast(isRu ? `Текст загружен: ${file.name}` : `Text loaded: ${file.name}`, 'success');
                } else if (target === 'diff') {
                    if (files.length >= 2) {
                        const [t1, t2] = await Promise.all([files[0].text(), files[1].text()]);
                        TextToolsModule.setDiffTexts(t1, t2);
                        StateModule.toast(isRu ? 'Загружены обе версии для сравнения!' : 'Both versions loaded!', 'success');
                    } else {
                        const txt = await file.text();
                        const leftEl = document.getElementById('diff-left');
                        const rightEl = document.getElementById('diff-right');
                        if (e.target === rightEl || (leftEl.value.trim() && !rightEl.value.trim())) {
                            TextToolsModule.setDiffTexts(leftEl.value, txt);
                            StateModule.toast(isRu ? `Версия 2: ${file.name}` : `Version 2: ${file.name}`, 'success');
                        } else {
                            TextToolsModule.setDiffTexts(txt, rightEl.value);
                            StateModule.toast(isRu ? `Версия 1: ${file.name}` : `Version 1: ${file.name}`, 'success');
                        }
                    }
                } else if (target === 'tables') {
                    TablesModule.loadFile(file);
                } else if (target === 'media-compress') {
                    MediaModule.loadMediaFile(file);
                    StateModule.toast(isRu ? `Медиа загружено: ${file.name}` : `Loaded: ${file.name}`, 'success');
                } else if (target === 'media-gif') {
                    if (file.type.startsWith('video/')) {
                        VideoGifModule.loadVideoFile(file);
                        StateModule.toast(isRu ? `Видео загружено: ${file.name}` : `Video loaded: ${file.name}`, 'success');
                    } else {
                        StateModule.toast(isRu ? 'Перетащите видеофайл (MP4/WebM/MOV)' : 'Drop a video file', 'warn');
                    }
                } else if (target === 'media-surgeon') {
                    AudioSurgeonModule.loadAudioFile(file);
                    StateModule.toast(isRu ? `Аудио загружено: ${file.name}` : `Audio loaded: ${file.name}`, 'success');
                } else if (target === 'media-transcribe') {
                    TranscribeModule.loadFile(file);
                    StateModule.toast(isRu ? `Файл готов к расшифровке: ${file.name}` : `Ready to transcribe: ${file.name}`, 'success');
                } else if (target === 'transfer') {
                    files.forEach((f) => TransferModule.enqueueFile(f));
                } else if (target === 'utils-picker') {
                    if (file.type.startsWith('image/')) {
                        QuickUtilsModule.loadPickerImage(file);
                        StateModule.toast(isRu ? `Фото для пипетки: ${file.name}` : `Image loaded: ${file.name}`, 'success');
                    } else {
                        StateModule.toast(isRu ? 'Перетащите изображение' : 'Drop an image file', 'warn');
                    }
                } else if (target === 'photo-compress') {
                    PhotoCompressModule.addFiles(files);
                } else if (target === 'photo-stitch') {
                    ScreenshotStitchModule.addFiles(files);
                } else if (target === 'photo-rmbg') {
                    BgRemoveModule.loadImageFile(file);
                } else if (target === 'codefmt') {
                    const txt = await file.text();
                    StateModule.trackProcessed(file.size);
                    CodeToolsModule.setInput(txt, file.name);
                    StateModule.toast(`Файл загружен: ${file.name}`, 'success');
                } else if (target === 'pdf-tools') {
                    PdfToolsModule.addFiles(files);
                } else if (target === 'utils-sha') {
                    QuickUtilsModule.loadShaFile(file);
                }
            });
        });
    }


    function addActionBtn(container, label, primary, onClick) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = primary
            ? 'px-3.5 py-2 rounded-xl text-xs font-semibold lab-btn-primary transition-all'
            : 'px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors';
        btn.textContent = label;
        btn.addEventListener('click', onClick);
        container.appendChild(btn);
    }

    async function handleFiles(files) {
        const isRu = I18nModule.getLang() === 'ru';
        const box = document.getElementById('smart-suggestions');
        const badge = document.getElementById('smart-file-badge');
        const summary = document.getElementById('smart-file-summary');
        const actionsEl = document.getElementById('smart-actions');
        actionsEl.innerHTML = '';
        box.classList.remove('hidden');

        // Если загружено 2 текстовых файла -> сразу в Diff
        if (files.length >= 2 && files.every((f) => f.type.startsWith('text/') || /\.(txt|md|json|csv|log|js|html)$/i.test(f.name))) {
            badge.textContent = '2× TEXT';
            summary.textContent = `${files[0].name} ↔ ${files[1].name}`;
            addActionBtn(actionsEl, isRu ? 'Сравнить версии в Diff' : 'Compare in Diff', true, async () => {
                const [t1, t2] = await Promise.all([files[0].text(), files[1].text()]);
                TextToolsModule.setDiffTexts(t1, t2);
                RouterModule.navigateSeo('/compare-documents');
            });
            return;
        }

        const file = files[0];
        summary.textContent = `${file.name} (${StateModule.formatBytes(file.size)})`;

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            badge.textContent = files.length > 1 ? `${files.length}× PDF` : 'PDF';
            addActionBtn(actionsEl, isRu ? 'Открыть в PDF-комбайне (слить / разделить)' : 'Open in PDF Toolkit', true, () => {
                RouterModule.navigateSeo('/pdf-tools');
                PdfToolsModule.addFiles(files);
            });
            addActionBtn(actionsEl, isRu ? 'Передать на телефон по QR' : 'Send via QR', false, () => {
                files.forEach((f) => TransferModule.enqueueFile(f));
                RouterModule.navigateSeo('/p2p-transfer');
            });
            return;
        }

        if (file.type.startsWith('image/')) {
            badge.textContent = 'IMAGE';
            addActionBtn(actionsEl, isRu ? 'Заблюрить данные + удалить EXIF' : 'Blur Sensitive Data + Strip EXIF', true, () => {
                RouterModule.navigateSeo('/blur-screenshot');
                CensorModule.loadImageFile(file);
            });
            addActionBtn(actionsEl, isRu ? (files.length > 1 ? `Сжать все (${files.length} фото) в ZIP` : 'Сжать / конвертировать (WebP/JPG)') : 'Compress / Convert (WebP/JPG)', files.length > 1, () => {
                RouterModule.navigateSeo('/compress-photo');
                PhotoCompressModule.addFiles(files);
            });
            addActionBtn(actionsEl, isRu ? 'Подогнать под размер (Пресеты)' : 'Resize with Presets', false, () => {
                RouterModule.navigateSeo('/resize-photo');
                ResizerModule.loadImageFile(file);
            });
            addActionBtn(actionsEl, isRu ? 'Пипетка цвета (Утилиты)' : 'Color Eyedropper', false, () => {
                RouterModule.navigateSeo('/quick-utils');
                QuickUtilsModule.loadPickerImage(file);
            });
            addActionBtn(actionsEl, isRu ? 'Передать на телефон по QR' : 'Send to Phone via QR', false, () => {
                TransferModule.enqueueFile(file);
                RouterModule.navigateSeo('/p2p-transfer');
            });
        } else if (/\.(xlsx|xls|csv|json)$/i.test(file.name)) {
            badge.textContent = 'TABLE';
            addActionBtn(actionsEl, isRu ? 'Конвертер и очистка таблиц (XLSX/CSV/JSON)' : 'Table Converter & Cleaner', true, () => {
                RouterModule.navigateSeo('/tables-converter');
                TablesModule.loadFile(file);
            });
            addActionBtn(actionsEl, isRu ? 'Передать на телефон по QR' : 'Send to Phone via QR', false, () => {
                TransferModule.enqueueFile(file);
                RouterModule.navigateSeo('/p2p-transfer');
            });
        } else if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
            const isVideo = file.type.startsWith('video/');
            badge.textContent = isVideo ? 'VIDEO' : 'AUDIO';
            if (isVideo) {
                addActionBtn(actionsEl, isRu ? 'Перевести видео в GIF' : 'Convert Video to GIF', true, () => {
                    RouterModule.navigateSeo('/video-to-gif');
                    VideoGifModule.loadVideoFile(file);
                });
                addActionBtn(actionsEl, isRu ? 'Сжать под Discord (10 МБ)' : 'Discord 10 MB', false, () => {
                    RouterModule.navigateSeo('/compress-video-discord');
                    MediaModule.loadMediaFile(file);
                });
            }
            addActionBtn(actionsEl, isRu ? 'Аудио-хирург (вырезать паузы)' : 'Audio Surgeon (Trim Silence)', !isVideo, () => {
                RouterModule.navigateSeo('/audio-surgeon');
                AudioSurgeonModule.loadAudioFile(file);
            });
            addActionBtn(actionsEl, isRu ? 'Расшифровать в текст (Whisper)' : 'Transcribe (Whisper)', false, () => {
                RouterModule.navigateSeo('/audio-to-text');
                TranscribeModule.loadFile(file);
            });
            addActionBtn(actionsEl, isRu ? 'Передать на телефон по QR' : 'Send to Phone via QR', false, () => {
                TransferModule.enqueueFile(file);
                RouterModule.navigateSeo('/p2p-transfer');
            });
        } else {
            badge.textContent = 'TEXT';
            addActionBtn(actionsEl, isRu ? 'Очистить «кривой» текст' : 'Clean Broken PDF Text', true, async () => {
                const txt = await file.text();
                RouterModule.navigateSeo('/clean-pdf-text');
                TextToolsModule.setCleanerInput(txt);
            });
            addActionBtn(actionsEl, isRu ? 'Анти-ИИ (удалить водяные знаки и следы)' : 'De-AI (Strip Watermarks & Artifacts)', false, async () => {
                const txt = await file.text();
                RouterModule.navigateSeo('/de-ai-text');
                DeAiModule.setInput(txt);
            });
            addActionBtn(actionsEl, isRu ? 'Открыть в Сравнителе (Diff)' : 'Open in Diff Comparator', false, async () => {
                const txt = await file.text();
                TextToolsModule.setDiffTexts(txt, txt);
                RouterModule.navigateSeo('/compare-documents');
            });
        }
    }

    return { init };
})();
