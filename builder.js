import {PHASES} from './data.js';
import {METABOLIC_TIMINGS} from './metabolic-presets.js?v=tiempos-bloques';
export const PHASE_PATTERNS={activation:['locomocion','rodilla','tiron'],strength:['rodilla','empuje'],main:['cadera','rodilla','tiron','empuje'],core:['antirotacion','antiextension'],metabolic:['locomocion','global'],recovery:['movilidad','respiracion']};
const REFERENCES=Object.fromEntries(Object.entries(METABOLIC_TIMINGS).map(([k,v])=>[k,[v.on,v.off]]));
export const PHASE_ORDER=['activation','strength','main','core','metabolic','recovery'];
export function insertBlock(blocks,block){
 const rank=PHASE_ORDER.indexOf(block.phase),at=blocks.findIndex(b=>PHASE_ORDER.indexOf(b.phase)>rank),copy=[...blocks];
 copy.splice(at<0?copy.length:at,0,block);return copy;
}
export function recommendedOrder(blocks){return [...blocks].sort((a,b)=>PHASE_ORDER.indexOf(a.phase)-PHASE_ORDER.indexOf(b.phase));}
export function moveItem(items,index,direction){const next=index+direction;if(index<0||next<0||next>=items.length)return items;const copy=[...items];[copy[index],copy[next]]=[copy[next],copy[index]];return copy;}
export function createBlock(phase,id){
 if(!Object.hasOwn(PHASES,phase))throw Error('Tipo de bloque no válido.');
 const [preferredOn,preferredOff]=REFERENCES[phase];
 return {id,name:PHASES[phase],phase,targetSeconds:METABOLIC_TIMINGS[phase].seconds,preferredOn,preferredOff,roundMode:'auto',rounds:1,timingPolicy:'metabolic',sequence:phase==='main'?'pairs':'circuit',variation:'inherit',notes:'',slots:PHASE_PATTERNS[phase].map((pattern,i)=>({id:`${id}-${i}`,pattern,exerciseId:null,locked:false}))};
}
export function changePhase(block,phase){
 if(!Object.hasOwn(PHASES,phase))throw Error('Tipo de bloque no válido.');
 const result=structuredClone(block),patterns=PHASE_PATTERNS[phase];
 delete result.emsProgram;
 result.phase=phase;result.name=PHASES[phase];[result.preferredOn,result.preferredOff]=REFERENCES[phase];result.roundMode='auto';result.timingPolicy='metabolic';result.sequence=phase==='main'?'pairs':'circuit';delete result.channels;
 result.slots.forEach((s,i)=>{if(!s.locked){s.pattern=patterns[i%patterns.length];s.exerciseId=null;}});
 return result;
}
