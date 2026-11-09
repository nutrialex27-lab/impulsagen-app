import {CHANNELS,exerciseInvolvement} from './metabolic.js';

export const HYPERTROPHY_TEMPLATE='hypertrophy';
export const HYPERTROPHY_ON=[20,30];
export const HYPERTROPHY_OFF=40;
export const HYPERTROPHY_LIMIT=20*60;
export const HYPERTROPHY_HZ=[80,81,82,83,84,85];
export const HYPERTROPHY_REST=[40,60,90,120];
export const HYPERTROPHY_GROUPS=[...CHANNELS,'HOMBROS','GEMELOS'];

const ACCESSORY_PATTERNS={
  equilibrado:['cadera','hombro','gemelo'],
  torso:['hombro','biceps','triceps'],
  piernas:['cadera','abduccion','gemelo']
};
const PHYSICAL_EFFORT={activation:[2,3],main:[6,7],core:[4,5],recovery:[1,2]};

// Maps follow the order of the 10 controls in the Wiemspro PRO reference sheet.
const CHANNEL_MAPS={
  rodilla:['5–6','1–2','3–4','0','0','0','2–3','0','0','0'],
  empuje:['0','0','0','0','0','0','2–3','5–6','3–4','0'],
  flexionrodilla:['0','5–6','0','0','0','0','0','0','0','0'],
  tiron:['0','0','0','0','5–6','2–3','2–3','0','3–4','0']
};

export const isHypertrophyWork=block=>block.timingPolicy==='hypertrophy';
export const isHypertrophyBlock=block=>isHypertrophyWork(block)||block.timingPolicy==='no-ems';
export const isHypertrophyPlan=plan=>plan.template===HYPERTROPHY_TEMPLATE;

export function makeHypertrophyTemplate(){
  const voluntary=(id,name,phase,targetSeconds,patterns)=>({
    id,name,phase,targetSeconds,timingPolicy:'no-ems',preferredOn:1,preferredOff:0,
    roundMode:'manual',rounds:1,sequence:'exercise',variation:'inherit',notes:'',
    slots:patterns.map((pattern,i)=>({id:`${id}-${i}`,pattern,exerciseId:null,locked:false}))
  });
  const work=(id,name,pattern)=>({
    ...voluntary(id,name,'main',300,[pattern]),timingPolicy:'hypertrophy',
    preferredOn:20,preferredOff:HYPERTROPHY_OFF,rounds:2,hz:80,restSeconds:90
  });
  return [
    voluntary('hip-activation','Calentamiento','activation',480,['locomocion']),
    work('hip-legs','Piernas · con EMS','rodilla'),
    work('hip-push','Pecho · con EMS','empuje'),
    work('hip-hamstring','Femoral · con EMS','flexionrodilla'),
    work('hip-pull','Dorsal · con EMS','tiron'),
    voluntary('hip-accessories','Complementos de sala','main',720,ACCESSORY_PATTERNS.equilibrado),
    voluntary('hip-core','Core','core',180,['antiextension']),
    voluntary('hip-recovery','Vuelta a la calma','recovery',300,['respiracion'])
  ];
}

export function applyHypertrophyEmphasis(blocks,emphasis){
  const patterns=ACCESSORY_PATTERNS[emphasis];
  return blocks.map(block=>block.id!=='hip-accessories'?block:{
    ...block,
    slots:block.slots.map((slot,index)=>{
      const pattern=patterns[index];
      if(slot.locked||!pattern||pattern===slot.pattern)return slot;
      return {...slot,pattern,exerciseId:null};
    })
  });
}

const PREFERRED_EXERCISES={
  'hip-activation':[['sala-cinta','sala-bici','base-1']],
  'hip-legs':[['sala-prensa','base-13','catalog-009','base-10']],
  'hip-push':[['sala-press-pecho','strength-bench-neutral','catalog-060']],
  'hip-hamstring':[['sala-femoral-sentado','sala-femoral-tumbado','catalog-130','catalog-129']],
  'hip-pull':[['sala-jalon','sala-remo-sentado','strength-chest-row-neutral','base-30']],
  'hip-accessories':[['sala-glute-drive','catalog-042','catalog-041'],['sala-laterales','catalog-111'],['sala-gemelo-pie','catalog-149','catalog-148']],
  'hip-core':[['base-47','sala-abdominales']],
  'hip-recovery':[[]]
};

export function initialHypertrophyBlocks(database,filters,eligible){
  const used=new Set();
  const blocks=makeHypertrophyTemplate();
  // Prioritize the working exercises before choosing warm-up alternatives.
  const ordered=[...blocks.filter(isHypertrophyWork),...blocks.filter(b=>!isHypertrophyWork(b))];
  for(const block of ordered){
    for(const [index,slot] of block.slots.entries()){
      const ids=PREFERRED_EXERCISES[block.id][index];
      const compatible=database.filter(e=>!used.has(e.id)&&eligible(e,block,slot,filters));
      const chosen=ids.map(id=>compatible.find(e=>e.id===id)).find(Boolean)||compatible[0];
      if(chosen){slot.exerciseId=chosen.id;used.add(chosen.id);}
    }
  }
  return blocks;
}

