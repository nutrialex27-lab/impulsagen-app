import {solveTiming} from './engine.js?v=metabolica-35';
import {METABOLIC_TIMINGS,varyMetabolicTiming} from './metabolic.js?v=rutina-parametros';
import {isHypertrophyBlock,isHypertrophyWork,varyHypertrophyTiming} from './hypertrophy.js?v=rutina-parametros';

export const METABOLIC_SESSION_SECONDS=35*60;
const WEEKLY_RANGES={
  activation:[240,360],strength:[180,300],main:[480,900],
  core:[180,360],metabolic:[180,450],recovery:[180,300]
};
const TARGET_CHANGES=3;

const canPlanWeeklyBlock=block=>!block.timingLocked&&block.roundMode==='auto'
  &&block.timingPolicy!=='custom'&&block.timingPolicy!=='pending';

function weeklyBlockOptions(block,{flexible=false}={}){
  const current=()=>solveTiming(block).error?[]:[block];
  if(!canPlanWeeklyBlock(block))return current();
  const [min,max]=WEEKLY_RANGES[block.phase];
  const {on,off}=METABOLIC_TIMINGS[block.phase];
  const continuous=block.phase==='recovery';
  const step=continuous||flexible?1:block.slots.length*(on+off);
  const options=[];
  for(let seconds=Math.ceil(min/step)*step;seconds<=max;seconds+=step){
    const candidate={
      ...block,targetSeconds:seconds,preferredOn:continuous?seconds:on,preferredOff:off,
      timingPolicy:'metabolic'
    };
    if(!solveTiming(candidate).error)options.push(candidate);
  }
  return options.length?options:current();
}

function bestWeeklyPlan(blocks,choices,rng){
  let plans=new Map([[0,{seconds:0,changes:0,score:0,blocks:[]}]]);
  const key=(seconds,changes)=>seconds*(TARGET_CHANGES+1)+changes;
  for(const [index,options] of choices.entries()){
    const next=new Map();
    const scored=options.map(block=>({
      block,changed:Number(block.targetSeconds!==blocks[index].targetSeconds),score:rng()
    }));
    for(const plan of plans.values()){
      for(const {block,changed,score} of scored){
        const seconds=plan.seconds+block.targetSeconds;
        const changes=Math.min(TARGET_CHANGES,plan.changes+changed);
        const state=key(seconds,changes);
        const weight=plan.score+score;
        if(seconds>METABOLIC_SESSION_SECONDS||weight<=(next.get(state)?.score??-1))continue;
        next.set(state,{seconds,changes,score:weight,blocks:[...plan.blocks,block]});
      }
    }
    plans=next;
  }
  for(let changes=TARGET_CHANGES;changes>=0;changes--){
    const plan=plans.get(key(METABOLIC_SESSION_SECONDS,changes));
    if(plan)return plan;
  }
  return null;
}

function varyWeeklyMetabolic(blocks,rng){
  const choices=blocks.map(block=>weeklyBlockOptions(block));
  const exact=bestWeeklyPlan(blocks,choices,rng);
  if(exact?.changes>0)return exact.blocks;

  // A custom session with a fixed or missing recovery block can need an
  // adjusted cycle in one block to absorb seconds left by the other full rounds.
  const adaptable=blocks.filter(block=>canPlanWeeklyBlock(block)&&block.phase!=='recovery');
  const flex=adaptable.find(block=>block.phase==='main')??adaptable[0];
  if(flex){
    choices[blocks.indexOf(flex)]=weeklyBlockOptions(flex,{flexible:true});
    const adjusted=bestWeeklyPlan(blocks,choices,rng);
    if(adjusted?.changes>0)return adjusted.blocks;
  }
  if(exact)return exact.blocks;
  const total=blocks.reduce((seconds,block)=>seconds+block.targetSeconds,0);
  if(total===METABOLIC_SESSION_SECONDS&&blocks.every(block=>!solveTiming(block).error))return blocks;
  return null;
}

const DURATION_SHIFTS=[15,30,-15,-30];
const pick=(options,rng)=>options[Math.floor(rng()*options.length)];

function shiftDuration(block,shift,{beginner,rng}){
  const durationReference=block.durationReference??block.targetSeconds;
  const targetSeconds=block.targetSeconds+shift;
  if(targetSeconds<1||targetSeconds>7200||Math.abs(targetSeconds-durationReference)>30)return null;
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
  if(!hypertrophy&&profile!=='principiante')return varyWeeklyMetabolic(blocks,rng);
  const available=blocks.flatMap((block,index)=>
    block.timingLocked||block.timingPolicy==='pending'||solveTiming(block).error?[]:[index]
  );
  const adjustable=available.filter(index=>{
    const block=blocks[index];
    return isHypertrophyBlock(block)||block.timingPolicy!=='custom'&&block.roundMode==='auto';
  });
  const updated=[...blocks];
  const options={beginner:profile==='principiante',rng};
  if(hypertrophy){
    // Keep the time budget for the EMS phase separate from voluntary exercise.
    redistributeDuration(updated,adjustable.filter(index=>isHypertrophyWork(blocks[index])),options);
    redistributeDuration(updated,adjustable.filter(index=>!isHypertrophyWork(blocks[index])),options);
  }else{
    redistributeDuration(updated,adjustable,options);
  }
  return updated;
}
