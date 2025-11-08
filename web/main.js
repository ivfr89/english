(() => {
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);

  // UI refs
  const el = (id) => document.getElementById(id);
  const overlay = el('overlay');
  const nameInput = el('name');
  const langSelect = el('language');
  const nativeSelect = el('native');
  const createBtn = el('createRoom');
  const joinBtn = el('joinRoom');
  const roomCodeInput = el('roomCode');
  const status = el('status');

  const roomLabel = el('roomLabel');
  const roundLabel = el('roundLabel');
  const lifeYou = el('lifeYou');
  const lifeOpp = el('lifeOpp');
  const yourPrompt = el('yourPrompt');
  const oppPrompt = el('oppPrompt');
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

  // Spinner UI
  const spinnerOverlay = el('spinnerOverlay');
  const spinBtn = el('spinBtn');
  const wheel = el('wheel');
  const turnLabel = el('turnLabel');
  const topicLegend = el('topicLegend');

  let playerId = null;
  let roomCode = null;
  let prompts = {};
  let topics = [];
  let nativeLanguage = 'Spanish';
  const COLORS = ['#22d3ee', '#0ea5e9', '#f472b6', '#a78bfa', '#34d399', '#fca5a5'];
  let stage = 'topic';
  let cooldownTimer = null;
  let cooldownEndsAt = null;

  function send(obj) { ws.send(JSON.stringify(obj)); }

  ws.addEventListener('open', () => { status.textContent = ''; });

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'error') status.textContent = msg.error;

    if (msg.type === 'room_created') {
      playerId = msg.playerId; roomCode = msg.roomCode;
      overlay.style.display = 'none';
      roomLabel.textContent = `Room: ${roomCode}`;
      info.textContent = 'Share the room code with your friend.';
    }

    if (msg.type === 'room_joined') {
      playerId = msg.playerId; roomCode = msg.roomCode;
      overlay.style.display = 'none';
      roomLabel.textContent = `Room: ${roomCode}`;
      info.textContent = 'Opponent connected. Get ready!';
    }

    if (msg.type === 'state') {
      roomCode = msg.roomCode || roomCode;
      roomLabel.textContent = `Room: ${roomCode || '-'}`;
      roundLabel.textContent = `Round: ${msg.round}`;
      prompts = msg.prompts || prompts;
      const mePrompt = prompts[playerId];
      const opPrompt = prompts[playerId === 'p1' ? 'p2' : 'p1'];
      const generating = msg.status === 'playing' && (!mePrompt || !opPrompt);
      yourPrompt.textContent = mePrompt || (generating ? 'Generando enunciado...' : 'Waiting...');
      oppPrompt.textContent = opPrompt || (generating ? 'Generando enunciado...' : 'Waiting...');
      if (Array.isArray(msg.topics)) { topics = msg.topics; renderLegend(); updateWheelColors(); }
      if (msg.players) {
        const me = msg.players.find((p) => p.id === playerId);
        const op = msg.players.find((p) => p.id !== playerId);
        lifeYou.style.width = `${me?.life ?? 100}%`;
        lifeOpp.style.width = `${op?.life ?? 100}%`;
        renderCards(me?.cards || [], op?.cards || []);
        aiAssistBtn.disabled = !me?.aiAssistReady;
      }
      if (msg.status === 'finished') submit.disabled = true;
      if (Array.isArray(msg.history)) renderHistory(msg.history);
      if ((msg.status === 'waiting_spin' || msg.status === 'waiting_subspin') && msg.turn) setTurn(msg.turn);
      if (!(msg.status === 'waiting_spin' || msg.status === 'waiting_subspin' || msg.status === 'spinning')) spinnerOverlay.style.display = 'none';
      if (msg.status === 'cooldown' && msg.cooldownEndsAt) startCooldown(msg.cooldownEndsAt);
      if (msg.status !== 'cooldown') stopCooldown();
    }

    if (msg.type === 'turn') {
      if (Array.isArray(msg.topics)) { topics = msg.topics; renderLegend(); updateWheelColors(); }
      if (msg.stage) stage = msg.stage;
      setTurn(msg.playerId);
    }

    if (msg.type === 'spin_start') {
      if (Array.isArray(msg.topics)) { topics = msg.topics; renderLegend(); updateWheelColors(); }
      if (msg.stage) stage = msg.stage;
      spinnerOverlay.style.display = 'flex';
      spinBtn.disabled = true;
      // Reset rotation then animate to target
      wheel.style.transition = 'none';
      wheel.style.transform = 'rotate(0deg)';
      void wheel.offsetWidth;
      wheel.style.transition = 'transform 2s cubic-bezier(.2,.8,.2,1)';
      const target = msg.rotations * 360 + msg.finalAngle;
      wheel.style.transform = `rotate(${target}deg)`;
      info.textContent = `${stage === 'subtopic' ? 'Subtema' : 'Tema'} seleccionado: ${localizeTopic(msg.topicKey)}`;
      // Only hide overlay automatically after subtopic spin.
      const spinStage = msg.stage || stage;
      setTimeout(() => {
        if (spinStage === 'subtopic') spinnerOverlay.style.display = 'none';
      }, 2300);
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
      yourPrompt.textContent = 'Generando enunciado...'; yourPrompt.classList.add('fade-in');
      oppPrompt.textContent = 'Generando enunciado...'; oppPrompt.classList.add('fade-in');
      submit.disabled = true;
      aiAssistBtn.disabled = true;
      info.textContent = `Tema: ${localizeTopic(msg.category)}${msg.subtopic ? ' • ' + localizeTopic(msg.subtopic) : ''}`;
      spinnerOverlay.style.display = 'none';
    }

    if (msg.type === 'prompts_ready') {
      prompts = msg.prompts || {};
      yourPrompt.textContent = prompts[playerId] || 'Waiting...'; yourPrompt.classList.add('fade-in');
      oppPrompt.textContent = prompts[playerId === 'p1' ? 'p2' : 'p1'] || 'Waiting...'; oppPrompt.classList.add('fade-in');
      info.textContent = `¡Listo! ${msg.subtopic ? 'Subtema' : 'Tema'}: ${localizeTopic(msg.category)}${msg.subtopic ? ' • ' + localizeTopic(msg.subtopic) : ''}. Responde para atacar.`;
      submit.disabled = false;
      // aiAssistBtn may be enabled if a card was played
      spinnerOverlay.style.display = 'none';
    }

    if (msg.type === 'answer_received') {
      if (msg.playerId !== playerId) info.textContent = 'Opponent answered.';
    }

    if (msg.type === 'evaluating') {
      info.textContent = 'Evaluating answers...';
      yourFeedback.textContent = 'Evaluating...'; yourFeedback.classList.add('fade-in');
      oppFeedback.textContent = 'Evaluating...'; oppFeedback.classList.add('fade-in');
      submit.disabled = true;
      spinnerOverlay.style.display = 'none';
    }

    if (msg.type === 'round_result') {
      const resMe = msg.results[playerId];
      const resOp = msg.results[playerId === 'p1' ? 'p2' : 'p1'];
      yourFeedback.textContent = `Score: ${resMe.score}\n${resMe.feedback}${resMe.corrections ? `\nCorrections: ${resMe.corrections}` : ''}`; yourFeedback.classList.add('fade-in');
      oppFeedback.textContent = `Score: ${resOp.score}\n${resOp.feedback}${resOp.corrections ? `\nCorrections: ${resOp.corrections}` : ''}`; oppFeedback.classList.add('fade-in');
      const meLife = msg.lives[playerId];
      const opLife = msg.lives[playerId === 'p1' ? 'p2' : 'p1'];
      lifeYou.style.width = `${meLife}%`;
      lifeOpp.style.width = `${opLife}%`;
      const dmgMe = msg.damage ? (msg.damage[playerId] || 0) : 0;
      const dmgOp = msg.damage ? (msg.damage[playerId === 'p1' ? 'p2' : 'p1'] || 0) : 0;
      if (dmgMe > 0) { lifeYou.classList.add('hit'); setTimeout(() => lifeYou.classList.remove('hit'), 500); }
      if (dmgOp > 0) { lifeOpp.classList.add('hit'); setTimeout(() => lifeOpp.classList.remove('hit'), 500); }
      submit.disabled = true;
      aiAssistBtn.disabled = true;
      if (msg.results && prompts) {
        const items = [];
        const meId = playerId;
        const opId = playerId === 'p1' ? 'p2' : 'p1';
        items.push({ round: msg.round, playerId: meId, prompt: prompts[meId] || '', answer: yourAnswer.value.trim(), score: msg.results[meId]?.score || 0, feedback: msg.results[meId]?.feedback || '', corrections: msg.results[meId]?.corrections || null });
        items.push({ round: msg.round, playerId: opId, prompt: prompts[opId] || '', answer: '(oculto)', score: msg.results[opId]?.score || 0, feedback: msg.results[opId]?.feedback || '', corrections: msg.results[opId]?.corrections || null });
        renderHistoryMerge(items);
      }
    }

    if (msg.type === 'game_over') {
      const win = msg.winner === playerId;
      info.textContent = win ? 'You win! 🎉' : 'You lost. 🥲';
      submit.disabled = true;
    }

    if (msg.type === 'opponent_disconnected') {
      info.textContent = 'Opponent disconnected.';
      submit.disabled = true;
    }

    if (msg.type === 'cards_granted') {
      info.textContent = '¡Has recibido una carta!';
    }
    if (msg.type === 'card_used') {
      if (msg.effect === 'heal_small') info.textContent = 'Usaste Cura (+10)';
    }
    if (msg.type === 'prompt_updated') {
      if (msg.playerId === playerId) { yourPrompt.textContent = msg.prompt; yourPrompt.classList.add('fade-in'); }
      else { oppPrompt.textContent = msg.prompt; oppPrompt.classList.add('fade-in'); }
    }
    if (msg.type === 'ai_assist_ready') {
      if (msg.playerId === playerId) { aiAssistBtn.disabled = false; info.textContent = 'AI Assist listo para este turno.'; }
    }
    if (msg.type === 'ai_answer') {
      if (msg.playerId === playerId) {
        yourAnswer.value = msg.text;
        yourAnswer.classList.add('fade-in');
      }
    }
  });

  createBtn.addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Player';
    const learningLanguage = langSelect.value;
    nativeLanguage = nativeSelect.value;
    send({ type: 'create_room', name, learningLanguage, nativeLanguage });
    status.textContent = 'Creating room...';
  });

  joinBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!code) { status.textContent = 'Enter a room code.'; return; }
    const name = nameInput.value.trim() || 'Player';
    const learningLanguage = langSelect.value;
    nativeLanguage = nativeSelect.value;
    send({ type: 'join_room', roomCode: code, name, learningLanguage, nativeLanguage });
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

  spinBtn.addEventListener('click', () => {
    spinBtn.disabled = true;
    send({ type: 'spin' });
  });

  function setTurn(pid) {
    const mine = pid === playerId;
    const what = stage === 'subtopic' ? 'Subtema' : 'Tema';
    turnLabel.textContent = mine ? `Tu turno: elige ${what}` : `Turno del oponente: elige ${what}`;
    spinnerOverlay.style.display = 'flex';
    spinBtn.disabled = !mine;
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

  function renderCards(mine, opp) {
    yourCards.innerHTML = (mine || []).map((c) => `<button class="card-btn" data-id="${c.id}">${escapeHTML(c.label)}</button>`).join('');
    oppCards.innerHTML = (opp || []).map((c) => `<span class="card-btn" disabled>${escapeHTML(c.label)}</span>`).join('');
    yourCards.querySelectorAll('button.card-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cardId = btn.getAttribute('data-id');
        send({ type: 'use_card', cardId });
      });
    });
  }

  function toHistoryHTML(x) {
    const title = `Ronda ${x.round} • Puntuación ${x.score}`;
    const corr = x.corrections ? `\nSugerencias: ${escapeHTML(x.corrections)}` : '';
    return `
      <details class="history-item" open>
        <summary>${escapeHTML(title)} <span class="tag">${x.language || ''}</span></summary>
        <div class="content">
          <div><strong>Enunciado:</strong> ${escapeHTML(x.prompt || '')}</div>
          <div style="margin-top:6px"><strong>Tu respuesta:</strong><br/>${escapeHTML(x.answer || '')}</div>
          <div style="margin-top:6px"><strong>Mejoras IA:</strong><br/>${escapeHTML(x.feedback || '')}${corr}</div>
        </div>
      </details>
    `;
  }

  function renderLegend() {
    if (!Array.isArray(topics) || topics.length === 0) { topicLegend.innerHTML = ''; return; }
    topicLegend.innerHTML = topics.map((t, i) => `
      <div class="legend-item">
        <span class="swatch" style="background:${COLORS[i % COLORS.length]}"></span>
        <span class="label">${escapeHTML(localizeTopic(t.key))}</span>
      </div>`).join('');
  }

  function updateWheelColors() {
    if (!Array.isArray(topics) || topics.length === 0) return;
    const n = topics.length;
    const angle = 360 / n;
    const segments = topics.map((_, i) => {
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
})();
