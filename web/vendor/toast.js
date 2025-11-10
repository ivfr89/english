(function(){
  const root = document.createElement('div');
  root.className = 'toast-root';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(root));

  function show(message, opts={}){
    const variant = opts.variant || 'primary';
    const title = opts.title || '';
    const ms = Number(opts.duration || 2600);
    const el = document.createElement('div');
    el.className = `toast ${variant}`;
    el.innerHTML = `${title ? `<div class="title">${escape(title)}</div>` : ''}<div>${escape(message)}</div>`;
    const close = document.createElement('span');
    close.className = 'close';
    close.textContent = '×';
    close.addEventListener('click', () => dismiss());
    el.prepend(close);
    root.appendChild(el);
    let timer = setTimeout(() => dismiss(), ms);
    function dismiss(){
      if (!el.parentNode) return;
      clearTimeout(timer);
      el.style.transition = 'opacity .2s ease';
      el.style.opacity = '0';
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
    }
    return { dismiss };
  }
  function escape(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  window.Toast = { show };
})();
