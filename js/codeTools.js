// =========================================================================
// CODE FORMATTER & VALIDATOR: JSON / XML / SQL (100% LOCAL)
// =========================================================================

const CodeToolsModule = (() => {
    let mode = 'json';

    function init() {
        const input = document.getElementById('codefmt-input');
        if (!input) return;

        document.querySelectorAll('.codefmt-mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                mode = btn.dataset.fmtmode;
                document.querySelectorAll('.codefmt-mode-btn').forEach((b) => {
                    const active = b.dataset.fmtmode === mode;
                    b.classList.toggle('bg-white', active);
                    b.classList.toggle('dark:bg-white/10', active);
                    b.classList.toggle('text-slate-900', active);
                    b.classList.toggle('dark:text-white', active);
                    b.classList.toggle('shadow-sm', active);
                    b.classList.toggle('text-slate-500', !active);
                });
                formatCode(false);
            });
        });

        document.getElementById('codefmt-pretty-btn').addEventListener('click', () => formatCode(false));
        document.getElementById('codefmt-minify-btn').addEventListener('click', () => formatCode(true));
        document.getElementById('codefmt-sample-btn').addEventListener('click', loadSample);
        document.getElementById('codefmt-clear-btn').addEventListener('click', () => {
            input.value = '';
            document.getElementById('codefmt-output').value = '';
            setStatus('Готово', 'neutral');
        });
        document.getElementById('codefmt-copy-btn').addEventListener('click', () => {
            const out = document.getElementById('codefmt-output');
            if (!out.value) return;
            out.select();
            try {
                document.execCommand('copy');
                StateModule.toast('Отформатированный код скопирован!', 'success');
            } catch (e) {}
        });

        input.addEventListener('input', () => {
            if (input.value.trim().length < 20000) formatCode(false);
        });
    }

    function setStatus(msg, type = 'neutral') {
        const el = document.getElementById('codefmt-status');
        if (!el) return;
        el.textContent = msg;
        if (type === 'ok') {
            el.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
        } else if (type === 'err') {
            el.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300';
        } else {
            el.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono text-zinc-500 dark:text-zinc-400 lab-segmented';
        }
    }

    function formatXml(xml, minify) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        const parseErr = doc.querySelector('parsererror');
        if (parseErr) {
            throw new Error(parseErr.textContent.split('\n')[0] || 'Ошибка синтаксиса XML');
        }
        const cleaned = xml.replace(/>\s*</g, '><').trim();
        if (minify) return cleaned;
        const tokens = cleaned.replace(/(>)(<)(\/*)/g, '$1\n$2$3').split('\n');
        let indent = 0;
        return tokens.map((node) => {
            if (node.match(/^<\/\w/)) indent = Math.max(0, indent - 1);
            const line = '  '.repeat(indent) + node;
            if (node.match(/^<\w[^>]*[^/]>$/) && !node.includes('</')) indent++;
            return line;
        }).join('\n');
    }

    function formatSql(sql, minify) {
        const cleaned = sql.replace(/\s+/g, ' ').trim();
        if (minify) return cleaned;
        const keywords = [
            'SELECT', 'FROM', 'WHERE', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'JOIN',
            'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION ALL', 'UNION',
            'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'AND', 'OR'
        ];
        let res = cleaned;
        keywords.forEach((kw) => {
            const re = new RegExp(`\\b${kw.replace(/ /g, '\\s+')}\\b`, 'gi');
            res = res.replace(re, (m) => {
                const up = m.toUpperCase().replace(/\s+/g, ' ');
                if (up === 'AND' || up === 'OR') return '\n  ' + up;
                return '\n' + up;
            });
        });
        return res.replace(/^\n+/, '').replace(/,\s*/g, ',\n  ');
    }

    function formatCode(minify = false) {
        const raw = document.getElementById('codefmt-input').value.trim();
        const out = document.getElementById('codefmt-output');
        if (!raw) {
            out.value = '';
            setStatus('Ожидание кода', 'neutral');
            return;
        }
        try {
            let result = '';
            if (mode === 'json') {
                const parsed = JSON.parse(raw);
                result = minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
                setStatus(minify ? 'JSON валиден (минифицирован)' : 'JSON валиден', 'ok');
            } else if (mode === 'xml') {
                result = formatXml(raw, minify);
                setStatus(minify ? 'XML валиден (минифицирован)' : 'XML валиден', 'ok');
            } else {
                result = formatSql(raw, minify);
                setStatus(minify ? 'SQL сжат в 1 строку' : 'SQL отформатирован', 'ok');
            }
            out.value = result;
        } catch (err) {
            setStatus(`Ошибка: ${err.message}`, 'err');
        }
    }

    function loadSample() {
        const input = document.getElementById('codefmt-input');
        if (mode === 'json') {
            input.value = '{"app":"Neon Hub","version":2.7,"privacy":{"uploads":0,"local":true},"tools":["censor","de-ai","pdf","qr"]}';
        } else if (mode === 'xml') {
            input.value = '<project name="Neon Hub"><privacy local="true" uploads="0"/><tools><tool>Censor</tool><tool>PDF</tool></tools></project>';
        } else {
            input.value = 'select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = 1 and o.total > 1000 group by u.id, u.name order by orders desc limit 20;';
        }
        formatCode(false);
    }

    function setInput(text, filename = '') {
        const lower = filename.toLowerCase();
        if (lower.endsWith('.xml') || lower.endsWith('.svg')) {
            document.querySelector('.codefmt-mode-btn[data-fmtmode="xml"]')?.click();
        } else if (lower.endsWith('.sql')) {
            document.querySelector('.codefmt-mode-btn[data-fmtmode="sql"]')?.click();
        } else if (lower.endsWith('.json')) {
            document.querySelector('.codefmt-mode-btn[data-fmtmode="json"]')?.click();
        }
        document.getElementById('codefmt-input').value = text;
        formatCode(false);
    }

    return { init, setInput };
})();
