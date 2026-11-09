import {PATTERN_GROUP} from './data.js';
export const PROFILES={'sin-definir':'Sin especificar',hombre:'Hombre',mujer:'Mujer',principiante:'Principiantes'};
export const EMPHASES={equilibrado:'Full body equilibrado',torso:'Torso',piernas:'Piernas y glúteos'};
export function defaultEmphasis(profile){return profile==='hombre'?'torso':profile==='mujer'?'piernas':'equilibrado';}
export function applyEmphasis(blocks,emphasis){
  const result=structuredClone(blocks),hasStrength=result.some(b=>b.phase==='strength');
  for(const b of result){
    if(!['strength','main'].includes(b.phase))continue;
    let patterns;
    if(b.phase==='strength')patterns=emphasis==='torso'?['rodilla','tiron']:emphasis==='piernas'?['cadera','empuje']:['rodilla','empuje'];
    else if(!hasStrength&&emphasis!=='equilibrado'){
      // Se conservan empuje, tirón, rodilla y cadera; se añaden dos huecos de énfasis.
      while(b.slots.length<6){let id=`${b.id}-emphasis-${b.slots.length}`;while(b.slots.some(s=>s.id===id))id+='x';b.slots.push({id,pattern:'rodilla',exerciseId:null,locked:false,autoEmphasis:true});}
      patterns=emphasis==='torso'?['rodilla','cadera','tiron','empuje','biceps','hombro']:['rodilla','cadera','tiron','empuje','flexionrodilla','abduccion'];
    } else if(emphasis==='torso')patterns=['empuje','cadera','biceps','hombro','tiron','rodilla','triceps'];
    else if(emphasis==='piernas')patterns=['rodilla','flexionrodilla','tiron','abduccion','empuje','cadera'];
    else patterns=b.slots.length<=4?['cadera','rodilla','tiron','empuje']:['cadera','empuje','rodilla','tiron','gemelo','hombro'];
    b.slots.forEach((s,i)=>{if(!s.locked&&!(b.phase==='strength'&&s.exerciseId))s.pattern=patterns[i%patterns.length];});
  }
  // Adapt the main block to the actual strength basics already chosen by the
  // trainer, instead of assuming a fixed push/pull or knee/hip pairing.
  const primary=result.filter(b=>['strength','main'].includes(b.phase));
  const basics=['rodilla','cadera','empuje','tiron'],group=p=>PATTERN_GROUP[p];
  const counts=new Map();for(const b of primary)for(const s of b.slots)counts.set(s.pattern,(counts.get(s.pattern)||0)+1);
  for(const pattern of basics)if(!counts.get(pattern)){
    const candidates=result.filter(b=>b.phase==='main').flatMap(b=>b.slots).filter(s=>!s.locked&&(!basics.includes(s.pattern)||(counts.get(s.pattern)||0)>1));
    const slot=candidates.find(s=>group(s.pattern)===group(pattern))||candidates[0];
    if(slot){counts.set(slot.pattern,counts.get(slot.pattern)-1);slot.pattern=pattern;counts.set(pattern,1);}
  }
  return result;
}
export function emphasisDistribution(blocks,patternGroups){
  const counts={torso:0,piernas:0,core:0,global:0,movilidad:0};
  for(const b of blocks.filter(b=>['strength','main'].includes(b.phase)))for(const s of b.slots){const group=patternGroups[s.pattern];if(group)counts[group]++;}
  return counts;
}
