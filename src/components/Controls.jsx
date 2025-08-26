import React from 'react';

export default function Controls({ currentCase }) {
  return (
    <div style={{marginTop: 10}}>
      <div className="title" style={{fontSize: 14}}>Case details</div>
      <div className="stack">
        <span className="tag">HR: {currentCase.hr} bpm</span>
        <span className="tag">ID: {currentCase.id}</span>
      </div>
      <div className="small" style={{marginTop: 6}}>{currentCase.description}</div>
      <div className="small" style={{marginTop: 10, opacity: 0.8}}>
        Tips:
        <ul>
          <li>Use Probe Angle to sweep between views subtly.</li>
          <li>Enable Color Doppler to visualize simulated jets and RVOT gradients.</li>
          <li>Turn on Measurement and click two points to measure mm at current depth.</li>
          <li>Adjust M-line to sample motion across valves or ventricular walls.</li>
        </ul>
      </div>
    </div>
  );
}