export function validHypertrophyBlock(block){
  if(block.timingPolicy==='no-ems')return block.preferredOff===0;
  return block.phase==='main'&&block.slots.length===1&&Object.hasOwn(CHANNEL_MAPS,block.slots[0].pattern)&&
    HYPERTROPHY_ON.includes(block.preferredOn)&&block.preferredOff===HYPERTROPHY_OFF&&
    HYPERTROPHY_HZ.includes(block.hz)&&HYPERTROPHY_REST.includes(block.restSeconds)&&
    block.roundMode==='manual'&&Number.isInteger(block.rounds)&&block.rounds>=1&&block.rounds<=4;
}

export function solveHypertrophyTiming(block){
  const total=block.targetSeconds;
  if(block.timingPolicy==='no-ems')return {rounds:1,cycles:0,on:0,off:0,buffer:0,total,work:0};
  if(!validHypertrophyBlock(block))return {error:'El bloque necesita un ejercicio, un ciclo 20/40 o 30/40 y entre una y cuatro series.'};
  const {rounds,preferredOn:on,preferredOff:off,restSeconds}=block;
  const extraRest=restSeconds-off;
  const used=rounds*(on+off)+(rounds-1)*extraRest;
  if(used>total)return {error:'La duración no alcanza para las series y la recuperación. Amplía el bloque o ajusta las series.'};
  return {rounds,cycles:rounds,on,off,extraRest,buffer:total-used,total,work:rounds*on};
}

export function varyHypertrophyTiming(before,after,{enabled=true,forceBlock=null}={}){
  let changed=0,skipped=0;
  if(!enabled)return {blocks:after,changed,skipped};
  const previous=new Map(before.map(block=>[block.id,block]));
  const blocks=after.map(block=>{
    if(!isHypertrophyWork(block)||block.timingLocked)return block;
    const old=previous.get(block.id);
    const affected=forceBlock?block.id===forceBlock:old&&old.slots[0].exerciseId!==block.slots[0].exerciseId;
    if(!affected)return block;
    const preferredOn=HYPERTROPHY_ON.find(on=>on!==block.preferredOn);
    const candidate={...block,preferredOn};
    if(solveHypertrophyTiming(candidate).error){skipped++;return block;}
    changed++;
    return candidate;
  });
  return {blocks,changed,skipped};
}

export function hypertrophyChannels(exercise){
  if(exercise.family==='extensionrodilla')return ['5–6',...Array(9).fill('0')];
  return [...(CHANNEL_MAPS[exercise.pattern]||Array(10).fill('0'))];
}

export function hypertrophyStimulation(block){
  const work=isHypertrophyWork(block);
  return {
    hz:work?block.hz:0,
    ems:work?[5,6]:[0,0],
    rpe:PHYSICAL_EFFORT[block.phase]||[3,4]
  };
}

function hypertrophyWeights(exercise){
  const {pattern,family}=exercise;
  const weights=exerciseInvolvement(exercise,pattern);
  if(family==='extensionrodilla'){
    weights.fill(0);
    weights[0]=1;
  }else if(pattern==='flexionrodilla'&&/curl|femoral/.test(family)){
    weights.fill(0);
    weights[1]=1;
  }else if(pattern==='hombro'){
    weights[5]=family==='aperturaposterior'?.5:.25;
  }else if(pattern==='tiron'&&['jalon','dominadas'].includes(family)){
    weights[5]=.4;
  }
  return [...weights,0,Number(pattern==='hombro'),Number(pattern==='gemelo')];
}

export function hypertrophyMuscleProposal(block,database){
  const exercises=block.slots.map(slot=>database.find(exercise=>exercise.id===slot.exerciseId));
  const ready=exercises.every(Boolean);
  const sensations=isHypertrophyWork(block)&&ready?hypertrophyChannels(exercises[0]):Array(CHANNELS.length).fill('0');
  if(!ready)return {percentages:null,sensations,focus:[]};

  // These are relative programming weights. The current is calibrated per channel.
  const scores=Array(HYPERTROPHY_GROUPS.length).fill(0);
  for(const exercise of exercises){
    hypertrophyWeights(exercise).forEach((weight,index)=>{scores[index]+=weight;});
  }
  const total=scores.reduce((sum,score)=>sum+score,0);
  if(!total)return {percentages:scores,sensations,focus:[]};

  const percentages=scores.map(score=>Math.round(100*score/total));
  const top=Math.max(...scores);
  percentages[scores.indexOf(top)]+=100-percentages.reduce((sum,percent)=>sum+percent,0);
  const focus=HYPERTROPHY_GROUPS.filter((_,index)=>scores[index]===top);
  return {percentages,sensations,focus};
}

export function hypertrophyExerciseSuitable(exercise,block){
  if(!isHypertrophyWork(block))return true;
  const isometric=/isom[eé]tr|sost[eé]n|est[aá]tic/i.test(`${exercise.name} ${exercise.family}`);
  const isolation=['apertura','escapular','aperturaposterior','facepull','jalonrecto'].includes(exercise.family);
  const vertical=exercise.pattern==='empuje'&&(/vertical|hombro/.test(exercise.family)||exercise.flags.includes('overhead'));
  return !isometric&&!isolation&&!vertical;
}

export function plannedEmsSeconds(blocks){
  return blocks.filter(isHypertrophyWork).reduce((seconds,block)=>seconds+block.targetSeconds,0);
}
