// Frequency ranges and ramps from the ImpulsaFit metabolic sheets.
const METABOLIC_STIMULATION={
 activation:{frequency:[18,22],ramp:1},
 strength:{frequency:[70,75],ramp:.8},
 main:{frequency:[42,48],ramp:.9},
 core:{frequency:[38,42],ramp:1},
 metabolic:{frequency:[30,38],ramp:.9},
 recovery:{frequency:[5,7],ramp:1.5}
};
// Closest cycles in the Wiemspro program dossier: Calentamiento 3,
// Resistencia Fuerza Funcional 3, Core 2 and HIIT 2. Use them as references
// only for comparable frequencies and cycles in the adapted program.
const RAMP_REFERENCES={
 activation:{frequency:[18,22],on:25,off:[15,15],ramp:.5},
 main:{frequency:[40,50],on:25,off:[20,20],ramp:.4},
 core:{frequency:[38,45],on:20,off:[20,20],ramp:.3},
 metabolic:{frequency:[30,38],on:30,off:[15,20],ramp:.4}
};
const ADAPTED={
 activation:{hz:20,ems:[3,4],rpe:[3,3]},
 strength:{hz:72,ems:[5,6],rpe:[6,6]},
 main:{hz:45,ems:[5,6],rpe:[6,6]},
 core:{hz:40,ems:[5,5],rpe:[5,5]},
 metabolic:{hz:34,ems:[5,6],rpe:[6,7]},
 recovery:{hz:6,ems:[2,2],rpe:[1,2]}
};
// Initial app references after individual familiarization. Earlier sheets allow
// 35–45 Hz for novice strength and <=50 Hz during initiation. 40 Hz is a chosen
// point in that interval; 4/10 is the initial sensation target, not a % conversion.
const BEGINNER={
 activation:{hz:20,ems:[3,4],rpe:[3,3]},
 strength:{hz:40,ems:[4,4],rpe:[4,4]},
 main:{hz:45,ems:[4,4],rpe:[4,4]},
 core:{hz:40,ems:[4,4],rpe:[4,4]},
 metabolic:{hz:34,ems:[4,4],rpe:[4,4]},
 recovery:{hz:6,ems:[2,2],rpe:[1,2]}
};
function frequencyRange(phase,profile){
 return profile==='principiante'&&phase==='strength'?[35,45]:METABOLIC_STIMULATION[phase].frequency;
}
const within=(value,[min,max])=>value>=min&&value<=max;
function riseTime(phase,hz,timing,beginner){
 const base=METABOLIC_STIMULATION[phase].ramp;
 if(beginner)return Math.max(1,base);
 const match=RAMP_REFERENCES[phase];
 if(match&&timing?.on===match.on&&within(timing.off,match.off)&&within(hz,match.frequency)){
  return match.ramp;
 }
 return base;
}
export function stimulationReference(phase,profile,previous,timing){
 const beginner=profile==='principiante';
 const reference=(beginner?BEGINNER:ADAPTED)[phase];
 const settings=METABOLIC_STIMULATION[phase];
 if(!settings)throw Error('Tipo de bloque sin referencia EMS.');
 const programmingProfile=beginner?'principiante':'adaptado';
 const [min,max]=frequencyRange(phase,profile);
 const retained=previous?.phase===phase&&previous.profile===programmingProfile
   &&Number.isInteger(previous.hz)&&previous.hz>=min&&previous.hz<=max;
 const hz=retained?previous.hz:reference.hz;
 return {
  source:beginner?'metabolic-initiation-v1':'metabolic-s12',profile:programmingProfile,phase,
  ...structuredClone(reference),hz,rampUp:riseTime(phase,hz,timing,beginner),rampDown:settings.ramp
 };
}
export function withStimulationProposals(blocks,profile,solve){
 return blocks.map(b=>({...b,stimulation:stimulationReference(b.phase,profile,b.stimulation,solve?.(b))}));
}
export const formatRamp=seconds=>String(seconds).replace('.',',')+' s';
export function validStimulation(value){
 const range=x=>Array.isArray(x)&&x.length===2&&x.every(v=>Number.isInteger(v)&&v>=0&&v<=10)&&x[0]<=x[1];
 const ramp=x=>x===undefined||Number.isFinite(x)&&x>=0&&x<=5;
 return value===undefined||!!value&&['metabolic-initiation-v1','metabolic-s12'].includes(value.source)
  &&['principiante','adaptado'].includes(value.profile)
  &&(value.phase===undefined||Object.hasOwn(METABOLIC_STIMULATION,value.phase))
  &&Number.isInteger(value.hz)&&value.hz>=1&&value.hz<=150&&range(value.ems)&&range(value.rpe)
  &&ramp(value.rampUp)&&ramp(value.rampDown);
}
