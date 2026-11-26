// =========================================================================
// MEDIA TOOLS: DISCORD 10 MB, VIDEO -> GIF, AUDIO SURGEON, WHISPER
// =========================================================================

const MediaModule = (() => {
    let currentFile = null;
    let targetMB = 9.5;
    let durationSec = 60;

    function init() {
        const input = document.getElementById('media-file-input');
        input.addEventListener('change', (e) => {
            if (e.target.files[0]) loadMediaFile(e.target.files[0]);
            input.value = '';
        });

        document.querySelectorAll('.media-preset-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                targetMB = Number(btn.dataset.mb);
                document.querySelectorAll('.media-preset-btn').forEach((b) => {
                    const active = b === btn;
                    b.className = active
                        ? 'media-preset-btn px-3 py-2 rounded-xl text-xs font-semibold border border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'media-preset-btn px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700';
                });
                updateBitrateCalc();
            });
        });

        document.getElementById('media-extract-wav').addEventListener('click', extractWav);
        document.getElementById('media-to-qr').addEventListener('click', () => {
            if (!currentFile) return;
            TransferModule.enqueueFile(currentFile);
            RouterModule.navigateSeo('/p2p-transfer');
        });
    }

    function loadMediaFile(file) {
        currentFile = file;
        document.getElementById('media-file-name').textContent = `${file.name} (${StateModule.formatBytes(file.size)})`;
        const video = document.getElementById('media-preview');
        video.src = URL.createObjectURL(file);
        video.classList.remove('hidden');
        document.getElementById('media-placeholder').classList.add('hidden');
        video.onloadedmetadata = () => {
            durationSec = Math.max(1, video.duration || 60);
            updateBitrateCalc();
        };
        updateBitrateCalc();
    }

    function updateBitrateCalc() {
        const totalKbps = Math.floor((targetMB * 8192) / durationSec);
        const videoKbps = Math.max(200, totalKbps - 128);
        document.getElementById('media-bitrate').textContent = `${videoKbps} kbps (${Math.round(durationSec)}s → ${targetMB} MB)`;
        document.getElementById('media-ffmpeg-cmd').textContent = `ffmpeg -i "${currentFile ? currentFile.name : 'input.mp4'}" -c:v libx264 -b:v ${videoKbps}k -c:a aac -b:a 128k output.mp4`;
    }

    async function extractWav() {
        if (!currentFile) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Сначала выберите видео или аудио' : 'Select a media file first', 'warn');
            return;
        }
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const buf = await currentFile.arrayBuffer();
            const audioBuf = await ctx.decodeAudioData(buf);
            const wavBlob = audioBufferToWav(audioBuf);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(wavBlob);
            a.download = currentFile.name.replace(/\.[^.]+$/, '') + '.wav';
            a.click();
            URL.revokeObjectURL(a.href);
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Аудиодорожка сохранена в WAV!' : 'Audio extracted as WAV!', 'success');
        } catch (e) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Браузер не смог декодировать аудио этого файла' : 'Could not decode audio track', 'warn');
        }
    }

    function audioBufferToWav(buffer) {
        const numCh = buffer.numberOfChannels;
        const length = buffer.length * numCh * 2 + 44;
        const out = new ArrayBuffer(length);
        const view = new DataView(out);
        const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
        writeStr(0, 'RIFF'); view.setUint32(4, length - 8, true); writeStr(8, 'WAVE');
        writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
        view.setUint16(22, numCh, true); view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * numCh * 2, true); view.setUint16(32, numCh * 2, true);
        view.setUint16(34, 16, true); writeStr(36, 'data'); view.setUint32(40, length - 44, true);
        let pos = 44;
        const channels = Array.from({ length: numCh }, (_, c) => buffer.getChannelData(c));
        for (let i = 0; i < buffer.length; i++) {
            for (let c = 0; c < numCh; c++) {
                const s = Math.max(-1, Math.min(1, channels[c][i]));
                view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                pos += 2;
            }
        }
        return new Blob([out], { type: 'audio/wav' });
    }

    return { init, loadMediaFile, audioBufferToWav };
})();

