export const CASES = [
  {
    id: 'normal',
    name: 'Normal neonatal heart',
    hr: 130, // bpm
    description: 'Normal biventricular size and function. No shunts.',
    flows: [],
  },
  {
    id: 'vsd',
    name: 'Perimembranous VSD (L->R)',
    hr: 140,
    description: 'Left-to-right shunt across perimembranous septum. Color jet RV-directed in PLAX, aliasing in PSAX.',
    flows: [
      { view: 'PLAX', type: 'VSD', strength: 0.9, colorDir: 'toProbe' },
      { view: 'PSAX', type: 'VSD', strength: 1.0, colorDir: 'toProbe' },
      { view: 'A4C',  type: 'VSD', strength: 0.7, colorDir: 'toProbe' },
    ],
  },
  {
    id: 'pda',
    name: 'Patent ductus arteriosus',
    hr: 150,
    description: 'Continuous L->R shunt from aorta to PA. In PSAX, jet entering main PA near pulmonary valve.',
    flows: [
      { view: 'PSAX', type: 'PDA', strength: 1.0, colorDir: 'fromProbe' }
    ],
  },
  {
    id: 'tof',
    name: 'Tetralogy of Fallot (classic)',
    hr: 120,
    description: 'RVOT obstruction and VSD with anterior aorta. Reduced PA flow, overriding aorta in PLAX/PSAX.',
    flows: [
      { view: 'PLAX', type: 'RVOT_OBS', strength: 0.8, colorDir: 'fromProbe' },
      { view: 'PLAX', type: 'VSD', strength: 0.5, colorDir: 'bidirectional' }
    ],
  },
  {
    id: 'coarc',
    name: 'Coarctation (infant)',
    hr: 135,
    description: 'Narrowing distal to left subclavian; in PSAX, relatively decreased descending aortic caliber; diastolic runoff on color.',
    flows: [
      { view: 'PSAX', type: 'COARC', strength: 0.6, colorDir: 'fromProbe' }
    ],
  },
];
