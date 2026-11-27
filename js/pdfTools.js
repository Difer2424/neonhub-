// =========================================================================
// PDF TOOLS: MERGE, EXTRACT PAGES & ROTATE (100% LOCAL VIA PDF-LIB)
// =========================================================================

const PdfToolsModule = (() => {
    let pdfItems = []; // { file, name, pages, bytes }

    function init() {
        const input = document.getElementById('pdf-file-input');
        if (!input) return;

        input.addEventListener('change', (e) => {
            if (e.target.files.length) addFiles(Array.from(e.target.files));
            input.value = '';
        });

        document.getElementById('pdf-clear-btn').addEventListener('click', () => {
            pdfItems = [];
            document.getElementById('pdf-page-range').value = '';
            render();
        });

        document.getElementById('pdf-build-btn').addEventListener('click', buildPdf);
    }

    async function addFiles(files) {
        if (typeof PDFLib === 'undefined') {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Библиотека pdf-lib не загрузилась' : 'pdf-lib library failed to load', 'warn');
            return;
        }
        const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (!pdfs.length) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Выберите PDF-файлы (.pdf)' : 'Please select PDF files (.pdf)', 'warn');
            return;
        }
        for (const f of pdfs) {
            try {
                const bytes = await f.arrayBuffer();
                const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
                pdfItems.push({ file: f, name: f.name, pages: doc.getPageCount(), bytes });
            } catch (e) {
                StateModule.toast(I18nModule.getLang() === 'ru' ? `Не удалось открыть ${f.name}` : `Failed to open ${f.name}`, 'warn');
            }
        }
        render();
        StateModule.toast(I18nModule.getLang() === 'ru' ? `Добавлено PDF: ${pdfs.length}` : `Added PDFs: ${pdfs.length}`, 'success');
    }

    function render() {
        const list = document.getElementById('pdf-file-list');
        const info = document.getElementById('pdf-total-info');
        const buildBtn = document.getElementById('pdf-build-btn');

        const totalPages = pdfItems.reduce((s, it) => s + it.pages, 0);
        info.textContent = I18nModule.getLang() === 'ru' ? `${pdfItems.length} файлов • ${totalPages} стр.` : `${pdfItems.length} files • ${totalPages} pages`;
        buildBtn.disabled = pdfItems.length === 0;

        if (!pdfItems.length) {
            list.innerHTML = `<div class="text-center text-xs text-zinc-500 py-8">
                ${I18nModule.getLang() === 'ru' ? 'Перетащите один или несколько PDF-файлов сюда, чтобы объединить их, вырезать нужные страницы или повернуть.' : 'Drop one or more PDF files here to merge, extract page ranges, or rotate pages.'}
            </div>`;
            return;
        }

        list.innerHTML = pdfItems.map((it, idx) => `
            <div class="flex items-center justify-between gap-3 p-3 rounded-2xl lab-input text-xs">
                <div class="min-w-0 flex-1">
                    <div class="font-medium text-zinc-900 dark:text-zinc-100 truncate">${StateModule.escapeHtml(it.name)}</div>
                    <div class="text-[11px] font-mono text-zinc-400">${it.pages} ${I18nModule.getLang() === 'ru' ? 'стр.' : 'pages'} • ${StateModule.formatBytes(it.file.size)}</div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" data-up="${idx}" class="pdf-up px-2 py-1 rounded-lg lab-segmented hover:opacity-80" title="${I18nModule.getLang() === 'ru' ? 'Выше' : 'Move up'}">↑</button>
                    <button type="button" data-dn="${idx}" class="pdf-dn px-2 py-1 rounded-lg lab-segmented hover:opacity-80" title="${I18nModule.getLang() === 'ru' ? 'Ниже' : 'Move down'}">↓</button>
                    <button type="button" data-rm="${idx}" class="pdf-rm px-2 py-1 text-rose-500 hover:underline">×</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.pdf-up').forEach((b) => {
            b.addEventListener('click', () => {
                const i = Number(b.dataset.up);
                if (i > 0) {
                    [pdfItems[i - 1], pdfItems[i]] = [pdfItems[i], pdfItems[i - 1]];
                    render();
                }
            });
        });
        list.querySelectorAll('.pdf-dn').forEach((b) => {
            b.addEventListener('click', () => {
                const i = Number(b.dataset.dn);
                if (i < pdfItems.length - 1) {
                    [pdfItems[i + 1], pdfItems[i]] = [pdfItems[i], pdfItems[i + 1]];
                    render();
                }
            });
        });
        list.querySelectorAll('.pdf-rm').forEach((b) => {
            b.addEventListener('click', () => {
                pdfItems.splice(Number(b.dataset.rm), 1);
                render();
            });
        });
    }

    function parsePageRange(rangeStr, totalPages) {
        const clean = rangeStr.trim();
        if (!clean) return Array.from({ length: totalPages }, (_, i) => i);
        const indices = [];
        clean.split(',').forEach((part) => {
            const p = part.trim();
            if (p.includes('-')) {
                const [a, b] = p.split('-').map((n) => parseInt(n.trim(), 10));
                if (!isNaN(a) && !isNaN(b)) {
                    const start = Math.max(1, Math.min(a, b));
                    const end = Math.min(totalPages, Math.max(a, b));
                    for (let k = start; k <= end; k++) indices.push(k - 1);
                }
            } else {
                const n = parseInt(p, 10);
                if (!isNaN(n) && n >= 1 && n <= totalPages) indices.push(n - 1);
            }
        });
        return indices;
    }

    async function buildPdf() {
        if (!pdfItems.length || typeof PDFLib === 'undefined') return;
        const btn = document.getElementById('pdf-build-btn');
        btn.disabled = true;
        try {
            const merged = await PDFLib.PDFDocument.create();
            const rotDeg = Number(document.getElementById('pdf-rotate-deg').value) || 0;

            for (const item of pdfItems) {
                const src = await PDFLib.PDFDocument.load(item.bytes, { ignoreEncryption: true });
                const copied = await merged.copyPages(src, src.getPageIndices());
                copied.forEach((p) => merged.addPage(p));
            }

            const rangeStr = document.getElementById('pdf-page-range').value.trim();
            let finalDoc = merged;

            if (rangeStr) {
                const total = merged.getPageCount();
                const keep = parsePageRange(rangeStr, total);
                if (!keep.length) {
                    StateModule.toast(I18nModule.getLang() === 'ru' ? 'Укажите корректный диапазон страниц' : 'Enter a valid page range', 'warn');
                    btn.disabled = false;
                    return;
                }
                finalDoc = await PDFLib.PDFDocument.create();
                const picked = await finalDoc.copyPages(merged, keep);
                picked.forEach((p) => finalDoc.addPage(p));
            }

            if (rotDeg !== 0) {
                finalDoc.getPages().forEach((page) => {
                    const cur = page.getRotation().angle || 0;
                    page.setRotation(PDFLib.degrees((cur + rotDeg) % 360));
                });
            }

            const outBytes = await finalDoc.save();
            const blob = new Blob([outBytes], { type: 'application/pdf' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = pdfItems.length > 1 ? 'neonhub-merged.pdf' : 'neonhub-edited.pdf';
            a.click();
            URL.revokeObjectURL(a.href);
            StateModule.toast(I18nModule.getLang() === 'ru' ? `PDF готов (${finalDoc.getPageCount()} стр.)!` : `PDF ready (${finalDoc.getPageCount()} pages)!`, 'success');
        } catch (err) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Ошибка при сборке PDF' : 'Error building PDF', 'warn');
        } finally {
            btn.disabled = false;
        }
    }

    return { init, addFiles };
})();