/* =====================================================================
   MODULE 7B: VIDEO TO GIF (BUILT-IN GIF89a LZW ENCODER) -> js/videoGif.js
===================================================================== */
const VideoGifModule = (() => {
    let gifBlob = null;
    let videoEl = null;

    function init() {
        videoEl = document.getElementById('gif-source-video');
        document.getElementById('gif-file-input').addEventListener('change', (e) => {
            if (e.target.files[0]) loadVideoFile(e.target.files[0]);
            e.target.value = '';
        });
        document.getElementById('gif-duration').addEventListener('input', (e) => {
            document.getElementById('gif-dur-val').textContent = e.target.value;
        });
        document.getElementById('gif-render-btn').addEventListener('click', renderGif);
        document.getElementById('gif-download-btn').addEventListener('click', () => {
            if (!gifBlob) return;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(gifBlob);
            a.download = 'neonhub-clip.gif';
            a.click();
            URL.revokeObjectURL(a.href);
        });
    }

    function loadVideoFile(file) {
        document.getElementById('gif-file-name').textContent = `${file.name} (${StateModule.formatBytes(file.size)})`;
        videoEl.src = URL.createObjectURL(file);
        videoEl.classList.remove('hidden');
        videoEl.onloadedmetadata = () => {
            document.getElementById('gif-start').max = Math.max(0, Math.floor(videoEl.duration - 1));
        };
    }

    // Встроенный чистый JS-кодировщик GIF89a (RGB332 палитра + LZW сжатие)
    function encodeGif89a(width, height, frames, delayCs) {
        const out = [];
        const pushBytes = (...arr) => arr.forEach((b) => out.push(b & 0xFF));
        const pushStr = (s) => { for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); };
        const push16 = (v) => { out.push(v & 0xFF, (v >> 8) & 0xFF); };

        // Header + Logical Screen Descriptor (256-color Global Color Table)
        pushStr('GIF89a');
        push16(width); push16(height);
        pushBytes(0xF7, 0x00, 0x00);

        // Global Color Table (RGB332)
        for (let i = 0; i < 256; i++) {
            pushBytes(
                Math.round(((i >> 5) & 7) * 255 / 7),
                Math.round(((i >> 2) & 7) * 255 / 7),
                Math.round((i & 3) * 255 / 3)
            );
        }

        // Netscape 2.0 loop extension
        pushBytes(0x21, 0xFF, 0x0B);
        pushStr('NETSCAPE2.0');
        pushBytes(0x03, 0x01, 0x00, 0x00, 0x00);

        const lzwEncode = (indices) => {
            const minCodeSize = 8;
            const clearCode = 256, eoiCode = 257;
            let codeSize = 9, nextCode = 258;
            let dict = new Map();
            const bytes = [];
            let bitBuf = 0, bitCount = 0;

            const writeCode = (code) => {
                bitBuf |= (code << bitCount);
                bitCount += codeSize;
                while (bitCount >= 8) {
                    bytes.push(bitBuf & 0xFF);
                    bitBuf >>= 8;
                    bitCount -= 8;
                }
            };

            writeCode(clearCode);
            let prefix = indices[0];
            for (let i = 1; i < indices.length; i++) {
                const k = indices[i];
                const key = (prefix << 8) | k;
                if (dict.has(key)) {
                    prefix = dict.get(key);
                } else {
                    writeCode(prefix);
                    if (nextCode < 4096) {
                        dict.set(key, nextCode++);
                        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
                    } else {
                        writeCode(clearCode);
                        dict.clear();
                        codeSize = 9;
                        nextCode = 258;
                    }
                    prefix = k;
                }
            }
            writeCode(prefix);
            writeCode(eoiCode);
            if (bitCount > 0) bytes.push(bitBuf & 0xFF);

            pushBytes(minCodeSize);
            for (let i = 0; i < bytes.length; i += 255) {
                const len = Math.min(255, bytes.length - i);
                pushBytes(len);
                for (let j = 0; j < len; j++) pushBytes(bytes[i + j]);
            }
            pushBytes(0x00);
        };

        frames.forEach((indices) => {
            pushBytes(0x21, 0xF9, 0x04, 0x04);
            push16(delayCs);
            pushBytes(0x00, 0x00);
            pushBytes(0x2C);
            push16(0); push16(0); push16(width); push16(height);
            pushBytes(0x00);
            lzwEncode(indices);
        });

        pushBytes(0x3B);
        return new Blob([new Uint8Array(out)], { type: 'image/gif' });
    }

    async function renderGif() {
        if (!videoEl.src) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Сначала выберите видеофайл' : 'Select a video first', 'warn');
            return;
        }
        const start = Math.max(0, Number(document.getElementById('gif-start').value) || 0);
        const duration = Math.min(10, Math.max(1, Number(document.getElementById('gif-duration').value) || 3));
        const width = Number(document.getElementById('gif-width').value) || 320;
        const fps = Number(document.getElementById('gif-fps').value) || 10;
        const height = Math.max(16, Math.round((videoEl.videoHeight / videoEl.videoWidth) * width));

        const totalFrames = Math.max(2, Math.floor(duration * fps));
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const wrap = document.getElementById('gif-progress-wrap');
        const bar = document.getElementById('gif-progress-bar');
        const pct = document.getElementById('gif-progress-pct');
        wrap.classList.remove('hidden');

        const frames = [];
        const seekTo = (t) => new Promise((resolve) => {
            videoEl.onseeked = () => resolve();
            videoEl.currentTime = Math.min(videoEl.duration - 0.05, t);
        });

        try {
            for (let i = 0; i < totalFrames; i++) {
                await seekTo(start + i / fps);
                ctx.drawImage(videoEl, 0, 0, width, height);
                const data = ctx.getImageData(0, 0, width, height).data;
                const indices = new Uint8Array(width * height);
                for (let p = 0, idx = 0; p < data.length; p += 4, idx++) {
                    indices[idx] = (data[p] & 0xE0) | ((data[p + 1] & 0xE0) >> 3) | (data[p + 2] >> 6);
                }
                frames.push(indices);
                const p = Math.round(((i + 1) / totalFrames) * 90);
                bar.style.width = `${p}%`;
                pct.textContent = `${p}%`;
            }
            gifBlob = encodeGif89a(width, height, frames, Math.max(2, Math.round(100 / fps)));
            bar.style.width = '100%'; pct.textContent = '100%';

            const img = document.getElementById('gif-result-img');
            img.src = URL.createObjectURL(gifBlob);
            img.classList.remove('hidden');
            document.getElementById('gif-placeholder').classList.add('hidden');
            document.getElementById('gif-result-meta').textContent = `${width}×${height} • ${fps} FPS • ${totalFrames} кадров • ${StateModule.formatBytes(gifBlob.size)}`;
            document.getElementById('gif-download-btn').disabled = false;
            StateModule.toast('GIF готов!', 'success');
        } catch (e) {
            StateModule.toast('Ошибка кодирования GIF', 'warn');
        }
    }

    return { init, loadVideoFile };
})();

