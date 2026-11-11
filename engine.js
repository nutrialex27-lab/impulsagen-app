import {PATTERN_GROUP,exerciseInBankPhase} from './data.js?v=banco-cardio';
import {METABOLIC_TIMINGS} from './metabolic.js';
import {NOVICE_TIMINGS} from './novice-presets.js';
import {validStimulation} from './stimulation.js';
import {GYM_EQUIPMENT} from './gym-catalog.js';
import {HYPERTROPHY_LIMIT,isHypertrophyPlan,isHypertrophyBlock,isHypertrophyWork,solveHypertrophyTiming,validHypertrophyBlock,hypertrophyExerciseSuitable,plannedEmsSeconds} from './hypertrophy.js';
export const VARIATION_MODES={zone:'Misma zona · más variedad',pattern:'Mismo patrón · más específico',block:'Todo el bloque · recomponer'};
export function formatTime(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
export function parseTime(value) {
  const s=String(value).trim().replace(',','.');
  if(/^\d{1,3}:\d{2}$/.test(s)) {const [m,x]=s.split(':').map(Number);if(x<60&&m*60+x>0&&m*60+x<=7200)return m*60+x;}
  if(/^\d+(\.\d+)?$/.test(s)) {const v=Math.round(Number(s)*60);if(v>0&&v<=7200)return v;}
  return null;
}
export function solveTiming(block) {
  const n=block.slots.length,T=block.targetSeconds;
  if(!n||!Number.isInteger(T)||T<=0)return {error:'Añade ejercicios y una duración válida.'};
  if(isHypertrophyBlock(block))return solveHypertrophyTiming(block);
  const continuous=block.phase==='recovery';
  if(!continuous&&(!Number.isFinite(block.preferredOn)||block.preferredOn<1||!Number.isFinite(block.preferredOff)||block.preferredOff<1))return {error:'Define el ON y el OFF de este bloque.'};
  const preferredOn=Math.max(1,Number(block.preferredOn)||1), preferredOff=continuous?0:Math.max(1,Number(block.preferredOff)||1);
  const candidates=block.roundMode==='manual'?[Math.max(1,Math.round(block.rounds))]:continuous?[1]:Array.from({length:Math.min(100,Math.floor(T/(n*2)))},(_,i)=>i+1);
  let best=null;
  for(const rounds of candidates) {
    const cycles=n*rounds,cycle=Math.floor(T/cycles);
    if(cycle<(continuous?1:2))continue;
    let on=continuous?cycle:Math.max(1,Math.min(cycle-1,Math.round(cycle*preferredOn/(preferredOn+preferredOff))));
    const rule=(block.timingPolicy==='beginner'?NOVICE_TIMINGS:METABOLIC_TIMINGS)[block.phase];
    if(!continuous&&(block.timingPolicy==='beginner'||block.timingPolicy==='metabolic'&&block.roundMode!=='manual')){
      if(cycle<rule.minOn+rule.off)continue;
      on=Math.max(rule.minOn,Math.min(rule.on,cycle-rule.off,on));
    }
    const off=continuous?0:cycle-on,buffer=T-cycles*cycle;
    const score=Math.abs(Math.log(cycle/(preferredOn+preferredOff))) + buffer/T*3;
    if(!best||score<best.score)best={rounds,cycles,on,off,buffer,total:cycles*(on+off)+buffer,work:cycles*on,score};
  }
  return best||{error:'La duración no permite completar todas las vueltas. Amplía el bloque o reduce las vueltas.'};
}
export function beginnerSuitable(exercise){
  return exercise.level===1&&!exercise.flags.some(f=>['overhead','desplazamiento'].includes(f))&&!exercise.equipment.some(m=>['barra','hexagonal','rack','multipower','landmine','trx','fitball'].includes(m))&&!['talonpunta','pasov','pasovbrazos','diagonal','linea','marchacarga'].includes(exercise.family);
}
export function eligible(exercise,block,slot,filters) {
  const hypertrophy=isHypertrophyBlock(block);
  const hasMaterial=key=>{
    if(hypertrophy&&GYM_EQUIPMENT.includes(key))return filters.equipment.includes('sala');
    return key!=='sala'&&filters.equipment.includes(key);
  };
  return exercise.enabled && exercise.pattern===slot.pattern && exercise.phases.includes(block.phase) && exercise.level<=filters.level && (!filters.beginner||beginnerSuitable(exercise)) && exercise.equipment.every(hasMaterial) && (!filters.noFloor||!['suelo','tumbado'].includes(exercise.position)) && (!filters.noOverhead||!exercise.flags.includes('overhead')) && (!filters.noTravel||!exercise.flags.includes('desplazamiento')) && hypertrophyExerciseSuitable(exercise,block);
}
export function alternativeEligible(exercise,block,slot,filters,scope='pattern') {
  if(!exerciseInBankPhase(exercise,block.phase))return false;
  if(isHypertrophyWork(block)&&exercise.pattern!==slot.pattern)return false;
  if(!eligible(exercise,block,{...slot,pattern:exercise.pattern},filters))return false;
  if(scope==='block')return true;
  if(scope==='zone')return PATTERN_GROUP[exercise.pattern]===PATTERN_GROUP[slot.pattern];
  return exercise.pattern===slot.pattern;
}
export function strengthBasic(exercise){
  return ['rodilla','cadera','empuje','tiron'].includes(exercise.pattern)&&!['extension','extensioncadera','apertura','escapular','aperturaposterior','facepull'].includes(exercise.family)&&exercise.id!=='base-40';
}
export function generate(blocks,database,filters,{blockId=null,blockIds=null,slotId=null,phase=null,avoidIds=[],rng=Math.random,scope=null}={}) {
  const result=structuredClone(blocks),occupied=new Set(),tasks=[],errors=[],records=new Map(database.map(e=>[e.id,e]));
  const familyUsed=new Map(),essentialUsed=new Map(),groupUsed=new Map(),groupGoals=new Map();
  const essentials=new Set(['rodilla','cadera','empuje','tiron']);
  // An explicit strength edit may exchange a squat for a hinge, or push for pull.
  // It never changes other blocks just to keep the previous movement pattern.
  const explicitStrength=phase==='strength'||blocks.some(b=>b.phase==='strength'&&(blockId===b.id||b.slots.some(s=>s.id===slotId)));
  const required=new Set(explicitStrength?[]:blocks.filter(b=>['strength','main'].includes(b.phase)).flatMap(b=>b.slots.map(s=>s.pattern)).filter(p=>essentials.has(p)));
  const key=(b,group)=>`${b.id}:${group}`;
  const increment=(map,k,n)=>map.set(k,(map.get(k)||0)+n);
  const track=(e,b,n)=>{increment(familyUsed,e.family,n);increment(groupUsed,key(b,PATTERN_GROUP[e.pattern]),n);if(['strength','main'].includes(b.phase))increment(essentialUsed,e.pattern,n);};
  for(const b of result)for(const s of b.slots) {
    const e=records.get(s.exerciseId);
    const compatible=e&&eligible(e,b,s,filters);
    const stableStrength=b.phase==='strength'&&compatible&&!blockId&&!slotId&&phase!=='strength';
    const inScope=(!blockId||b.id===blockId)&&(!blockIds||blockIds.includes(b.id))&&(!slotId||s.id===slotId)&&(!phase||b.phase===phase);
    const target=inScope&&(!s.locked||slotId===s.id)&&!stableStrength;
    let mode=scope||(b.variation&&b.variation!=='inherit'?b.variation:filters.variation)||'pattern';
    // Within-zone strength changes keep a pushing/pulling slot specific, while
    // a lower-body slot can explore knee, hip and unilateral families.
    if(b.phase==='strength'&&mode==='zone'&&['empuje','tiron'].includes(s.pattern))mode='pattern';
    if(mode==='block')increment(groupGoals,key(b,PATTERN_GROUP[s.pattern]),1);
    if(target)tasks.push({b,s,mode,originalPattern:s.pattern});
    else if(s.exerciseId) {
      if(inScope&&!compatible)errors.push('Un ejercicio conservado no cumple los filtros. Cámbialo desde su bloque, elige otra ficha o revisa los criterios.');
      if(occupied.has(s.exerciseId))errors.push('Hay ejercicios repetidos entre los que quieres conservar.');
      occupied.add(s.exerciseId);
      if(e)track(e,b,1);
    }
  }
  if(errors.length)return {error:errors[0]};
  if(!tasks.length)return {error:'No hay ejercicios desbloqueados para cambiar.'};
  const oldIds=new Set(tasks.map(t=>t.s.exerciseId).filter(Boolean)),avoid=new Set(avoidIds);
  const oldFamilies=new Set([...oldIds].map(id=>records.get(id)?.family).filter(Boolean));
  for(const t of tasks) {
    t.options=database.filter(e=>alternativeEligible(e,t.b,t.s,filters,t.mode)&&(t.b.phase!=='strength'||strengthBasic(e))&&!oldIds.has(e.id)&&!avoid.has(e.id)&&!occupied.has(e.id)).map(e=>({e,noise:rng()}));
    if(!t.options.length)return {error:`Sin alternativas para «${t.b.name} · ${t.s.pattern}». Añade ejercicios compatibles, amplía el material o revisa los filtros.`};
  }
  tasks.sort((a,b)=>a.options.length-b.options.length);
  let steps=0;
  const canUse=(t,e)=>!occupied.has(e.id)&&(t.mode!=='block'||(groupUsed.get(key(t.b,PATTERN_GROUP[e.pattern]))||0)<(groupGoals.get(key(t.b,PATTERN_GROUP[e.pattern]))||0));
  const missing=()=>[...required].filter(p=>!(essentialUsed.get(p)>0));
  function search(index) {
    if(index===tasks.length)return !missing().length;
    if(++steps>100000)return false;
    // No explorar una rama que ya no puede conservar los patrones básicos presentes.
    if(missing().some(p=>!tasks.slice(index).some(t=>['strength','main'].includes(t.b.phase)&&t.options.some(({e})=>e.pattern===p&&canUse(t,e)))))return false;
    const t=tasks[index];
    const supported=exercise=>exercise.position==='sentado'||/apoyo|pared|banco/.test(exercise.name.toLocaleLowerCase('es'));
    const score=({e,noise})=>(familyUsed.get(e.family)||0)*5+(oldFamilies.has(e.family)?2:0)+noise-(filters.beginner&&supported(e)?1:0)-(required.has(e.pattern)&&!(essentialUsed.get(e.pattern)>0)&&['strength','main'].includes(t.b.phase)?10:0);
    const preferComplexity=t.b.phase==='metabolic';
    const preferSala=isHypertrophyBlock(t.b)&&filters.equipment.includes('sala');
    const isMachine=exercise=>exercise.equipment.some(key=>GYM_EQUIPMENT.includes(key));
    const options=t.options.filter(({e})=>canUse(t,e)).sort((a,b)=>{
      const levelOrder=preferComplexity?b.e.level-a.e.level:0;
      const salaOrder=preferSala?Number(isMachine(b.e))-Number(isMachine(a.e)):0;
      return levelOrder||salaOrder||score(a)-score(b);
    });
    for(const {e} of options) {
      occupied.add(e.id);track(e,t.b,1);t.s.exerciseId=e.id;t.s.pattern=e.pattern;
      if(search(index+1))return true;
      occupied.delete(e.id);track(e,t.b,-1);t.s.pattern=t.originalPattern;
    }
    return false;
  }
  if(!search(0))return {error:'No hay suficientes alternativas para conservar el reparto y los patrones básicos con estos filtros. Revisa el material o los criterios; tu sesión se conserva.'};
  return {blocks:result};
}
export function validateSession(blocks,database,filters,{allowPendingTiming=false}={}) {
  const errors=[],seen=new Set();
  if(plannedEmsSeconds(blocks)>HYPERTROPHY_LIMIT)errors.push('La fase de hipertrofia con EMS supera los 20 minutos previstos. Ajusta la duración de sus bloques.');
  for(const b of blocks) {
    const timing=solveTiming(b);if(timing.error&&!(allowPendingTiming&&b.timingPolicy==='pending'))errors.push(`${b.name}: ${timing.error}`);
    for(const s of b.slots) {
      const e=database.find(e=>e.id===s.exerciseId);
      if(!e)errors.push(`${b.name}: hay un hueco sin ejercicio.`);
      else {if(!eligible(e,b,s,filters))errors.push(`${b.name}: «${e.name}» no cumple los filtros actuales.`);if(seen.has(e.id))errors.push(`«${e.name}» está repetido.`);seen.add(e.id);}
    }
  }
  return [...new Set(errors)];
}
export function validateBackup(data,patterns,phases,equipment) {
  if(data?.schema!==1||!Array.isArray(data.database)||!Array.isArray(data.blocks)||!data.filters||!Array.isArray(data.saved))throw Error('La copia no tiene el formato de ImpulsaFit.');
  if(data.database.length>3000||data.blocks.length<1||data.blocks.length>16||data.saved.length>200)throw Error('La copia supera los límites de esta versión.');
  const validProgramming=s=>(s.profile===undefined||['sin-definir','hombre','mujer','principiante'].includes(s.profile))&&(s.emphasis===undefined||['equilibrado','torso','piernas'].includes(s.emphasis))&&(s.programmingVersion===undefined||Number.isInteger(s.programmingVersion)&&s.programmingVersion>=1&&s.programmingVersion<=20);
  if(!validProgramming(data)||(data.catalogVersion!==undefined&&(!Number.isInteger(data.catalogVersion)||data.catalogVersion<1||data.catalogVersion>20)))throw Error('El perfil o la versión del banco no es válido.');
  const str=(v,max=2000)=>typeof v==='string'&&v.length<=max;
  const validFilters=f=>f&&Number.isInteger(f.level)&&f.level>=1&&f.level<=3&&Array.isArray(f.equipment)&&f.equipment.every(x=>Object.hasOwn(equipment,x))&&['noFloor','noOverhead','noTravel','avoidLast'].every(x=>typeof f[x]==='boolean')&&(f.variation===undefined||Object.hasOwn(VARIATION_MODES,f.variation))&&(f.beginner===undefined||typeof f.beginner==='boolean')&&(f.varyTiming===undefined||typeof f.varyTiming==='boolean');
  if(!validFilters(data.filters))throw Error('Filtros no válidos.');
  const validateExercises=list=>{const ids=new Set();for(const e of list){
    if(!e||!str(e.id,100)||ids.has(e.id)||!str(e.name,140)||!e.name.trim()||!Object.hasOwn(patterns,e.pattern)||!str(e.family,100)||!Array.isArray(e.phases)||!e.phases.length||!e.phases.every(x=>Object.hasOwn(phases,x))||!Number.isInteger(e.level)||e.level<1||e.level>3||!Array.isArray(e.equipment)||!e.equipment.every(x=>Object.hasOwn(equipment,x))||!['de pie','sentado','suelo','tumbado'].includes(e.position)||!Array.isArray(e.flags)||!e.flags.every(x=>['overhead','desplazamiento'].includes(x))||!str(e.cue)||!str(e.regression)||typeof e.enabled!=='boolean')throw Error('Hay un ejercicio no válido en la copia.');
    if(e.components!==undefined&&(!Array.isArray(e.components)||!e.components.length||e.components.length>5||!e.components.every(p=>Object.hasOwn(patterns,p))))throw Error('Hay componentes de movimiento no válidos en la copia.');
    ids.add(e.id);
  }};
  validateExercises(data.database);
  const validBlocks=blocks=>{
    if(!Array.isArray(blocks)||!blocks.length||blocks.length>16)return false;
    const bid=new Set(),sid=new Set();
    for(const b of blocks){
      const onValid=b.timingPolicy==='pending'&&b.preferredOn===null||Number.isFinite(b.preferredOn)&&b.preferredOn>=1&&b.preferredOn<=600;
      const offValid=b.timingPolicy==='pending'&&b.preferredOff===null||Number.isFinite(b.preferredOff)&&b.preferredOff>=0&&b.preferredOff<=600;
      const channelsValid=b.channels===undefined||b.channels&&['torso','piernas','manual','pending','auto','beginner'].includes(b.channels.source)&&Array.isArray(b.channels.values)&&b.channels.values.length===10&&b.channels.values.every(v=>v===null||Number.isInteger(v)&&v>=0&&v<=100)&&b.channels.values[9]===0;
      if(!str(b.id,100)||bid.has(b.id)||!str(b.name,140)||!b.name.trim()||!Object.hasOwn(phases,b.phase)||!Number.isInteger(b.targetSeconds)||b.targetSeconds<1||b.targetSeconds>7200||!onValid||!offValid||!channelsValid||!validStimulation(b.stimulation)||(b.timingPolicy!==undefined&&!['metabolic','custom','pending','beginner','hypertrophy','no-ems'].includes(b.timingPolicy))||(b.timingLocked!==undefined&&typeof b.timingLocked!=='boolean')||(b.sequence!==undefined&&!['circuit','pairs','exercise'].includes(b.sequence))||!['manual','auto'].includes(b.roundMode)||!Number.isInteger(b.rounds)||b.rounds<1||b.rounds>100||!str(b.notes)||!Array.isArray(b.slots)||!b.slots.length||b.slots.length>12||(b.variation!==undefined&&b.variation!=='inherit'&&!Object.hasOwn(VARIATION_MODES,b.variation)))return false;
      bid.add(b.id);for(const s of b.slots){if(!str(s.id,100)||sid.has(s.id)||!Object.hasOwn(patterns,s.pattern)||typeof s.locked!=='boolean'||(s.exerciseId!==null&&!str(s.exerciseId,100)))return false;sid.add(s.id);}
      if(isHypertrophyBlock(b)&&!validHypertrophyBlock(b))return false;
    }
    return true;
  };
  const validPlan=plan=>validBlocks(plan.blocks)&&(
    isHypertrophyPlan(plan)
      ? plan.profile!=='principiante'&&plan.blocks.some(isHypertrophyWork)&&plan.blocks.every(isHypertrophyBlock)
      : !plan.blocks.some(isHypertrophyBlock)
  );
  if(!validPlan(data))throw Error('La plantilla no es válida.');
  if(data.drafts!==undefined){
    if(!data.drafts||typeof data.drafts!=='object'||Array.isArray(data.drafts))throw Error('Los borradores no son válidos.');
    for(const [key,draft] of Object.entries(data.drafts)){
      if(!draft||key!==(isHypertrophyPlan(draft)?'hypertrophy':'metabolic')||!validPlan(draft)||!validFilters(draft.filters)||!validProgramming(draft)||!str(draft.title,140)||!str(draft.notes))throw Error('Un borrador no es válido.');
    }
  }
  for(const s of data.saved){if(!str(s.id,100)||!str(s.title,140)||!str(s.date,100)||Number.isNaN(Date.parse(s.date))||!validPlan(s)||!validFilters(s.filters)||!validProgramming(s)||!Array.isArray(s.exercises)||s.exercises.length>200||(s.notes!==undefined&&!str(s.notes)))throw Error('Una sesión guardada no es válida.');validateExercises(s.exercises);}
  return data;
}
