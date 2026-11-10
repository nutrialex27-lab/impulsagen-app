import {EQUIPMENT,MOVEMENT_LEVELS,PATTERNS,PHASES,SEED} from './data.js';
import {eligible,strengthBasic} from './engine.js';
import {GYM_EQUIPMENT} from './gym-catalog.js';
import {isHypertrophyBlock} from './hypertrophy.js';

const ROOT='https://openrouter.ai';
const CHAT='/api/v1/chat/completions';
const AUTH='/api/v1/auth/keys';
const PROPOSAL_COUNT=5;
const CATALOG_CONTEXT_LIMIT=12;
const MODEL='openrouter/free';

export const exerciseNameKey=name=>name.normalize('NFD').replace(/\p{M}/gu,'')
  .toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu,' ').trim();

export function proposalReferences(block,filters,database,{patterns=null,family='',rng=Math.random,limit=CATALOG_CONTEXT_LIMIT,blockCriteria=false}={}){
  const enabled=new Set(database.filter(exercise=>exercise.enabled).map(exercise=>exercise.id));
  const candidates=SEED.filter(exercise=>enabled.has(exercise.id)&&
    (!patterns||patterns.includes(exercise.pattern))&&(!family||exercise.family===family)&&
    (!blockCriteria||block.phase!=='strength'||strengthBasic(exercise))&&
    eligible(exercise,block,{pattern:exercise.pattern},filters));
  for(let i=candidates.length-1;i>0;i--){
    const index=Math.floor(rng()*(i+1));
    [candidates[i],candidates[index]]=[candidates[index],candidates[i]];
  }
  if(blockCriteria&&block.phase==='metabolic')candidates.sort((a,b)=>b.level-a.level);
  if(blockCriteria&&isHypertrophyBlock(block)&&filters.equipment.includes('sala')){
    const usesMachine=exercise=>exercise.equipment.some(key=>GYM_EQUIPMENT.includes(key));
    candidates.sort((a,b)=>Number(usesMachine(b))-Number(usesMachine(a)));
  }
  const byFamily=new Map();
  for(const exercise of candidates){
    const key=exercise.pattern+'-'+exercise.family;
    if(!byFamily.has(key))byFamily.set(key,exercise);
  }
  const distinct=[...byFamily.values()],selected=new Set(distinct);
  return [...distinct,...candidates.filter(exercise=>!selected.has(exercise))].slice(0,limit);
}

export async function createAiAuthorization(){
  if(!globalThis.crypto?.subtle)throw Error('Abre ImpulsaFit desde su enlace HTTPS para conectar la IA.');
  const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const verifier=base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const url=new URL('/auth',ROOT);
  url.search=new URLSearchParams({
    code_challenge:base64url(new Uint8Array(digest)),code_challenge_method:'S256',key_label:'ImpulsaFit EMS'
  }).toString();
  return {url:url.href,verifier};
}

function routerError(path,status){
  let message='OpenRouter no pudo completar la solicitud. Vuelve a intentarlo en unos minutos.';
  if(path===AUTH&&[400,401,403,404].includes(status)){
    message='El código ya no es válido. Pide otro código en OpenRouter.';
  }else if(status===401){
    message='Vuelve a conectar la IA para generar propuestas.';
  }else if(status===429){
    message='El modelo gratuito está ocupado o has alcanzado su límite. Vuelve a intentarlo más tarde.';
  }else if([402,404].includes(status)){
    message='Ahora mismo no hay un modelo gratuito disponible para esta solicitud.';
  }
  return Object.assign(new Error(message),{status});
}

async function openRouter(path,body,{key,signal,request=fetch}={}){
  let response;
  try{
    response=await request(ROOT+path,{
      method:'POST',cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal,
      headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},
      body:JSON.stringify(body)
    });
  }catch{
    if(signal?.aborted)throw Error('La conexión ha tardado demasiado. Vuelve a intentarlo.');
    throw Error('No se pudo conectar con OpenRouter. Comprueba la conexión y vuelve a intentarlo.');
  }
  if(!response.ok)throw routerError(path,response.status);
  let answer;
  try{answer=await response.json();}
  catch{
    if(signal?.aborted)throw Error('La conexión ha tardado demasiado. Vuelve a intentarlo.');
    throw routerError(path,502);
  }
  const failure=answer?.error??answer?.choices?.[0]?.error;
  if(failure){
    const status=Number(failure.code);
    throw routerError(path,Number.isInteger(status)&&status>=400&&status<=599?status:502);
  }
  return answer;
}

export async function exchangeAiCode(code,verifier,options){
  const trimmed=code.trim();
  if(!trimmed||trimmed.length>500||/\s/.test(trimmed))throw Error('Pega el código que te muestra OpenRouter.');
  const answer=await openRouter(AUTH,{
    code:trimmed,code_verifier:verifier,code_challenge_method:'S256'
  },options);
  const key=answer?.key;
  if(typeof key!=='string'||!/^sk-or-[A-Za-z0-9_-]{12,180}$/.test(key)){
    throw Error('OpenRouter no completó la conexión. Pide un código nuevo.');
  }
  return key;
}

