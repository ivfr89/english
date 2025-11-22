(() => {
  const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  let ws = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;

  // UI refs
  const el = (id) => document.getElementById(id);
  const overlay = el('overlay');
  const nameInput = el('name');
  const nameRow = el('nameRow');
  const userProfile = el('userProfile');
  const userAvatar = el('userAvatar');
  const userName = el('userName');
  const logoutBtn = el('logoutBtn');
  const switchBtn = el('switchBtn');
  let lastUserEmail = '';
  const langSelect = el('language');
  const nativeSelect = el('native');
  const levelSelect = el('level');
  const createBtn = el('createRoom');
  const singleBtn = el('singlePlayer');
  const joinBtn = el('joinRoom');
  const roomCodeInput = el('roomCode');
  const status = el('status');
  const loginStatus = el('loginStatus');
  const gLogin = el('gLogin');
  const authGate = el('authGate');

  const roomLabel = el('roomLabel');
  const roundLabel = el('roundLabel');
  const lifeYouBar = el('lifeYouBar');
  const lifeOppBar = el('lifeOppBar');
  const youTitle = el('youTitle');
  const oppTitle = el('oppTitle');
  const yourPrompt = el('yourPrompt');
  const yourHint = el('yourHint');
  const oppPrompt = el('oppPrompt');
  const oppHint = el('oppHint');
  const yourAnswer = el('yourAnswer');
  const submit = el('submit');
  const aiAssistBtn = el('aiAssistBtn');
  const yourFeedback = el('yourFeedback');
  const oppFeedback = el('oppFeedback');
  const info = el('info');
  const yourHistory = el('yourHistory');
  const oppHistory = el('oppHistory');
  const yourCards = el('yourCards');
  const oppCards = el('oppCards');
  const cooldownBox = el('cooldown');
  const cooldownLabel = el('cooldownLabel');
  const skipBtn = el('skipBtn');
  const spThresholdInput = el('spThreshold');
  const dictPopup = el('dictPopup');
  const dictContent = el('dictContent');
  const dictLoader = el('dictLoader');
  const dictClose = el('dictClose');

  // Spinner UI
  const spinnerOverlay = el('spinnerOverlay');
  const spinBtn = el('spinBtn');
  const wheelCanvas = el('wheelCanvas');
  const wheel = el('wheel');
  const turnLabel = el('turnLabel');
  const topicLegend = el('topicLegend');
  const toggleViewBtn = document.getElementById('toggleViewBtn');
  const playgroundBtn = el('playgroundBtn');
  const favoritesBtn = el('favoritesBtn');
  const progressBtn = el('progressBtn');
  const playgroundOverlay = el('playgroundOverlay');
  const pgList = el('pgList');
  const pgSubmit = el('pgSubmit');
  const pgMore = el('pgMore');
  const pgExit = el('pgExit');
  const pgClose = el('pgClose');
  const pgFavs = el('pgFavs');
  const pgNewNote = el('pgNewNote');
  const pgAddNote = el('pgAddNote');
  const addFavBtn = el('addFavBtn');
  // Overlays for favorites/progress (declare early for global handlers)
  const favoritesOverlay = el('favoritesOverlay');
  const favList = el('favList');
  const favClose = el('favClose');
  const progressOverlay = el('progressOverlay');
  const progressList = el('progressList');
  const progClose = el('progClose');
  const spTitle = el('spTitle');
  const spDesc = el('spDesc');
  const spThresholdLabel = el('spThresholdLabel');
  const mpTitle = el('mpTitle');
  const mpDesc = el('mpDesc');
  const levelLabel = el('levelLabel');

  let playerId = null;
  let roomCode = null;
  let prompts = {};
  let topics = [];
  let nativeLanguage = 'Spanish';
  let gameMode = 'duo';
  let targetThreshold = 70;
  const COLORS = ['#22d3ee', '#0ea5e9', '#f472b6', '#a78bfa', '#34d399', '#fca5a5'];
  let winWheel = null;
  const hasSl = true; // vendor shim provides local styling & behavior
  const hasWinwheel = typeof window.Winwheel !== 'undefined';

  // Fallback visibility if Shoelace is not available
  // Always show fallback bars (our shim manages sl-progress-bar visually)
  const lyfb = document.getElementById('lifeYouFallback');
  const lofb = document.getElementById('lifeOppFallback');
  if (lyfb) lyfb.style.display = 'none';
  if (lofb) lofb.style.display = 'none';
  // Fallback for spinner: show CSS wheel if Winwheel not loaded
  if (!hasWinwheel && wheel) wheel.style.display = 'block';
  if (hasWinwheel && wheel) wheel.style.display = 'none';
  let stage = 'topic';
  let cooldownTimer = null;
  let cooldownEndsAt = null;
  let mobileView = 'you'; // 'you' | 'opponent'
  let inPlayground = false;
  let pgBlockOpenUntil = 0; // guard to avoid immediate re-open after exit
  let lastPlayers = [];

  connectWs();

  // Size the wheel immediately on load to avoid oversized initial render
  ensureWheelSize();

  // Localize overlay descriptions based on native language
  function localizeOverlay() {
    const nat = (nativeSelect?.value || 'Spanish');
    const es = nat === 'Spanish';
    if (spTitle) spTitle.textContent = '🎯 Single Player';
    if (mpTitle) mpTitle.textContent = '🆚 Multiplayer';
    if (es) {
      if (spDesc) spDesc.textContent = 'Practica solo con un bot. Pierdes vida si tu puntuación cae por debajo del umbral.';
      if (spThresholdLabel) spThresholdLabel.textContent = 'Umbral';
      if (levelLabel) levelLabel.textContent = 'Nivel';
      if (singleBtn) singleBtn.textContent = 'Comenzar práctica';
      if (mpDesc) mpDesc.textContent = 'Juega 1v1 en línea. Crea una sala o únete con un código.';
      if (createBtn) createBtn.textContent = 'Crear sala';
      if (joinBtn) joinBtn.textContent = 'Unirme';
      if (roomCodeInput) roomCodeInput.placeholder = 'Código de sala';
      if (pgSubmit) pgSubmit.textContent = 'Enviar';
    } else {
      if (spDesc) spDesc.textContent = 'Practice solo with a bot. You lose HP if your score falls below the threshold.';
      if (spThresholdLabel) spThresholdLabel.textContent = 'Threshold';
      if (levelLabel) levelLabel.textContent = 'Level';
      if (singleBtn) singleBtn.textContent = 'Start practice';
      if (mpDesc) mpDesc.textContent = 'Play 1v1 online. Create a room or join with a code.';
      if (createBtn) createBtn.textContent = 'Create room';
      if (joinBtn) joinBtn.textContent = 'Join';
      if (roomCodeInput) roomCodeInput.placeholder = 'Room code';
      if (pgSubmit) pgSubmit.textContent = 'Submit';
    }
  }
  if (nativeSelect) nativeSelect.addEventListener('change', localizeOverlay);
  localizeOverlay();
  if (nativeSelect && logoutBtn) nativeSelect.addEventListener('change', () => {
    logoutBtn.textContent = (nativeSelect.value === 'Spanish') ? 'Cerrar sesión' : 'Sign out';
  });

  // --- Persist user preferences locally ---
  const LS = {
    name: 'ld.name',
    learn: 'ld.learn',
    native: 'ld.native',
    level: 'ld.level',
    threshold: 'ld.threshold',
    lastMode: 'ld.lastMode', // 'single' | 'multi'
    lastRoom: 'ld.lastRoom',
  };
  function lsGet(k, d='') { try { return localStorage.getItem(k) ?? d; } catch { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, String(v)); } catch {} }

  // Restore fields
  if (nameInput) nameInput.value = lsGet(LS.name, nameInput.value || '');
  if (langSelect) langSelect.value = lsGet(LS.learn, langSelect.value || 'English');
  if (nativeSelect) nativeSelect.value = lsGet(LS.native, nativeSelect.value || 'Spanish');
  if (levelSelect) levelSelect.value = lsGet(LS.level, levelSelect.value || 'B1-B2');
  if (spThresholdInput) {
    const storedTh = parseInt(lsGet(LS.threshold, spThresholdInput.value || '70'), 10);
    if (!isNaN(storedTh)) spThresholdInput.value = String(storedTh);
  }

  // Persist on change
  if (nameInput) nameInput.addEventListener('input', () => lsSet(LS.name, nameInput.value.trim()));
  if (langSelect) langSelect.addEventListener('change', () => lsSet(LS.learn, langSelect.value));
  if (nativeSelect) nativeSelect.addEventListener('change', () => lsSet(LS.native, nativeSelect.value));
  if (levelSelect) levelSelect.addEventListener('change', () => lsSet(LS.level, levelSelect.value));
  if (spThresholdInput) spThresholdInput.addEventListener('change', () => lsSet(LS.threshold, spThresholdInput.value));

  // Remember last mode and room
  function rememberMode(m) { lsSet(LS.lastMode, m); }
  function rememberRoom(code) { if (code) lsSet(LS.lastRoom, code); }

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  // --- Lightweight dictionary menu near selection ---
  let dictMenuEl = null;
  let lastSelectionText = '';
  function ensureDictMenu() {
    if (dictMenuEl) return dictMenuEl;
    const m = document.createElement('div');
    m.id = 'dictMenu';
    m.className = 'dict-menu';
    m.style.display = 'none';
    const btn = document.createElement('button');
    btn.textContent = 'Entender';
    btn.addEventListener('click', () => {
      if (!lastSelectionText) return;
      const text = lastSelectionText.slice(0, 160);
      const context = (yourPrompt?.textContent || '').slice(0, 2000);
      if (dictPopup) { dictPopup.style.display = ''; }
      if (dictLoader) dictLoader.style.display = 'inline-block';
      if (dictContent) dictContent.textContent = 'Analizando…';
      send({ type: 'explain_selection', text, context, nativeLanguage });
      m.style.display = 'none';
      if (dictPopup) { dictPopup.style.display = ''; dictContent.textContent = 'Analizando…'; }
    });
    m.appendChild(btn);
    document.body.appendChild(m);
    dictMenuEl = m;
    return m;
  }
  function hideDictMenu() { if (dictMenuEl) dictMenuEl.style.display = 'none'; }
  function showDictMenuAt(rect) {
    const m = ensureDictMenu();
    m.style.left = Math.min(window.innerWidth - 140, Math.max(8, rect.left + window.scrollX)) + 'px';
    m.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    m.style.display = 'block';
  }
  function onSelectionChange() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !yourPrompt) { hideDictMenu(); return; }
    const txt = String(sel.toString() || '').trim();
    if (!txt) { hideDictMenu(); return; }
    // Only if selection belongs to your prompt
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    if (!(yourPrompt.contains(container.nodeType === 1 ? container : container.parentNode))) { hideDictMenu(); return; }
    lastSelectionText = txt;
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) { hideDictMenu(); return; }
    showDictMenuAt(rect);
  }
  if (!isMobile) {
    document.addEventListener('mouseup', () => setTimeout(onSelectionChange, 0));
    document.addEventListener('keyup', (e) => { if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') return; setTimeout(onSelectionChange, 0); });
  }
  if (dictClose) dictClose.addEventListener('click', () => { if (dictPopup) dictPopup.style.display = 'none'; if (dictLoader) dictLoader.style.display = 'none'; });

  // Toolbar-based dictionary for mobile or fallback
  window._dictExplain = () => {
    const sel = (window.getSelection()?.toString() || '').trim();
    if (sel) {
      if (dictPopup) dictPopup.style.display = '';
      if (dictLoader) dictLoader.style.display = 'inline-block';
      if (dictContent) dictContent.textContent = 'Analizando…';
      const context = (yourPrompt?.textContent || '').slice(0, 2000);
      send({ type: 'explain_selection', text: sel.slice(0,160), context, nativeLanguage });
      return;
    }
    // No selection (common on Android): reveal inline input
    if (dictText) dictText.style.display = '';
    if (dictGoBtn) dictGoBtn.style.display = '';
    if (dictText) { dictText.focus(); dictText.select?.(); }
  };
  window._dictGo = () => {
    const text = (dictText?.value || '').trim();
    if (!text) return;
    if (dictPopup) dictPopup.style.display = '';
    if (dictLoader) dictLoader.style.display = 'inline-block';
    if (dictContent) dictContent.textContent = 'Analizando…';
    const context = (yourPrompt?.textContent || '').slice(0, 2000);
    send({ type: 'explain_selection', text: text.slice(0,160), context, nativeLanguage });
  };

  // Single submit code path via button click; keep this as a proxy
  // Deprecated helper removed; use button click handler only

  function send(obj) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (status) status.textContent = 'Reconectando...';
      return false;
    }
    ws.send(JSON.stringify(obj));
    return true;
  }

  function handleWsOpen() {
    reconnectAttempts = 0;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (status) status.textContent = '';
  }

  function handleWsClose() {
    if (status) status.textContent = 'Conexión perdida. Reintentando...';
    scheduleReconnect();
  }

  function handleWsError() {
    if (status) status.textContent = 'Error de conexión. Reintentando...';
    try { ws?.close(); } catch {}
  }

  function handleWsMessage(ev) {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'error') status.textContent = msg.error;

    if (msg.type === 'room_created') {
      playerId = msg.playerId; roomCode = msg.roomCode;
      overlay.style.display = 'none';
      roomLabel.textContent = `Room: ${roomCode}`;
      info.textContent = 'Share the room code with your friend.';
      rememberRoom(roomCode);
    }

    if (msg.type === 'room_joined') {
      playerId = msg.playerId; roomCode = msg.roomCode;
      overlay.style.display = 'none';
      roomLabel.textContent = `Room: ${roomCode}`;
      info.textContent = 'Opponent connected. Get ready!';
      rememberRoom(roomCode);
    }

    if (msg.type === 'state') {
      roomCode = msg.roomCode || roomCode;
      roomLabel.textContent = `Room: ${roomCode || '-'}`;
      roundLabel.textContent = `Round: ${msg.round}`;
      if (msg.mode) gameMode = msg.mode;
      if (typeof msg.threshold === 'number') targetThreshold = msg.threshold;
      prompts = msg.prompts || prompts;
      const mePrompt = prompts[playerId];
      const opPrompt = prompts[playerId === 'p1' ? 'p2' : 'p1'];
      const generating = msg.status === 'playing' && (!mePrompt || !opPrompt);
      yourPrompt.textContent = mePrompt || (generating ? 'Generando enunciado...' : 'Waiting...');
      oppPrompt.textContent = opPrompt || (generating ? 'Generando enunciado...' : 'Waiting...');
      const hints = msg.hints || {};
      const myHint = hints[playerId];
      const oHint = hints[playerId === 'p1' ? 'p2' : 'p1'];
      if (yourHint) { if (myHint) { yourHint.style.display = ''; yourHint.textContent = myHint; } else { yourHint.style.display = 'none'; yourHint.textContent = ''; } }
      if (oppHint) { if (oHint) { oppHint.style.display = ''; oppHint.textContent = oHint; } else { oppHint.style.display = 'none'; oppHint.textContent = ''; } }
      if (Array.isArray(msg.topics)) { topics = msg.topics; renderLegend(); if (hasWinwheel) buildWheel(); else updateWheelColors(); }
      if (msg.players) {
        lastPlayers = msg.players;
        const me = msg.players.find((p) => p.id === playerId);
        const op = msg.players.find((p) => p.id !== playerId);
        if (hasSl) {
          if (me) lifeYouBar.value = me.life ?? 100;
          if (op) lifeOppBar.value = op.life ?? 100;
        } else {
          const ly = document.getElementById('lifeYou');
          const lo = document.getElementById('lifeOpp');
          if (ly && me) ly.style.width = `${me.life ?? 100}%`;
          if (lo && op) lo.style.width = `${op.life ?? 100}%`;
        }
        // Update titles with CEFR level
        if (youTitle && me) youTitle.textContent = `You${me.level ? ` (${me.level})` : ''}`;
        if (oppTitle && op) oppTitle.textContent = `Opponent${op.level ? ` (${op.level})` : ''}`;
        renderCards(me?.cards || [], op?.cards || [], !!me?.silenced);
        aiAssistBtn.disabled = !me?.aiAssistReady;
      }
      if (msg.status === 'finished') submit.disabled = true;
      if (Array.isArray(msg.history)) renderHistory(msg.history);
      inPlayground = msg.status === 'playground';
      if (playgroundBtn) playgroundBtn.style.display = (gameMode === 'single' && !inPlayground) ? '' : 'none';
      if (favoritesBtn) favoritesBtn.style.display = '';
      if (progressBtn) progressBtn.style.display = '';
      if (playgroundOverlay) playgroundOverlay.style.display = inPlayground ? 'flex' : 'none';
      applyMobileView();
      if ((msg.status === 'waiting_spin' || msg.status === 'waiting_subspin') && msg.turn) setTurn(msg.turn);
      if (!(msg.status === 'waiting_spin' || msg.status === 'waiting_subspin' || msg.status === 'spinning')) spinnerOverlay.style.display = 'none';
      if (msg.status === 'cooldown' && msg.cooldownEndsAt) startCooldown(msg.cooldownEndsAt);
      if (msg.status !== 'cooldown') stopCooldown();
    }

    if (msg.type === 'turn') {
      if (Array.isArray(msg.topics)) { topics = msg.topics; renderLegend(); if (hasWinwheel) buildWheel(); else updateWheelColors(); }
      if (msg.stage) stage = msg.stage;
      setTurn(msg.playerId);
      applyMobileView();
    }

    if (msg.type === 'spin_start') {
      if (Array.isArray(msg.topics)) { topics = msg.topics; renderLegend(); if (hasWinwheel) buildWheel(); else updateWheelColors(); }
      if (msg.stage) stage = msg.stage;
      spinnerOverlay.style.display = 'flex';
      spinBtn.disabled = true;
      spinBtn.setAttribute('disabled','');
      // Fit wheel to viewport
      ensureWheelSize();
      if (hasWinwheel) {
        // Use Winwheel to spin to selected index
        buildWheel();
        const n = Math.max(1, (topics || []).length);
        const slice = 360 / n;
        const segCenter = (msg.index * slice + slice / 2);
        // Align segment center to pointer at top (-90deg in canvas)
        let stopAngle = (-90 - segCenter) % 360; if (stopAngle < 0) stopAngle += 360;
        try { if (winWheel) winWheel.stopAnimation(false); } catch {}
        if (winWheel) {
          winWheel.rotationAngle = 0;
          winWheel.draw();
          winWheel.animation = { type: 'spinToStop', duration: 2, spins: msg.rotations || 5, stopAngle, callbackFinished: () => {
            const spinStage = msg.stage || stage;
            if (spinStage === 'subtopic') spinnerOverlay.style.display = 'none';
          }};
          winWheel.startAnimation();
        }
      } else if (wheel) {
        // CSS fallback rotation
        const n = Math.max(1, (topics || []).length);
        const slice = 360 / n;
        const finalAngle = 360 - (msg.index * slice + slice / 2);
        wheel.style.transition = 'none';
        wheel.style.transform = 'rotate(0deg)';
        void wheel.offsetWidth;
        wheel.style.transition = 'transform 2s cubic-bezier(.2,.8,.2,1)';
        wheel.style.transform = `rotate(${(msg.rotations || 5) * 360 + finalAngle}deg)`;
        const spinStage = msg.stage || stage;
        setTimeout(() => { if (spinStage === 'subtopic') spinnerOverlay.style.display = 'none'; }, 2300);
      }
      info.textContent = `${stage === 'subtopic' ? 'Subtema' : 'Tema'} seleccionado: ${localizeTopic(msg.topicKey)}`;
    }

    if (msg.type === 'cooldown_start') {
      startCooldown(msg.endsAt);
    }

    if (msg.type === 'skip_update') {
      // Optional: could reflect how many have skipped
      // For now, disable button once we clicked it.
    }

    if (msg.type === 'round_start') {
      yourAnswer.value = '';
      yourFeedback.textContent = '';
      oppFeedback.textContent = '';
      prompts = {};
      yourPrompt.textContent = 'Generando enunciado...';
      oppPrompt.textContent = 'Generando enunciado...';
      if (yourHint) { yourHint.style.display = 'none'; yourHint.textContent = ''; }
      if (oppHint) { oppHint.style.display = 'none'; oppHint.textContent = ''; }
      submit.disabled = true;
      aiAssistBtn.disabled = true;
      info.textContent = `Tema: ${localizeTopic(msg.category)}${msg.subtopic ? ' • ' + localizeTopic(msg.subtopic) : ''}`;
      spinnerOverlay.style.display = 'none';
    }

    if (msg.type === 'prompts_ready') {
      prompts = msg.prompts || {};
      yourPrompt.textContent = prompts[playerId] || 'Waiting...';
      oppPrompt.textContent = prompts[playerId === 'p1' ? 'p2' : 'p1'] || 'Waiting...';
      const hints = msg.hints || {};
      const myHint = hints[playerId];
      const oHint = hints[playerId === 'p1' ? 'p2' : 'p1'];
      if (yourHint) { if (myHint) { yourHint.style.display = ''; yourHint.textContent = myHint; } else { yourHint.style.display = 'none'; yourHint.textContent = ''; } }
      if (oppHint) { if (oHint) { oppHint.style.display = ''; oppHint.textContent = oHint; } else { oppHint.style.display = 'none'; oppHint.textContent = ''; } }
      info.textContent = `¡Listo! ${msg.subtopic ? 'Subtema' : 'Tema'}: ${localizeTopic(msg.category)}${msg.subtopic ? ' • ' + localizeTopic(msg.subtopic) : ''}. Responde para atacar.`;
      const src = (msg.promptSources && msg.promptSources[playerId]) || null;
      const ms = (msg.promptTimes && typeof msg.promptTimes[playerId] === 'number') ? msg.promptTimes[playerId] : null;
      if (src) {
        const tag = src === 'ai' ? 'IA' : 'Mock';
        let t = '';
        if (typeof ms === 'number' && ms > 0) {
          t = ms < 1000 ? ` ${ms}ms` : ` ${(ms/1000).toFixed(1)}s`;
        }
        info.textContent += ` (${tag}${t})`;
      }
      submit.disabled = false;
      // aiAssistBtn may be enabled if a card was played
      spinnerOverlay.style.display = 'none';
      toast('✅ Enunciados listos', 'success');
      applyMobileView();
    }

    if (msg.type === 'playground_ready') {
      if (Date.now() < pgBlockOpenUntil) {
        // Ignore stale playground_ready right after exiting
        return;
      }
      inPlayground = true;
      if (playgroundOverlay) playgroundOverlay.style.display = 'flex';
      renderPlayground(msg.exercises || []);
      send({ type: 'list_favorites' });
    }

    if (msg.type === 'playground_feedback') {
      const items = msg.results || [];
      items.forEach((r) => {
        const box = document.querySelector(`.pg-item[data-id=\"${r.id}\"] .pg-feedback`);
        if (box) box.textContent = `Score: ${r.score}\n${r.feedback}${r.corrections ? `\nCorrections: ${r.corrections}` : ''}`;
      });
      // Re-enable UI after receiving feedback
      setPgLoading(false);
    }

    if (msg.type === 'playground_synonyms') {
      const items = msg.items || [];
      items.forEach((it) => updateExerciseSynonyms(it.id, it.synonyms || []));
    }

    if (msg.type === 'favorites') {
      renderFavorites(msg.items || []);
      // Also render into overlay if open
      if (favoritesOverlay && favoritesOverlay.style.display !== 'none') renderFavoritesOverlay(msg.items || []);
    }

    if (msg.type === 'progress_data') {
      if (!pgProgressBox && !(progressOverlay && progressOverlay.style.display !== 'none' && progressList)) return;
      const hist = msg.history || [];
      const pgs = msg.playground || [];
      const histHtml = hist.map((h) => {
        const ideals = Array.isArray(h.ideals) && h.ideals.length ? `\\n\\nIdeal answers:\\n- ${h.ideals.map(escapeHTML).join('\\n- ')}` : '';
        return `
        <div class=\"pg-prog-item\">
          <h5>Ronda ${h.round} • ${escapeHTML(h.language || '')} • Score ${h.score}</h5>
          <div class=\"muted\">${escapeHTML(h.prompt || '')}</div>
          <pre style=\"margin-top:4px\"><strong>Tu respuesta:</strong>\n${escapeHTML(h.answer || '')}</pre>
          <pre style=\"margin-top:4px\">${escapeHTML(h.feedback || '')}${h.corrections ? `\\n${escapeHTML(h.corrections)}` : ''}${ideals}</pre>
        </div>`;
      }).join('');
      const pgHtml = pgs.map((x) => `
        <div class="pg-prog-item">
          <h5>${escapeHTML(x.kind || 'playground')} • Score ${x.score}</h5>
          <div class="muted">${escapeHTML(x.prompt || '')}</div>
          <div style=\"margin-top:4px\">${escapeHTML(x.feedback || '')}${x.corrections ? `\\n${escapeHTML(x.corrections)}` : ''}</div>
        </div>
      `).join('');
      const _html_progress = `
        <h3 style=\"margin:4px 0\">Historial reciente</h3>
        ${histHtml || '<div class=\\"muted\\">Sin historial</div>'}
        <h3 style=\"margin:10px 0 4px 0\">Playground</h3>
        ${pgHtml || '<div class=\\"muted\\">Sin ejercicios</div>'}
      `;
      if (pgProgressBox) { pgProgressBox.innerHTML = _html_progress; pgProgressBox.style.display = ''; }
      if (progressOverlay && progressOverlay.style.display !== 'none' && progressList) { progressList.innerHTML = _html_progress; }
    }

    if (msg.type === 'answer_received') {
      if (msg.playerId !== playerId) info.textContent = 'Opponent answered.';
    }

    if (msg.type === 'evaluating') {
      info.textContent = 'Evaluating answers...';
      toast('⏳ Evaluando respuestas...', 'primary');
      yourFeedback.textContent = 'Evaluating...';
      oppFeedback.textContent = 'Evaluating...';
      submit.disabled = true;
      spinnerOverlay.style.display = 'none';
    }

    if (msg.type === 'explain_result') {
      if (typeof msg.text === 'string' && dictContent) {
        dictContent.textContent = msg.explanation || 'Sin datos.';
        if (dictPopup) dictPopup.style.display = '';
        if (dictLoader) dictLoader.style.display = 'none';
      }
    }

    if (msg.type === 'round_result') {
      const resMe = msg.results[playerId];
      const otherId = playerId === 'p1' ? 'p2' : 'p1';
      const resOp = msg.results[otherId];
      if (resMe) {
        const ideals = (msg.ideals && Array.isArray(msg.ideals[playerId])) ? msg.ideals[playerId] : [];
        const idealText = ideals.length ? `\n\nIdeal answers:\n- ${ideals.join('\n- ')}` : '';
        const meObj = Array.isArray(lastPlayers) ? lastPlayers.find(p => p.id === playerId) : null;
        yourFeedback.textContent = `${meObj?.level ? `Level: ${meObj.level}\n` : ''}Score: ${resMe.score}\n${resMe.feedback}${resMe.corrections ? `\nCorrections: ${resMe.corrections}` : ''}${idealText}`;
      }
      if (resOp) {
        const otherId = playerId === 'p1' ? 'p2' : 'p1';
        const opObj = Array.isArray(lastPlayers) ? lastPlayers.find(p => p.id === otherId) : null;
        oppFeedback.textContent = `${opObj?.level ? `Level: ${opObj.level}\n` : ''}Score: ${resOp.score}\n${resOp.feedback}${resOp.corrections ? `\nCorrections: ${resOp.corrections}` : ''}`;
      } else {
        oppFeedback.textContent = '';
      }
      const meLife = msg.lives[playerId];
      const opLife = msg.lives[otherId];
      if (hasSl) {
        lifeYouBar.value = meLife;
        lifeOppBar.value = opLife;
      } else {
        const ly = document.getElementById('lifeYou');
        const lo = document.getElementById('lifeOpp');
        if (ly) ly.style.width = `${meLife}%`;
        if (lo) lo.style.width = `${opLife}%`;
      }
      submit.disabled = true;
      aiAssistBtn.disabled = true;
      if (msg.results && prompts) {
        const items = [];
        const meId = playerId;
        const opId = otherId;
        const myIdeals = (msg.ideals && Array.isArray(msg.ideals[meId])) ? msg.ideals[meId] : [];
        const opIdeals = (msg.ideals && Array.isArray(msg.ideals[opId])) ? msg.ideals[opId] : [];
        items.push({ round: msg.round, playerId: meId, prompt: prompts[meId] || '', answer: yourAnswer.value.trim(), score: msg.results[meId]?.score || 0, feedback: msg.results[meId]?.feedback || '', corrections: msg.results[meId]?.corrections || null, language: (Array.isArray(lastPlayers)? (lastPlayers.find(p=>p.id===meId)?.learningLanguage): '') || '', level: (Array.isArray(lastPlayers)? (lastPlayers.find(p=>p.id===meId)?.level): '') || '', ideals: myIdeals });
        if (msg.results[opId]) items.push({ round: msg.round, playerId: opId, prompt: prompts[opId] || '', answer: '(oculto)', score: msg.results[opId]?.score || 0, feedback: msg.results[opId]?.feedback || '', corrections: msg.results[opId]?.corrections || null, language: (Array.isArray(lastPlayers)? (lastPlayers.find(p=>p.id===opId)?.learningLanguage): '') || '', level: (Array.isArray(lastPlayers)? (lastPlayers.find(p=>p.id===opId)?.level): '') || '', ideals: opIdeals });
        renderHistoryMerge(items);
      }
    }

    if (msg.type === 'game_over') {
      const win = msg.winner === playerId;
      info.textContent = win ? 'You win! 🎉' : 'You lost. 🥲';
      toast(win ? '🏆 ¡Has ganado!' : '💀 Has perdido', win ? 'success' : 'error');
      submit.disabled = true;
    }

    if (msg.type === 'opponent_disconnected') {
      info.textContent = 'Opponent disconnected.';
      toast('🔌 Oponente desconectado', 'warning');
      submit.disabled = true;
    }

    if (msg.type === 'cards_granted') {
      info.textContent = '¡Has recibido una carta!';
      toast('🎁 ¡Has recibido una carta!', 'success');
    }
    if (msg.type === 'card_used') {
      if (msg.effect === 'heal_small') info.textContent = 'Usaste Cura (+10)';
      if (msg.effect === 'shield_small') info.textContent = 'Usaste Escudo (+5)';
      if (msg.effect === 'shield_medium') info.textContent = 'Usaste Escudo (+10)';
      if (msg.effect === 'double_hit') info.textContent = 'Usaste Doble golpe (+50%)';
      toast('Carta usada', 'primary');
    }
    if (msg.type === 'player_silenced') {
      if (msg.playerId === playerId) info.textContent = 'Estás silenciado: no puedes usar cartas esta ronda.';
      else info.textContent = 'Silenciaste al oponente esta ronda.';
      toast('🔇 Silencio aplicado', 'warning');
    }
    if (msg.type === 'card_stolen') {
      if (msg.to === playerId) info.textContent = 'Robaste una carta al oponente.';
      if (msg.from === playerId) info.textContent = 'Te robaron una carta.';
      toast('🫳 Robo de carta', 'warning');
    }
    if (msg.type === 'prompt_updated') {
      if (msg.playerId === playerId) { yourPrompt.textContent = msg.prompt; }
      else { oppPrompt.textContent = msg.prompt; }
    }
    if (msg.type === 'ai_assist_ready') {
      if (msg.playerId === playerId) { aiAssistBtn.disabled = false; info.textContent = 'AI Assist listo para este turno.'; toast('✨ AI Assist disponible', 'success'); }
    }
    if (msg.type === 'ai_answer') {
      if (msg.playerId === playerId) {
        yourAnswer.value = msg.text;
        // no animation to avoid layout shifts
      }
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    const delay = Math.min(10000, 1000 * Math.pow(1.5, reconnectAttempts || 0));
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectWs();
    }, delay);
  }

  function connectWs() {
    const socket = new WebSocket(WS_URL);
    ws = socket;
    socket.addEventListener('open', handleWsOpen);
    socket.addEventListener('message', handleWsMessage);
    socket.addEventListener('close', handleWsClose);
    socket.addEventListener('error', handleWsError);
  }

  createBtn.addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Player';
    learningLanguage = langSelect.value;
    nativeLanguage = nativeSelect.value;
    const level = levelSelect?.value || 'B1-B2';
    rememberMode('multi');
    send({ type: 'create_room', name, learningLanguage, nativeLanguage, level });
    status.textContent = 'Creating room...';
  });

  joinBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!code) { status.textContent = 'Enter a room code.'; return; }
    const name = nameInput.value.trim() || 'Player';
    learningLanguage = langSelect.value;
    nativeLanguage = nativeSelect.value;
    const level = levelSelect?.value || 'B1-B2';
    rememberMode('multi');
    rememberRoom(code);
    send({ type: 'join_room', roomCode: code, name, learningLanguage, nativeLanguage, level });
    status.textContent = 'Joining room...';
  });

  submit.addEventListener('click', () => {
    const text = yourAnswer.value.trim();
    if (!text) return;
    send({ type: 'answer', text });
    submit.disabled = true;
    info.textContent = 'Waiting for opponent...';
  });

  aiAssistBtn.addEventListener('click', () => {
    send({ type: 'ai_answer_request' });
    aiAssistBtn.disabled = true;
  });

  skipBtn.addEventListener('click', () => {
    skipBtn.disabled = true;
    send({ type: 'skip' });
  });

  if (singleBtn) {
    singleBtn.addEventListener('click', () => {
      const name = nameInput.value.trim() || 'Player';
      learningLanguage = langSelect.value;
      nativeLanguage = nativeSelect.value;
      const level = levelSelect?.value || 'B1-B2';
      const th = parseInt(spThresholdInput?.value || '70', 10) || 70;
      targetThreshold = Math.max(40, Math.min(100, th));
      rememberMode('single');
      send({ type: 'single_start', name, learningLanguage, nativeLanguage, level, threshold: targetThreshold });
      status.textContent = 'Starting single player...';
    });
  }

  spinBtn.addEventListener('click', () => {
    spinBtn.disabled = true;
    spinBtn.setAttribute('disabled','');
    send({ type: 'spin' });
  });

  function setTurn(pid) {
    const mine = pid === playerId;
    const what = stage === 'subtopic' ? 'Subtema' : 'Tema';
    turnLabel.textContent = mine ? `Tu turno: elige ${what}` : `Turno del oponente: elige ${what}`;
    spinnerOverlay.style.display = 'flex';
    // Ensure wheel fits before first spin
    ensureWheelSize();
    if (hasWinwheel) buildWheel(); else updateWheelColors();
    // Toggle disabled both as property and attribute (for custom elements)
    if (mine) {
      spinBtn.disabled = false;
      spinBtn.removeAttribute('disabled');
    } else {
      spinBtn.disabled = true;
      spinBtn.setAttribute('disabled', '');
    }
  }

  function renderHistory(list) {
    const meId = playerId;
    const opId = playerId === 'p1' ? 'p2' : 'p1';
    const mine = list.filter((x) => x.playerId === meId);
    const opp = list.filter((x) => x.playerId === opId);
    yourHistory.innerHTML = mine.map(toHistoryHTML).join('');
    oppHistory.innerHTML = opp.map(toHistoryHTML).join('');
  }

  function renderHistoryMerge(items) {
    const mine = items.filter((x) => x.playerId === playerId);
    const opp = items.filter((x) => x.playerId !== playerId);
    if (mine.length) yourHistory.innerHTML = toHistoryHTML(mine[0]) + yourHistory.innerHTML;
    if (opp.length) oppHistory.innerHTML = toHistoryHTML(opp[0]) + oppHistory.innerHTML;
  }

  function toast(message, variant) {
    if (window.Toast && typeof window.Toast.show === 'function') {
      window.Toast.show(message, { variant });
    }
  }

  function renderCards(mine, opp, meSilenced) {
    yourCards.innerHTML = (mine || []).map((c) => `<button class="card-btn" data-id="${c.id}" ${meSilenced ? "disabled" : ""}>${escapeHTML(c.label)}</button>`).join('');
    oppCards.innerHTML = (opp || []).map((c) => `<span class="card-btn" disabled>${escapeHTML(c.label)}</span>`).join('');
    yourCards.querySelectorAll('button.card-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cardId = btn.getAttribute('data-id');
        send({ type: 'use_card', cardId });
      });
    });
  }


  function cardEmoji(type) {
    switch (type) {
      case "heal_small": return "❤️";
      case "shield_small": return "🛡️";
      case "shield_medium": return "🛡️";
      case "double_hit": return "⚡";
      case "silence": return "🔇";
      case "steal": return "🫳";
      case "reroll_prompt": return "🔀";
      case "ai_assist": return "✨";
      default: return "🃏";
    }
  }

  function toHistoryHTML(x) {
    const title = `Ronda ${x.round} • Puntuación ${x.score}`;
    const corr = x.corrections ? `\nSugerencias: ${escapeHTML(x.corrections)}` : '';
    const ideals = Array.isArray(x.ideals) && x.ideals.length ? `\n\nRespuestas ideales:\n- ${x.ideals.map(escapeHTML).join('\n- ')}` : '';
    return `
      <details class="history-item" open>
        <summary>${escapeHTML(title)} <span class="tag">${x.language || ''}</span>${x.level ? ` <span class="tag">${escapeHTML(x.level)}</span>` : ''}</summary>
        <div class="content">
          <div><strong>Enunciado:</strong></div>
          <pre>${escapeHTML(x.prompt || '')}</pre>
          <div style="margin-top:6px"><strong>Tu respuesta:</strong></div>
          <pre>${escapeHTML(x.answer || '')}</pre>
          <div style="margin-top:6px"><strong>Mejoras IA:</strong></div>
          <pre>${escapeHTML(x.feedback || '')}${corr}${ideals}</pre>
        </div>
      </details>
    `;
  }

  function renderLegend() {
    if (!Array.isArray(topics) || topics.length === 0) { topicLegend.innerHTML = ''; return; }
    const single = gameMode === 'single';
    topicLegend.innerHTML = topics.map((t, i) => `
      <div class="legend-item${single ? ' clickable' : ''}" data-key="${escapeHTML(t.key)}">
        <span class="swatch" style="background:${COLORS[i % COLORS.length]}"></span>
        <span class="label">${escapeHTML(localizeTopic(t.key))}</span>
      </div>`).join('');
    if (single) {
      // Allow selecting topic/subtopic via legend chips when single-player
      topicLegend.querySelectorAll('.legend-item.clickable').forEach((el) => {
        el.addEventListener('click', () => {
          const key = el.getAttribute('data-key');
          if (!key) return;
          if (stage === 'topic') {
            send({ type: 'choose_topic', topicKey: key });
          } else if (stage === 'subtopic') {
            send({ type: 'choose_subtopic', subtopicKey: key });
          }
        });
      });
    }
  }

  function buildWheel() {
    // Ensure current sizing before building the canvas wheel
    ensureWheelSize();
    if (!wheelCanvas || !Array.isArray(topics) || topics.length === 0 || typeof Winwheel === 'undefined') return;
    const size = wheelCanvas.width || 320;
    let fontSize = size <= 280 ? 11 : size <= 320 ? 13 : size <= 360 ? 14 : 16;
    if (topics.length >= 14) fontSize -= 2;
    if (topics.length >= 18) fontSize -= 2;
    if (fontSize < 10) fontSize = 10;
    const segs = topics.map((t, i) => ({
      fillStyle: COLORS[i % COLORS.length],
      text: localizeTopic(t.key),
      textFillStyle: '#e5e7eb',
      textFontSize: fontSize,
    }));
    try {
      winWheel = new Winwheel({
        canvasId: 'wheelCanvas',
        numSegments: segs.length,
        segments: segs,
        outerRadius: Math.floor((wheelCanvas.width || 420) / 2) - 20,
        innerRadius: 12,
        textAlignment: 'outer',
        // Orient labels along the arc for readability
        textOrientation: 'tangent',
        pointerAngle: 0,
        animation: { type: 'spinToStop', duration: 2, spins: 5 },
      });
    } catch {}
  }

  function ensureWheelSize() {
    if (!wheelCanvas) return;
    const vw = Math.max(320, window.innerWidth || 800);
    const vh = Math.max(320, window.innerHeight || 600);
    // Mobile-friendly sizing: a bit smaller to leave room for controls
    const size = Math.max(220, Math.min(360, Math.floor(Math.min(vw * 0.72, vh * 0.44))));
    if (wheelCanvas.width !== size || wheelCanvas.height !== size) {
      wheelCanvas.width = size;
      wheelCanvas.height = size;
    }
    if (wheel) { wheel.style.width = size + 'px'; wheel.style.height = size + 'px'; }
  }

  window.addEventListener('resize', () => { ensureWheelSize(); if (hasWinwheel) buildWheel(); else updateWheelColors(); });
  window.addEventListener('resize', applyMobileView);

  function applyMobileView() {
    const rightPanel = document.getElementById('right');
    const leftPanel = document.getElementById('left');
    const isMobile = window.innerWidth <= 700;
    if (gameMode === 'single') {
      if (rightPanel) rightPanel.style.display = 'none';
      if (toggleViewBtn) toggleViewBtn.style.display = 'none';
      if (leftPanel) leftPanel.style.display = '';
      return;
    }
    // Duo mode
    if (!isMobile) {
      if (leftPanel) leftPanel.style.display = '';
      if (rightPanel) rightPanel.style.display = '';
      if (toggleViewBtn) toggleViewBtn.style.display = 'none';
    } else {
      if (toggleViewBtn) {
        toggleViewBtn.style.display = '';
        toggleViewBtn.textContent = mobileView === 'you' ? 'Ver oponente' : 'Ver tu vista';
      }
      if (leftPanel) leftPanel.style.display = (mobileView === 'you') ? '' : 'none';
      if (rightPanel) rightPanel.style.display = (mobileView === 'opponent') ? '' : 'none';
    }
  }

  if (toggleViewBtn) {
    toggleViewBtn.addEventListener('click', () => {
      mobileView = mobileView === 'you' ? 'opponent' : 'you';
      applyMobileView();
    });
  }

  if (playgroundBtn) {
    playgroundBtn.addEventListener('click', () => {
      send({ type: 'enter_playground' });
    });
  }
  // Favorites/Progress handlers moved to global inline handlers to avoid shadow/bubbling quirks

  // Inline onclick handlers are used instead for playground controls
  function setPgLoading(loading) {
    if (!pgSubmit) return;
    const label = nativeSelect?.value === 'Spanish' ? 'Enviar' : 'Submit';
    const sending = nativeSelect?.value === 'Spanish' ? 'Enviando…' : 'Sending…';
    if (loading) {
      pgSubmit.innerHTML = `<span class="btn-spinner"></span>${sending}`;
      pgSubmit.classList.add('btn-loading');
      pgSubmit.setAttribute('disabled','');
      if (pgMore) pgMore.setAttribute('disabled','');
      // Allow exiting the playground even while evaluating
    } else {
      pgSubmit.textContent = label;
      pgSubmit.classList.remove('btn-loading');
      pgSubmit.removeAttribute('disabled');
      if (pgMore) pgMore.removeAttribute('disabled');
    }
  }
  // Inline onclick handler is used for submit

  // Expose simple global handlers as a fail-safe for clicks
  window._pgEnter = () => { send({ type: 'enter_playground' }); };
  window._pgExit = () => {
    send({ type: 'exit_playground' });
    inPlayground = false;
    pgBlockOpenUntil = Date.now() + 1500;
    if (playgroundOverlay) playgroundOverlay.style.display = 'none';
    if (playgroundBtn) playgroundBtn.style.display = (gameMode === 'single') ? '' : 'none';
  };
  window._pgMore = () => { send({ type: 'playground_more' }); };
  window._pgSubmit = () => {
    if (pgSubmit?.disabled) return;
    const items = Array.from(document.querySelectorAll('.pg-item'));
    const answers = items.map((it) => ({ id: it.getAttribute('data-id'), answer: (it.querySelector('textarea')?.value || '').trim() }));
    setPgLoading(true);
    send({ type: 'playground_submit', answers });
  };
  window._pgAddNote = () => {
    const text = (pgNewNote?.value || '').trim();
    if (!text) return;
    send({ type: 'add_favorite_note', text });
    pgNewNote.value = '';
    send({ type: 'list_favorites' });
  };
  window._addFavMain = () => {
    const sel = (window.getSelection()?.toString() || '').trim();
    const text = sel || (yourPrompt?.textContent || '').trim();
    if (!text) return;
    send({ type: 'add_favorite_note', text });
    toast('⭐ Nota guardada', 'success');
  };
  window._favOpen = () => { send({ type: 'list_favorites' }); if (favoritesOverlay) favoritesOverlay.style.display = 'flex'; };
  window._favClose = () => { if (favoritesOverlay) favoritesOverlay.style.display = 'none'; };
  window._progOpen = () => { send({ type: 'playground_progress' }); if (progressOverlay) progressOverlay.style.display = 'flex'; };
  window._progClose = () => { if (progressOverlay) progressOverlay.style.display = 'none'; };
  window._pgProgress = () => { if (pgProgressBox) pgProgressBox.style.display = ''; send({ type: 'playground_progress' }); };

  // Robust delegated clicks for sl-button and nested elements
  // (Removed delegated handlers — using explicit onclick globals)

  if (addFavBtn) addFavBtn.addEventListener('click', () => {
    const sel = (window.getSelection()?.toString() || '').trim();
    const text = sel || (yourPrompt?.textContent || '').trim();
    if (!text) return;
    send({ type: 'add_favorite_note', text });
    toast('⭐ Nota guardada', 'success');
  });

  if (pgAddNote) pgAddNote.addEventListener('click', () => {
    const text = (pgNewNote?.value || '').trim();
    if (!text) return;
    send({ type: 'add_favorite_note', text });
    pgNewNote.value = '';
    send({ type: 'list_favorites' });
  });

  function renderFavorites(list) {
    if (!pgFavs) return;
    pgFavs.innerHTML = (list || []).map(f => `
      <div class="pg-fav" data-id="${f.id}">
        <div class="text">${escapeHTML(f.text)}</div>
        <div class="actions">
          <button data-action="practice">Practicar</button>
          <button data-action="delete">Eliminar</button>
        </div>
      </div>
    `).join('');
    pgFavs.querySelectorAll('.pg-fav').forEach((row) => {
      const id = row.getAttribute('data-id');
      row.querySelector('[data-action="practice"]').addEventListener('click', () => {
        send({ type: 'start_playground_note', id });
      });
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        send({ type: 'delete_favorite_note', id });
        send({ type: 'list_favorites' });
      });
    });
  }

  function renderFavoritesOverlay(list) {
    if (!favList) return;
    favList.innerHTML = (list || []).map(f => `
      <div class="pg-fav" data-id="${f.id}">
        <div class="text">${escapeHTML(f.text)}</div>
        <div class="actions">
          <button data-action="practice">Practicar</button>
          <button data-action="delete">Eliminar</button>
        </div>
      </div>
    `).join('');
    favList.querySelectorAll('.pg-fav').forEach((row) => {
      const id = row.getAttribute('data-id');
      row.querySelector('[data-action="practice"]').addEventListener('click', () => {
        send({ type: 'start_playground_note', id });
        if (favoritesOverlay) favoritesOverlay.style.display = 'none';
      });
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        send({ type: 'delete_favorite_note', id });
        send({ type: 'list_favorites' });
      });
    });
  }

  function renderPlayground(exercises) {
    if (!pgList) return;
    pgList.innerHTML = exercises.map((ex) => `
      <div class="pg-item" data-id="${ex.id}">
        <h4>${escapeHTML(ex.title || ex.kind || 'Ejercicio')}</h4>
        <div class="muted">${escapeHTML(ex.prompt || '')}</div>
        ${renderSynonyms(ex)}
        <textarea placeholder="Tu respuesta..."></textarea>
        <div class="pg-feedback"></div>
      </div>
    `).join('');
    // Wire chips to insert text
    pgList.querySelectorAll('.pg-item').forEach((it) => {
      const ta = it.querySelector('textarea');
      it.querySelectorAll('.pg-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const value = chip.getAttribute('data-word') || '';
          insertAtCursor(ta, value);
          ta.focus();
        });
      });
    });
  }

  function renderSynonyms(ex) {
    const syns = Array.isArray(ex.synonyms) ? ex.synonyms : [];
    if (!syns.length) return '';
    const nat = (nativeSelect?.value || 'Spanish');
    const es = nat === 'Spanish';
    const label = es ? 'Sugerencias de sinónimos' : 'Synonym suggestions';
    const chips = syns.map(pair => {
      const term = escapeHTML(pair.term);
      const opts = (pair.options || []).slice(0,3).map(o => `<span class="pg-chip" data-word="${escapeHTML(o)}">${escapeHTML(o)}</span>`).join('');
      return `<div class="pg-syns"><span class="muted">${label} (${term}):</span> ${opts}</div>`;
    }).join('');
    return chips;
  }

  function updateExerciseSynonyms(id, syns) {
    const it = document.querySelector(`.pg-item[data-id="${id}"]`);
    if (!it) return;
    // Remove previous synonym blocks
    it.querySelectorAll('.pg-syns').forEach(n => n.remove());
    const html = renderSynonyms({ synonyms: syns });
    if (!html) return;
    const ta = it.querySelector('textarea');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    it.insertBefore(wrapper, ta);
    // Wire new chips
    wrapper.querySelectorAll('.pg-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const value = chip.getAttribute('data-word') || '';
        insertAtCursor(ta, value);
        ta.focus();
      });
    });
  }

  function insertAtCursor(textarea, text) {
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const spaceBefore = before && !/\s$/.test(before) ? ' ' : '';
    const spaceAfter = after && !/^\s/.test(after) ? ' ' : '';
    textarea.value = before + spaceBefore + text + spaceAfter + after;
    const pos = (before + spaceBefore + text).length;
    textarea.setSelectionRange(pos, pos);
  }

  // Allow Esc to exit playground quickly
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && inPlayground) {
      if (pgExit) pgExit.click();
    }
  });

  function updateWheelColors() {
    // Ensure fallback CSS wheel is sized correctly as well
    ensureWheelSize();
    if (!wheel || !Array.isArray(topics) || topics.length === 0) return;
    const n = topics.length;
    const angle = 360 / n;
    const segments = topics.map((t, i) => {
      const a0 = i * angle;
      const a1 = (i + 1) * angle;
      const color = COLORS[i % COLORS.length];
      return `${color} ${a0}deg ${a1}deg`;
    });
    wheel.style.background = `conic-gradient(${segments.join(',')})`;
  }

  function localizeTopic(key) {
    const t = (topics || []).find((x) => x.key === key);
    if (!t) return key;
    return t.labels?.[nativeLanguage] || key;
  }

  function escapeHTML(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function startCooldown(endsAt) {
    cooldownEndsAt = endsAt;
    cooldownBox.style.display = 'inline-flex';
    updateCooldownLabel();
    if (cooldownTimer) clearInterval(cooldownTimer);
    skipBtn.disabled = false;
    cooldownTimer = setInterval(updateCooldownLabel, 250);
  }

  function stopCooldown() {
    if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
    cooldownEndsAt = null;
    cooldownBox.style.display = 'none';
    skipBtn.disabled = false;
  }

  function updateCooldownLabel() {
    if (!cooldownEndsAt) return;
    const ms = Math.max(0, cooldownEndsAt - Date.now());
    const sec = Math.ceil(ms / 1000);
    cooldownLabel.textContent = `Tiempo de repaso: ${sec}s`;
    if (ms <= 0) stopCooldown();
  }
// keep IIFE open; auth helpers below will run in same scope
  // Load Google login button if configured
  initGoogleLogin();
  checkSession();

  async function initGoogleLogin() {
    const es = (nativeSelect?.value === 'Spanish');
    function showGateWithMsg(msg) {
      if (authGate) authGate.style.display = 'flex';
      if (overlay) overlay.style.display = 'none';
      if (loginStatus && msg) loginStatus.textContent = msg;
    }
    try {
      const cfg = await fetch('/config.json').then(r => r.json()).catch(() => ({}));
      if (!cfg.googleClientId) {
        showGateWithMsg(es ? 'Google Client ID no configurado. Define GOOGLE_CLIENT_ID en .env.' : 'Google Client ID not configured. Set GOOGLE_CLIENT_ID in .env.');
        return;
      }
      // If no session, show gate immediately while loading GIS
      const me = await fetch('/auth/me').then(r=>r.json()).catch(()=>({ok:false}));
      if (!me.ok) showGateWithMsg(es ? 'Inicia sesión con Google para continuar.' : 'Sign in with Google to continue.');

      try {
        await loadScript('https://accounts.google.com/gsi/client');
      } catch (e) {
        showGateWithMsg(es ? 'No se pudo cargar Google. Desactiva bloqueadores y recarga.' : 'Failed to load Google. Disable blockers and reload.');
        return;
      }

      if (window.google && gLogin) {
        try {
          window.google.accounts.id.initialize({
            client_id: cfg.googleClientId,
            callback: handleGoogleCredential,
          });
          window.google.accounts.id.renderButton(gLogin, { theme: 'outline', size: 'large' });
        } catch (e) {
          showGateWithMsg(es ? 'No se pudo inicializar el botón de Google.' : 'Could not initialize Google button.');
          return;
        }
        // Verify button rendered; if not, likely 403 due to origin mismatch
        setTimeout(() => {
          try {
            if (!gLogin.firstChild) {
              const diag = `origin=${location.origin} • client_id=${cfg.googleClientId}`;
              const msg = es
                ? `No se pudo mostrar el botón (403). Revisa orígenes autorizados en Google Cloud (debe incluir exactamente ${location.origin}). Detalles: ${diag}`
                : `Button failed to render (403). Check authorized JavaScript origins in Google Cloud (must include exactly ${location.origin}). Details: ${diag}`;
              showGateWithMsg(msg);
            }
          } catch {}
        }, 700);
      } else {
        showGateWithMsg(es ? 'Google no está disponible en esta página.' : 'Google is not available on this page.');
      }
    } catch (e) {
      showGateWithMsg(es ? 'Error de autenticación. Recarga la página.' : 'Auth error. Reload the page.');
    }
  }

  async function checkSession() {
    try {
      const r = await fetch('/auth/me');
      const data = await r.json();
      if (data.ok && data.user) {
        if (loginStatus) loginStatus.textContent = (nativeSelect?.value === 'Spanish') ? `Conectado como ${data.user?.name || ''}` : `Signed in as ${data.user?.name || ''}`;
        if (nameInput && data.user?.name) nameInput.value = data.user.name;
        if (authGate) authGate.style.display = 'none';
        if (overlay) overlay.style.display = 'flex';
        // Toggle profile UI
        if (userProfile) userProfile.style.display = '';
        if (nameRow) nameRow.style.display = 'none';
        if (userName) userName.textContent = data.user?.name || '';
        if (userAvatar && data.user?.picture) userAvatar.src = data.user.picture;
        if (logoutBtn) logoutBtn.textContent = (nativeSelect?.value === 'Spanish') ? 'Cerrar sesión' : 'Sign out';
        if (switchBtn) switchBtn.textContent = (nativeSelect?.value === 'Spanish') ? 'Cambiar de cuenta' : 'Switch account';
        lastUserEmail = data.user?.email || '';
      }
    } catch {}
  }

  async function handleGoogleCredential(resp) {
    try {
      const r = await fetch('/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: resp.credential }) });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || 'Login failed');
      if (loginStatus) loginStatus.textContent = (nativeSelect?.value === 'Spanish') ? `Conectado como ${data.user?.name || ''}` : `Signed in as ${data.user?.name || ''}`;
      // Prefill name input
      if (nameInput && data.user?.name) nameInput.value = data.user.name;
      if (nameInput) lsSet(LS.name, nameInput.value.trim());
      if (authGate) authGate.style.display = 'none';
      if (overlay) overlay.style.display = 'flex';
      // Toggle profile UI
      if (userProfile) userProfile.style.display = '';
      if (nameRow) nameRow.style.display = 'none';
      if (userName) userName.textContent = data.user?.name || '';
      if (userAvatar && data.user?.picture) userAvatar.src = data.user.picture;
      if (logoutBtn) logoutBtn.textContent = (nativeSelect?.value === 'Spanish') ? 'Cerrar sesión' : 'Sign out';
      if (switchBtn) switchBtn.textContent = (nativeSelect?.value === 'Spanish') ? 'Cambiar de cuenta' : 'Switch account';
      lastUserEmail = data.user?.email || '';
    } catch (e) {
      if (loginStatus) loginStatus.textContent = (nativeSelect?.value === 'Spanish') ? 'Error al iniciar sesión' : 'Login error';
    }
  }

  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch {}
    // Reset UI to auth gate
    if (userProfile) userProfile.style.display = 'none';
    if (nameRow) nameRow.style.display = '';
    if (userName) userName.textContent = '';
    if (userAvatar) userAvatar.removeAttribute('src');
    if (authGate) authGate.style.display = 'flex';
    if (overlay) overlay.style.display = 'none';
    if (loginStatus) loginStatus.textContent = (nativeSelect?.value === 'Spanish') ? 'Sesión cerrada' : 'Signed out';
  });

  if (switchBtn) switchBtn.addEventListener('click', async () => {
    try { await fetch('/auth/logout', { method: 'POST' }); } catch {}
    // Ask GIS to forget auto-select and prompt account chooser
    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
        if (lastUserEmail) {
          // Revoke consent to ensure account selection next time
          window.google.accounts.id.revoke(lastUserEmail, () => {});
        }
      }
    } catch {}
    // Reset UI to gate
    if (userProfile) userProfile.style.display = 'none';
    if (nameRow) nameRow.style.display = '';
    if (userName) userName.textContent = '';
    if (userAvatar) userAvatar.removeAttribute('src');
    if (authGate) authGate.style.display = 'flex';
    if (overlay) overlay.style.display = 'none';
    if (loginStatus) loginStatus.textContent = (nativeSelect?.value === 'Spanish') ? 'Elige tu cuenta de Google' : 'Choose your Google account';
    // Optional: display One Tap prompt (if enabled by Google)
    try { if (window.google?.accounts?.id) window.google.accounts.id.prompt(); } catch {}
  });

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = src; s.async = true; s.defer = true;
      s.onload = () => resolve(); s.onerror = reject; document.head.appendChild(s);
    });
  }
})();
