import {EQUIPMENT,FAMILY_LABELS,MOVEMENT_LEVELS,PATTERNS,PHASES,SEED,exerciseInBankPhase} from './data.js?v=banco-cardio';

const ROOT='https://openrouter.ai';
const CHAT='/api/v1/chat/completions';
const AUTH='/api/v1/auth/keys';
const PROPOSAL_COUNT=5;
const CATALOG_CONTEXT_LIMIT=12;
const MODEL='openrouter/free';
const FREE_FALLBACK_MODELS=['google/gemma-4-26b-a4b-it:free','nvidia/nemotron-3-ultra-550b-a55b:free'];
const PRIMARY_TIMEOUT=27000;

export const exerciseNameKey=name=>name.normalize('NFD').replace(/\p{M}/gu,'')
  .toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu,' ').trim();

const SEARCH_WORDS=new Set(['a','al','con','de','del','el','en','entre','la','las','los','no','para','un','una','y']);
const searchTerms=query=>[...new Set(exerciseNameKey(query).split(' ')
  .filter(word=>word&&!SEARCH_WORDS.has(word))
  .map(word=>word.length>4&&word.endsWith('s')?word.slice(0,-1):word))];
const materialTerms=new Set(Object.values(EQUIPMENT).flatMap(searchTerms));

function searchableExercise(exercise){
  const material=exercise.equipment.map(key=>EQUIPMENT[key]).join(' ')||'Sin material';
  return exerciseNameKey([exercise.name,exercise.family,FAMILY_LABELS[exercise.family],
    PATTERNS[exercise.pattern],material,exercise.cue].join(' '));
}

export function matchesExerciseQuery(exercise,query){
  const terms=searchTerms(query);
  if(!terms.length)return true;
  const searchable=searchableExercise(exercise);
  return terms.every(word=>searchable.includes(word));
}

