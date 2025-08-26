import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

function randNoise(x, y, t) {
  // simple hash noise for speckle
  const n = Math.sin((x*127.1 + y*311.7 + t*13.13)) * 43758.5453;
  return (n - Math.floor(n));
}

function drawSpeckle(ctx, w, h, gain, t) {
  const img = ctx.getImageData(0,0,w,h);
  const d = img.data;
  for (let y=0; y<h; y+=2) {
    for (let x=0; x<w; x+=2) {
      const idx = (y*w + x)*4;
      const v = Math.pow(randNoise(x*0.9, y*0.8, t*0.8), 1.8) * 255 * gain * 0.6;
      d[idx] = d[idx+1] = d[idx+2] = (d[idx] + v)|0;
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(img,0,0);
}

function chamberPath(ctx, cx, cy, rx, ry) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
  ctx.restore();
}

function drawLabel(ctx, text, x, y) {
  ctx.save();
  ctx.fillStyle = '#c9d3ff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawColorJet(ctx, pts, phase, dir, strength) {
  // pts: array of points defining jet path
  const len = pts.length;
  for (let i=0;i<len-1;i++){
    const p = pts[i];
    const n = pts[i+1];
    const t = (i/len + phase*0.8) % 1;
    const col = dir === 'toProbe' ? [60, 140, 255] : dir === 'fromProbe' ? [255, 80, 60] : (i%2? [255,80,60]:[60,140,255]);
    const alpha = 0.2 + 0.5*strength;
    ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
    ctx.lineWidth = 6*strength*(0.5+0.5*Math.sin(phase*6+i));
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(n.x, n.y);
    ctx.stroke();
  }
}

function rotatePoint(px, py, cx, cy, ang){
  const s = Math.sin(ang), c = Math.cos(ang);
  const dx = px - cx, dy = py - cy;
  return { x: cx + dx*c - dy*s, y: cy + dx*s + dy*c };
}

const SimulatorCanvas = forwardRef(function SimulatorCanvas(props, ref){
  const { currentCase, view, depth, gain, angle, colorDoppler, paused, measureMode, onMeasurement, mLineX } = props;
  const canvasRef = useRef(null);
  const [size, setSize] = useState({w: 800, h: 520});
  const [clicks, setClicks] = useState([]);

  useEffect(() => {
    const el = canvasRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio||1, 2);
      el.width = rect.width*dpr;
      el.height = rect.height*dpr;
      setSize({ w: el.width, h: el.height, dpr });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf;
    let start = performance.now();
    const loop = (ts) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) { raf = requestAnimationFrame(loop); return; }
      const { w, h } = size;
      const t = (ts-start)/1000;
      ctx.clearRect(0,0,w,h);

      // Ultrasound sector
      const cx = 0.12*w; // probe position left top
      const cy = 0.1*h;
      const sectorR = Math.min(w*0.95, h*1.2);
      const opening = Math.PI*0.85; // sector width
      const angOffset = (-Math.PI/2 + 0.15) + angle*Math.PI/180;

      // sector mask
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, sectorR, angOffset-opening/2, angOffset+opening/2);
      ctx.closePath();
      ctx.clip();

      // base background gradient
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, sectorR);
      g.addColorStop(0, '#0f111a');
      g.addColorStop(1, '#05060a');
      ctx.fillStyle = g;
      ctx.fillRect(0,0,w,h);

      // dynamic heart model parameters
      const bpm = currentCase.hr || 130;
      const phase = paused ? 0 : (t * bpm/60) % 1;
      const beat = 0.85 + 0.15*Math.sin(phase*2*Math.PI);

      // scale by depth (simple linear mm/px scale ~ 0.2*depth)
      const scale = 1.2 / (depth/6);

      // Base view center in sector coordinates
      let vx = cx + Math.cos(angOffset+0.22)*sectorR*0.55;
      let vy = cy + Math.sin(angOffset+0.22)*sectorR*0.55;

      // draw heart simplified depending on view
      ctx.save();
      // Transform to approximate view alignment
      ctx.translate(vx, vy);
      ctx.rotate(angOffset - Math.PI/2);
      ctx.scale(scale, scale);

      // Speckle pre-pass on small offscreen and draw later
      // Chambers (very simplified ovals)
      const base = 70*beat;
      const rv = { x: -70, y: 10, rx: base*0.7, ry: base*0.5 };
      const lv = { x:  20, y:  0, rx: base*0.95, ry: base*0.65 };
      const ra = { x: -80, y: -60, rx: base*0.55, ry: base*0.4 };
      const la = { x:   5, y: -60, rx: base*0.6, ry: base*0.42 };

      // Shape tuning per view
      if (view === 'PSAX') {
        lv.rx = base*0.8; lv.ry = base*0.8; lv.x = 0; lv.y = 0;
        rv.x = -lv.rx*1.2; rv.ry = base*0.5; rv.rx = base*0.6; rv.y = 0;
        ra.ry *= 0.4; la.ry *= 0.4;
      } else if (view === 'A4C') {
        lv.y += 10; rv.y += 10; ra.y -= 10; la.y -= 10;
        lv.x += 10; rv.x -= 20;
      }

      // Myocardium outline
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(200,210,230,0.35)';
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ;[lv, rv, la, ra].forEach(ch => {
        ctx.beginPath(); ctx.ellipse(ch.x, ch.y, ch.rx, ch.ry, 0, 0, Math.PI*2); ctx.stroke(); ctx.fill();
      });

      // Valve lines (mitral, tricuspid, aortic/pulmonic in PSAX)
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(220,230,255,0.35)';
      if (view === 'PLAX') {
        ctx.beginPath(); ctx.moveTo(lv.x- lv.rx*0.2, lv.y- lv.ry*0.6); ctx.lineTo(la.x+ la.rx*0.2, la.y+ la.ry*0.6); ctx.stroke(); // mitral
        ctx.beginPath(); ctx.moveTo(rv.x+ rv.rx*0.2, rv.y- rv.ry*0.5); ctx.lineTo(ra.x+ ra.rx*0.5, ra.y+ ra.ry*0.5); ctx.stroke(); // tricuspid
        // aortic
        ctx.beginPath(); ctx.arc(lv.x+lv.rx*0.9, lv.y- lv.ry*0.6, 14, 0, Math.PI*2); ctx.stroke();
      } else if (view === 'PSAX') {
        // aortic valve in center, pulmonic anterior
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(40, -18, 16, 0, Math.PI*2); ctx.stroke();
      } else if (view === 'A4C') {
        ctx.beginPath(); ctx.moveTo(lv.x, lv.y- lv.ry*0.9); ctx.lineTo(la.x, la.y+ la.ry*0.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rv.x, rv.y- rv.ry*0.9); ctx.lineTo(ra.x, ra.y+ ra.ry*0.9); ctx.stroke();
      }

      // Chamber labels
      drawLabel(ctx, 'LV', lv.x-10, lv.y+5);
      drawLabel(ctx, 'RV', rv.x-10, rv.y+5);
      if (view !== 'PSAX') { drawLabel(ctx, 'LA', la.x-10, la.y+5); drawLabel(ctx, 'RA', ra.x-10, ra.y+5); }

      // Color Doppler flows
      if (props.colorDoppler) {
        const flows = (currentCase.flows||[]).filter(f=>f.view===view);
        flows.forEach(f=>{
          if (f.type === 'VSD') {
            const pts = [];
            const start = { x: -20, y: -5 };
            for (let i=0;i<20;i++) pts.push({ x: start.x + i*8, y: start.y + Math.sin(i*0.6+ t*4)*4 });
            drawColorJet(ctx, pts, phase, f.colorDir, f.strength);
          } else if (f.type === 'PDA') {
            const pts = [];
            for (let i=0;i<25;i++) pts.push({ x: 70 + i*3, y: -80 + Math.sin(i*0.4 + t*6)*6 });
            drawColorJet(ctx, pts, phase, f.colorDir, f.strength);
          } else if (f.type === 'RVOT_OBS') {
            const pts = [];
            for (let i=0;i<18;i++) pts.push({ x: 40 + i*5, y: -20 - i*1.2 + Math.sin(i*0.5+t*5)*2 });
            drawColorJet(ctx, pts, phase, f.colorDir, f.strength);
          } else if (f.type === 'COARC') {
            const pts = [];
            for (let i=0;i<30;i++) pts.push({ x: 90 + i*2.2, y: -70 + Math.sin(i*0.5+t*5)*3 });
            drawColorJet(ctx, pts, phase, f.colorDir, f.strength);
          }
        });
      }

      // Measurement overlay in heart space handled later; restore
      ctx.restore();

      // Sector border and depth markers
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, sectorR, angOffset-opening/2, angOffset+opening/2);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(120,140,170,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Depth scale (cm)
      ctx.save();
      ctx.fillStyle = '#9fb0d0';
      ctx.font = '11px system-ui, sans-serif';
      for (let cm=1; cm<=Math.floor(depth); cm++){
        const r = (cm/depth)*sectorR*0.8;
        const p1 = rotatePoint(cx + Math.cos(angOffset-opening/2)*r, cy + Math.sin(angOffset-opening/2)*r, cx, cy, 0);
        const p2 = rotatePoint(cx + Math.cos(angOffset+opening/2)*r, cy + Math.sin(angOffset+opening/2)*r, cx, cy, 0);
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = '#3a4560'; ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.fillText(cm+' cm', p2.x+4, p2.y+4);
      }
      ctx.restore();

      // Speckle noise to emulate ultrasound texture
      drawSpeckle(ctx, w, h, gain, t);

      // M-line indicator
      const mx = cx + Math.cos(angOffset-opening/2 + opening*mLineX)*sectorR*0.8;
      const my = cy + Math.sin(angOffset-opening/2 + opening*mLineX)*sectorR*0.8;
      ctx.save();
      ctx.strokeStyle = 'rgba(200,230,255,0.5)';
      ctx.setLineDash([6,6]);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mx, my); ctx.stroke();
      ctx.restore();

      // Measurement overlay in screen space
      if (clicks.length === 1) {
        const p = clicks[0];
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
      } else if (clicks.length === 2) {
        const [a,b] = clicks;
        ctx.strokeStyle = '#ffd166';
        ctx.fillStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.beginPath(); ctx.arc(a.x, a.y, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
        const dx = b.x-a.x, dy=b.y-a.y; const pxDist = Math.hypot(dx,dy);
        const pxPerCm = (sectorR*0.8)/depth; // linear approx along radius
        const pxPerMm = pxPerCm/10;
        const mm = pxDist/pxPerMm;
        ctx.fillText(mm.toFixed(1)+' mm', (a.x+b.x)/2+6, (a.y+b.y)/2-6);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, currentCase, view, depth, gain, angle, colorDoppler, paused, mLineX, clicks]);

  useEffect(() => { setClicks([]); if (onMeasurement) onMeasurement(null); }, [depth]);

  const handleClick = (e) => {
    if (!measureMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width/rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height/rect.height);
    const next = [...clicks, {x,y}].slice(-2);
    setClicks(next);
    if (next.length === 2) {
      const dx = next[1].x-next[0].x, dy = next[1].y-next[0].y; const pxDist = Math.hypot(dx,dy);
      const sectorR = Math.min(canvasRef.current.width*0.95, canvasRef.current.height*1.2);
      const pxPerCm = (sectorR*0.8)/depth; const pxPerMm = pxPerCm/10; const mm = pxDist/pxPerMm;
      onMeasurement && onMeasurement({ distMm: mm, scale: pxPerMm });
    }
  };

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const link = document.createElement('a');
      link.download = `echo-${props.view}-${props.currentCase.id}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  }));

  return (
    <canvas ref={canvasRef} onClick={handleClick} style={{width: '100%', height: '100%'}} />
  );
});

export default SimulatorCanvas;
