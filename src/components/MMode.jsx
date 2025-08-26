import React, { useEffect, useRef } from 'react';

export default function MMode({ currentCase, view, depth, gain, paused, mLineX }) {
  const canvasRef = useRef(null);
  const bufferRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    const ro = new ResizeObserver(()=>{
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio||1, 2);
      el.width = rect.width*dpr; el.height = rect.height*dpr;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf; let start = performance.now();
    const loop = (ts) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) { raf = requestAnimationFrame(loop); return; }
      const w = canvasRef.current.width; const h = canvasRef.current.height;
      if (!bufferRef.current) {
        bufferRef.current = ctx.createImageData(w, h);
        for (let i=0;i<w*h*4;i+=4){ bufferRef.current.data[i+3]=255; }
      }
      const img = bufferRef.current;

      // shift left by 1 px
      for (let y=0; y<h; y++){
        for (let x=0; x<w-1; x++){
          const i = (y*w + x)*4;
          const j = (y*w + x+1)*4;
          img.data[i] = img.data[j];
          img.data[i+1] = img.data[j+1];
          img.data[i+2] = img.data[j+2];
        }
      }

      // new column on the right: synthesize from cardiac motion
      const t = (ts-start)/1000; const bpm = currentCase.hr || 130; const phase = paused ? 0 : (t * bpm/60) % 1;
      for (let y=0; y<h; y++){
        // Simulate brightness varying with valve motion line at two depths
        const depthNorm = y/h; // 0 nearfield, 1 farfield
        const valve1 = 0.35 + 0.05*Math.sin(phase*2*Math.PI*1.0);
        const valve2 = view==='PSAX' ? 0.55 + 0.06*Math.cos(phase*2*Math.PI*0.9) : 0.65 + 0.07*Math.sin(phase*2*Math.PI*1.1 + 1.2);
        let bright = 10 + 180*Math.pow(1-depthNorm, 2) * 0.3; // attenuation
        bright += 70 * Math.exp(-Math.pow((depthNorm-valve1)*60,2));
        bright += 60 * Math.exp(-Math.pow((depthNorm-valve2)*65,2));
        if (currentCase.id==='tof') bright += 40*Math.exp(-Math.pow((depthNorm-0.2)*45,2));
        if (currentCase.id==='vsd' && view!=='PSAX') bright += 30*Math.exp(-Math.pow((depthNorm-0.48)*55,2));
        // gain
        bright *= gain;
        const col = Math.max(0, Math.min(255, bright|0));
        const i = (y*w + (w-1))*4;
        img.data[i]=img.data[i+1]=img.data[i+2]=col;
      }

      ctx.putImageData(img, 0, 0);
      // grid overlay
      ctx.save();
      ctx.strokeStyle = 'rgba(80,100,130,0.3)';
      for (let y=0; y<h; y+=Math.max(16, h/8)) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
      ctx.restore();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [currentCase, view, depth, gain, paused, mLineX]);

  return <canvas ref={canvasRef} style={{width:'100%', height:'100%', borderRadius: 8}} />
}
