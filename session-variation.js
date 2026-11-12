import {roundBlockDurations,solveTiming} from './engine.js?v=minutos-enteros';
import {METABOLIC_TIMINGS,varyMetabolicTiming} from './metabolic.js?v=tiempos-bloques';
import {HYPERTROPHY_LIMIT,isHypertrophyBlock,isHypertrophyWork,plannedEmsSeconds,varyHypertrophyTiming} from './hypertrophy.js?v=rutina-parametros';
import {wiemsproProgram} from './wiemspro.js?v=programas-ems';

export const METABOLIC_SESSION_SECONDS=35*60;
// Intermittent ON planning reference for the 35-minute ImpulsaFit session.
export const METABOLIC_ON_REFERENCE=17*60+10;
const WEEKLY_RANGES={main:[480,960],core:[180,360]};
const DEFAULT_DURATION_PHASES=['activation','strength','recovery'];

export function metabolicWorkSummary(blocks,timings=blocks.map(solveTiming)){
  let work=0,continuous=0;
  blocks.forEach((block,index)=>{
    const on=timings[index].work||0;
    if(block.phase==='recovery')continuous+=on;
    else work+=on;
  });
  return {work,continuous};
}

const hasFixedTiming=block=>block.timingLocked||block.roundMode==='manual'
  ||block.timingPolicy==='pending'||(block.timingPolicy==='custom'&&!wiemsproProgram(block));
const canPlanWeeklyBlock=block=>Object.hasOwn(WEEKLY_RANGES,block.phase)&&!hasFixedTiming(block);

function weeklyBlockOptions(block){
  const current=solveTiming(block);
  const fixed=current.error||block.targetSeconds%60!==0?[]:[{block,timing:current}];
  if(!canPlanWeeklyBlock(block))return fixed;
  const [min,max]=WEEKLY_RANGES[block.phase];
  const reference=METABOLIC_TIMINGS[block.phase];
  const program=wiemsproProgram(block);
  const cycles=program?[[program.on,program.off]]:reference.variants;
  const options=[];
  for(const [on,off] of cycles){
    for(let seconds=min;seconds<=max;seconds+=60){
      const candidate={...block,targetSeconds:seconds};
      if(!program){
        candidate.preferredOn=on;
        candidate.preferredOff=off;
        candidate.timingPolicy='metabolic';
      }
      const timing=solveTiming(candidate);
      if(!timing.error)options.push({block:candidate,timing});
    }
  }
  if(!options.length)return fixed;
  return block.targetSeconds<min||block.targetSeconds>max?[...options,...fixed]:options;
}

function bestWeeklyPlan(blocks,choices){
  if(choices.some(options=>!options.length))return null;
  const remaining=[{min:0,max:0}];
  for(const options of [...choices].reverse()){
    const seconds=options.map(({block})=>block.targetSeconds),tail=remaining[0];
    remaining.unshift({min:Math.min(...seconds)+tail.min,max:Math.max(...seconds)+tail.max});
  }
  let plans=new Map([[0,{seconds:0,work:0,changed:false,score:0,blocks:[]}]]);
  for(const [index,options] of choices.entries()){
    const next=new Map();
    const phase=blocks[index].phase,reference=METABOLIC_TIMINGS[phase];
    const scored=options.map(({block,timing})=>{
      const changed=block.targetSeconds!==blocks[index].targetSeconds;
      const cycleReference=wiemsproProgram(block)||reference;
      const standardCycle=phase!=='recovery'&&timing.on===cycleReference.on&&timing.off===cycleReference.off;
      const score=Number(standardCycle)*0.45-timing.buffer/30;
      return {block,work:phase==='recovery'?0:timing.work,changed,score};
    });
    for(const plan of plans.values()){
      for(const option of scored){
        const {block}=option;
        const seconds=plan.seconds+block.targetSeconds;
        const left=METABOLIC_SESSION_SECONDS-seconds,tail=remaining[index+1];
        if(left<tail.min||left>tail.max)continue;
        const work=plan.work+option.work,changed=plan.changed||option.changed;
        const state=(seconds*(METABOLIC_SESSION_SECONDS+1)+work)*2+Number(changed);
        const score=plan.score+option.score;
        if(score>(next.get(state)?.score??-Infinity))next.set(state,{seconds,work,changed,score,blocks:[...plan.blocks,block]});
      }
    }
    plans=next;
  }
  const complete=[...plans.values()];
  const withinReference=complete.filter(plan=>plan.work<=METABOLIC_ON_REFERENCE);
  const changed=withinReference.filter(plan=>plan.changed);
  const options=changed.length?changed:withinReference;
  const quality=plan=>plan.score-Math.abs(plan.work-METABOLIC_ON_REFERENCE)/50;
  if(options.length)return options.reduce((best,plan)=>quality(plan)>quality(best)?plan:best);
  // A manually chosen or locked combination may exceed the reference. Keep
  // the 35-minute plan with the smallest feasible ON and show it in the summary.
  return complete.sort((a,b)=>a.work-b.work||Number(b.changed)-Number(a.changed)||b.score-a.score)[0];
}

