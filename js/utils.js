// =========================================================================
// QUICK UTILITIES & P2P QR TRANSFER
// =========================================================================

/* =====================================================================
           MODULE 7E: QUICK UTILITIES (LOUPE, COLORS, PASSWORDS, SHA-256, UNITS)
        ===================================================================== */
        const QuickUtilsModule = (() => {
            let pickerImg = null;
            const pickedColors = [];

            function init() {
                // Копирование для всех кнопок .copy-util-btn
                document.querySelectorAll('.copy-util-btn').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const target = document.getElementById(btn.dataset.copyTarget);
                        if (!target || !target.value) return;
                        target.select();
                        try { document.execCommand('copy'); StateModule.toast('Скопировано!', 'success'); } catch (e) {}
                    });
                });

                // 1. Пипетка с лупой
                const canvas = document.getElementById('picker-canvas');
                const loupe = document.getElementById('picker-loupe');
                document.getElementById('picker-file-input').addEventListener('change', (e) => {
                    if (e.target.files[0]) loadPickerImage(e.target.files[0]);
                    e.target.value = '';
                });
                document.getElementById('picker-demo-btn').addEventListener('click', async () => {
                    loadPickerImage(await StateModule.createDemoScreenshotBlob());
                });

                const sampleAt = (e, save = false) => {
                    if (!pickerImg) return;
                    const rect = canvas.getBoundingClientRect();
                    const pt = e.touches ? e.touches[0] : e;
                    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(((pt.clientX - rect.left) / rect.width) * canvas.width)));
                    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(((pt.clientY - rect.top) / rect.height) * canvas.height)));
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;

                    // Рисуем 11x11 пикселей в лупе (zoom 10x)
                    loupe.classList.remove('hidden');
                    const lctx = loupe.getContext('2d');
                    lctx.imageSmoothingEnabled = false;
                    lctx.clearRect(0, 0, loupe.width, loupe.height);
                    lctx.drawImage(canvas, x - 5, y - 5, 11, 11, 0, 0, 110, 110);
                    lctx.strokeStyle = 'rgba(255,255,255,0.9)';
                    lctx.lineWidth = 2;
                    lctx.strokeRect(50, 50, 10, 10);

                    const hex = rgbToHex(r, g, b);
                    if (save) {
                        setColorFromHex(hex);
                        if (!pickedColors.includes(hex)) {
                            pickedColors.unshift(hex);
                            if (pickedColors.length > 10) pickedColors.pop();
                            renderPickerHistory();
                        }
                        StateModule.toast(`Выбран цвет ${hex}`, 'success');
                    }
                };

                canvas.addEventListener('mousemove', (e) => sampleAt(e, false));
                canvas.addEventListener('mouseleave', () => loupe.classList.add('hidden'));
                canvas.addEventListener('click', (e) => sampleAt(e, true));
                canvas.addEventListener('touchstart', (e) => { e.preventDefault(); sampleAt(e, true); }, { passive: false });

                // 2. Конвертер HEX / RGB / HSL
                document.getElementById('color-native').addEventListener('input', (e) => setColorFromHex(e.target.value));
                document.getElementById('color-hex').addEventListener('change', (e) => setColorFromHex(e.target.value));
                document.getElementById('color-rgb').addEventListener('change', (e) => {
                    const m = e.target.value.match(/(\d+)\D+(\d+)\D+(\d+)/);
                    if (m) setColorFromHex(rgbToHex(Number(m[1]), Number(m[2]), Number(m[3])));
                });
                setColorFromHex('#0d9488');

                // 3. Генератор паролей
                ['pass-len', 'pass-upper', 'pass-lower', 'pass-num', 'pass-sym'].forEach((id) => {
                    document.getElementById(id).addEventListener('input', generatePassword);
                });
                document.getElementById('pass-gen-btn').addEventListener('click', generatePassword);
                generatePassword();

                // 4. SHA-256
                document.getElementById('sha-input').addEventListener('input', async (e) => {
                    const text = e.target.value;
                    if (!text) { document.getElementById('sha-output').value = ''; return; }
                    const buf = new TextEncoder().encode(text);
                    document.getElementById('sha-output').value = await computeSha256(buf);
                });
                document.getElementById('sha-file-input').addEventListener('change', async (e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    document.getElementById('sha-file-label').textContent = f.name;
                    document.getElementById('sha-output').value = await computeSha256(await f.arrayBuffer());
                    StateModule.toast('SHA-256 файла вычислен!', 'success');
                });

                // 5. Конвертер единиц (px ↔ мм / см / in / pt)
                ['unit-val', 'unit-from', 'unit-dpi'].forEach((id) => {
                    document.getElementById(id).addEventListener('input', updateUnits);
                });
                updateUnits();
            }

            function loadPickerImage(file) {
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = () => {
                    pickerImg = img;
                    const canvas = document.getElementById('picker-canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    canvas.classList.remove('hidden');
                    document.getElementById('picker-empty').classList.add('hidden');
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            }

            function renderPickerHistory() {
                const box = document.getElementById('picker-history');
                box.innerHTML = pickedColors.map((hex) => `
                    <button type="button" data-hex="${hex}" class="hist-swatch inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                        <span class="w-3 h-3 rounded-full border border-black/10" style="background:${hex}"></span>${hex}
                    </button>
                `).join('');
                box.querySelectorAll('.hist-swatch').forEach((b) => {
                    b.addEventListener('click', () => setColorFromHex(b.dataset.hex));
                });
            }

            function rgbToHex(r, g, b) {
                return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
            }

            function setColorFromHex(raw) {
                let hex = raw.trim();
                if (!hex.startsWith('#')) hex = '#' + hex;
                if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);

                const rn = r / 255, gn = g / 255, bn = b / 255;
                const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
                let h = 0, s = 0, l = (max + min) / 2;
                if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
                    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
                    else h = ((rn - gn) / d + 4) / 6;
                }

                document.getElementById('color-native').value = hex;
                document.getElementById('color-swatch').style.backgroundColor = hex;
                document.getElementById('color-hex').value = hex.toLowerCase();
                document.getElementById('color-rgb').value = `rgb(${r}, ${g}, ${b})`;
                document.getElementById('color-hsl').value = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
            }

            function generatePassword() {
                const len = Number(document.getElementById('pass-len').value) || 20;
                document.getElementById('pass-len-val').textContent = len;
                let pool = '';
                if (document.getElementById('pass-upper').checked) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                if (document.getElementById('pass-lower').checked) pool += 'abcdefghijklmnopqrstuvwxyz';
                if (document.getElementById('pass-num').checked) pool += '0123456789';
                if (document.getElementById('pass-sym').checked) pool += '!@#$%^&*()-_=+[]{}';
                if (!pool) pool = 'abcdefghijklmnopqrstuvwxyz0123456789';

                const arr = new Uint32Array(len);
                crypto.getRandomValues(arr);
                let pwd = '';
                for (let i = 0; i < len; i++) pwd += pool[arr[i] % pool.length];
                document.getElementById('pass-output').value = pwd;

                const entropy = Math.round(len * Math.log2(pool.length));
                const badge = document.getElementById('pass-strength');
                badge.textContent = `${entropy} bit`;
            }

            async function computeSha256(buffer) {
                const hash = await crypto.subtle.digest('SHA-256', buffer);
                return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
            }

            function updateUnits() {
                const val = Number(document.getElementById('unit-val').value) || 0;
                const from = document.getElementById('unit-from').value;
                const dpi = Number(document.getElementById('unit-dpi').value) || 96;

                // Приводим к дюймам
                let inches = val;
                if (from === 'px') inches = val / dpi;
                else if (from === 'mm') inches = val / 25.4;
                else if (from === 'cm') inches = val / 2.54;
                else if (from === 'pt') inches = val / 72;

                const results = [
                    ['px', (inches * dpi).toFixed(1)],
                    ['мм', (inches * 25.4).toFixed(2)],
                    ['см', (inches * 2.54).toFixed(3)],
                    ['in', inches.toFixed(3)],
                    ['pt', (inches * 72).toFixed(1)]
                ];
                document.getElementById('unit-results').innerHTML = results.map(([u, v]) => `
                    <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between">
                        <span class="text-slate-400">${u}</span>
                        <span class="font-semibold text-slate-800 dark:text-slate-200">${v}</span>
                    </div>
                `).join('');
            }

            async function loadShaFile(f) {
                if (!f) return;
                document.getElementById('sha-file-label').textContent = f.name;
                document.getElementById('sha-output').value = await computeSha256(await f.arrayBuffer());
                StateModule.toast('SHA-256 файла вычислен!', 'success');
            }

            return { init, loadPickerImage, loadShaFile };
        })();

        const TransferModule = (() => {
            const queue = [];
            const received = [];
            let peer = null;
            let activeConn = null;
            let roomCode = '';

            function init() {
                const fileInput = document.getElementById('transfer-file-input');
                if (!fileInput) return;

                fileInput.addEventListener('change', (e) => {
                    Array.from(e.target.files || []).forEach(enqueueFile);
                    e.target.value = '';
                });
                document.getElementById('transfer-new-room').addEventListener('click', () => startHostRoom());
                document.getElementById('transfer-send-btn').addEventListener('click', sendQueue);
                document.getElementById('transfer-join-btn').addEventListener('click', () => {
                    const code = document.getElementById('transfer-join-input').value.trim().toUpperCase();
                    if (code) joinRoom(code);
                });

                const params = new URLSearchParams(window.location.search);
                const joinParam = params.get('room');
                if (joinParam) {
                    document.getElementById('transfer-join-input').value = joinParam.toUpperCase();
                    joinRoom(joinParam.toUpperCase());
                } else {
                    startHostRoom();
                }
            }

            function setStatus(text, tone = 'neutral') {
                const el = document.getElementById('transfer-p2p-status');
                if (!el) return;
                el.textContent = text;
                if (tone === 'ok') {
                    el.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
                } else if (tone === 'warn') {
                    el.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300';
                } else {
                    el.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono lab-segmented text-zinc-500 dark:text-zinc-400';
                }
            }

            function enqueueFile(file) {
                queue.push(file);
                renderQueue();
                StateModule.toast(`${file.name} → очередь P2P`, 'info');
            }

            function renderQueue() {
                const list = document.getElementById('transfer-queue-list');
                const sendBtn = document.getElementById('transfer-send-btn');
                if (sendBtn) sendBtn.disabled = !queue.length || !activeConn;
                if (!queue.length) {
                    list.innerHTML = 'Очередь пуста — добавьте файл или перетащите его прямо в это окно.';
                    return;
                }
                list.innerHTML = queue.map((f, idx) => `
                    <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl lab-input">
                        <div class="min-w-0">
                            <div class="font-medium text-zinc-800 dark:text-zinc-200 truncate">${StateModule.escapeHtml(f.name)}</div>
                            <div class="text-[11px] font-mono text-zinc-400">${StateModule.formatBytes(f.size)}</div>
                        </div>
                        <button type="button" data-rm="${idx}" class="rm-q-btn text-xs text-rose-500 hover:underline px-2">×</button>
                    </div>
                `).join('');
                list.querySelectorAll('.rm-q-btn').forEach((b) => {
                    b.addEventListener('click', () => {
                        queue.splice(Number(b.dataset.rm), 1);
                        renderQueue();
                    });
                });
            }

            function renderReceived() {
                const wrap = document.getElementById('transfer-received-wrap');
                const list = document.getElementById('transfer-received-list');
                if (!wrap || !list) return;
                if (!received.length) {
                    wrap.classList.add('hidden');
                    return;
                }
                wrap.classList.remove('hidden');
                list.innerHTML = received.map((it, idx) => `
                    <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl lab-input">
                        <div class="min-w-0">
                            <div class="font-medium text-zinc-800 dark:text-zinc-200 truncate">${StateModule.escapeHtml(it.name)}</div>
                            <div class="text-[11px] font-mono text-zinc-400">${StateModule.formatBytes(it.size)}</div>
                        </div>
                        <a href="${it.url}" download="${StateModule.escapeHtml(it.name)}" class="px-3 py-1.5 rounded-lg text-xs font-semibold lab-btn-emerald shrink-0">Скачать</a>
                    </div>
                `).join('');
            }

            function bindConnection(conn) {
                activeConn = conn;
                conn.on('open', () => {
                    setStatus('Устройство подключено (P2P)', 'ok');
                    renderQueue();
                    StateModule.toast('Прямое P2P-соединение установлено!', 'success');
                });
                conn.on('data', (payload) => {
                    if (payload && payload.kind === 'file' && payload.data) {
                        const blob = new Blob([payload.data], { type: payload.type || 'application/octet-stream' });
                        const url = URL.createObjectURL(blob);
                        received.unshift({ name: payload.name || 'file', size: blob.size, url });
                        StateModule.trackProcessed(blob.size);
                        renderReceived();
                        StateModule.toast(`Получен файл: ${payload.name}`, 'success');
                    }
                });
                conn.on('close', () => {
                    activeConn = null;
                    setStatus('Соединение закрыто', 'warn');
                    renderQueue();
                });
            }

            async function sendQueue() {
                if (!activeConn || !queue.length) return;
                const sendBtn = document.getElementById('transfer-send-btn');
                sendBtn.disabled = true;
                try {
                    for (const f of queue) {
                        const buf = await f.arrayBuffer();
                        activeConn.send({ kind: 'file', name: f.name, type: f.type, data: buf });
                        StateModule.trackProcessed(f.size);
                    }
                    StateModule.toast(`Отправлено файлов: ${queue.length}`, 'success');
                    StateModule.trackEvent('p2p_send', { count: queue.length });
                } catch (e) {
                    StateModule.toast('Ошибка отправки по P2P', 'warn');
                } finally {
                    sendBtn.disabled = false;
                }
            }

            function drawQrForRoom(code) {
                const container = document.getElementById('qr-container');
                document.getElementById('transfer-room-code').textContent = code;
                const shareUrl = window.location.protocol === 'file:'
                    ? `https://neon-hub.ru/p2p-transfer?room=${code}`
                    : `${window.location.origin}/p2p-transfer?room=${code}`;

                if (typeof qrcode !== 'undefined') {
                    try {
                        const qr = qrcode(0, 'M');
                        qr.addData(shareUrl);
                        qr.make();
                        const count = qr.getModuleCount();
                        const pad = 2;
                        const size = count + pad * 2;
                        let rects = `<rect width="${size}" height="${size}" fill="#ffffff"/>`;
                        for (let r = 0; r < count; r++) {
                            for (let c = 0; c < count; c++) {
                                if (qr.isDark(r, c)) rects += `<rect x="${c + pad}" y="${r + pad}" width="1" height="1" fill="#131314"/>`;
                            }
                        }
                        container.innerHTML = `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" class="w-full h-full">${rects}</svg>`;
                        return;
                    } catch (e) {}
                }
                container.innerHTML = `<div class="text-xs font-mono text-zinc-500">${code}</div>`;
            }

            function startHostRoom() {
                if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
                activeConn = null;
                roomCode = 'PL-' + Math.floor(1000 + Math.random() * 9000);
                drawQrForRoom(roomCode);
                renderQueue();

                if (typeof Peer === 'undefined') {
                    setStatus('Офлайн-режим (PeerJS недоступен)', 'warn');
                    return;
                }
                setStatus('Ожидание подключения…', 'neutral');
                peer = new Peer('neonhub-' + roomCode.toLowerCase());
                peer.on('open', () => setStatus('Комната готова • сканируйте QR', 'neutral'));
                peer.on('connection', (conn) => bindConnection(conn));
                peer.on('error', () => setStatus('P2P-сервер недоступен в текущей сети', 'warn'));
            }

            function joinRoom(code) {
                if (typeof Peer === 'undefined') {
                    StateModule.toast('PeerJS не загрузился', 'warn');
                    return;
                }
                if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
                const clean = code.replace(/^NEONHUB-/i, '').toUpperCase();
                setStatus(`Подключение к ${clean}…`, 'neutral');
                peer = new Peer();
                peer.on('open', () => {
                    const conn = peer.connect('neonhub-' + clean.toLowerCase(), { reliable: true });
                    bindConnection(conn);
                });
                peer.on('error', () => setStatus('Не удалось подключиться к комнате', 'warn'));
            }

            return { init, enqueueFile };
        })();
