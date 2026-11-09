import {PHASES} from './data.js';
import {applyEmphasis} from './profiles.js';
import {eligible,generate,validateSession} from './engine.js';
import {PHASE_PATTERNS} from './builder.js';
import {NOVICE_TIMINGS,noviceTiming,upgradeNoviceBlocks} from './novice-presets.js';

export const BEGINNER_TOTAL_SECONDS=1200;
const BUDGET=Object.fromEntries(Object.entries(NOVICE_TIMINGS).map(([phase,r])=>[phase,r.seconds]));
export function beginnerBlock(block,{preserveDuration=false}={}){
  return noviceTiming(block,{preserveDuration});
}
export function beginnerFilters(filters,{entering=false}={}){
  return {...structuredClone(filters),beginner:true,level:1,noFloor:entering?true:filters.noFloor,noOverhead:true,noTravel:true};
}
export function beginnerTimings(blocks){
  const result=structuredClone(blocks),counts=new Map();for(const b of result)counts.set(b.phase,(counts.get(b.phase)||0)+1);
  const budget={...BUDGET},present=[...counts.keys()],receiver=present.includes('main')?'main':present.find(p=>p!=='recovery')||'recovery';
  for(const phase of Object.keys(budget))if(!counts.has(phase)){budget[receiver]+=budget[phase];budget[phase]=0;}
  const used=new Map();for(const b of result){const i=used.get(b.phase)||0,n=counts.get(b.phase);used.set(b.phase,i+1);
    b.targetSeconds=Math.floor(budget[b.phase]/n)+(i<budget[b.phase]%n?1:0);
    Object.assign(b,beginnerBlock(b,{preserveDuration:true}));
  }
  return result;
}
export function adaptBeginner(blocks,database,filters,{emphasis='equilibrado',resetTiming=true,avoidIds=[]}={}){
  const nextFilters=beginnerFilters(filters,{entering:resetTiming});
  let proposed=applyEmphasis(blocks,emphasis);proposed=resetTiming?beginnerTimings(proposed):upgradeNoviceBlocks(proposed);
  let replaced=0,releasedPins=0;
  for(const b of proposed)for(const [i,s] of b.slots.entries()){
    const current=database.find(e=>e.id===s.exerciseId);
    if(current&&eligible(current,b,s,nextFilters))continue;
    if(s.exerciseId)replaced++;if(s.locked)releasedPins++;
    s.exerciseId=null;s.locked=false;
    if(!database.some(e=>eligible(e,b,s,nextFilters))){
      const fallbacks=[...PHASE_PATTERNS[b.phase].slice(i%PHASE_PATTERNS[b.phase].length),...PHASE_PATTERNS[b.phase]];
      const pattern=fallbacks.find(pattern=>database.some(e=>eligible(e,b,{...s,pattern},nextFilters)));
      if(!pattern)return {error:`Sin opciones sencillas para ${PHASES[b.phase]}. Revisa el material disponible o las fichas. Tu sesión se conserva.`};
      s.pattern=pattern;
    }
  }
  const hasTargets=proposed.some(b=>b.slots.some(s=>!s.locked&&!(b.phase==='strength'&&s.exerciseId)));
  const result=hasTargets?generate(proposed,database,nextFilters,{avoidIds}):{blocks:proposed};
  if(result.error)return result;
  const errors=validateSession(result.blocks,database,nextFilters);if(errors.length)return {error:errors[0]};
  return {blocks:result.blocks,filters:nextFilters,replaced,releasedPins};
}
