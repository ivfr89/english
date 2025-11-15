(function(){
  class Winwheel {
    constructor(opts){
      this.canvasId = opts.canvasId;
      this.canvas = document.getElementById(this.canvasId);
      if (!this.canvas) throw new Error('Winwheel: canvas not found');
      // HiDPI scale
      const dpr = (window.devicePixelRatio || 1);
      const w = this.canvas.width;
      const h = this.canvas.height;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx = this.canvas.getContext('2d');
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = w;
      this.height = h;
      this.centerX = this.width/2;
      this.centerY = this.height/2;
      this.numSegments = opts.numSegments || (opts.segments ? opts.segments.length : 0);
      this.segments = opts.segments || [];
      this.outerRadius = opts.outerRadius || Math.min(this.width, this.height)/2 - 10;
      this.innerRadius = opts.innerRadius || 0;
      this.textAlignment = opts.textAlignment || 'outer';
      // Support simple text orientation modes: 'tangent' (along arc), 'radial' (from center out), 'horizontal' (page horizontal)
      this.textOrientation = opts.textOrientation || 'tangent';
      this.pointerAngle = opts.pointerAngle || 0;
      this.rotationAngle = 0; // degrees
      this.animation = opts.animation || { type: 'spinToStop', duration: 2, spins: 5, stopAngle: 0 };
      this._raf = null;
      this.draw();
    }
    _deg2rad(d){ return d * Math.PI / 180; }
    stopAnimation(){ if (this._raf){ cancelAnimationFrame(this._raf); this._raf = null; } }
    draw(){
      const ctx = this.ctx;
      ctx.clearRect(0,0,this.width,this.height);
      ctx.save();
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this._deg2rad(this.rotationAngle));
      const segAngle = 2*Math.PI / Math.max(1, this.numSegments);
      // outer rim
      ctx.beginPath();
      ctx.arc(0,0,this.outerRadius+3,0,2*Math.PI,false);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 6;
      ctx.stroke();
      // segments
      for (let i=0;i<this.numSegments;i++){
        const seg = this.segments[i] || {};
        const a0 = i*segAngle;
        const a1 = (i+1)*segAngle;
        // segment fill
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.arc(0,0,this.outerRadius,a0,a1,false);
        ctx.closePath();
        ctx.fillStyle = seg.fillStyle || '#444';
        ctx.fill();
        // divider
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.arc(0,0,this.outerRadius,a0,a0+0.002,false);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // inner hole
        if (this.innerRadius>0){
          ctx.save();
          ctx.globalCompositeOperation='destination-out';
          ctx.beginPath();
          ctx.arc(0,0,this.innerRadius,0,2*Math.PI,false);
          ctx.fill();
          ctx.restore();
        }
        // text
        const rawLabel = String(seg.text||'');
        if (rawLabel){
          ctx.save();
          const mid = a0 + (a1-a0)/2;
          const r = this.outerRadius - 26;
          const arcAngle = (a1 - a0);
          // Available width along the arc (approximate straight projection)
          const maxWidth = Math.max(18, r * arcAngle - 10);
          ctx.rotate(mid);
          ctx.translate(r,0);
          if (this.textOrientation === 'tangent') {
            ctx.rotate(Math.PI/2);
          } else if (this.textOrientation === 'horizontal') {
            ctx.rotate(-mid);
          } else {
            // 'radial' or unknown: leave baseline along radius
          }
          ctx.fillStyle = seg.textFillStyle || '#e5e7eb';
          const fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
          let fs = Number(seg.textFontSize||14);
          if (!Number.isFinite(fs) || fs <= 0) fs = 14;
          ctx.textAlign = 'center';
          // Shrink to fit
          ctx.font = `${fs}px ${fontFamily}`;
          let label = rawLabel;
          let w = ctx.measureText(label).width;
          while (w > maxWidth && fs > 9){
            fs -= 1;
            ctx.font = `${fs}px ${fontFamily}`;
            w = ctx.measureText(label).width;
          }
          // If still too wide at min size, ellipsize progressively
          if (w > maxWidth){
            const ell = '…';
            // Reserve width for ellipsis
            const ellW = ctx.measureText(ell).width;
            let cut = label.length;
            while (cut > 1 && (ctx.measureText(label.slice(0, cut)).width + ellW) > maxWidth){
              cut -= 1;
            }
            label = cut > 1 ? (label.slice(0, cut) + ell) : '';
          }
          if (label){
            ctx.fillText(label, 0, 4);
          }
          ctx.restore();
        }
      }
      // center hub
      ctx.beginPath();
      ctx.arc(0,0,this.innerRadius+14,0,2*Math.PI,false);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();
      ctx.restore();
    }
    startAnimation(){
      const anim = this.animation || {};
      const duration = Math.max(0.2, Number(anim.duration)||2)*1000;
      const spins = Math.max(0, Number(anim.spins)||5);
      const stopAngle = Number(anim.stopAngle)||0;
      const start = performance.now();
      const from = this.rotationAngle;
      // rotate clockwise to desired stop angle + spins
      const to = from + spins*360 + (stopAngle - (from%360));
      const easeOut = (t)=>1 - Math.pow(1-t, 3);
      const step = (now)=>{
        const p = Math.min(1, (now-start)/duration);
        const v = from + (to-from)*easeOut(p);
        this.rotationAngle = v;
        this.draw();
        if (p<1){ this._raf = requestAnimationFrame(step); }
        else { this._raf = null; if (typeof anim.callbackFinished==='function') anim.callbackFinished(); }
      };
      this.stopAnimation();
      this._raf = requestAnimationFrame(step);
    }
  }
  window.Winwheel = Winwheel;
})();
