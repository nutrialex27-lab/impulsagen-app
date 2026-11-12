import {SEED,PATTERNS,PHASES,EQUIPMENT,PATTERN_GROUP} from './data.js?v=tiempos-bloques';
import {PROFILES,EMPHASES} from './profiles.js';
import {validateBackup,eligible,alternativeEligible} from './engine.js?v=programas-ems';
import {migrateProgramming,PHASE_ORDER_VERSION,PROGRAMMING_VERSION} from './metabolic.js?v=tiempos-bloques';
import {upgradeNoviceBlocks} from './novice-presets.js';
import {recommendedOrder} from './builder.js?v=tiempos-bloques';
import {updateMetabolicDurationDefaults} from './session-variation.js?v=minutos-enteros';
import {GYM_EQUIPMENT} from './gym-catalog.js';
import {METABOLIC_CATALOG_VERSION} from './metabolic-catalog.js?v=banco-cardio';
import {isHypertrophyBlock,isHypertrophyPlan,isHypertrophyWork} from './hypertrophy.js';
export const CATALOG_VERSION=METABOLIC_CATALOG_VERSION;
export function upgradeState(input){
  validateBackup(input,PATTERNS,PHASES,EQUIPMENT);
  const data=structuredClone(input),oldVersion=Number.isInteger(data.catalogVersion)?data.catalogVersion:1;
  const names=new Set(data.database.map(e=>e.name.trim().toLocaleLowerCase('es'))),ids=new Set(data.database.map(e=>e.id));
  for(const e of SEED)if(data.database.length<3000&&e.catalogVersion>oldVersion&&!ids.has(e.id)&&!names.has(e.name.trim().toLocaleLowerCase('es'))){data.database.push(structuredClone(e));ids.add(e.id);names.add(e.name.trim().toLocaleLowerCase('es'));}
  data.catalogVersion=Math.max(oldVersion,CATALOG_VERSION);
  data.profile=Object.hasOwn(PROFILES,data.profile)?data.profile:'sin-definir';
  data.emphasis=Object.hasOwn(EMPHASES,data.emphasis)?data.emphasis:'equilibrado';
  data.filters.variation??='zone';
  if(data.profile==='principiante'){data.filters.beginner=true;data.filters.level=1;data.filters.noOverhead=true;data.filters.noTravel=true;}
  else if(data.filters.beginner)data.filters.beginner=false;
  data.title=typeof data.title==='string'?data.title.slice(0,140):'Metabólica · Sesión nueva';
  data.notes=typeof data.notes==='string'?data.notes.slice(0,2000):'';
  const oldProgramming=data.programmingVersion||0;
  if(oldProgramming<PHASE_ORDER_VERSION){
    if(!oldProgramming)data.blocks=migrateProgramming(data.blocks,data.profile,data.emphasis);
    if(data.profile==='principiante')data.blocks=upgradeNoviceBlocks(data.blocks);
    data.blocks=recommendedOrder(data.blocks);
  }
  if(oldProgramming<PROGRAMMING_VERSION){
    if(data.profile!=='principiante'&&!isHypertrophyPlan(data))data.blocks=updateMetabolicDurationDefaults(data.blocks);
    const metabolicDraft=data.drafts?.metabolic;
    if(metabolicDraft&&metabolicDraft.profile!=='principiante'){
      metabolicDraft.blocks=updateMetabolicDurationDefaults(metabolicDraft.blocks);
    }
    data.programmingVersion=PROGRAMMING_VERSION;
  }
  data.saved.forEach(s=>{s.profile=Object.hasOwn(PROFILES,s.profile)?s.profile:'sin-definir';s.emphasis=Object.hasOwn(EMPHASES,s.emphasis)?s.emphasis:'equilibrado';s.filters.variation??='zone';if(s.profile==='principiante'){s.filters.beginner=true;s.filters.level=1;s.filters.noOverhead=true;s.filters.noTravel=true;}else if(s.filters.beginner)s.filters.beginner=false;});
  return data;
}
export function manualCandidates(blocks,database,filters,{blockId,slotId,pattern='all',family='',query='',avoidIds=[]}){
  const block=blocks.find(b=>b.id===blockId),slot=block?.slots.find(s=>s.id===slotId);if(!slot)return [];
  const occupied=new Set(blocks.flatMap(b=>b.slots.filter(s=>s.id!==slotId).map(s=>s.exerciseId))),avoid=new Set(avoidIds);
  const q=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
  const current=database.find(e=>e.id===slot.exerciseId),scope=pattern==='all'?'block':pattern==='zone'?'zone':'pattern';
  const criterion={...slot,pattern:isHypertrophyWork(block)||['all','zone'].includes(pattern)?slot.pattern:pattern};
  return database.filter(e=>(!family||e.family===family)&&!occupied.has(e.id)&&(!avoid.has(e.id)||e.id===slot.exerciseId)&&alternativeEligible(e,block,criterion,filters,scope)&&(!q||`${e.name} ${PATTERNS[e.pattern]} ${e.family} ${e.cue} ${e.equipment.map(k=>EQUIPMENT[k]).join(' ')}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').includes(q))).sort((a,b)=>{
    const levelOrder=block.phase==='metabolic'?b.level-a.level:0;
    const salaOrder=isHypertrophyBlock(block)?Number(b.equipment.some(key=>GYM_EQUIPMENT.includes(key)))-Number(a.equipment.some(key=>GYM_EQUIPMENT.includes(key))):0;
    const zoneOrder=Number(PATTERN_GROUP[b.pattern]===PATTERN_GROUP[slot.pattern])-Number(PATTERN_GROUP[a.pattern]===PATTERN_GROUP[slot.pattern]);
    const familyOrder=Number(a.family===current?.family)-Number(b.family===current?.family);
    return levelOrder||salaOrder||zoneOrder||familyOrder||a.name.localeCompare(b.name,'es');
  });
}