/* =====================================================================
   MODULE 7C: AUDIO SURGEON + VOICE RECORDER -> js/audioSurgeon.js
===================================================================== */
const AudioSurgeonModule = (() => {
    let audioBuffer = null;
    let trimmedBlob = null;
    let mediaRecorder = null;
    let recChunks = [];
    let recStream = null;
    let recTimerId = null;
    let vuAnimId = null;
    let recStartTs = 0;

    function init() {
        document.getElementById('rec-toggle-btn').addEventListener('click', toggleRecording);
        document.getElementById('surgeon-file-input').addEventListener('change', (e) => {
            if (e.target.files[0]) loadAudioFile(e.target.files[0]);
            e.target.value = '';
        });

        document.getElementById('surgeon-threshold').addEventListener('input', (e) => {
            document.getElementById('surgeon-threshold-val').textContent = `${(Number(e.target.value) * 100).toFixed(1)}%`;
            drawWaveform();
        });
        document.getElementById('surgeon-min-pause').addEventListener('input', (e) => {
            document.getElementById('surgeon-pause-val').textContent = `${e.target.value} мс`;
            drawWaveform();
        });

        document.getElementById('surgeon-cut-btn').addEventListener('click', cutSilence);
        document.getElementById('surgeon-download-btn').addEventListener('click', () => {
            if (!trimmedBlob) return;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(trimmedBlob);
            a.download = 'neonhub-audio-trimmed.wav';
            a.click();
            URL.revokeObjectURL(a.href);
        });
        document.getElementById('surgeon-to-transcribe').addEventListener('click', () => {
            if (!trimmedBlob) return;
            const file = new File([trimmedBlob], 'voice-recording.wav', { type: 'audio/wav' });
            TranscribeModule.loadFile(file);
            RouterModule.navigateSeo('/audio-to-text');
        });
        window.addEventListener('resize', () => { if (audioBuffer) drawWaveform(); });
    }

    async function toggleRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            return;
        }
        try {
            recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const actx = new (window.AudioContext || window.webkitAudioContext)();
            const src = actx.createMediaStreamSource(recStream);
            const analyser = actx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            const dataArr = new Uint8Array(analyser.fftSize);

            const updateVu = () => {
                analyser.getByteTimeDomainData(dataArr);
                let sum = 0;
                for (let i = 0; i < dataArr.length; i++) {
                    const v = (dataArr[i] - 128) / 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / dataArr.length);
                document.getElementById('rec-vu-bar').style.width = `${Math.min(100, Math.round(rms * 350))}%`;
                vuAnimId = requestAnimationFrame(updateVu);
            };
            updateVu();

            recChunks = [];
            mediaRecorder = new MediaRecorder(recStream);
            mediaRecorder.ondataavailable = (ev) => { if (ev.data.size) recChunks.push(ev.data); };
            mediaRecorder.onstop = async () => {
                cancelAnimationFrame(vuAnimId);
                clearInterval(recTimerId);
                recStream.getTracks().forEach((t) => t.stop());
                actx.close();
                document.getElementById('rec-vu-bar').style.width = '0%';
                document.getElementById('rec-dot').classList.remove('animate-ping');
                document.getElementById('rec-btn-label').textContent = I18nModule.getLang() === 'ru' ? 'Записать с микрофона' : 'Record Microphone';
                const blob = new Blob(recChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                await loadAudioFile(blob);
                StateModule.toast(I18nModule.getLang() === 'ru' ? 'Запись открыта на звуковой волне!' : 'Recording loaded on waveform!', 'success');
            };

            mediaRecorder.start();
            recStartTs = Date.now();
            document.getElementById('rec-dot').classList.add('animate-ping');
            document.getElementById('rec-btn-label').textContent = I18nModule.getLang() === 'ru' ? 'Остановить запись' : 'Stop Recording';
            recTimerId = setInterval(() => {
                const sec = Math.floor((Date.now() - recStartTs) / 1000);
                document.getElementById('rec-timer').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
            }, 250);
        } catch (err) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Нет доступа к микрофону' : 'Microphone access denied', 'warn');
        }
    }

    async function loadAudioFile(fileOrBlob) {
        try {
            const actx = new (window.AudioContext || window.webkitAudioContext)();
            const ab = await fileOrBlob.arrayBuffer();
            audioBuffer = await actx.decodeAudioData(ab);
            actx.close();
            trimmedBlob = MediaModule.audioBufferToWav(audioBuffer);
            const player = document.getElementById('surgeon-audio-player');
            player.src = URL.createObjectURL(trimmedBlob);
            player.classList.remove('hidden');
            document.getElementById('surgeon-empty').classList.add('hidden');
            ['surgeon-cut-btn', 'surgeon-download-btn', 'surgeon-to-transcribe'].forEach((id) => {
                document.getElementById(id).disabled = false;
            });
            drawWaveform();
        } catch (e) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Не удалось декодировать аудио' : 'Could not decode audio', 'warn');
        }
    }

    function findSilentRegions() {
        if (!audioBuffer) return [];
        const threshold = Number(document.getElementById('surgeon-threshold').value) || 0.025;
        const minPauseMs = Number(document.getElementById('surgeon-min-pause').value) || 400;
        const sr = audioBuffer.sampleRate;
        const data = audioBuffer.getChannelData(0);
        const winSize = Math.floor(sr * 0.02); // 20ms
        const minWindows = Math.max(1, Math.floor(minPauseMs / 20));
        const padSamples = Math.floor(sr * 0.06);

        const regions = [];
        let silentRun = 0, runStart = 0;
        for (let pos = 0; pos < data.length; pos += winSize) {
            let sum = 0;
            const end = Math.min(data.length, pos + winSize);
            for (let i = pos; i < end; i++) sum += data[i] * data[i];
            const rms = Math.sqrt(sum / (end - pos));
            if (rms < threshold) {
                if (silentRun === 0) runStart = pos;
                silentRun++;
            } else {
                if (silentRun >= minWindows) {
                    const s = Math.min(pos, runStart + padSamples);
                    const e = Math.max(s, pos - padSamples);
                    if (e > s) regions.push([s, e]);
                }
                silentRun = 0;
            }
        }
        if (silentRun >= minWindows) {
            const s = Math.min(data.length, runStart + padSamples);
            if (data.length > s) regions.push([s, data.length]);
        }
        return regions;
    }

    function drawWaveform() {
        if (!audioBuffer) return;
        const canvas = document.getElementById('surgeon-wave-canvas');
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(300, Math.floor(rect.width));
        canvas.height = Math.max(100, Math.floor(rect.height));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const regions = findSilentRegions();
        const total = audioBuffer.length;
        let cutSamples = 0;

        // Подсветка пауз янтарным
        ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
        regions.forEach(([s, e]) => {
            cutSamples += (e - s);
            const x1 = (s / total) * canvas.width;
            const x2 = (e / total) * canvas.width;
            ctx.fillRect(x1, 0, Math.max(1, x2 - x1), canvas.height);
        });

        // Отрисовка волны
        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const mid = canvas.height / 2;
        ctx.fillStyle = '#6366f1';
        for (let x = 0; x < canvas.width; x++) {
            let min = 1, max = -1;
            const start = x * step;
            for (let i = 0; i < step && start + i < data.length; i++) {
                const v = data[start + i];
                if (v < min) min = v;
                if (v > max) max = v;
            }
            const h = Math.max(1, (max - min) * mid);
            ctx.fillRect(x, mid - max * mid, 1, h);
        }

        const dur = audioBuffer.duration.toFixed(1);
        const cutSec = (cutSamples / audioBuffer.sampleRate).toFixed(1);
        document.getElementById('surgeon-stats').textContent = `${dur}с • пауз: ${regions.length} (-${cutSec}с)`;
    }

    function cutSilence() {
        if (!audioBuffer) return;
        const regions = findSilentRegions();
        if (!regions.length) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Пауз длиннее порога не найдено' : 'No silence regions found', 'info');
            return;
        }
        const keep = [];
        let cursor = 0;
        regions.forEach(([s, e]) => {
            if (s > cursor) keep.push([cursor, s]);
            cursor = e;
        });
        if (cursor < audioBuffer.length) keep.push([cursor, audioBuffer.length]);

        const newLen = keep.reduce((acc, [s, e]) => acc + (e - s), 0);
        if (newLen < 100) return;

        const actx = new (window.AudioContext || window.webkitAudioContext)();
        const outBuf = actx.createBuffer(audioBuffer.numberOfChannels, newLen, audioBuffer.sampleRate);
        for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
            const src = audioBuffer.getChannelData(ch);
            const dst = outBuf.getChannelData(ch);
            let off = 0;
            keep.forEach(([s, e]) => {
                dst.set(src.subarray(s, e), off);
                off += (e - s);
            });
        }
        actx.close();
        const oldDur = audioBuffer.duration.toFixed(1);
        audioBuffer = outBuf;
        trimmedBlob = MediaModule.audioBufferToWav(audioBuffer);
        const player = document.getElementById('surgeon-audio-player');
        player.src = URL.createObjectURL(trimmedBlob);
        drawWaveform();
        StateModule.toast(`${oldDur}с → ${audioBuffer.duration.toFixed(1)}с`, 'success');
    }

    return { init, loadAudioFile };
})();

