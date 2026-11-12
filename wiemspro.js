export const WIEMSPRO_DOSSIER='https://es.scribd.com/document/739672540/Dossier-Programas-Wiemspro-ES';

// Dossier pulse widths in the app's channel order, through BRAZO.
const pulseWidths=Object.freeze([350,350,350,250,300,200,350,300,250]);
const corePulseWidths=Object.freeze([350,350,350,300,300,200,350,300,250]);

export const WIEMSPRO_PROGRAMS=[
  {id:'warmup-2',phase:'activation',name:'Calentamiento 2',hz:15,on:30,off:10,rampUp:1,rampDown:1,pulseWidths},
  {id:'warmup-3',phase:'activation',name:'Calentamiento 3',hz:21,on:25,off:15,rampUp:0.5,rampDown:0.5,pulseWidths},
  {id:'functional-2',phase:'main',name:'Resistencia a la fuerza Funcional 2',hz:40,on:30,off:15,rampUp:0.4,rampDown:0.4,pulseWidths},
  {id:'functional-3',phase:'main',name:'Resistencia a la fuerza Funcional 3',hz:50,on:25,off:20,rampUp:0.4,rampDown:0.4,pulseWidths},
  {id:'core-2',phase:'core',name:'Core 2',hz:45,on:20,off:20,rampUp:0.3,rampDown:0.3,pulseWidths:corePulseWidths},
  {id:'hiit-2',phase:'metabolic',name:'HIIT 2 · Baja frecuencia',hz:33,on:30,off:15,rampUp:0.4,rampDown:0.4,pulseWidths}
];

export const wiemsproProgram=block=>
  WIEMSPRO_PROGRAMS.find(program=>program.id===block.emsProgram&&program.phase===block.phase);