function proposalRequest(block,filters,references,compact,targets){
  const count=targets?.length??(compact?3:PROPOSAL_COUNT);
  const properties={
    base:{type:'string',enum:references.map(exercise=>exercise.id)},
    name:{type:'string'},cue:{type:'string'},regression:{type:'string'}
  };
  if(targets)properties.slot={type:'integer',enum:targets.map(target=>target.number)};
  const context={
    bloque:PHASES[block.phase],
    trabajoConEMS:block.timingPolicy!=='no-ems',
    iniciacion:Boolean(filters.beginner),
    referencias:references.map(exercise=>({
      base:exercise.id,nombre:exercise.name,patron:PATTERNS[exercise.pattern],
      complejidad:MOVEMENT_LEVELS[exercise.level],material:exercise.equipment.map(key=>EQUIPMENT[key]),
      posicion:exercise.position,permiteBrazosSobreCabeza:exercise.flags.includes('overhead'),
      permiteDesplazamiento:exercise.flags.includes('desplazamiento')
    }))
  };
  if(targets)context.huecos=targets.map(({number,bases})=>({slot:number,bases:[...bases]}));
  return {
    model:MODEL,max_tokens:compact?6144:4096,temperature:.8,reasoning:{enabled:false},
    provider:{require_parameters:!compact,max_price:{prompt:0,completion:0,request:0}},
    response_format:compact?{type:'json_object'}:{type:'json_schema',json_schema:{name:'impulsafit_exercises',strict:true,schema:{
      type:'object',required:['exercises'],additionalProperties:false,
      properties:{exercises:{type:'array',items:{
        type:'object',properties,required:Object.keys(properties),additionalProperties:false
      }}}
    }}},
    messages:[
      {role:'system',content:[
        'Propón hasta '+count+' variantes reales de ejercicio en español para que un entrenador las revise.',
        ...(targets?['Devuelve una variante distinta por cada hueco. Indica su número en slot y usa solo una base de la lista de ese hueco.']:[]),
        'Para cada propuesta elige una base y conserva su patrón, complejidad, postura y exactamente el mismo material.',
        'Conserva los límites de brazos y desplazamiento. Cambia la ejecución de forma útil, no te limites a cambiar el nombre.',
        'Si es iniciación, mantén los apoyos estables y el gesto sencillo. Para la vuelta a la calma usa movimientos suaves.',
        'Evita saltos, gestos balísticos, cargas máximas y movimientos que exijan material adicional.',
        'Devuelve solo un objeto JSON con la propiedad exercises, una lista de objetos con base, name, cue y regression.',
        'Usa nombres concisos, una frase de técnica y una variante más sencilla con el mismo material.',
        'No des ajustes de corriente, recomendaciones clínicas, tiempos ni series. Omite propuestas que no cumplan.'
      ].join(' ')},
      {role:'user',content:JSON.stringify(context)}
    ]
  };
}

function parseExerciseAnswer(answer){
  const choice=answer?.choices?.[0];
  if(choice?.finish_reason==='content_filter')throw Error('El proveedor filtró esta respuesta. Revisa el bloque y vuelve a intentarlo.');
  if(choice?.finish_reason==='error')throw routerError(CHAT,502);
  const content=choice?.message?.content;
  const text=Array.isArray(content)
    ? content.filter(part=>part?.type==='text'&&typeof part.text==='string').map(part=>part.text).join('')
    : content;
  if(typeof text!=='string'||!text.trim()||text.length>25000)return null;

  const fenced=text.match(/\x60{3}(?:json)?\s*([\s\S]*?)\x60{3}/i)?.[1];
  const firstBrace=text.indexOf('{'),lastBrace=text.lastIndexOf('}');
  const object=firstBrace>=0&&lastBrace>firstBrace?text.slice(firstBrace,lastBrace+1):null;
  for(const candidate of [text,fenced,object]){
    if(!candidate)continue;
    let output;
    try{output=JSON.parse(candidate);}
    catch{continue;}
    if(Array.isArray(output?.exercises))return output;
    if(Array.isArray(output))return {exercises:output};
  }
  return null;
}

function proposalText(value,max){
  if(typeof value!=='string')return '';
  const trimmed=value.trim().replace(/\s+/g,' ');
  return trimmed.length<=max&&!/[<>\u0000-\u001f]|https?:|electrodos?|\b(?:Hz|mA)\b/i.test(trimmed)?trimmed:'';
}

