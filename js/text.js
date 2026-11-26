// =========================================================================
// TEXT & DATA TOOLS: PDF CLEANER, DIFF, DE-AI, TABLES CONVERTER
// =========================================================================

const TextToolsModule = (() => {
    function init() {
        const cleanerIn = document.getElementById('cleaner-input');
        cleanerIn.addEventListener('input', runCleaner);
        ['opt-hyphens', 'opt-breaks', 'opt-spaces', 'opt-pages'].forEach((id) => {
            document.getElementById(id).addEventListener('change', runCleaner);
        });

        document.getElementById('cleaner-clear-btn').addEventListener('click', () => {
            cleanerIn.value = '';
            runCleaner();
        });

        document.getElementById('cleaner-sample-btn').addEventListener('click', () => {
            cleanerIn.value = `Глава 1. Приват-\nность данных в брау-\nзере\n\n— 12 —\n\nСовременные веб-при-\nложения позволяют обра-\nбатывать файлы локально\nбез отправки на уда-\nлённые серверы.\n\nСтраница 13\n\nЭто экономит   время и\nгарантирует   безопасность.`;
            runCleaner();
        });

        document.getElementById('cleaner-copy-btn').addEventListener('click', () => {
            const out = document.getElementById('cleaner-output');
            if (!out.value) return;
            out.select();
            try {
                document.execCommand('copy');
                StateModule.toast(I18nModule.getLang() === 'ru' ? 'Текст скопирован!' : 'Text copied!', 'success');
            } catch (e) {}
        });

        document.getElementById('cleaner-to-deai').addEventListener('click', () => {
            const out = document.getElementById('cleaner-output').value;
            if (!out.trim()) return;
            DeAiModule.setInput(out);
            RouterModule.navigateSeo('/de-ai-text');
        });

        // Diff
        document.getElementById('diff-left').addEventListener('input', runDiff);
        document.getElementById('diff-right').addEventListener('input', runDiff);
        document.getElementById('diff-sample-btn').addEventListener('click', loadDiffSample);
        document.getElementById('diff-swap-btn').addEventListener('click', () => {
            const l = document.getElementById('diff-left');
            const r = document.getElementById('diff-right');
            [l.value, r.value] = [r.value, l.value];
            runDiff();
        });
    }

    function runCleaner() {
        let text = document.getElementById('cleaner-input').value;
        if (document.getElementById('opt-pages').checked) {
            text = text.replace(/^\s*(?:[-—–]\s*\d+\s*[-—–]|(?:страница|стр\.|page)\s*\d+|\d{1,4})\s*$/gim, '');
        }
        if (document.getElementById('opt-hyphens').checked) {
            text = text.replace(/([а-яёa-z])-\s*\n\s*([а-яёa-z])/gi, '$1$2');
        }
        if (document.getElementById('opt-breaks').checked) {
            text = text.replace(/([^\n])\n(?!\n)/g, '$1 ');
        }
        if (document.getElementById('opt-spaces').checked) {
            text = text.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        }
        document.getElementById('cleaner-output').value = text;
        const unit = I18nModule.getLang() === 'ru' ? 'симв.' : 'chars';
        document.getElementById('cleaner-stats').textContent = `${text.length} ${unit}`;
    }

    function setCleanerInput(txt) {
        document.getElementById('cleaner-input').value = txt;
        runCleaner();
    }

    // Простой и быстрый LCS-diff на уровне строк и слов
    function lcsDiff(a, b) {
        const m = a.length, n = b.length;
        const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
        for (let i = m - 1; i >= 0; i--) {
            for (let j = n - 1; j >= 0; j--) {
                dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
        const res = [];
        let i = 0, j = 0;
        while (i < m && j < n) {
            if (a[i] === b[j]) {
                res.push({ type: 'eq', val: a[i] }); i++; j++;
            } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                res.push({ type: 'del', val: a[i] }); i++;
            } else {
                res.push({ type: 'add', val: b[j] }); j++;
            }
        }
        while (i < m) res.push({ type: 'del', val: a[i++] });
        while (j < n) res.push({ type: 'add', val: b[j++] });
        return res;
    }

    function renderInlineWordDiff(oldLine, newLine) {
        const oldTokens = oldLine.split(/(\s+)/);
        const newTokens = newLine.split(/(\s+)/);
        const ops = lcsDiff(oldTokens, newTokens);
        let leftHtml = '', rightHtml = '';
        ops.forEach((op) => {
            const safe = StateModule.escapeHtml(op.val);
            if (op.type === 'eq') {
                leftHtml += safe; rightHtml += safe;
            } else if (op.type === 'del') {
                leftHtml += `<mark class="bg-rose-200 dark:bg-rose-800/80 text-rose-950 dark:text-rose-100 rounded px-0.5">${safe}</mark>`;
            } else {
                rightHtml += `<mark class="bg-emerald-200 dark:bg-emerald-800/80 text-emerald-950 dark:text-emerald-100 rounded px-0.5">${safe}</mark>`;
            }
        });
        return { leftHtml, rightHtml };
    }

    function runDiff() {
        const left = document.getElementById('diff-left').value;
        const right = document.getElementById('diff-right').value;
        const out = document.getElementById('diff-output');

        if (!left && !right) {
            document.getElementById('diff-stat-add').textContent = '+0';
            document.getElementById('diff-stat-del').textContent = '-0';
            out.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">${I18nModule.getLang() === 'ru' ? 'Вставьте две версии текста выше или загрузите пример.' : 'Paste two versions above or load a sample.'}</div>`;
            return;
        }

        const ops = lcsDiff(left.split('\n'), right.split('\n'));
        let added = 0, deleted = 0, lineNum = 1;
        let html = '';

        for (let k = 0; k < ops.length; k++) {
            const cur = ops[k];
            const next = ops[k + 1];

            // Если строка изменена — показываем чёткую пару «Было → Стало» с подсветкой слов
            if (cur.type === 'del' && next && next.type === 'add') {
                deleted++; added++;
                const { leftHtml, rightHtml } = renderInlineWordDiff(cur.val, next.val);
                html += `<div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/[0.05] dark:divide-white/[0.05]">
                    <div class="px-4 py-2 bg-rose-500/[0.08] text-rose-900 dark:text-rose-200 whitespace-pre-wrap flex gap-3"><span class="select-none text-[11px] opacity-45 w-6 text-right shrink-0">${lineNum}</span><span class="flex-1">${leftHtml}</span></div>
                    <div class="px-4 py-2 bg-emerald-500/[0.08] text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap flex gap-3"><span class="select-none text-[11px] opacity-45 w-6 text-right shrink-0">${lineNum}</span><span class="flex-1">${rightHtml}</span></div>
                </div>`;
                lineNum++;
                k++;
                continue;
            }

            const safe = StateModule.escapeHtml(cur.val);
            if (cur.type === 'eq') {
                html += `<div class="px-4 py-1.5 text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap flex gap-3"><span class="select-none text-[11px] opacity-35 w-6 text-right shrink-0">${lineNum}</span><span class="flex-1">${safe || ' '}</span></div>`;
                lineNum++;
            } else if (cur.type === 'del') {
                deleted++;
                html += `<div class="px-4 py-2 bg-rose-500/[0.09] text-rose-900 dark:text-rose-200 whitespace-pre-wrap flex gap-3"><span class="select-none text-[11px] font-bold text-rose-500 w-6 text-right shrink-0">−</span><span class="flex-1 line-through opacity-85">${safe}</span></div>`;
            } else {
                added++;
                html += `<div class="px-4 py-2 bg-emerald-500/[0.09] text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap flex gap-3"><span class="select-none text-[11px] font-bold text-emerald-500 w-6 text-right shrink-0">+</span><span class="flex-1">${safe}</span></div>`;
                lineNum++;
            }
        }

        const isRu = I18nModule.getLang() === 'ru';
        document.getElementById('diff-stat-add').textContent = isRu ? `+${added} добавлено` : `+${added} added`;
        document.getElementById('diff-stat-del').textContent = isRu ? `-${deleted} удалено` : `-${deleted} removed`;
        out.innerHTML = html;
    }

    function setDiffTexts(t1, t2) {
        document.getElementById('diff-left').value = t1;
        document.getElementById('diff-right').value = t2;
        runDiff();
    }

    function loadDiffSample() {
        setDiffTexts(
            `Договор оказания услуг №14\nСрок выполнения работ: 14 календарных дней.\nСтоимость проекта составляет 120 000 рублей.\nОплата производится в течение 5 банковских дней.`,
            `Договор оказания услуг №14-А\nСрок выполнения работ: 10 рабочих дней.\nСтоимость проекта составляет 135 000 рублей (включая поддержку).\nОплата производится в течение 5 банковских дней.`
        );
    }

    return { init, setCleanerInput, setDiffTexts, loadDiffSample };
})();

const DeAiModule = (() => {
    const INVISIBLE_CHARS = {
        '\u200B': { tag: 'ZWSP', code: 'U+200B', replace: '' },
        '\u200C': { tag: 'ZWNJ', code: 'U+200C', replace: '' },
        '\u200D': { tag: 'ZWJ',  code: 'U+200D', replace: '' },
        '\uFEFF': { tag: 'BOM',  code: 'U+FEFF', replace: '' },
        '\u00A0': { tag: 'NBSP', code: 'U+00A0', replace: ' ' },
        '\u00AD': { tag: 'SHY',  code: 'U+00AD', replace: '' },
        '\u202F': { tag: 'NNBSP', code: 'U+202F', replace: ' ' },
        '\u2060': { tag: 'WJ',   code: 'U+2060', replace: '' }
    };

    const INVISIBLE_REGEX = /[\u200B\u200C\u200D\uFEFF\u00A0\u00AD\u202F\u2060]/g;
    const DASH_REGEX = /[—–]/g;
    const TYPO_REGEX = /[«»“”„‟‘’‚…]/g;
    const EMOJI_REGEX = /(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2705}\u{274C}\u{2728}]\uFE0F?)/gu;

    const CLICHE_PATTERNS = [
        /(^|\n)\s*(?:конечно|разумеется|безусловно)[!,.]?\s*(?:вот\s+[^:\n]{0,45}[:.]?\s*)?/gi,
        /(?:^|(?<=[.!?\n]\s*))(?:важно\s+отметить|стоит\s+отметить|стоит\s+подчеркнуть|следует\s+отметить|необходимо\s+подчеркнуть),?\s*(?:что\s+)?/gi,
        /(?:^|(?<=[.!?\n]\s*))(?:в\s+современном\s+(?:быстро\s+меняющемся\s+)?мире|в\s+наше\s+время|не\s+секрет),?\s*(?:что\s+)?/gi,
        /(?:^|(?<=[.!?\n]\s*))(?:в\s+заключение(?:\s+(?:можно|хочется)\s+сказать)?|подводя\s+итог(?:и)?|резюмируя(?:\s+вышесказанное)?|таким\s+образом),?\s*(?:что\s+)?/gi,
        /(?:^|(?<=[.!?\n]\s*))(?:давайте\s+разбер[её]мся|рассмотрим\s+подробнее)[:.,]?\s*/gi,
        /(^|\n)\s*(?:certainly|sure thing|absolutely|of course)[!,.]?\s*(?:here(?:'s| is)\s+[^:\n]{0,45}[:.]?\s*)?/gi,
        /(?:^|(?<=[.!?\n]\s*))(?:it\s+is\s+(?:important|worth)\s+to\s+(?:note|mention|highlight)|needless\s+to\s+say),?\s*(?:that\s+)?/gi,
        /(?:^|(?<=[.!?\n]\s*))(?:in\s+today'?s\s+(?:fast-paced\s+|digital\s+|ever-evolving\s+)?world|in\s+conclusion|to\s+sum\s+up|all\s+in\s+all|overall|furthermore|moreover),?\s*/gi,
        /(?:^|(?<=[.!?\n]\s*))(?:let'?s\s+(?:dive\s+in(?:to)?|delve\s+into|explore))[:.,]?\s*/gi
    ];

    function init() {
        const input = document.getElementById('deai-input');
        const showInvCb = document.getElementById('deai-show-invisible');

        input.addEventListener('input', runDeAi);
        ['deai-opt-invisible', 'deai-opt-dashes', 'deai-opt-typo', 'deai-opt-markdown', 'deai-opt-emoji', 'deai-opt-cliches'].forEach((id) => {
            document.getElementById(id).addEventListener('change', runDeAi);
        });

        showInvCb.addEventListener('change', () => toggleInvisibleMode(showInvCb.checked));

        document.getElementById('deai-back-to-edit').addEventListener('click', () => {
            showInvCb.checked = false;
            toggleInvisibleMode(false);
            input.focus();
        });

        document.getElementById('deai-clear-btn').addEventListener('click', () => {
            input.value = '';
            runDeAi();
        });

        document.getElementById('deai-sample-btn').addEventListener('click', loadSample);

        document.getElementById('deai-copy-btn').addEventListener('click', () => {
            const out = document.getElementById('deai-output');
            if (!out.value) return;
            out.focus();
            out.select();
            try {
                document.execCommand('copy');
                StateModule.toast(I18nModule.getLang() === 'ru' ? 'Очищенный текст скопирован!' : 'Cleaned text copied!', 'success');
            } catch (e) {}
        });

        document.getElementById('deai-to-diff').addEventListener('click', () => {
            const raw = input.value;
            const cleaned = document.getElementById('deai-output').value;
            if (!raw.trim()) {
                StateModule.toast(I18nModule.getLang() === 'ru' ? 'Сначала вставьте текст или пример' : 'Paste text or load a sample first', 'warn');
                return;
            }
            TextToolsModule.setDiffTexts(raw, cleaned);
            RouterModule.navigateSeo('/compare-documents');
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Открыто сравнение До / После в Diff' : 'Opened Before / After in Diff', 'info');
        });
    }

    function toggleInvisibleMode(show) {
        document.getElementById('deai-input').classList.toggle('hidden', show);
        document.getElementById('deai-invisible-wrapper').classList.toggle('hidden', !show);
        if (show) renderInvisibleInspector(document.getElementById('deai-input').value);
    }

    function countMarkdown(text) {
        let count = 0;
        [/^#{1,6}\s+/gm, /\*\*[^*\n]+\*\*/g, /__[^_\n]+__/g, /(?<!\*)\*[^*\n]+\*(?!\*)/g, /`[^`\n]+`/g, /\[([^\]\n]+)\]\(([^)\n]+)\)/g, /^\s*[-*+]\s+/gm].forEach((re) => {
            const m = text.match(re);
            if (m) count += m.length;
        });
        return count;
    }

    function countCliches(text) {
        let count = 0;
        CLICHE_PATTERNS.forEach((re) => {
            re.lastIndex = 0;
            const m = text.match(re);
            if (m) m.forEach((hit) => { if (hit.trim().length > 0) count++; });
        });
        return count;
    }

    function diagnose(text) {
        const invisible = (text.match(INVISIBLE_REGEX) || []).length;
        const dashes = (text.match(DASH_REGEX) || []).length;
        const typo = (text.match(TYPO_REGEX) || []).length;
        const markdown = countMarkdown(text);
        const emoji = (text.match(EMOJI_REGEX) || []).length;
        const cliches = countCliches(text);
        const total = invisible + dashes + typo + markdown + emoji + cliches;

        let score = 0;
        if (text.trim().length > 0 && total > 0) {
            const weighted = invisible * 14 + cliches * 18 + markdown * 8 + dashes * 7 + emoji * 7 + typo * 5;
            const words = Math.max(15, text.trim().split(/\s+/).length);
            score = Math.min(100, Math.round(weighted * Math.min(1.5, 45 / words)));
        }
        return { invisible, dashes, typo, markdown, emoji, cliches, total, score };
    }

    function cleanText(raw, opts) {
        let text = raw;
        if (opts.invisible) {
            text = text.replace(INVISIBLE_REGEX, (ch) => (INVISIBLE_CHARS[ch] ? INVISIBLE_CHARS[ch].replace : ''));
        }
        if (opts.markdown) {
            text = text
                .replace(/^#{1,6}\s+/gm, '')
                .replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g, '$1')
                .replace(/\*\*([^*\n]+)\*\*/g, '$1')
                .replace(/__([^_\n]+)__/g, '$1')
                .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
                .replace(/`([^`\n]+)`/g, '$1')
                .replace(/^\s*[-*+]\s+/gm, '');
        }
        if (opts.emoji) text = text.replace(EMOJI_REGEX, '');
        if (opts.typo) {
            text = text.replace(/[«»“”„‟]/g, '"').replace(/[‘’‚]/g, "'").replace(/…/g, '...');
        }
        if (opts.dashes) text = text.replace(/[—–]/g, '-');
        if (opts.cliches) {
            CLICHE_PATTERNS.forEach((re) => {
                text = text.replace(re, (m, prefix) => (prefix === '\n' ? '\n' : ''));
            });
            text = text.replace(/(^|\n|[.!?]\s+)([a-zа-яё])/g, (m, p1, p2) => p1 + p2.toUpperCase());
        }
        return text
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/ +([.,!?;:])/g, '$1')
            .replace(/^[ \t]+/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    function renderInvisibleInspector(text) {
        const view = document.getElementById('deai-invisible-view');
        if (!text) {
            view.innerHTML = `<span class="text-slate-400 text-xs">${I18nModule.getLang() === 'ru' ? 'Пусто — вставьте текст или загрузите пример.' : 'Empty — paste text or insert a sample.'}</span>`;
            return;
        }
        let html = '';
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const meta = INVISIBLE_CHARS[ch];
            if (meta) {
                html += `<span class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[10px] font-mono font-bold bg-amber-200/90 dark:bg-amber-500/30 text-amber-950 dark:text-amber-200 border border-amber-400/80 dark:border-amber-500/60 align-middle select-none" title="${meta.code}">${meta.tag}</span>`;
            } else {
                html += StateModule.escapeHtml(ch);
            }
        }
        view.innerHTML = html;
    }

    function setBadge(id, count, isAmber = false) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = count;
        el.className = count > 0
            ? `px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${isAmber ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200' : 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-200'}`
            : 'px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-black/5 dark:bg-white/10 text-zinc-400';
    }

    function runDeAi() {
        const raw = document.getElementById('deai-input').value;
        const opts = {
            invisible: document.getElementById('deai-opt-invisible').checked,
            dashes: document.getElementById('deai-opt-dashes').checked,
            typo: document.getElementById('deai-opt-typo').checked,
            markdown: document.getElementById('deai-opt-markdown').checked,
            emoji: document.getElementById('deai-opt-emoji').checked,
            cliches: document.getElementById('deai-opt-cliches').checked
        };

        const before = diagnose(raw);
        const cleaned = cleanText(raw, opts);
        const after = diagnose(cleaned);

        setBadge('deai-badge-invisible', before.invisible, true);
        setBadge('deai-badge-dashes', before.dashes);
        setBadge('deai-badge-typo', before.typo);
        setBadge('deai-badge-markdown', before.markdown);
        setBadge('deai-badge-emoji', before.emoji);
        setBadge('deai-badge-cliches', before.cliches);

        const isRu = I18nModule.getLang() === 'ru';
        const unitArt = isRu ? 'артеф.' : 'items';
        const scoreBeforeEl = document.getElementById('deai-score-before');
        const barBefore = document.getElementById('deai-bar-before');

        scoreBeforeEl.textContent = `${before.score}%`;
        document.getElementById('deai-score-after').textContent = `${after.score}%`;
        document.getElementById('deai-count-before').textContent = `${before.total} ${unitArt}`;
        document.getElementById('deai-count-after').textContent = `${after.total} ${unitArt}`;
        barBefore.style.width = `${before.score}%`;
        document.getElementById('deai-bar-after').style.width = `${after.score}%`;

        barBefore.className = `h-full rounded-full transition-all duration-300 ${before.score >= 60 ? 'bg-rose-500' : before.score >= 25 ? 'bg-amber-500' : 'bg-emerald-500'}`;
        scoreBeforeEl.className = `px-2 py-0.5 rounded-md font-semibold ${before.score >= 60 ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : before.score >= 25 ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`;

        const removed = Math.max(0, before.total - after.total);
        document.getElementById('deai-total-removed').textContent = removed > 0
            ? (isRu ? `(снято ${removed})` : `(-${removed} cleaned)`)
            : '';

        document.getElementById('deai-output').value = cleaned;
        const unitChar = isRu ? 'симв.' : 'chars';
        document.getElementById('deai-in-stats').textContent = `${raw.length} ${unitChar}`;
        document.getElementById('deai-out-stats').textContent = `${cleaned.length} ${unitChar}`;

        if (document.getElementById('deai-show-invisible').checked) {
            renderInvisibleInspector(raw);
        }
    }

    function loadSample() {
        const isRu = I18nModule.getLang() === 'ru';
        const sample = isRu
            ? `\uFEFFКонечно! Вот готовый текст для вашего проекта:\n\n### 🚀 Ключевые преимущества локальной обработки\n\nВ современном мире важно отметить, что приватность данных\u00A0— это основа доверия. Стоит подчеркнуть, что локальные\u200B инструменты работают мгновенно и без серверов…\n\n- **Полная безопасность**\u200C — файлы не покидают устройство ✨\n- **Высокая скорость** — обработка через \`Canvas API\` и WebAssembly\u00AD 💡\n- **Гибкие «цепочки»**\u200D – мгновенная передача между модулями ✅\n\nВ заключение можно сказать, что такой подход открывает новые горизонты!`
            : `\uFEFFCertainly! Here is a polished draft for your product:\n\n### 🚀 Key Benefits of Local-First Processing\n\nIn today's fast-paced world, it is important to note that privacy\u00A0— not cloud storage — builds user trust. Let's dive in…\n\n- **Zero Uploads**\u200B — your files stay on your device ✨\n- **Instant Speed**\u200C — powered by \`Canvas API\` and WebAssembly\u00AD 💡\n- **Smart “Workflows”**\u200D – seamless handoff between tools ✅\n\nIn conclusion, this approach creates a smoother experience for everyone!`;

        setInput(sample);
        const cb = document.getElementById('deai-show-invisible');
        cb.checked = true;
        toggleInvisibleMode(true);
        StateModule.toast(isRu ? 'Пример загружен — невидимые знаки подсвечены!' : 'Sample loaded — hidden watermarks highlighted!', 'info');
    }

    function setInput(text) {
        document.getElementById('deai-input').value = text;
        runDeAi();
    }

    return { init, runDeAi, setInput, loadSample };
})();
window.DeAiModule = DeAiModule;

