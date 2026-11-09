// Author-defined initial planning references, not device-calibrated doses.
// Metabolic timings are explicitly shared with the other profiles. Reduced
// volume and perceived intensity do not make this a first-contact protocol.
// The WB-EMS consensus does not validate these percentages or long ON phases.
// https://doi.org/10.3389/fphys.2023.1174103
import {METABOLIC_TIMINGS} from './metabolic-presets.js';
const BUDGET={activation:240,strength:180,main:360,core:120,metabolic:120,recovery:180};
export const NOVICE_TIMINGS=Object.fromEntries(Object.entries(METABOLIC_TIMINGS).map(([phase,r])=>[phase,{...structuredClone(r),seconds:BUDGET[phase],...(phase==='recovery'?{on:BUDGET[phase]}:{})}]));
// PIERNAS, ISQUIO, GLÚTEOS, LUMBAR, DORSAL, TRAPECIO, ABDOM., PECHO, BRAZO, EXTRA1.
export const NOVICE_CHANNELS={
 activation:[20,20,22,12,18,14,20,18,16,0],
 strength:[30,30,35,18,30,22,28,28,24,0],
 main:[30,32,35,18,30,22,30,28,24,0],
 core:[15,16,18,18,20,16,35,18,18,0],
 metabolic:[28,30,32,16,28,20,28,25,22,0],
 recovery:[15,15,18,10,12,10,12,12,10,0]
};
export const NOVICE_LEVELS=Array.from({length:10},(_,i)=>[...new Set(Object.values(NOVICE_CHANNELS).map(v=>v[i]))].sort((a,b)=>a-b));
export function noviceTiming(block,{preserveDuration=true}={}){
 const r=NOVICE_TIMINGS[block.phase];
 return {...structuredClone(block),targetSeconds:preserveDuration?block.targetSeconds:r.seconds,preferredOn:r.on,preferredOff:r.off,roundMode:'auto',rounds:1,timingPolicy:'beginner',timingLocked:false};
}
export function upgradeNoviceBlocks(blocks){
 const result=blocks.map(b=>b.timingPolicy==='pending'||b.preferredOn===null||b.preferredOff===null||b.phase!=='recovery'&&(b.timingPolicy==='beginner'&&b.preferredOn<=4||b.preferredOn===4&&b.preferredOff===4&&!b.timingLocked)?noviceTiming(b):structuredClone(b));
 // Redistribute the old factory minute, keeping total duration and all exercises.
 // Two metabolic slots no longer fit into 1:00 with metabolic ON/OFF criteria.
 const activation=result.filter(b=>b.phase==='activation'),metabolic=result.filter(b=>b.phase==='metabolic');
 if(activation.length===1&&metabolic.length===1&&activation[0].targetSeconds===300&&metabolic[0].targetSeconds===60&&activation[0].timingPolicy==='beginner'&&metabolic[0].timingPolicy==='beginner'){
  activation[0].targetSeconds=240;metabolic[0].targetSeconds=120;
 }
 return result;
}