export function proposalReferences(database,query,phase=''){
  const terms=searchTerms(query);
  if(!terms.length)return [];
  const movementTerms=terms.filter(word=>!materialTerms.has(word));
  const enabled=new Set(database.filter(exercise=>exercise.enabled).map(exercise=>exercise.id));
  const matches=SEED.filter(exercise=>enabled.has(exercise.id)&&
    (phase?exerciseInBankPhase(exercise,phase):exercise.phases.some(value=>exerciseInBankPhase(exercise,value))))
    .map(exercise=>{
      const searchable=searchableExercise(exercise);
      if(movementTerms.length&&!movementTerms.some(word=>searchable.includes(word)))return {exercise,score:0};
      return {exercise,score:terms.filter(word=>searchable.includes(word)).length};
    });
  const best=Math.max(0,...matches.map(match=>match.score));
  return best?matches.filter(match=>match.score===best).slice(0,CATALOG_CONTEXT_LIMIT).map(match=>match.exercise):[];
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

function routerError(path,status,failure,retryAfter){
  const dataPolicy=[404,503].includes(status)&&/matching your data policy/i.test(failure?.message??'');
  const contentFiltered=failure?.metadata?.error_type==='content_policy_violation'||Array.isArray(failure?.metadata?.reasons);
  const retryable=path===CHAT&&!dataPolicy&&!contentFiltered&&!retryAfter&&([400,404,408,422].includes(status)||status>=500);
  let message=`OpenRouter no pudo completar la solicitud (${status}).`;
  if(path===AUTH&&[400,401,403,404].includes(status)){
    message='El código ya no es válido. Pide otro código en OpenRouter.';
  }else if(status===401){
    message='La conexión de OpenRouter ha caducado o es inválida (401). Vuelve a conectar la IA.';
  }else if(status===402){
    message='OpenRouter rechazó la solicitud por el estado de los créditos de la cuenta o de la clave (402).';
  }else if(contentFiltered){
    message=`OpenRouter filtró esta solicitud (${status}).`;
  }else if(status===403){
    message='OpenRouter bloqueó la solicitud por los permisos o límites de la cuenta (403).';
  }else if(status===429){
    message='El modelo gratuito está ocupado o has alcanzado su límite (429). Vuelve a intentarlo más tarde.';
  }else if(dataPolicy){
    message=`La política de datos de OpenRouter no ofrece un modelo compatible para esta solicitud (${status}).`;
  }else if(status===404){
    message='Ahora mismo no hay un modelo gratuito disponible para esta solicitud (404).';
  }else if(status===408){
    message='OpenRouter tardó demasiado en responder (408). Vuelve a intentarlo.';
  }else if([400,422].includes(status)){
    message=`OpenRouter rechazó el formato de la solicitud (${status}).`;
  }else if(status>=500){
    message=`OpenRouter o el proveedor del modelo no está disponible temporalmente (${status}).`;
  }
  return Object.assign(new Error(message),{status,retryable});
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
    if(signal?.aborted)throw routerError(path,408);
    throw Error('No se pudo conectar con OpenRouter. Comprueba la conexión y vuelve a intentarlo.');
  }
  let answer;
  try{answer=await response.json();}
  catch{
    if(signal?.aborted)throw routerError(path,408);
    if(response.ok)throw routerError(path,502);
  }
  const failure=answer?.error??answer?.choices?.[0]?.error;
  const retryAfter=response.headers.get('retry-after');
  if(!response.ok)throw routerError(path,response.status,failure,retryAfter);
  if(failure){
    const status=Number(failure.code);
    throw routerError(path,Number.isInteger(status)&&status>=400&&status<=599?status:502,failure,retryAfter);
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

function proposalRequest(query,phase,references,compact){
  const count=compact?3:PROPOSAL_COUNT;
  const properties={
    base:{type:'string',enum:references.map(exercise=>exercise.id)},
    name:{type:'string'},cue:{type:'string'},regression:{type:'string'}
  };
  const context={
    ejercicioBuscado:query,
    bloque:PHASES[phase]||'Cualquier bloque compatible',
    referencias:references.map(exercise=>({
      base:exercise.id,nombre:exercise.name,patron:PATTERNS[exercise.pattern],
      complejidad:MOVEMENT_LEVELS[exercise.level],material:exercise.equipment.map(key=>EQUIPMENT[key]),
      bloques:exercise.phases.filter(value=>exerciseInBankPhase(exercise,value)).map(value=>PHASES[value]),
      posicion:exercise.position,permiteBrazosSobreCabeza:exercise.flags.includes('overhead'),
      permiteDesplazamiento:exercise.flags.includes('desplazamiento')
    }))
  };
  return {
    ...(compact?{models:FREE_FALLBACK_MODELS}:{
      model:MODEL,temperature:.8,reasoning:{enabled:false},
      response_format:{type:'json_schema',json_schema:{name:'impulsafit_exercises',strict:true,schema:{
        type:'object',required:['exercises'],additionalProperties:false,
        properties:{exercises:{type:'array',items:{
          type:'object',properties,required:Object.keys(properties),additionalProperties:false
        }}}
      }}}
    }),
    max_tokens:compact?6144:4096,
    provider:{require_parameters:!compact,max_price:{prompt:0,completion:0,request:0}},
    messages:[
      {role:'system',content:[
        'Propón hasta '+count+' fichas de ejercicios en español que respondan a ejercicioBuscado.',
        'Trata ejercicioBuscado como una descripción del movimiento o grupo muscular. Omite propuestas que no encajen con lo que se busca.',
        'Para cada propuesta elige una base y conserva su patrón, complejidad, postura y exactamente el mismo material.',
        'Conserva los límites de brazos y desplazamiento. Cambia la ejecución de forma útil, no te limites a cambiar el nombre.',
        'Para la vuelta a la calma usa movimientos suaves. En el bloque metabólico propone secuencias rítmicas con apoyos controlados.',
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

export function readExerciseProposals(output,references,database){
  if(!Array.isArray(output?.exercises))throw Error('El modelo devolvió una respuesta incompleta. Pide otras propuestas.');
  const names=new Set([...SEED,...database].map(exercise=>exerciseNameKey(exercise.name)));
  const bases=new Map(references.map(exercise=>[exercise.id,exercise]));
  const proposals=[];
  for(const item of output.exercises.slice(0,PROPOSAL_COUNT)){
    const base=bases.get(item?.base);
    const name=proposalText(item?.name,140),cue=proposalText(item?.cue,350),regression=proposalText(item?.regression,230);
    const normalized=exerciseNameKey(name);
    if(!base||!normalized||!cue||!regression||names.has(normalized))continue;
    const {pattern,family,level,equipment,position,flags,components}=base;
    const phases=base.phases.filter(value=>exerciseInBankPhase(base,value));
    if(!phases.length)continue;
    proposals.push(structuredClone({
      name,pattern,family,level,equipment,position,flags,cue,regression,enabled:true,phases,
      ...(components?{components}:{})
    }));
    names.add(normalized);
  }
  return proposals;
}

export async function generateExerciseProposals(database,{query='',phase='',key,signal,request,exclude=[]}={}){
  if(!key)throw Error('Conecta la IA antes de generar propuestas.');
  const search=query.trim().slice(0,140);
  if(!searchTerms(search).length)throw Error('Escribe el ejercicio o el grupo muscular que buscas.');
  const references=proposalReferences(database,search,phase);
  if(!references.length)throw Error('No encontré una ficha de referencia. Prueba con el nombre del movimiento o con cualquier bloque.');
  const primarySignal=signal&&typeof AbortSignal.any==='function'&&typeof AbortSignal.timeout==='function'
    ? AbortSignal.any([signal,AbortSignal.timeout(PRIMARY_TIMEOUT)])
    : signal;
  let readable=false;
  for(const compact of [false,true]){
    if(signal?.aborted)throw routerError(CHAT,408);
    try{
      const answer=await openRouter(CHAT,proposalRequest(search,phase,references,compact),{
        key,signal:compact?signal:primarySignal,request
      });
      const output=parseExerciseAnswer(answer);
      if(!output)continue;
      readable=true;
      const proposals=readExerciseProposals(output,references,[...database,...exclude]);
      if(proposals.length)return proposals;
    }catch(error){
      if(compact||signal?.aborted||!error.retryable)throw error;
    }
  }
  if(readable)return [];
  throw Error('El modelo gratuito dejó la tanda incompleta tras dos intentos. Vuelve a generar las propuestas.');
}
