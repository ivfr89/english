(function(){
  function upgradeProgress(el){
    if (el.__shimmed) return;
    el.__shimmed = true;
    const bar = document.createElement('div');
    bar.className = 'bar';
    el.appendChild(bar);
    const set = (v) => { const n = Math.max(0, Math.min(100, Number(v)||0)); bar.style.width = n + '%'; };
    const desc = Object.getOwnPropertyDescriptor(el.__proto__,'value');
    Object.defineProperty(el,'value',{
      get(){ return Number(el.getAttribute('value')||0); },
      set(v){ el.setAttribute('value', v); set(v); }
    });
    const obs = new MutationObserver(() => set(el.getAttribute('value')));
    obs.observe(el,{attributes:true, attributeFilter:['value']});
    set(el.getAttribute('value'));
  }
  function ready(){
    document.querySelectorAll('sl-progress-bar').forEach(upgradeProgress);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
