import React, { useMemo, useRef, useState } from 'react';
import SimulatorCanvas from './components/SimulatorCanvas.jsx';
import MMode from './components/MMode.jsx';
import Controls from './components/Controls.jsx';
import { CASES } from './cases.js';

export default function App() {
  const [caseId, setCaseId] = useState(CASES[0].id);
  const currentCase = useMemo(() => CASES.find(c => c.id === caseId) || CASES[0], [caseId]);

  const [view, setView] = useState('PLAX');
  const [depth, setDepth] = useState(6); // cm
  const [gain, setGain] = useState(0.9);
  const [angle, setAngle] = useState(0); // degrees
  const [colorDoppler, setColorDoppler] = useState(false);
  const [paused, setPaused] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [mLineX, setMLineX] = useState(0.6);

  const simRef = useRef(null);
  const [measurement, setMeasurement] = useState(null);

  const handleSnapshot = () => {
    if (simRef.current) simRef.current.exportPNG();
  };

  return (
    <div className="app">
      <div className="panel simulator-grid">
        <div style={{position: 'relative', minHeight: 0}}>
          <SimulatorCanvas
            ref={simRef}
            currentCase={currentCase}
            view={view}
            depth={depth}
            gain={gain}
            angle={angle}
            colorDoppler={colorDoppler}
            paused={paused}
            measureMode={measureMode}
            onMeasurement={setMeasurement}
            mLineX={mLineX}
          />
        </div>
        <div className="panel" style={{padding: 8}}>
          <MMode
            currentCase={currentCase}
            view={view}
            depth={depth}
            gain={gain}
            paused={paused}
            mLineX={mLineX}
          />
          <div className="bar" style={{marginTop: 8}}>
            <div className="small">M-line: {(mLineX*100|0)}%</div>
            <input type="range" min="0.05" max="0.95" step="0.01" value={mLineX}
              onChange={e=>setMLineX(parseFloat(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="panel controls">
        <h3 className="title">Pediatric Echo Simulator</h3>
        <div className="row">
          <label>Case</label>
          <select value={caseId} onChange={e=>setCaseId(e.target.value)}>
            {CASES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="row">
          <label>View</label>
          <select value={view} onChange={e=>setView(e.target.value)}>
            <option>PLAX</option>
            <option>PSAX</option>
            <option>A4C</option>
          </select>
        </div>
        <div className="row">
          <label>Depth (cm)</label>
          <input type="range" min="4" max="12" step="0.1" value={depth} onChange={e=>setDepth(parseFloat(e.target.value))} />
        </div>
        <div className="row">
          <label>Gain</label>
          <input type="range" min="0.5" max="1.4" step="0.01" value={gain} onChange={e=>setGain(parseFloat(e.target.value))} />
        </div>
        <div className="row">
          <label>Probe Angle (°)</label>
          <input type="range" min="-45" max="45" step="1" value={angle} onChange={e=>setAngle(parseFloat(e.target.value))} />
        </div>
        <div className="row">
          <label>Color Doppler</label>
          <input type="checkbox" checked={colorDoppler} onChange={e=>setColorDoppler(e.target.checked)} />
        </div>
        <div className="row">
          <label>Freeze</label>
          <input type="checkbox" checked={paused} onChange={e=>setPaused(e.target.checked)} />
        </div>
        <div className="row">
          <label>Measurement</label>
          <button className="btn" onClick={()=>setMeasureMode(m => !m)}>{measureMode ? 'Measuring: Click 2 points' : 'Start Measure'}</button>
        </div>
        {measurement && (
          <div className="stack" style={{marginTop: 6}}>
            <span className="tag">Distance: {measurement.distMm.toFixed(1)} mm</span>
            <span className="tag">Depth scale: {measurement.scale.toFixed(2)} px/mm</span>
          </div>
        )}
        <div className="row">
          <label>Snapshot</label>
          <button className="btn" onClick={handleSnapshot}>Export PNG</button>
        </div>
        <Controls currentCase={currentCase} />
      </div>
    </div>
  );
}
