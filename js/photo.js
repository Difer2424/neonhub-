// =========================================================================
// PHOTO TOOLS: CENSOR + EXIF INSPECTOR & RESIZER PRESETS
// =========================================================================

const CensorModule = (() => {
    let sourceImg = null;
    let masks = [];
    let currentMode = 'blur';
    let currentColor = '#ef4444';
    let isDrawing = false;
    let startX = 0, startY = 0, currX = 0, currY = 0;

    function init() {
        const canvas = document.getElementById('censor-canvas');
        const fileInput = document.getElementById('censor-file-input');
        const demoBtn = document.getElementById('censor-demo-btn');

        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) loadImageFile(e.target.files[0]);
            fileInput.value = '';
        });

        demoBtn.addEventListener('click', async () => {
            const file = await StateModule.createDemoScreenshotBlob();
            loadImageFile(file);
        });

        document.querySelectorAll('.censor-mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                currentMode = btn.dataset.maskMode;
                document.querySelectorAll('.censor-mode-btn').forEach((b) => {
                    const active = b.dataset.maskMode === currentMode;
                    b.className = active
                        ? 'censor-mode-btn px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-700 shadow-sm'
                        : 'censor-mode-btn px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300';
                });
            });
        });

        document.querySelectorAll('.censor-color-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                currentColor = btn.dataset.censorColor;
                document.querySelectorAll('.censor-color-btn').forEach((b) => {
                    const active = b === btn;
                    b.classList.toggle('ring-2', active);
                    b.classList.toggle('ring-offset-2', active);
                    b.classList.toggle('opacity-70', !active);
                });
            });
        });

        // Горячая клавиша Ctrl+Z / Cmd+Z для отмены в Цензоре
        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                const censorView = document.getElementById('subview-censor');
                const photoView = document.getElementById('view-photo');
                if (photoView && !photoView.classList.contains('hidden') && censorView && !censorView.classList.contains('hidden')) {
                    if (masks.length) {
                        e.preventDefault();
                        masks.pop();
                        render();
                    }
                }
            }
        });

        document.getElementById('censor-undo').addEventListener('click', () => {
            if (masks.length) {
                masks.pop();
                render();
            }
        });

        document.getElementById('censor-clear').addEventListener('click', () => {
            masks = [];
            render();
        });

        document.getElementById('censor-download').addEventListener('click', () => {
            if (!sourceImg) return;
            canvas.toBlob((blob) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'neonhub-clean-no-exif.png';
                a.click();
                URL.revokeObjectURL(a.href);
                StateModule.toast(I18nModule.getLang() === 'ru' ? 'PNG сохранён без EXIF!' : 'Clean PNG saved (no EXIF)!', 'success');
            }, 'image/png');
        });

        document.getElementById('censor-to-resizer').addEventListener('click', () => {
            if (!sourceImg) return;
            canvas.toBlob((blob) => {
                const file = new File([blob], 'censored.png', { type: 'image/png' });
                ResizerModule.loadImageFile(file);
                RouterModule.navigateSeo('/resize-photo');
            }, 'image/png');
        });

        document.getElementById('censor-to-qr').addEventListener('click', () => {
            if (!sourceImg) return;
            canvas.toBlob((blob) => {
                TransferModule.enqueueFile(new File([blob], 'censored-no-exif.png', { type: 'image/png' }));
                RouterModule.navigateSeo('/p2p-transfer');
            }, 'image/png');
        });

        // События мыши и тача на холсте
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const pt = e.touches ? e.touches[0] : e;
            return {
                x: ((pt.clientX - rect.left) / rect.width) * canvas.width,
                y: ((pt.clientY - rect.top) / rect.height) * canvas.height
            };
        };

        const onStart = (e) => {
            if (!sourceImg) return;
            e.preventDefault();
            const p = getPos(e);
            isDrawing = true;
            startX = currX = p.x;
            startY = currY = p.y;
        };

        const onMove = (e) => {
            if (!isDrawing) return;
            e.preventDefault();
            const p = getPos(e);
            currX = p.x;
            currY = p.y;
            render(true);
        };

        const onEnd = () => {
            if (!isDrawing) return;
            isDrawing = false;
            const x = Math.min(startX, currX);
            const y = Math.min(startY, currY);
            const w = Math.abs(currX - startX);
            const h = Math.abs(currY - startY);
            const dist = Math.hypot(currX - startX, currY - startY);
            if ((currentMode === 'arrow' && dist > 8) || (w > 4 && h > 4)) {
                masks.push({
                    x, y, w, h,
                    x1: startX, y1: startY, x2: currX, y2: currY,
                    mode: currentMode,
                    color: currentColor,
                    strength: Number(document.getElementById('censor-strength').value) || 16
                });
            }
            render(false);
        };

        canvas.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        canvas.addEventListener('touchstart', onStart, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
    }

    // Бинарная проверка наличия EXIF-сегмента (0xFFE1) в JPEG
    async function inspectExif(file) {
        const dot = document.getElementById('exif-dot');
        const txt = document.getElementById('exif-text');
        const isRu = I18nModule.getLang() === 'ru';
        try {
            const buf = await file.slice(0, 65536).arrayBuffer();
            const view = new DataView(buf);
            let hasExif = false;
            if (view.byteLength > 4 && view.getUint16(0) === 0xFFD8) {
                let offset = 2;
                while (offset + 4 < view.byteLength) {
                    const marker = view.getUint16(offset);
                    if (marker === 0xFFE1) {
                        hasExif = true;
                        break;
                    }
                    if ((marker & 0xFF00) !== 0xFF00) break;
                    offset += 2 + view.getUint16(offset + 2);
                }
            }
            if (hasExif) {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
                txt.textContent = isRu
                    ? (I18nModule.getLang() === 'ru' ? 'Обнаружен EXIF (камера/дата/GPS) — будет полностью удалён при сохранении.' : 'EXIF found (camera/date/GPS) — will be stripped completely on save.')
                    : 'EXIF metadata detected (camera/date/GPS) — will be stripped on export.';
            } else {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
                txt.textContent = isRu
                    ? (I18nModule.getLang() === 'ru' ? 'EXIF не найден (чистый файл). При экспорте в PNG метаданные также гарантированно очищаются.' : 'No EXIF found (clean file). PNG export also guarantees metadata removal.')
                    : 'No EXIF found. PNG export also guarantees zero metadata.';
            }
        } catch (e) {}
    }

    function loadImageFile(file) {
        if (file && file.size) StateModule.trackProcessed(file.size);
        inspectExif(file);
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            sourceImg = img;
            masks = [];
            const canvas = document.getElementById('censor-canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.classList.remove('hidden');
            document.getElementById('censor-empty').classList.add('hidden');
            document.getElementById('censor-dims').textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
            render();
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    function drawArrow(ctx, x1, y1, x2, y2, color, lw) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = Math.max(14, lw * 4.2);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2 - Math.cos(angle) * (headLen * 0.65), y2 - Math.sin(angle) * (headLen * 0.65));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function applyMask(ctx, m) {
        const canvas = document.getElementById('censor-canvas');
        const lw = Math.max(3, Math.round(canvas.width / 220) * (m.strength / 16));

        if (m.mode === 'rect') {
            ctx.save();
            ctx.strokeStyle = m.color || '#ef4444';
            ctx.lineWidth = lw;
            ctx.lineJoin = 'round';
            ctx.strokeRect(m.x, m.y, m.w, m.h);
            ctx.restore();
            return;
        }
        if (m.mode === 'arrow') {
            drawArrow(ctx, m.x1, m.y1, m.x2, m.y2, m.color || '#ef4444', lw);
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(m.x, m.y, m.w, m.h);
        ctx.clip();

        if (m.mode === 'black') {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(m.x, m.y, m.w, m.h);
        } else if (m.mode === 'blur') {
            ctx.filter = `blur(${Math.max(4, Math.round(m.strength * 0.7))}px)`;
            ctx.drawImage(sourceImg, 0, 0);
        } else if (m.mode === 'pixel') {
            const size = Math.max(6, Math.round(m.strength));
            const tmp = document.createElement('canvas');
            const sw = Math.max(1, Math.ceil(m.w / size));
            const sh = Math.max(1, Math.ceil(m.h / size));
            tmp.width = sw;
            tmp.height = sh;
            const tctx = tmp.getContext('2d');
            tctx.drawImage(sourceImg, m.x, m.y, m.w, m.h, 0, 0, sw, sh);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tmp, 0, 0, sw, sh, m.x, m.y, m.w, m.h);
        }
        ctx.restore();
    }

    function render(showPreviewBox = false) {
        if (!sourceImg) return;
        const canvas = document.getElementById('censor-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(sourceImg, 0, 0);
        masks.forEach((m) => applyMask(ctx, m));

        if (showPreviewBox) {
            const lw = Math.max(2, canvas.width / 250);
            if (currentMode === 'arrow') {
                drawArrow(ctx, startX, startY, currX, currY, currentColor, lw * 1.4);
            } else {
                const x = Math.min(startX, currX);
                const y = Math.min(startY, currY);
                const w = Math.abs(currX - startX);
                const h = Math.abs(currY - startY);
                ctx.save();
                ctx.strokeStyle = currentMode === 'rect' ? currentColor : '#e3e3e3';
                ctx.lineWidth = lw;
                if (currentMode !== 'rect') ctx.setLineDash([6, 4]);
                ctx.strokeRect(x, y, w, h);
                ctx.restore();
            }
        }
    }

    return { init, loadImageFile };
})();