function rebalanceLegacyMetabolicDurations(blocks){
  const choices=blocks.map(block=>weeklyBlockOptions(block));
  const exact=bestWeeklyPlan(blocks,choices);
  if(exact)return exact.blocks;
  const total=blocks.reduce((seconds,block)=>seconds+block.targetSeconds,0);
  if(total===METABOLIC_SESSION_SECONDS&&blocks.every(block=>block.targetSeconds%60===0&&!solveTiming(block).error))return blocks;
  return null;
}

export function updateMetabolicDurationDefaults(blocks){
  const updated=blocks.map(block=>{
    if(!DEFAULT_DURATION_PHASES.includes(block.phase)||block.timingPolicy==='beginner'||hasFixedTiming(block))return block;
    const targetSeconds=METABOLIC_TIMINGS[block.phase].seconds;
    if(block.targetSeconds===targetSeconds)return block;
    const adjusted={...block,targetSeconds};
    if(block.phase==='recovery')adjusted.preferredOn=targetSeconds;
    return solveTiming(adjusted).error?block:adjusted;
  });
  const wasFullSession=blocks.reduce((seconds,block)=>seconds+block.targetSeconds,0)===METABOLIC_SESSION_SECONDS;
  if(wasFullSession&&updated.some((block,index)=>block!==blocks[index])){
    return rebalanceLegacyMetabolicDurations(updated)??blocks;
  }
  return updated;
}

const DURATION_SHIFTS=[60,-60];
const pick=(options,rng)=>options[Math.floor(rng()*options.length)];

function shiftDuration(block,shift,{beginner,rng}){
  const durationReference=block.durationReference%60===0?block.durationReference:block.targetSeconds;
  const targetSeconds=block.targetSeconds+shift;
  if(targetSeconds<60||targetSeconds>7200||Math.abs(targetSeconds-durationReference)>60)return null;
  const adjusted={...block,durationReference,targetSeconds};
  const options={forceBlock:block.id,beginner,solve:solveTiming,rng};
  const vary=isHypertrophyBlock(block)?varyHypertrophyTiming:varyMetabolicTiming;
  const candidate=vary([block],[adjusted],options).blocks[0];
  const timing=solveTiming(candidate);
  if(timing.error)return null;
  if(!isHypertrophyBlock(block)&&block.phase!=='recovery'){
    const rule=METABOLIC_TIMINGS[block.phase];
    if(timing.on<rule.minOn||timing.on>rule.on||timing.off<rule.off)return null;
  }
  return candidate;
}

function redistributeDuration(blocks,indices,options){
  if(indices.length<2)return;
  const shifts=indices.map(index=>new Map(DURATION_SHIFTS.map(shift=>[
    shift,shiftDuration(blocks[index],shift,options)
  ])));
  const pairs=[];
  for(const [i,first] of indices.entries()){
    for(const [j,second] of indices.entries()){
      if(j<=i)continue;
      for(const shift of DURATION_SHIFTS){
        const a=shifts[i].get(shift),b=shifts[j].get(-shift);
        if(a&&b)pairs.push({first,second,a,b});
      }
    }
  }
  if(!pairs.length)return;
  const {first,second,a,b}=pick(pairs,options.rng);
  blocks[first]=a;
  blocks[second]=b;
}

export function varySessionProgramming(blocks,{profile,hypertrophy=false,rng=Math.random}={}){
  const minutes=roundBlockDurations(blocks,{
    skip:block=>block.timingLocked,
    group:block=>hypertrophy&&isHypertrophyWork(block)
  });
  if(minutes.some(block=>block.targetSeconds%60!==0))return null;
  if(!hypertrophy&&profile!=='principiante')return minutes;
  if(hypertrophy&&plannedEmsSeconds(minutes)>HYPERTROPHY_LIMIT)return null;
  const available=minutes.flatMap((block,index)=>
    block.timingLocked||block.timingPolicy==='pending'||solveTiming(block).error?[]:[index]
  );
  const adjustable=available.filter(index=>{
    const block=minutes[index];
    return isHypertrophyBlock(block)||block.timingPolicy!=='custom'&&block.roundMode==='auto';
  });
  const updated=[...minutes];
  const options={beginner:profile==='principiante',rng};
  if(hypertrophy){
    // Keep the time budget for the EMS phase separate from voluntary exercise.
    redistributeDuration(updated,adjustable.filter(index=>isHypertrophyWork(minutes[index])),options);
    redistributeDuration(updated,adjustable.filter(index=>!isHypertrophyWork(minutes[index])),options);
  }else{
    redistributeDuration(updated,adjustable,options);
  }
  return updated;
}