const TablesModule = (() => {
    let headers = [];
    let rows = [];

    function init() {
        document.getElementById('tables-file-input').addEventListener('change', (e) => {
            if (e.target.files[0]) loadFile(e.target.files[0]);
            e.target.value = '';
        });

        document.getElementById('tables-parse-btn').addEventListener('click', () => {
            const txt = document.getElementById('tables-raw-input').value.trim();
            if (!txt) return;
            parseText(txt);
        });

        document.getElementById('tables-sample-btn').addEventListener('click', () => {
            const sample = `Товар,Категория,Цена,Наличие\nКлавиатура,Периферия,4500,Да\nМышь ,Периферия,2100,Да\nКлавиатура,Периферия,4500,Да\nМонитор 27",Дисплеи,24900,Нет\n , , , \nНаушники,Аудио,6300,Да`;
            document.getElementById('tables-raw-input').value = sample;
            parseText(sample);
        });

        document.getElementById('tables-clear-btn').addEventListener('click', () => {
            headers = []; rows = [];
            document.getElementById('tables-raw-input').value = '';
            render();
        });

        document.getElementById('tables-dedupe-btn').addEventListener('click', () => {
            if (!rows.length) return;
            const seen = new Set();
            const before = rows.length;
            rows = rows.filter((r) => {
                const key = JSON.stringify(r.map((c) => String(c ?? '').trim()));
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            render();
            StateModule.toast(I18nModule.getLang() === 'ru' ? `Удалено дубликатов: ${before - rows.length}` : `Removed ${before - rows.length} duplicates`, 'success');
        });

        document.getElementById('tables-trim-btn').addEventListener('click', () => {
            if (!rows.length) return;
            headers = headers.map((h) => String(h ?? '').trim());
            rows = rows
                .map((r) => r.map((c) => (typeof c === 'string' ? c.trim() : c)))
                .filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
            render();
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Пробелы и пустые строки очищены' : 'Trimmed & dropped empty rows', 'success');
        });

        document.getElementById('tables-sort-asc').addEventListener('click', () => sortByCol(1));
        document.getElementById('tables-sort-desc').addEventListener('click', () => sortByCol(-1));

        document.getElementById('tables-export-xlsx').addEventListener('click', exportXlsx);
        document.getElementById('tables-export-csv').addEventListener('click', exportCsv);
        document.getElementById('tables-export-json').addEventListener('click', exportJson);
    }

    async function loadFile(file) {
        const name = file.name.toLowerCase();
        try {
            if ((name.endsWith('.xlsx') || name.endsWith('.xls')) && typeof XLSX !== 'undefined') {
                const data = await file.arrayBuffer();
                const wb = XLSX.read(data, { type: 'array' });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                setDataFromAoa(aoa);
                StateModule.toast(`Excel: ${file.name}`, 'success');
            } else {
                const txt = await file.text();
                document.getElementById('tables-raw-input').value = txt.slice(0, 50000);
                parseText(txt);
                StateModule.toast(`Loaded: ${file.name}`, 'success');
            }
        } catch (err) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Не удалось прочитать файл таблицы' : 'Failed to parse table file', 'warn');
        }
    }

    function parseCsvLine(line, sep) {
        const res = [];
        let cur = '', inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (ch === sep && !inQuotes) {
                res.push(cur); cur = '';
            } else {
                cur += ch;
            }
        }
        res.push(cur);
        return res;
    }

    function parseText(txt) {
        const trimmed = txt.trim();
        // Попытка распарсить JSON
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                let parsed = JSON.parse(trimmed);
                if (!Array.isArray(parsed)) parsed = [parsed];
                if (parsed.length && typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
                    const keySet = new Set();
                    parsed.forEach((obj) => Object.keys(obj || {}).forEach((k) => keySet.add(k)));
                    headers = Array.from(keySet);
                    rows = parsed.map((obj) => headers.map((k) => (obj && obj[k] !== undefined ? obj[k] : '')));
                    render();
                    return;
                }
            } catch (e) {}
        }
        // Определение разделителя (Tab, ; или ,)
        const lines = trimmed.split(/\r?\n/).filter((l) => l.length > 0);
        if (!lines.length) return;
        const first = lines[0];
        const sep = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
        const aoa = lines.map((l) => parseCsvLine(l, sep));
        setDataFromAoa(aoa);
    }

    function setDataFromAoa(aoa) {
        if (!aoa || !aoa.length) { headers = []; rows = []; render(); return; }
        const maxCols = Math.max(...aoa.map((r) => r.length));
        headers = Array.from({ length: maxCols }, (_, i) => String(aoa[0][i] ?? `Col_${i + 1}`));
        rows = aoa.slice(1).map((r) => Array.from({ length: maxCols }, (_, i) => r[i] ?? ''));
        render();
    }

    function sortByCol(dir) {
        const idx = Number(document.getElementById('tables-sort-col').value);
        if (isNaN(idx) || idx < 0 || !rows.length) return;
        rows.sort((a, b) => {
            const va = a[idx] ?? '', vb = b[idx] ?? '';
            const na = Number(String(va).replace(/\s/g, '').replace(',', '.'));
            const nb = Number(String(vb).replace(/\s/g, '').replace(',', '.'));
            if (!isNaN(na) && !isNaN(nb) && String(va).trim() !== '' && String(vb).trim() !== '') {
                return (na - nb) * dir;
            }
            return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
        });
        render();
    }

    function render() {
        const sel = document.getElementById('tables-sort-col');
        const prevVal = sel.value;
        sel.innerHTML = headers.length
            ? headers.map((h, i) => `<option value="${i}">${StateModule.escapeHtml(h)}</option>`).join('')
            : `<option value="">Столбец сортировки...</option>`;
        if (prevVal && Number(prevVal) < headers.length) sel.value = prevVal;

        const isRu = I18nModule.getLang() === 'ru';
        document.getElementById('tables-stats').textContent = isRu
            ? `${rows.length} строк • ${headers.length} столбцов`
            : `${rows.length} rows • ${headers.length} cols`;

        const preview = document.getElementById('tables-preview');
        if (!headers.length) {
            preview.innerHTML = `<div class="p-4 text-xs text-slate-400">${isRu ? 'Загрузите файл Excel/CSV/JSON или вставьте данные выше.' : 'Upload Excel/CSV/JSON or paste data above.'}</div>`;
            return;
        }
        const limit = Math.min(rows.length, 150);
        let html = `<table class="w-full text-left border-collapse text-xs"><thead><tr class="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">`;
        headers.forEach((h) => { html += `<th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">${StateModule.escapeHtml(h)}</th>`; });
        html += `</tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800">`;
        for (let i = 0; i < limit; i++) {
            html += `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">`;
            headers.forEach((_, c) => {
                html += `<td class="px-3 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">${StateModule.escapeHtml(rows[i][c] ?? '')}</td>`;
            });
            html += `</tr>`;
        }
        html += `</tbody></table>`;
        if (rows.length > limit) {
            html += `<div class="p-2 text-[11px] text-slate-400 text-center">Показаны первые ${limit} из ${rows.length} строк (при экспорте сохранятся все).</div>`;
        }
        preview.innerHTML = html;
    }

    function downloadBlob(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function exportXlsx() {
        if (!headers.length) return;
        if (typeof XLSX === 'undefined') {
            StateModule.toast('SheetJS не загрузился — используйте экспорт CSV/JSON', 'warn');
            return;
        }
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, 'neonhub-table.xlsx');
        StateModule.toast('Excel (.xlsx) сохранён!', 'success');
    }

    function exportCsv() {
        if (!headers.length) return;
        const esc = (v) => {
            const s = String(v ?? '');
            return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'neonhub-table.csv');
        StateModule.toast('CSV сохранён!', 'success');
    }

    function exportJson() {
        if (!headers.length) return;
        const objs = rows.map((r) => {
            const o = {};
            headers.forEach((h, i) => { o[h] = r[i] ?? ''; });
            return o;
        });
        downloadBlob(new Blob([JSON.stringify(objs, null, 2)], { type: 'application/json' }), 'neonhub-table.json');
        StateModule.toast('JSON сохранён!', 'success');
    }

    return { init, loadFile };
})();