const ResizerModule = (() => {
    let img = null;

    function init() {
        const fileInput = document.getElementById('resizer-file-input');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) loadImageFile(e.target.files[0]);
            fileInput.value = '';
        });

        document.getElementById('resizer-demo-btn').addEventListener('click', async () => {
            const file = await StateModule.createDemoScreenshotBlob();
            loadImageFile(file);
        });

        document.querySelectorAll('.preset-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('is-selected'));
                btn.classList.add('is-selected');
                document.getElementById('resizer-w').value = btn.dataset.w;
                document.getElementById('resizer-h').value = btn.dataset.h;
                render();
            });
        });

        ['resizer-w', 'resizer-h', 'resizer-fit', 'resizer-format'].forEach((id) => {
            document.getElementById(id).addEventListener('input', render);
        });

        document.getElementById('resizer-download').addEventListener('click', () => {
            if (!img) return;
            const canvas = document.getElementById('resizer-canvas');
            const fmt = document.getElementById('resizer-format').value;
            const ext = fmt.split('/')[1];
            canvas.toBlob((blob) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `neonhub-${canvas.width}x${canvas.height}.${ext}`;
                a.click();
                URL.revokeObjectURL(a.href);
                StateModule.toast(I18nModule.getLang() === 'ru' ? 'Изображение сохранено!' : 'Image downloaded!', 'success');
            }, fmt, 0.92);
        });

        document.getElementById('resizer-to-qr').addEventListener('click', () => {
            if (!img) return;
            const canvas = document.getElementById('resizer-canvas');
            const fmt = document.getElementById('resizer-format').value;
            const ext = fmt.split('/')[1];
            canvas.toBlob((blob) => {
                TransferModule.enqueueFile(new File([blob], `resized-${canvas.width}x${canvas.height}.${ext}`, { type: fmt }));
                RouterModule.navigateSeo('/p2p-transfer');
            }, fmt, 0.92);
        });
    }

    function loadImageFile(file) {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            img = image;
            document.getElementById('resizer-empty').classList.add('hidden');
            document.getElementById('resizer-canvas').classList.remove('hidden');
            render();
            URL.revokeObjectURL(url);
        };
        image.src = url;
    }

    function render() {
        if (!img) return;
        const w = Math.max(16, Math.min(4096, Number(document.getElementById('resizer-w').value) || 512));
        const h = Math.max(16, Math.min(4096, Number(document.getElementById('resizer-h').value) || 512));
        const fit = document.getElementById('resizer-fit').value;

        const canvas = document.getElementById('resizer-canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const boxRatio = w / h;

        if (fit === 'cover') {
            let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
            if (imgRatio > boxRatio) {
                sw = img.naturalHeight * boxRatio;
                sx = (img.naturalWidth - sw) / 2;
            } else {
                sh = img.naturalWidth / boxRatio;
                sy = (img.naturalHeight - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        } else {
            if (fit === 'contain-white') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
            } else if (fit === 'contain-blur') {
                ctx.save();
                ctx.filter = 'blur(24px)';
                ctx.drawImage(img, -24, -24, w + 48, h + 48);
                ctx.restore();
            }
            let dw = w, dh = h;
            if (imgRatio > boxRatio) {
                dh = w / imgRatio;
            } else {
                dw = h * imgRatio;
            }
            ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        }

        document.getElementById('resizer-info').textContent = `${w} × ${h} px`;
    }

    return { init, loadImageFile };
})();