/* =====================================================================
   MODULE 7D: AUDIO TO TEXT (LIVE DICTATION + WHISPER AI) -> js/transcribe.js
===================================================================== */
const TranscribeModule = (() => {
    let recognition = null;
    let isListening = false;
    let whisperFile = null;
    let whisperPipeline = null;

    function init() {
        document.getElementById('transcribe-live-btn').addEventListener('click', toggleLiveDictation);
        document.getElementById('whisper-file-input').addEventListener('change', (e) => {
            if (e.target.files[0]) loadFile(e.target.files[0]);
            e.target.value = '';
        });
        document.getElementById('whisper-run-btn').addEventListener('click', runWhisper);
        document.getElementById('transcribe-clear-btn').addEventListener('click', () => {
            document.getElementById('transcribe-output').value = '';
        });
        document.getElementById('transcribe-copy-btn').addEventListener('click', () => {
            const out = document.getElementById('transcribe-output');
            if (!out.value) return;
            out.select();
            try { document.execCommand('copy'); StateModule.toast('Скопировано!', 'success'); } catch (e) {}
        });
        document.getElementById('transcribe-to-deai').addEventListener('click', () => {
            const txt = document.getElementById('transcribe-output').value.trim();
            if (!txt) return;
            DeAiModule.setInput(txt);
            RouterModule.navigateSeo('/de-ai-text');
            StateModule.toast('Текст передан в Анти-ИИ!', 'info');
        });
    }

    function toggleLiveDictation() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            StateModule.toast(I18nModule.getLang() === 'ru' ? 'Web Speech API не поддерживается в этом браузере' : 'Web Speech API not supported here', 'warn');
            return;
        }
        const btn = document.getElementById('transcribe-live-btn');
        const status = document.getElementById('transcribe-live-status');
        const out = document.getElementById('transcribe-output');

        if (isListening && recognition) {
            recognition.stop();
            return;
        }
        recognition = new SpeechRec();
        recognition.lang = document.getElementById('transcribe-lang').value;
        recognition.continuous = true;
        recognition.interimResults = true;

        let finalPrefix = out.value ? out.value + '\n' : '';
        recognition.onstart = () => {
            isListening = true;
            btn.textContent = I18nModule.getLang() === 'ru' ? 'Остановить диктовку' : 'Stop Dictation';
            status.textContent = I18nModule.getLang() === 'ru' ? 'Слушаю...' : 'Listening...';
        };
        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) finalPrefix += event.results[i][0].transcript + ' ';
                else interim += event.results[i][0].transcript;
            }
            out.value = finalPrefix + interim;
        };
        recognition.onend = () => {
            isListening = false;
            btn.textContent = I18nModule.getLang() === 'ru' ? 'Начать диктовку' : 'Start Dictation';
            status.textContent = I18nModule.getLang() === 'ru' ? 'Готово' : 'Ready';
        };
        recognition.onerror = () => {
            status.textContent = 'Ошибка микрофона / сети';
        };
        recognition.start();
    }

    function loadFile(file) {
        whisperFile = file;
        document.getElementById('whisper-status').textContent = `${file.name} (${StateModule.formatBytes(file.size)})`;
        document.getElementById('whisper-run-btn').disabled = false;
    }

    async function decodeTo16kMono(file) {
        const actx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const ab = await file.arrayBuffer();
        const decoded = await actx.decodeAudioData(ab);
        const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
        const src = off.createBufferSource();
        src.buffer = decoded;
        src.connect(off.destination);
        src.start();
        const rendered = await off.startRendering();
        actx.close();
        return rendered.getChannelData(0);
    }

    async function runWhisper() {
        if (!whisperFile) return;
        const status = document.getElementById('whisper-status');
        const runBtn = document.getElementById('whisper-run-btn');
        runBtn.disabled = true;
        try {
            status.textContent = 'Загрузка аудио (16 kHz)...';
            const pcm = await decodeTo16kMono(whisperFile);

            if (!whisperPipeline) {
                status.textContent = 'Загрузка Whisper-tiny в браузер (1 раз ~40 МБ)...';
                const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
                env.allowLocalModels = false;
                whisperPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
                    progress_callback: (p) => {
                        if (p.progress) status.textContent = `Загрузка модели: ${Math.round(p.progress)}%`;
                    }
                });
            }

            status.textContent = 'Распознавание речи (Whisper)...';
            const langCode = document.getElementById('transcribe-lang').value.split('-')[0];
            const res = await whisperPipeline(pcm, { language: langCode, task: 'transcribe', chunk_length_s: 30 });
            const out = document.getElementById('transcribe-output');
            out.value = (out.value ? out.value + '\n\n' : '') + (res.text || '').trim();
            status.textContent = 'Готово (офлайн Whisper)!';
            StateModule.toast('Расшифровка завершена!', 'success');
        } catch (err) {
            status.textContent = 'Не удалось запустить Whisper (проверьте доступ к CDN/WASM)';
            StateModule.toast('Ошибка запуска Whisper в текущем окружении', 'warn');
        } finally {
            runBtn.disabled = false;
        }
    }

    return { init, loadFile };
})();
