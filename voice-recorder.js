(function() {
  var state = {
    stream: null,
    mediaRecorder: null,
    chunks: [],
    recordings: [],
    isRecording: false,
    timerInterval: null,
    timerSec: 0,
    currentAudio: null,
    playingId: null,
    initialized: false
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function nextRecordingId() {
    return 'vr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function sanitizeFileStem(name, fallback) {
    var stem = String(name || fallback || 'recording').replace(/\.[^.]+$/, '').trim();
    return stem || (fallback || 'recording');
  }

  function slugify(name, fallback) {
    return sanitizeFileStem(name, fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || (fallback || 'recording');
  }

  function getDurationLabel(durationSec) {
    var total = Number(durationSec) || 0;
    var mins = String(Math.floor(total / 60)).padStart(2, '0');
    var secs = String(total % 60).padStart(2, '0');
    return mins + ':' + secs;
  }

  function updateRecordUI() {
    var recBtn = byId('vrRecBtn');
    var dot = byId('vrDot');
    var body = byId('vrBody');
    var timer = byId('vrTimer');

    if (recBtn) {
      recBtn.textContent = state.isRecording ? '\u23F9 Stop' : '\u23FA Record';
      recBtn.classList.toggle('vr-recording', state.isRecording);
    }
    if (dot) dot.style.display = state.isRecording ? 'inline-block' : 'none';
    if (body) body.classList.toggle('vr-recording-active', state.isRecording);
    if (!state.isRecording && timer) timer.textContent = '00:00';
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function stopStream() {
    if (!state.stream) return;
    state.stream.getTracks().forEach(function(track) { track.stop(); });
    state.stream = null;
  }

  function stopPlayback() {
    if (!state.currentAudio) return;
    state.currentAudio.pause();
    if (state.currentAudio._blobUrl) {
      URL.revokeObjectURL(state.currentAudio._blobUrl);
      state.currentAudio._blobUrl = null;
    }
    state.currentAudio = null;
  }

  function stopIfRecording() {
    if (state.isRecording) stopRecording();
  }

  function renderList() {
    var list = byId('vrList');
    if (!list) return;

    list.innerHTML = '';
    if (!state.recordings.length) {
      list.innerHTML = '<div class="vr-empty">No recordings yet.</div>';
      return;
    }

    state.recordings.forEach(function(rec) {
      var item = document.createElement('div');
      item.className = 'vr-rec-item';

      var name = document.createElement('span');
      name.className = 'vr-rec-name';
      name.textContent = rec.name + ' (' + getDurationLabel(rec.durationSec) + ')';
      name.title = name.textContent;
      item.appendChild(name);

      var isPlaying = state.playingId === rec.id && state.currentAudio && !state.currentAudio.paused;
      var playBtn = document.createElement('button');
      playBtn.className = 'vr-ibtn';
      playBtn.textContent = isPlaying ? '\u23F8' : '\u25B6';
      playBtn.title = isPlaying ? 'Pause' : 'Play';
      playBtn.addEventListener('click', function() {
        togglePlay(rec.id);
      });
      item.appendChild(playBtn);

      var saveBtn = document.createElement('button');
      saveBtn.className = 'vr-ibtn';
      saveBtn.textContent = '\u2B07';
      saveBtn.title = 'Download audio file';
      saveBtn.addEventListener('click', function() {
        exportAudio(rec.id);
      });
      item.appendChild(saveBtn);

      var encBtn = document.createElement('button');
      encBtn.className = 'vr-ibtn vr-enc';
      encBtn.textContent = '\uD83D\uDD12';
      encBtn.title = 'Export encrypted secure player (no app required)';
      encBtn.addEventListener('click', function() {
        exportEncrypted(rec.id);
      });
      item.appendChild(encBtn);

      var delBtn = document.createElement('button');
      delBtn.className = 'vr-ibtn vr-del';
      delBtn.textContent = '\u00D7';
      delBtn.title = 'Delete recording';
      delBtn.addEventListener('click', function() {
        deleteRecording(rec.id);
      });
      item.appendChild(delBtn);

      list.appendChild(item);
    });
  }

  function chooseRecorderOptions() {
    var mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4'
    ];
    for (var i = 0; i < mimeTypes.length; i++) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeTypes[i])) {
        return { mimeType: mimeTypes[i] };
      }
    }
    return {};
  }

  function startTimer() {
    state.timerSec = 0;
    var timer = byId('vrTimer');
    if (timer) timer.textContent = '00:00';
    stopTimer();
    state.timerInterval = setInterval(function() {
      state.timerSec += 1;
      var timerEl = byId('vrTimer');
      if (timerEl) timerEl.textContent = getDurationLabel(state.timerSec);
    }, 1000);
  }

  function addRecording(recording) {
    state.recordings.push(recording);
    renderList();
  }

  function startRecording() {
    if (state.isRecording) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert('Microphone recording is not supported in this browser.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(function(stream) {
        state.stream = stream;
        state.chunks = [];

        try {
          state.mediaRecorder = new MediaRecorder(stream, chooseRecorderOptions());
        } catch (primaryError) {
          try {
            state.mediaRecorder = new MediaRecorder(stream);
          } catch (fallbackError) {
            stopStream();
            alert('Could not start audio recording: ' + (fallbackError.message || fallbackError));
            return;
          }
        }

        state.mediaRecorder.ondataavailable = function(event) {
          if (event.data && event.data.size > 0) state.chunks.push(event.data);
        };

        state.mediaRecorder.onerror = function(event) {
          stopTimer();
          state.isRecording = false;
          updateRecordUI();
          stopStream();
          alert('Recording failed: ' + ((event.error && event.error.message) || 'Unknown error'));
        };

        state.mediaRecorder.onstop = function() {
          var mimeType = state.mediaRecorder && state.mediaRecorder.mimeType ? state.mediaRecorder.mimeType : 'audio/webm';
          var blob = new Blob(state.chunks, { type: mimeType });
          state.chunks = [];
          addRecording({
            id: nextRecordingId(),
            name: 'Recording ' + (state.recordings.length + 1),
            blob: blob,
            mimeType: mimeType,
            durationSec: state.timerSec
          });
          state.mediaRecorder = null;
          stopStream();
        };

        state.mediaRecorder.start(500);
        state.isRecording = true;
        startTimer();
        updateRecordUI();
      })
      .catch(function(error) {
        var message = error && error.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access and try again.'
          : error && error.name === 'NotFoundError'
          ? 'No microphone found. Please connect a microphone and try again.'
          : 'Could not access microphone:\n' + (error && error.message ? error.message : error);
        alert(message);
      });
  }

  function stopRecording() {
    if (!state.isRecording) return;
    state.isRecording = false;
    stopTimer();
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop();
    } else {
      stopStream();
    }
    updateRecordUI();
  }

  function toggleRecording() {
    if (state.isRecording) stopRecording();
    else startRecording();
  }

  function toggleMinimize() {
    var panel = byId('lsVoiceRecorder');
    var minBtn = byId('vrMinBtn');
    if (!panel) return;
    var minimized = panel.classList.toggle('vr-minimized');
    if (minBtn) minBtn.textContent = minimized ? '\u002B' : '\u2212';
  }

  function getAudioExtension(rec) {
    if (rec && rec.fileName) {
      var match = rec.fileName.match(/(\.[^.]+)$/);
      if (match) return match[1].toLowerCase();
    }
    var mimeType = String(rec && rec.mimeType || '').toLowerCase();
    if (mimeType.indexOf('ogg') !== -1) return '.ogg';
    if (mimeType.indexOf('mp4') !== -1 || mimeType.indexOf('aac') !== -1) return '.mp4';
    if (mimeType.indexOf('mpeg') !== -1 || mimeType.indexOf('mp3') !== -1) return '.mp3';
    if (mimeType.indexOf('wav') !== -1 || mimeType.indexOf('wave') !== -1) return '.wav';
    if (mimeType.indexOf('flac') !== -1) return '.flac';
    return '.webm';
  }

  function exportAudio(id) {
    var rec = state.recordings.find(function(item) { return item.id === id; });
    if (!rec) return;
    downloadBlob(rec.blob, slugify(rec.name, 'recording') + getAudioExtension(rec));
  }

  function getBlobArrayBuffer(blob) {
    if (typeof blob.arrayBuffer === 'function') {
      return blob.arrayBuffer();
    }
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function() { reject(new Error('Failed to read audio data.')); };
      reader.onload = function(event) { resolve(event.target.result); };
      reader.readAsArrayBuffer(blob);
    });
  }

  function readFileText(file) {
    if (typeof file.text === 'function') {
      return file.text();
    }
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function() { reject(new Error('Could not read the selected file.')); };
      reader.onload = function(event) { resolve(event.target.result); };
      reader.readAsText(file);
    });
  }

  function escapeJsonForHtml(json) {
    return json.replace(/<\/script/gi, '<\\/script');
  }

  function buildPlayerHtml(payload) {
    var payloadJson = escapeJsonForHtml(JSON.stringify(payload));
    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width,initial-scale=1">',
      '  <title>Secure Voice Recording</title>',
      '  <style>',
      '    *{box-sizing:border-box;margin:0;padding:0}',
      '    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:system-ui,Arial,Helvetica,sans-serif;padding:16px}',
      '    .card{background:#1e293b;color:#e2e8f0;border-radius:14px;padding:28px 24px;width:min(380px,100%);box-shadow:0 20px 60px rgba(0,0,0,0.5)}',
      '    h2{font-size:17px;color:#f1f5f9;margin-bottom:6px}',
      '    .sub{font-size:12px;color:#64748b;margin-bottom:18px;line-height:1.5}',
      '    label{display:block;font-size:12px;color:#94a3b8;margin-bottom:5px;font-weight:600}',
      '    input[type=password]{width:100%;padding:9px 11px;border-radius:7px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px;margin-bottom:10px;outline:none}',
      '    input[type=password]:focus{border-color:#3b82f6}',
      '    .btn{width:100%;padding:10px;border-radius:7px;border:none;background:#2563eb;color:#fff;font-size:14px;font-weight:600;cursor:pointer}',
      '    .btn:hover{background:#1d4ed8}',
      '    .btn:disabled{background:#334155;color:#64748b;cursor:default}',
      '    .err{color:#f87171;font-size:12px;margin-bottom:10px;min-height:16px}',
      '    .player{display:none;margin-top:16px}',
      '    audio{width:100%;margin-bottom:8px;border-radius:6px}',
      '    .note{font-size:11px;color:#475569;text-align:center;line-height:1.5}',
      '  </style>',
      '</head>',
      '<body>',
      '  <div class="card">',
      '    <h2>&#x1F512; Secure Voice Recording</h2>',
      '    <p class="sub">Enter the password to unlock and play this recording.<br>Audio exists only in memory while this page is open.</p>',
      '    <div id="lockUI">',
      '      <label for="pw">Password</label>',
      '      <input type="password" id="pw" placeholder="Enter password" autocomplete="off" />',
      '      <div class="err" id="err"></div>',
      '      <button class="btn" id="unlockBtn">&#x1F513; Unlock &amp; Play</button>',
      '    </div>',
      '    <div class="player" id="player">',
      '      <audio id="aud" controls></audio>',
      '      <p class="note">&#x1F512; Audio is cleared when you close this page.<br>Re-open the file and enter the password to listen again.</p>',
      '    </div>',
      '  </div>',
      '  <script id="voice-recording-data" type="application/json">' + payloadJson + '</script>',
      '  <script>',
      '    (function(){',
      '      var payload = JSON.parse(document.getElementById("voice-recording-data").textContent);',
      '      var activeUrl = null;',
      '      function b64d(s){var raw=atob(s),bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;}',
      '      async function unlock(){',
      '        var pw=document.getElementById("pw").value;',
      '        var btn=document.getElementById("unlockBtn");',
      '        var err=document.getElementById("err");',
      '        if(!pw){err.textContent="Please enter a password.";return;}',
      '        btn.disabled=true;btn.textContent="Decrypting…";err.textContent="";',
      '        try{',
      '          var salt=b64d(payload.salt),iv=b64d(payload.iv),ct=b64d(payload.ct);',
      '          var enc=new TextEncoder();',
      '          var pwKey=await crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveKey"]);',
      '          var key=await crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:payload.iter,hash:"SHA-256"},pwKey,{name:"AES-GCM",length:256},false,["decrypt"]);',
      '          var plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:iv},key,ct);',
      '          if(activeUrl) URL.revokeObjectURL(activeUrl);',
      '          activeUrl=URL.createObjectURL(new Blob([plain],{type:payload.mime||"audio/webm"}));',
      '          var audio=document.getElementById("aud");',
      '          audio.src=activeUrl;',
      '          document.getElementById("lockUI").style.display="none";',
      '          document.getElementById("player").style.display="block";',
      '          audio.play().catch(function(){});',
      '        }catch(error){',
      '          err.textContent="Wrong password or corrupted file.";',
      '          btn.disabled=false;btn.textContent="🔓 Unlock & Play";',
      '        }',
      '      }',
      '      document.getElementById("unlockBtn").addEventListener("click", unlock);',
      '      document.getElementById("pw").addEventListener("keydown", function(event){ if (event.key === "Enter") unlock(); });',
      '      window.addEventListener("beforeunload", function(){ if(activeUrl) URL.revokeObjectURL(activeUrl); });',
      '    })();',
      '  </script>',
      '</body>',
      '</html>'
    ].join('\n');
  }

  function exportEncrypted(id) {
    var rec = state.recordings.find(function(item) { return item.id === id; });
    if (!rec) return;

    var password = prompt('Create a password to encrypt this recording.\n\nThe recipient will need this password to listen to it.\nKeep the password and the file separate for security.');
    if (password === null) return;
    if (!password) {
      alert('Password cannot be empty.');
      return;
    }

    var confirmPassword = prompt('Confirm the password:');
    if (confirmPassword === null) return;
    if (password !== confirmPassword) {
      alert('Passwords do not match. Please try again.');
      return;
    }

    getBlobArrayBuffer(rec.blob)
      .then(function(arrayBuffer) {
        var bytes = new Uint8Array(arrayBuffer);
        var salt = crypto.getRandomValues(new Uint8Array(16));
        var iv = crypto.getRandomValues(new Uint8Array(12));
        var encoder = new TextEncoder();
        return crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
          .then(function(passwordKey) {
            return crypto.subtle.deriveKey(
              { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
              passwordKey,
              { name: 'AES-GCM', length: 256 },
              false,
              ['encrypt']
            );
          })
          .then(function(key) {
            return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes);
          })
          .then(function(cipherText) {
            return {
              t: 'voice-recording',
              v: 2,
              mime: rec.mimeType || 'audio/webm',
              name: rec.name,
              iter: PBKDF2_ITERATIONS,
              salt: b64Encode(salt),
              iv: b64Encode(iv),
              ct: b64Encode(new Uint8Array(cipherText))
            };
          });
      })
      .then(function(payload) {
        var fileName = slugify(rec.name, 'recording') + '-secure-player.html';
        downloadBlob(new Blob([buildPlayerHtml(payload)], { type: 'text/html' }), fileName);
        alert('Encrypted player saved as:\n' + fileName + '\n\nShare this file and the password separately.\nThe recipient opens the HTML file in any modern browser (Edge, Chrome, Firefox), enters the password, and the audio plays.');
      })
      .catch(function(error) {
        alert('Encryption failed: ' + (error && error.message ? error.message : error));
      });
  }

  function addLoadedAudio(file, nameOverride) {
    var displayName = sanitizeFileStem(nameOverride || file.name, 'Loaded recording');
    addRecording({
      id: nextRecordingId(),
      name: displayName,
      blob: file,
      fileName: file.name,
      mimeType: file.type || 'audio/webm',
      durationSec: 0
    });
  }

  function extractPayloadFromHtml(html) {
    var match = html.match(/<script[^>]*id=["']voice-recording-data["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      throw new Error('Could not parse the encrypted recording data.');
    }
  }

  function loadEncryptedHtml(file, fileName) {
    readFileText(file)
      .then(function(html) {
        var payload = extractPayloadFromHtml(html);
        if (!payload || payload.t !== 'voice-recording') {
          throw new Error('INVALID_PLAYER_FILE');
        }

        var password = prompt('Enter the password to decrypt this recording:');
        if (password === null) return null;
        if (!password) {
          alert('Password cannot be empty.');
          return null;
        }

        var encoder = new TextEncoder();
        var salt = b64Decode(payload.salt);
        var iv = b64Decode(payload.iv);
        var cipherText = b64Decode(payload.ct);
        var iterations = payload.iter || PBKDF2_ITERATIONS;

        return crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
          .then(function(passwordKey) {
            return crypto.subtle.deriveKey(
              { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
              passwordKey,
              { name: 'AES-GCM', length: 256 },
              false,
              ['decrypt']
            );
          })
          .then(function(key) {
            return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, cipherText);
          })
          .then(function(plainText) {
            addRecording({
              id: nextRecordingId(),
              name: payload.name || sanitizeFileStem(fileName, 'Loaded recording'),
              blob: new Blob([plainText], { type: payload.mime || 'audio/webm' }),
              fileName: fileName,
              mimeType: payload.mime || 'audio/webm',
              durationSec: 0
            });
          });
      })
      .catch(function(error) {
        if (!error) return;
        if (error.message === 'INVALID_PLAYER_FILE') {
          alert('This HTML file is not a voice recording encrypted player.');
          return;
        }
        if (error.message === 'Could not parse the encrypted recording data.') {
          alert('Could not parse the encrypted recording data.\nThe file may be corrupted.');
          return;
        }
        if (error.message === 'Could not read the selected file.') {
          alert(error.message);
          return;
        }
        alert('Wrong password or corrupted file.\n' + (error && error.message ? error.message : ''));
      });
  }

  function handleLoadFile(file) {
    if (!file) return;
    var lowerName = String(file.name || '').toLowerCase();
    if (file.type === 'text/html' || lowerName.endsWith('.html')) {
      loadEncryptedHtml(file, file.name || 'recording.html');
      return;
    }
    addLoadedAudio(file);
  }

  function togglePlay(id) {
    if (state.playingId === id && state.currentAudio && !state.currentAudio.paused) {
      stopPlayback();
      state.playingId = null;
      renderList();
      return;
    }

    stopPlayback();

    var rec = state.recordings.find(function(item) { return item.id === id; });
    if (!rec) return;

    var url = URL.createObjectURL(rec.blob);
    var audio = new Audio(url);
    audio._blobUrl = url;
    audio.onended = function() {
      URL.revokeObjectURL(url);
      audio._blobUrl = null;
      if (state.playingId === id) {
        state.playingId = null;
        state.currentAudio = null;
        renderList();
      }
    };
    audio.onerror = function() {
      URL.revokeObjectURL(url);
      audio._blobUrl = null;
      state.playingId = null;
      state.currentAudio = null;
      renderList();
    };

    state.currentAudio = audio;
    state.playingId = id;
    audio.play().catch(function() {});
    renderList();
  }

  function deleteRecording(id) {
    if (!confirm('Delete this recording? This cannot be undone.')) return;
    if (state.playingId === id) {
      stopPlayback();
      state.playingId = null;
    }
    state.recordings = state.recordings.filter(function(item) { return item.id !== id; });
    renderList();
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    var minBtn = byId('vrMinBtn');
    var recBtn = byId('vrRecBtn');
    var loadBtn = byId('vrLoadBtn');
    var loadInput = byId('vrLoadInput');

    if (minBtn) minBtn.addEventListener('click', toggleMinimize);
    if (recBtn) recBtn.addEventListener('click', toggleRecording);
    if (loadBtn && loadInput) {
      loadBtn.addEventListener('click', function() {
        loadInput.click();
      });
      loadInput.addEventListener('change', function() {
        if (loadInput.files && loadInput.files[0]) handleLoadFile(loadInput.files[0]);
        loadInput.value = '';
      });
    }

    updateRecordUI();
    renderList();
  }

  window.voiceRecorder = {
    stopIfRecording: stopIfRecording
  };

  window.addEventListener('beforeunload', function() {
    stopTimer();
    stopPlayback();
    stopStream();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