const PhotoCompressModule = (() => {
    let items = []; // { file, name, origSize, blob, newSize, outName, url }

    function init() {
        const input = document.getElementById('pcomp-file-input');
        if (!input) return;

        input.addEventListener('change', (e) => {
            if (e.target.files.length) addFiles(Array.from(e.target.files));
            input.value = '';
        });

        document.getElementById('pcomp-clear-btn').addEventListener('click', () => {
            items.forEach((it) => { if (it.url) URL.revokeObjectURL(it.url); });
            items = [];
            render();
        });

        document.getElementById('pcomp-quality').addEventListener('input', (e) => {
            document.getElementById('pcomp-quality-val').textContent = `${e.target.value}%`;
            reprocessAll();
        });

        document.getElementById('pcomp-format').addEventListener('change', reprocessAll);
        document.getElementById('pcomp-maxw').addEventListener('change', reprocessAll);
        document.getElementById('pcomp-download-zip').addEventListener('click', downloadAllZip);
    }

    function compressOne(file, fmt, quality, maxW) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                let w = img.naturalWidth;
                let h = img.naturalHeight;
                if (maxW > 0 && w > maxW) {
                    h = Math.round((h * maxW) / w);
                    w = maxW;
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (fmt === 'image/jpeg') {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, w, h);
                }
                ctx.drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(url);

                const ext = fmt.split('/')[1].replace('jpeg', 'jpg');
                const base = file.name.replace(/\.[^.]+$/, '');
                canvas.toBlob((blob) => {
                    resolve({
                        file,
                        name: file.name,
                        origSize: file.size,
                        blob,
                        newSize: blob ? blob.size : file.size,
                        outName: `${base}.${ext}`,
                        dims: `${w}×${h}`
                    });
                }, fmt, quality);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
            };
            img.src = url;
        });
    }

    async function addFiles(files) {
        const imgs = files.filter((f) => f.type.startsWith('image/'));
        if (!imgs.length) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Выберите изображения (PNG / JPG / WebP)' : 'Select images (PNG / JPG / WebP)', 'warn');
            return;
        }
        const fmt = document.getElementById('pcomp-format').value;
        const quality = (Number(document.getElementById('pcomp-quality').value) || 80) / 100;
        const maxW = Number(document.getElementById('pcomp-maxw').value) || 0;

        for (const f of imgs) {
            StateModule.trackProcessed(f.size);
            const res = await compressOne(f, fmt, quality, maxW);
            if (res) items.push(res);
        }
        render();
        StateModule.toast(I18nModule.getLang() === 'ru' ? `Обработано фото: ${imgs.length}` : `Processed photos: ${imgs.length}`, 'success');
    }

    async function reprocessAll() {
        if (!items.length) return;
        const fmt = document.getElementById('pcomp-format').value;
        const quality = (Number(document.getElementById('pcomp-quality').value) || 80) / 100;
        const maxW = Number(document.getElementById('pcomp-maxw').value) || 0;
        const updated = [];
        for (const it of items) {
            const res = await compressOne(it.file, fmt, quality, maxW);
            if (res) updated.push(res);
        }
        items = updated;
        render();
    }

    function render() {
        const list = document.getElementById('pcomp-list');
        const bar = document.getElementById('pcomp-summary-bar');
        if (!items.length) {
            bar.classList.add('hidden');
            list.innerHTML = `<div class="text-center space-y-2 py-8">
                <p class="text-sm font-medium text-zinc-700 dark:text-zinc-200">${I18nModule.getLang() === 'ru' ? 'Перетащите сюда от 1 до 50 фотографий' : 'Drop 1 to 50 photos here'}</p>
                <p class="text-xs text-zinc-500">${I18nModule.getLang() === 'ru' ? 'Конвертация в WebP / JPG / PNG и сжатие происходят локально в браузере без потери приватности' : 'WebP / JPG / PNG conversion and compression run locally in your browser'}</p>
            </div>`;
            return;
        }

        bar.classList.remove('hidden');
        const totalOrig = items.reduce((s, x) => s + x.origSize, 0);
        const totalNew = items.reduce((s, x) => s + x.newSize, 0);
        const pct = totalOrig > 0 ? Math.round((1 - totalNew / totalOrig) * 100) : 0;

        document.getElementById('pcomp-total-count').textContent = I18nModule.getLang() === 'ru' ? `${items.length} фото` : `${items.length} photos`;
        document.getElementById('pcomp-size-diff').textContent = `${StateModule.formatBytes(totalOrig)} → ${StateModule.formatBytes(totalNew)} (${pct >= 0 ? '-' + pct : '+' + Math.abs(pct)}%)`;

        list.innerHTML = `<div class="divide-y divide-black/[0.06] dark:divide-white/[0.06]">` + items.map((it, idx) => {
            const saved = it.origSize > 0 ? Math.round((1 - it.newSize / it.origSize) * 100) : 0;
            return `<div class="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div class="min-w-0 flex-1">
                    <div class="font-medium text-zinc-900 dark:text-zinc-100 truncate">${StateModule.escapeHtml(it.outName)}</div>
                    <div class="text-[11px] font-mono text-zinc-400 mt-0.5">${it.dims} • ${StateModule.formatBytes(it.origSize)} → <span class="text-emerald-500 font-semibold">${StateModule.formatBytes(it.newSize)}</span> (${saved >= 0 ? '-' + saved : '+' + Math.abs(saved)}%)</div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button type="button" data-dl="${idx}" class="pcomp-dl-one px-3 py-1.5 rounded-lg lab-segmented text-zinc-700 dark:text-zinc-200 hover:opacity-85">Скачать</button>
                    <button type="button" data-rm="${idx}" class="pcomp-rm-one px-2 py-1.5 text-rose-500 hover:underline">×</button>
                </div>
            </div>`;
        }).join('') + `</div>`;

        list.querySelectorAll('.pcomp-dl-one').forEach((btn) => {
            btn.addEventListener('click', () => {
                const it = items[Number(btn.dataset.dl)];
                if (!it || !it.blob) return;
                const a = document.createElement('a');
                a.href = URL.createObjectURL(it.blob);
                a.download = it.outName;
                a.click();
                URL.revokeObjectURL(a.href);
            });
        });

        list.querySelectorAll('.pcomp-rm-one').forEach((btn) => {
            btn.addEventListener('click', () => {
                items.splice(Number(btn.dataset.rm), 1);
                render();
            });
        });
    }

    async function downloadAllZip() {
        if (!items.length) return;
        if (items.length === 1) {
            const it = items[0];
            const a = document.createElement('a');
            a.href = URL.createObjectURL(it.blob);
            a.download = it.outName;
            a.click();
            URL.revokeObjectURL(a.href);
            return;
        }
        if (typeof JSZip === 'undefined') {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'JSZip не загрузился — скачивайте файлы по одному' : 'JSZip failed to load — download files one by one', 'warn');
            return;
        }
        const zip = new JSZip();
        const usedNames = new Set();
        items.forEach((it, idx) => {
            let name = it.outName;
            if (usedNames.has(name)) name = `${idx + 1}-${name}`;
            usedNames.add(name);
            zip.file(name, it.blob);
        });
        const content = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = 'neonhub-photos.zip';
        a.click();
        URL.revokeObjectURL(a.href);
        StateModule.toast(I18nModule.getLang() === 'ru' ? 'ZIP-архив с фото скачан!' : 'Photo ZIP downloaded!', 'success');
    }

    return { init, addFiles };
})();


