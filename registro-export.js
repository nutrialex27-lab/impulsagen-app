import {solveTiming} from './engine.js?v=banco-variedad';
import {stimulationForBlock} from './stimulation.js?v=programas-ems';
import {isHypertrophyPlan,hypertrophyStimulation} from './hypertrophy.js?v=rutina-parametros';

export const REGISTRO_INBOX='impulsafit-registro-routine-v1';
const phases={activation:'activation',strength:'strength',main:'fullBody',core:'core',metabolic:'metabolic',recovery:'coolDown'};

export function registroRoutine(plan,id=crypto.randomUUID()){
  const counts=new Map(),exercises=new Map(plan.database.map(exercise=>[exercise.id,exercise]));
  const hypertrophy=isHypertrophyPlan(plan);
  const blocks=plan.blocks.map(block=>{
    const phase=phases[block.phase];
    if(!phase)throw Error('El bloque no tiene un tipo compatible con Registro EMS.');
    const count=(counts.get(phase)||0)+1;counts.set(phase,count);
    const blockId=phase+(count===1?'':'-'+count),timing=solveTiming(block);
    if(timing.error)throw Error(timing.error);
    const stimulation=hypertrophy?hypertrophyStimulation(block):stimulationForBlock(block,plan.profile,timing);
    const ems=block.timingPolicy!=='no-ems';
    return {id:blockId,phase,name:block.name,rounds:['activation','coolDown'].includes(phase)?1:timing.rounds,plannedRounds:timing.rounds,
      seconds:timing.total,on:timing.on,off:timing.off,ems,hz:stimulation.hz,
      rampUp:stimulation.rampUp??0,rampDown:stimulation.rampDown??0,
      ...(Number.isFinite(block.restSeconds)?{restSeconds:block.restSeconds}:{}),
      ...(stimulation.pulseWidths?{pulseWidths:[...stimulation.pulseWidths]}:{}),
      program:stimulation.program?.name??'',sequence:block.sequence??'circuit',
      exercises:block.slots.map((slot,index)=>{
        const exercise=exercises.get(slot.exerciseId);
        if(!exercise)throw Error('Completa todos los ejercicios antes de llevar la rutina al registro.');
        return {id:blockId+'-exercise-'+(index+1),name:exercise.name};
      })};
  });
  return {format:'registro-ems-routine',version:1,routine:{id,title:plan.title.trim()||'Rutina EMS',kind:hypertrophy?'hypertrophy':'metabolic',profile:plan.profile??'',blocks}};
}