export function readExerciseProposals(output,block,references,database,targets=null){
  if(!Array.isArray(output?.exercises))throw Error('El modelo devolvió una respuesta incompleta. Pide otras propuestas.');
  const names=new Set([...SEED,...database].map(exercise=>exerciseNameKey(exercise.name)));
  const bases=new Map(references.map(exercise=>[exercise.id,exercise]));
  const targetByNumber=new Map(targets?.map(target=>[target.number,target]));
  const filled=new Set();
  const proposals=[];
  for(const item of output.exercises.slice(0,targets?targets.length*2:PROPOSAL_COUNT)){
    const base=bases.get(item?.base);
    const target=targetByNumber.get(item?.slot);
    if(targets&&(!target||!target.bases.has(item?.base)||filled.has(target.slotId)))continue;
    const name=proposalText(item?.name,140),cue=proposalText(item?.cue,350),regression=proposalText(item?.regression,230);
    const normalized=exerciseNameKey(name);
    if(!base||!normalized||!cue||!regression||names.has(normalized))continue;
    const {pattern,family,level,equipment,position,flags,components}=base;
    proposals.push(structuredClone({
      name,pattern,family,level,equipment,position,flags,cue,regression,enabled:true,phases:[block.phase],
      ...(target?{slotId:target.slotId}:{}),
      ...(components?{components}:{})
    }));
    names.add(normalized);
    if(target)filled.add(target.slotId);
  }
  return proposals;
}

export async function generateExerciseProposals(block,filters,references,database,{key,signal,request,targets=null}={}){
  if(!key)throw Error('Conecta la IA antes de generar propuestas.');
  if(!references.length)throw Error('No hay fichas de referencia compatibles. Revisa el material, la complejidad o el patrón.');
  const proposals=[];
  let remaining=targets,readable=false;
  for(const compact of [false,true]){
    if(signal?.aborted){
      if(proposals.length)return proposals;
      throw Error('La conexión ha tardado demasiado. Vuelve a intentarlo.');
    }
    try{
      const allowed=remaining?new Set(remaining.flatMap(target=>[...target.bases])):null;
      const offered=allowed?references.filter(exercise=>allowed.has(exercise.id)):references;
      const answer=await openRouter(CHAT,proposalRequest(block,filters,offered,compact,remaining),{key,signal,request});
      const output=parseExerciseAnswer(answer);
      if(!output)continue;
      if(!remaining)return readExerciseProposals(output,block,offered,database);
      readable=true;
      const batch=readExerciseProposals(output,block,offered,[...database,...proposals],remaining);
      proposals.push(...batch);
      const filled=new Set(batch.map(proposal=>proposal.slotId));
      remaining=remaining.filter(target=>!filled.has(target.slotId));
      if(!remaining.length)return proposals;
    }catch(error){
      if(compact&&proposals.length&&error.status!==401)return proposals;
      // A simpler format can use a different free endpoint. Preserve account,
      // quota and moderation errors without sending another request.
      if(compact||signal?.aborted||![400,404,422,502,503].includes(error.status))throw error;
    }
  }
  if(readable)return proposals;
  throw Error('El modelo gratuito dejó la tanda incompleta tras dos intentos. Vuelve a generar las propuestas.');
}

export async function generateBlockProposals(block,filters,database,{exclude=[],...options}={}){
  const references=new Map();
  const byPattern=new Map();
  const targets=block.slots.flatMap((slot,index)=>{
    if(slot.locked)return [];
    if(!byPattern.has(slot.pattern)){
      byPattern.set(slot.pattern,proposalReferences(block,filters,database,{
        patterns:[slot.pattern],limit:3,blockCriteria:true
      }));
    }
    const matching=byPattern.get(slot.pattern);
    for(const exercise of matching)references.set(exercise.id,exercise);
    return matching.length?[{number:index+1,slotId:slot.id,bases:new Set(matching.map(exercise=>exercise.id))}]:[];
  });
  if(block.slots.every(slot=>slot.locked))throw Error('Desbloquea un ejercicio para renovar el bloque.');
  if(!targets.length)throw Error('No hay referencias para los huecos libres. Revisa el material y la complejidad.');
  const proposals=await generateExerciseProposals(block,filters,[...references.values()],[...database,...exclude],{...options,targets});
  return proposals.sort((a,b)=>block.slots.findIndex(slot=>slot.id===a.slotId)-block.slots.findIndex(slot=>slot.id===b.slotId));
}

export function prepareAiBlockUpdate(block,filters,database,proposals,createId){
  if(!proposals.length||database.length+proposals.length>3000)return null;
  const names=new Set(database.map(exercise=>exerciseNameKey(exercise.name)));
  const replacements=new Map();
  for(const {slotId,...exercise} of proposals){
    const slot=block.slots.find(item=>item.id===slotId);
    const name=exerciseNameKey(exercise.name);
    if(!slot||slot.locked||replacements.has(slotId)||names.has(name)||!eligible(exercise,block,slot,filters))return null;
    names.add(name);
    replacements.set(slotId,{...exercise,id:createId()});
  }
  const slots=block.slots.map(slot=>{
    const replacement=replacements.get(slot.id);
    return replacement?{...slot,exerciseId:replacement.id}:slot;
  });
  return {block:{...block,slots},exercises:[...replacements.values()]};
}
