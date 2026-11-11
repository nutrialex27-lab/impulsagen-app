// Reference: ImpulsaFit weekly metabolic routines S9-S12. The additional
// lower-duty variants below are new programming options, not historical claims.
import {NOVICE_TIMINGS,NOVICE_CHANNELS,NOVICE_LEVELS,noviceTiming} from './novice-presets.js';
import {METABOLIC_TIMINGS} from './metabolic-presets.js';
export {METABOLIC_TIMINGS} from './metabolic-presets.js';
export const PROGRAMMING_VERSION=4;
export const CHANNELS=['PIERNAS','ISQUIO','GLÚTEOS','LUMBAR','DORSAL','TRAPECIO','ABDOM.','PECHO','BRAZO','EXTRA1'];
const activation=[48,50,52,30,42,35,45,38,35,0],core=[30,32,38,32,40,30,65,35,32,0],metabolic=[60,62,65,35,58,45,60,55,50,0],recovery=[25,25,28,20,22,18,20,20,18,0];
const torso=[55,55,58,35,68,50,60,66,60,0],legStrength=[65,68,70,35,58,42,60,55,48,0],legMain=[68,68,72,35,55,42,60,52,48,0];
const knownLevels=CHANNELS.map((_,i)=>[...new Set([activation,torso,legStrength,legMain,core,metabolic,recovery].map(values=>values[i]))].sort((a,b)=>a-b));
export function channelReference(phase,profile,emphasis){
 if(profile==='principiante')return {source:'beginner',values:[...NOVICE_CHANNELS[phase]]};
 const focus=emphasis==='torso'||emphasis==='piernas'?emphasis:profile==='hombre'?'torso':profile==='mujer'?'piernas':null;
 if(!focus)return {source:'pending',values:[...Array(9).fill(null),0]};
 const common={activation,core,metabolic,recovery},values=common[phase]||(phase==='main'&&focus==='piernas'?legMain:focus==='piernas'?legStrength:torso);
 return {source:focus,values:[...values]};
}
export function withChannelReferences(blocks,profile,emphasis,{overwrite=false,pending=false}={}){
 return blocks.map(b=>({...b,channels:!overwrite&&b.channels?structuredClone(b.channels):pending?{source:'pending',values:[...Array(9).fill(null),0]}:channelReference(b.phase,profile,emphasis)}));
}
// Qualitative programming roles, not measured activation or a current-dose
// prediction. Numeric levels are drawn from the user's existing S12 references.
const INVOLVEMENT={
 rodilla:[1,.3,.8,.15,0,0,.35,0,0],cadera:[.35,1,1,.25,.15,0,.35,0,0],
 empuje:[0,0,0,.1,0,.15,.35,1,.7],tiron:[.1,.15,.1,.25,1,.8,.35,0,.7],
 biceps:[0,0,0,0,0,0,.15,0,1],triceps:[0,0,0,0,0,0,.15,.2,1],hombro:[0,0,0,.1,.3,.65,.25,.2,.4],
 flexionrodilla:[.15,1,.35,.1,0,0,.15,0,0],abduccion:[.3,.15,1,.1,0,0,.2,0,0],gemelo:[0,0,0,0,0,0,.1,0,0],
 antirotacion:[.15,.1,.2,.35,.3,.15,1,.1,.2],antiextension:[.15,.1,.3,.35,.3,.2,1,.35,.35],antilateral:[.15,.1,.35,.5,.4,.2,1,.2,.25],flexiontronco:[0,0,.1,.2,0,0,1,0,0],
 locomocion:[.8,.4,.7,.15,.1,.15,.4,.1,.2],global:[.8,.5,.8,.2,.4,.3,.7,.5,.6]
};
function movementWeights(exercise,pattern){
 const weights=[...(INVOLVEMENT[pattern]||Array(9).fill(0))];
 if(pattern==='tiron'){
  const supported=exercise?.position==='sentado'||/apoyo|apoyad|trx/i.test(exercise?.name||'');weights[3]=supported?.15:.35;
  if(['facepull','aperturaposterior','escapular'].includes(exercise?.family)){weights[4]=.5;weights[5]=1;weights[8]=.3;}
 }
 if(pattern==='empuje'&&['vertical','pressvertical'].includes(exercise?.family)){weights[7]=.2;weights[5]=.6;weights[8]=.8;}
 if(exercise?.id==='base-40'){weights[7]=.1;weights[5]=.3;weights[8]=.2;}
 if(pattern==='cadera'&&/puente|hipthrust|extension/.test(exercise?.family||'')){weights[1]=.5;weights[3]=.15;}
 return weights;
}
export function exerciseInvolvement(exercise,pattern){
 const components=exercise?.components?.length?exercise.components:[pattern];
 const scores=Array(9).fill(0);
 for(const component of components){
  movementWeights(exercise,component).forEach((weight,index)=>{
   scores[index]=Math.max(scores[index],weight);
  });
 }
 return scores;
}
export function proposeChannels(block,database,profile,emphasis){
 let reference=channelReference(block.phase,profile,emphasis);
 if(reference.source==='pending'){
  if(profile==='principiante')return reference;
  const a=channelReference(block.phase,'hombre','torso').values,b=channelReference(block.phase,'mujer','piernas').values;
  reference={source:'neutral',values:a.map((v,i)=>Math.min(v,b[i]))};
 }
 const records=block.slots.map(s=>database.find(e=>e.id===s.exerciseId));
 if(records.some(e=>!e))return {source:'pending',values:[...Array(9).fill(null),0],reason:'exercise'};
 const novice=profile==='principiante';
 const movements=block.slots.map((s,i)=>{
  const record=records[i];
  const identity=[s.pattern,record.family,record.position,record.name];
  if(record.components)identity.push(record.components);
  return identity;
 });
 const fingerprint=JSON.stringify([novice?'auto-beginner-v1':'auto-v1',profile,emphasis,block.phase,movements]);
 const scores=Array(9).fill(0);block.slots.forEach((s,i)=>exerciseInvolvement(records[i],s.pattern).forEach((v,c)=>scores[c]=Math.max(scores[c],v)));
 const torsoReference=channelReference(block.phase,'hombre','torso').values,legReference=channelReference(block.phase,'mujer','piernas').values;
 const roles=scores.map(score=>score>=.75?'principal':score>=.3?'apoyo':'base');
 const values=reference.values.map((cap,i)=>{
  if(i===9)return 0;
  if(['activation','recovery'].includes(block.phase))return cap;
  const lower=novice?cap:Math.min(torsoReference[i],legReference[i]),background=Math.min(novice?NOVICE_CHANNELS.activation[i]:activation[i],lower);
  const support=(novice?NOVICE_LEVELS:knownLevels)[i].filter(value=>value<cap&&value>=background).at(-1)??background;
  return roles[i]==='principal'?cap:roles[i]==='apoyo'?support:background;
 });
 const same=block.channels?.source==='auto'&&block.channels.fingerprint===fingerprint&&values.every((v,i)=>v===block.channels.values[i]);
 const changed=same&&Array.isArray(block.channels.changed)?block.channels.changed.filter(i=>Number.isInteger(i)&&i>=0&&i<10):block.channels?.source==='auto'?values.flatMap((v,i)=>v!==block.channels.values[i]?[i]:[]):[];
 return {source:'auto',values,roles,fingerprint,changed,focus:CHANNELS.filter((_,i)=>i<9&&roles[i]==='principal')};
}
export function withChannelProposals(blocks,database,profile,emphasis){
 return blocks.map(b=>({...b,channels:proposeChannels(b,database,profile,emphasis)}));
}
export function resetMetabolicTiming(block,{beginner=false,resetDuration=false}={}){
 if(beginner)return noviceTiming(block,{preserveDuration:!resetDuration});
 const r=METABOLIC_TIMINGS[block.phase];
 const result={...structuredClone(block),targetSeconds:resetDuration?r.seconds:block.targetSeconds,preferredOn:r.on,preferredOff:r.off,roundMode:'auto',rounds:1,timingPolicy:'metabolic',timingLocked:false};
 if(resetDuration)delete result.durationReference;
 return result;
}
export function sequenceGroups(block){
 const order=block.slots.map((_,i)=>i+1);
 return block.sequence==='exercise'?order.map(i=>[i]):block.sequence==='pairs'?Array.from({length:Math.ceil(order.length/2)},(_,i)=>order.slice(i*2,i*2+2)):[order];
}
export function varyMetabolicTiming(before,after,{enabled=true,beginner=false,forceBlock=null,solve,rng=Math.random}={}){
 const result=structuredClone(after);let changed=0,skipped=0;
 if(!enabled)return {blocks:result,changed,skipped};
 for(const b of result){
  const previous=before.find(x=>x.id===b.id),affected=forceBlock===b.id||previous&&(b.slots.length!==previous.slots.length||b.slots.some(s=>s.exerciseId!==previous.slots.find(p=>p.id===s.id)?.exerciseId));
  if(!affected||b.phase==='recovery'||b.timingLocked||b.timingPolicy==='pending')continue;
  const rule=(beginner?NOVICE_TIMINGS:METABOLIC_TIMINGS)[b.phase],old=solve(b),options=rule.variants.map(([on,off])=>({...b,preferredOn:on,preferredOff:off,timingPolicy:beginner?'beginner':'metabolic'})).filter(candidate=>{const t=solve(candidate);return !t.error&&t.on>=rule.minOn&&t.on<=rule.on&&t.off>=rule.off&&(old.error||t.on!==old.on||t.off!==old.off);});
  if(!options.length){skipped++;continue;}
  Object.assign(b,options[Math.min(options.length-1,Math.floor(rng()*options.length))]);changed++;
 }
 return {blocks:result,changed,skipped};
}
export function migrateProgramming(blocks,profile,emphasis){
 const result=structuredClone(blocks),oldVisual={activation:[300,40,10],strength:[300,20,30],main:[720,25,20],core:[300,30,20],metabolic:[300,30,20],recovery:[180,90,0]};
 const oldWeekly={activation:[300,25,25],main:[900,25,20],core:[360,30,30],metabolic:[360,30,30],recovery:[180,90,0]};
 const factoryVisual=profile!=='principiante'&&result.length===6&&new Set(result.map(b=>b.phase)).size===6&&result.every(b=>oldVisual[b.phase]?.every((v,i)=>v===[b.targetSeconds,b.preferredOn,b.preferredOff][i])&&b.roundMode==='auto');
 for(const b of result){
  if(profile==='principiante'&&b.phase!=='recovery'&&b.preferredOn===4&&b.preferredOff===4){b.preferredOn=null;b.preferredOff=null;b.timingPolicy='pending';}
  else if(profile!=='principiante'){
   const legacy=[oldVisual[b.phase],oldWeekly[b.phase]].some(v=>v&&b.preferredOn===v[1]&&b.preferredOff===v[2]);
   if(legacy&&!b.timingPolicy){const r=METABOLIC_TIMINGS[b.phase];b.preferredOn=r.on;b.preferredOff=r.off;b.timingPolicy='metabolic';}
   if(factoryVisual)b.targetSeconds=METABOLIC_TIMINGS[b.phase].seconds;
  }
  if(b.phase==='main')b.sequence??='pairs';
 }
 return result;
}