/* =========================================================================
   SCREENSHOT STITCHER / COLLAGE MODULE
========================================================================= */
const ScreenshotStitchModule = (() => {
    let images = []; // { file, name, img }

    function init() {
        const input = document.getElementById('stitch-file-input');
        if (!input) return;

        input.addEventListener('change', (e) => {
            if (e.target.files.length) addFiles(Array.from(e.target.files));
            input.value = '';
        });

        document.getElementById('stitch-clear-btn').addEventListener('click', () => {
            images = [];
            renderList();
            renderCanvas();
        });

        ['stitch-layout', 'stitch-gap', 'stitch-bg', 'stitch-radius'].forEach((id) => {
            document.getElementById(id).addEventListener('input', () => {
                if (id === 'stitch-gap') document.getElementById('stitch-gap-val').textContent = `${document.getElementById(id).value} px`;
                renderCanvas();
            });
        });

        document.getElementById('stitch-download-btn').addEventListener('click', () => {
            if (!images.length) return;
            const canvas = document.getElementById('stitch-canvas');
            canvas.toBlob((blob) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'neonhub-stitched.png';
                a.click();
                URL.revokeObjectURL(a.href);
                StateModule.toast(I18nModule.getLang() === 'ru' ? 'Склеенное изображение сохранено!' : 'Stitched image saved!', 'success');
            }, 'image/png');
        });
    }

    function loadOne(file) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve({ file, name: file.name, img });
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
            };
            img.src = url;
        });
    }

    async function addFiles(files) {
        const valid = files.filter((f) => f.type.startsWith('image/'));
        if (!valid.length) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Выберите изображения (PNG / JPG / WebP)' : 'Select images (PNG / JPG / WebP)', 'warn');
            return;
        }
        for (const f of valid) {
            StateModule.trackProcessed(f.size);
            const loaded = await loadOne(f);
            if (loaded) images.push(loaded);
        }
        renderList();
        renderCanvas();
        StateModule.toast(I18nModule.getLang() === 'ru' ? `Добавлено для склейки: ${valid.length}` : `Added to stitch: ${valid.length}`, 'success');
    }

    function renderList() {
        const list = document.getElementById('stitch-file-list');
        document.getElementById('stitch-download-btn').disabled = images.length === 0;
        if (!images.length) {
            list.innerHTML = `<div class="text-xs text-zinc-500 text-center py-4">${I18nModule.getLang() === 'ru' ? 'Перетащите 2 или более скриншотов сюда' : 'Drop 2 or more screenshots here'}</div>`;
            return;
        }
        list.innerHTML = images.map((it, i) => `
            <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl lab-input text-xs">
                <span class="truncate font-medium text-zinc-800 dark:text-zinc-200">${i + 1}. ${StateModule.escapeHtml(it.name)}</span>
                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" data-up="${i}" class="st-up px-1.5 py-0.5 rounded lab-segmented">↑</button>
                    <button type="button" data-dn="${i}" class="st-dn px-1.5 py-0.5 rounded lab-segmented">↓</button>
                    <button type="button" data-rm="${i}" class="st-rm px-1.5 py-0.5 text-rose-500">×</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.st-up').forEach((b) => b.addEventListener('click', () => {
            const i = Number(b.dataset.up);
            if (i > 0) { [images[i - 1], images[i]] = [images[i], images[i - 1]]; renderList(); renderCanvas(); }
        }));
        list.querySelectorAll('.st-dn').forEach((b) => b.addEventListener('click', () => {
            const i = Number(b.dataset.dn);
            if (i < images.length - 1) { [images[i + 1], images[i]] = [images[i], images[i + 1]]; renderList(); renderCanvas(); }
        }));
        list.querySelectorAll('.st-rm').forEach((b) => b.addEventListener('click', () => {
            images.splice(Number(b.dataset.rm), 1); renderList(); renderCanvas();
        }));
    }

    function drawRoundedImage(ctx, img, x, y, w, h, r) {
        ctx.save();
        if (r > 0) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            ctx.clip();
        }
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
    }

    function renderCanvas() {
        const canvas = document.getElementById('stitch-canvas');
        const empty = document.getElementById('stitch-empty');
        const info = document.getElementById('stitch-info');
        if (!images.length) {
            canvas.classList.add('hidden');
            empty.classList.remove('hidden');
            info.textContent = '';
            return;
        }
        empty.classList.add('hidden');
        canvas.classList.remove('hidden');

        const layout = document.getElementById('stitch-layout').value;
        const gap = Number(document.getElementById('stitch-gap').value) || 0;
        const bg = document.getElementById('stitch-bg').value;
        const radius = Number(document.getElementById('stitch-radius').value) || 0;

        let cw = 0, ch = 0;
        const placements = [];

        if (layout === 'vertical') {
            const targetW = Math.max(...images.map((it) => it.img.naturalWidth));
            let y = gap;
            images.forEach((it) => {
                const scale = targetW / it.img.naturalWidth;
                const h = Math.round(it.img.naturalHeight * scale);
                placements.push({ img: it.img, x: gap, y, w: targetW, h });
                y += h + gap;
            });
            cw = targetW + gap * 2;
            ch = y;
        } else if (layout === 'horizontal') {
            const targetH = Math.max(...images.map((it) => it.img.naturalHeight));
            let x = gap;
            images.forEach((it) => {
                const scale = targetH / it.img.naturalHeight;
                const w = Math.round(it.img.naturalWidth * scale);
                placements.push({ img: it.img, x, y: gap, w, h: targetH });
                x += w + gap;
            });
            cw = x;
            ch = targetH + gap * 2;
        } else {
            // Сетка 2 колонки
            const cols = 2;
            const cellW = Math.min(1200, Math.max(...images.map((it) => it.img.naturalWidth)));
            const rowHeights = [];
            for (let i = 0; i < images.length; i += cols) {
                const slice = images.slice(i, i + cols);
                const maxH = Math.max(...slice.map((it) => Math.round((it.img.naturalHeight * cellW) / it.img.naturalWidth)));
                rowHeights.push(maxH);
            }
            let y = gap;
            rowHeights.forEach((rh, rIdx) => {
                for (let c = 0; c < cols; c++) {
                    const idx = rIdx * cols + c;
                    if (!images[idx]) continue;
                    const it = images[idx];
                    const h = Math.round((it.img.naturalHeight * cellW) / it.img.naturalWidth);
                    placements.push({ img: it.img, x: gap + c * (cellW + gap), y: y + Math.round((rh - h) / 2), w: cellW, h });
                }
                y += rh + gap;
            });
            cw = cellW * cols + gap * (cols + 1);
            ch = y;
        }

        canvas.width = Math.max(1, cw);
        canvas.height = Math.max(1, ch);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (bg !== 'transparent') {
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        placements.forEach((p) => drawRoundedImage(ctx, p.img, p.x, p.y, p.w, p.h, radius));
        info.textContent = `${canvas.width} × ${canvas.height} px • ${images.length} ${I18nModule.getLang() === 'ru' ? 'фото' : 'photos'}`;
    }

    return { init, addFiles };
})();

/* =========================================================================
   LOCAL BACKGROUND REMOVER (AI WASM + INSTANT CHROMA-KEY FALLBACK)
========================================================================= */
const BgRemoveModule = (() => {
    let sourceFile = null;
    let sourceImg = null;
    let resultBlob = null;

    function init() {
        const input = document.getElementById('rmbg-file-input');
        if (!input) return;

        input.addEventListener('change', (e) => {
            if (e.target.files[0]) loadImageFile(e.target.files[0]);
            input.value = '';
        });

        document.getElementById('rmbg-ai-btn').addEventListener('click', runAiRemoval);
        document.getElementById('rmbg-fast-btn').addEventListener('click', runFastCornerRemoval);
        document.getElementById('rmbg-tol').addEventListener('input', (e) => {
            document.getElementById('rmbg-tol-val').textContent = e.target.value;
        });

        document.getElementById('rmbg-download-btn').addEventListener('click', () => {
            if (!resultBlob) return;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(resultBlob);
            a.download = 'neonhub-no-bg.png';
            a.click();
            URL.revokeObjectURL(a.href);
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'PNG без фона сохранён!' : 'Transparent PNG saved!', 'success');
        });
    }

    function loadImageFile(file) {
        if (!file.type.startsWith('image/')) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Выберите изображение' : 'Select an image first', 'warn');
            return;
        }
        StateModule.trackProcessed(file.size);
        sourceFile = file;
        resultBlob = null;
        document.getElementById('rmbg-download-btn').disabled = true;
        document.getElementById('rmbg-ai-btn').disabled = false;
        document.getElementById('rmbg-fast-btn').disabled = false;
        document.getElementById('rmbg-status').textContent = `${file.name} (${StateModule.formatBytes(file.size)})`;

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            sourceImg = img;
            const preview = document.getElementById('rmbg-preview');
            preview.src = url;
            preview.classList.remove('hidden');
            document.getElementById('rmbg-empty').classList.add('hidden');
        };
        img.src = url;
    }

    async function runAiRemoval() {
        if (!sourceFile) return;
        const status = document.getElementById('rmbg-status');
        const aiBtn = document.getElementById('rmbg-ai-btn');
        aiBtn.disabled = true;
        status.textContent = I18nModule.getLang() === 'ru' ? 'Загрузка локальной ИИ-модели (~40 МБ при 1-м запуске)...' : 'Loading local AI model (~40 MB on first run)...';
        try {
            const mod = await import('https://esm.sh/@imgly/background-removal@1.4.5');
            const removeBg = mod.removeBackground || mod.default;
            const blob = await removeBg(sourceFile, {
                progress: (key, current, total) => {
                    if (total > 0) status.textContent = I18nModule.getLang() === 'ru' ? `ИИ-обработка: ${Math.round((current / total) * 100)}%` : `AI processing: ${Math.round((current / total) * 100)}%`;
                }
            });
            resultBlob = blob;
            document.getElementById('rmbg-preview').src = URL.createObjectURL(blob);
            document.getElementById('rmbg-download-btn').disabled = false;
            status.textContent = I18nModule.getLang() === 'ru' ? 'Готово! Фон удалён нейросетью локально.' : 'Done! Background removed locally via AI.';
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Фон удалён!' : 'Background removed!', 'success');
        } catch (err) {
            status.textContent = I18nModule.getLang() === 'ru' ? 'ИИ-модель недоступна офлайн — используйте «Быстрое удаление (однотонный фон)».' : 'AI model unavailable offline — use Quick Remove (solid background).';
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Используйте быстрый режим для однотонного фона' : 'Use Quick Mode for solid backgrounds', 'warn');
        } finally {
            aiBtn.disabled = false;
        }
    }

    function runFastCornerRemoval() {
        if (!sourceImg) return;
        const tol = Number(document.getElementById('rmbg-tol').value) || 38;
        const c = document.createElement('canvas');
        c.width = sourceImg.naturalWidth;
        c.height = sourceImg.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(sourceImg, 0, 0);
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const d = imgData.data;

        // Берём цвет фона из верхнего левого угла (0,0) и делаем flood-fill от краёв
        const bgR = d[0], bgG = d[1], bgB = d[2];
        const w = c.width, h = c.height;
        const visited = new Uint8Array(w * h);
        const stack = [0, w - 1, (h - 1) * w, h * w - 1];
        const tolSq = tol * tol * 3;

        while (stack.length) {
            const idx = stack.pop();
            if (visited[idx]) continue;
            visited[idx] = 1;
            const p = idx * 4;
            const dr = d[p] - bgR, dg = d[p + 1] - bgG, db = d[p + 2] - bgB;
            if (dr * dr + dg * dg + db * db <= tolSq) {
                d[p + 3] = 0;
                const x = idx % w, y = (idx - x) / w;
                if (x > 0) stack.push(idx - 1);
                if (x < w - 1) stack.push(idx + 1);
                if (y > 0) stack.push(idx - w);
                if (y < h - 1) stack.push(idx + w);
            }
        }
        ctx.putImageData(imgData, 0, 0);
        c.toBlob((blob) => {
            resultBlob = blob;
            document.getElementById('rmbg-preview').src = URL.createObjectURL(blob);
            document.getElementById('rmbg-download-btn').disabled = false;
            document.getElementById('rmbg-status').textContent = I18nModule.getLang() === 'ru' ? `Готово (быстрый режим, допуск ${tol})` : `Done (quick mode, tolerance ${tol})`;
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Однотонный фон удалён!' : 'Solid background removed!', 'success');
        }, 'image/png');
    }

    return { init, loadImageFile };
})();
