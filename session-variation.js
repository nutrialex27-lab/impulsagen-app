import {solveTiming} from './engine.js?v=rutina-parametros';
import {METABOLIC_TIMINGS,varyMetabolicTiming} from './metabolic.js?v=rutina-parametros';
import {
  HYPERTROPHY_HZ,isHypertrophyBlock,isHypertrophyWork,varyHypertrophyTiming
} from './hypertrophy.js?v=rutina-parametros';
import {varyMetabolicFrequency} from './stimulation.js?v=rutina-parametros';

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
  for(const index of available){
    const block=updated[index];
    if(isHypertrophyWork(block)){
      updated[index]={...block,hz:pick(HYPERTROPHY_HZ.filter(hz=>hz!==block.hz),rng)};
    }else if(!hypertrophy){
      updated[index]=varyMetabolicFrequency(block,profile,rng);
    }
  }
  return updated;
}
