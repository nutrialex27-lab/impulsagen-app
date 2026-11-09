// Reference values recovered from both ImpulsaFit S12 metabolic sheets.
// Frequency is not a dose; perceived EMS intensity is checked per channel.
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
export function stimulationReference(phase,profile){
 const beginner=profile==='principiante',r=(beginner?BEGINNER:ADAPTED)[phase];
 if(!r)throw Error('Tipo de bloque sin referencia EMS.');
 return {source:beginner?'metabolic-initiation-v1':'metabolic-s12',profile:beginner?'principiante':'adaptado',...structuredClone(r)};
}
export function withStimulationProposals(blocks,profile){
 return blocks.map(b=>({...b,stimulation:stimulationReference(b.phase,profile)}));
}
export function validStimulation(value){
 const range=x=>Array.isArray(x)&&x.length===2&&x.every(v=>Number.isInteger(v)&&v>=0&&v<=10)&&x[0]<=x[1];
 return value===undefined||!!value&&['metabolic-initiation-v1','metabolic-s12'].includes(value.source)&&['principiante','adaptado'].includes(value.profile)&&Number.isInteger(value.hz)&&value.hz>=1&&value.hz<=150&&range(value.ems)&&range(value.rpe);
}
