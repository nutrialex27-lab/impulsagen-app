import {SEED,PATTERNS,PHASES,EQUIPMENT,DEFAULT_EQUIPMENT,GROUPS,PATTERN_GROUP,FAMILY_LABELS,MOVEMENT_LEVELS,makeTemplate,exerciseInBankPhase} from './data.js?v=tiempos-bloques';
import {PROFILES,EMPHASES,defaultEmphasis,applyEmphasis,emphasisDistribution} from './profiles.js';
import {CATALOG_VERSION,upgradeState,manualCandidates} from './state.js?v=duraciones-fijas';
import {adaptBeginner,beginnerBlock,BEGINNER_TOTAL_SECONDS} from './beginner.js?v=minutos-enteros';
import {NOVICE_TIMINGS,upgradeNoviceBlocks} from './novice-presets.js';
import {PHASE_ORDER_VERSION,PROGRAMMING_VERSION,CHANNELS,channelReference,withChannelReferences,resetMetabolicTiming,varyMetabolicTiming,sequenceGroups,withChannelProposals,proposeChannels} from './metabolic.js?v=tiempos-bloques';
import {formatTime,parseTime,solveTiming,eligible,generate,validateSession,validateBackup,VARIATION_MODES} from './engine.js?v=minutos-enteros';
import {PHASE_PATTERNS,createBlock,changePhase,moveItem,insertBlock,recommendedOrder} from './builder.js?v=tiempos-bloques';
import {stimulationForBlock,withStimulationProposals,formatRamp} from './stimulation.js?v=programas-ems';
import {WIEMSPRO_DOSSIER,WIEMSPRO_PROGRAMS,wiemsproProgram} from './wiemspro.js?v=programas-ems';
import {GYM_EQUIPMENT} from './gym-catalog.js';
import {routineSheet,renderRoutinePdf} from './routine-pdf.js?v=duraciones-fijas';
import {
  METABOLIC_ON_REFERENCE,metabolicWorkSummary,varySessionProgramming
} from './session-variation.js?v=duraciones-fijas';
import {createAiAuthorization,exchangeAiCode,exerciseNameKey,generateExerciseProposals,matchesExerciseQuery} from './ai-exercises.js?v=banco-cardio';
import {
  HYPERTROPHY_TEMPLATE,HYPERTROPHY_ON,HYPERTROPHY_OFF,HYPERTROPHY_HZ,HYPERTROPHY_REST,HYPERTROPHY_LIMIT,HYPERTROPHY_GROUPS,
  initialHypertrophyBlocks,isHypertrophyPlan,isHypertrophyBlock,isHypertrophyWork,plannedEmsSeconds,
  applyHypertrophyEmphasis,varyHypertrophyTiming,hypertrophyStimulation,hypertrophyMuscleProposal
} from './hypertrophy.js?v=rutina-parametros';

const STORAGE='impulsafit-ems-v1',root=document.querySelector('#app');
const aiDialog=document.createElement('dialog');
aiDialog.setAttribute('aria-labelledby','aiDialogTitle');
document.body.append(aiDialog);
let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener('appinstalled', () => {
  installPrompt = undefined;
  document.documentElement.classList.add('app-installed');
});

async function installApp() {
  const prompt = installPrompt;
  if (prompt) {
    installPrompt = undefined;
    try {
      await prompt.prompt();
      return;
    } catch {
      // Some browsers only allow installing from their menu.
    }
  }
  document.querySelector('#installDialog').showModal();
}
const icons={
 sparkles:'<path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM5 3v4M3 5h4m12 12v4m-2-2h4"/>',
 shuffle:'<path d="m3 4 3 0 12 16h3m-4-4 4 4-4 0M3 20h3l4-5m4-6 4-5h3m-4 0 4 0-4 4"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 unlock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 save:'<path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
 archive:'<path d="M5 8v12h14V8M4 4h16v4H4zM10 12h4"/>',
 undo:'<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14"/>',
 install:'<rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M12 6v8m-3-3 3 3 3-3m-4 7h2"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
 upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4"/>',
 edit:'<path d="m15 4 5 5M4 20l4-1L21 6l-4-4L4 15v5Z"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 check:'<path d="m5 12 4 4L20 5"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>'
};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.chevron}</svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.()||`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ui={page:'session',query:'',pattern:'',phase:'',group:'',material:'',chooser:null,ai:null,expanded:new Set(),undo:[],toastTimer:null};
const AI_CONNECTION='impulsafit-ai-session';
let aiKey='';
try{aiKey=sessionStorage.getItem(AI_CONNECTION)||'';}catch{}
const fresh=()=>({schema:1,catalogVersion:CATALOG_VERSION,programmingVersion:PROGRAMMING_VERSION,profile:'sin-definir',emphasis:'equilibrado',database:structuredClone(SEED),blocks:makeTemplate(),template:'visual',filters:{level:2,equipment:[...DEFAULT_EQUIPMENT],noFloor:false,noOverhead:true,noTravel:true,avoidLast:false,variation:'zone'},saved:[],title:'Metabólica · Sesión nueva',notes:''});
let data=fresh(),storageError=false,loadFailure=false,catalogUpdated=false,programmingUpdated=false;
try {const stored=localStorage.getItem(STORAGE);if(stored){const previous=JSON.parse(stored);programmingUpdated=(previous.programmingVersion||0)<PROGRAMMING_VERSION;catalogUpdated=(previous.catalogVersion||1)<CATALOG_VERSION;data=upgradeState(previous);data.title=typeof data.title==='string'?data.title.slice(0,140):'Metabólica · Sesión nueva';data.notes=typeof data.notes==='string'?data.notes.slice(0,2000):'';}}
catch{storageError=true;loadFailure=true;}
if(data.blocks.every(b=>b.slots.every(s=>!s.exerciseId))){const r=generate(data.blocks,data.database,data.filters);if(r.blocks)data.blocks=r.blocks;}
function persist(){
  if(!isHypertrophyPlan(data))data.blocks=withStimulationProposals(withChannelProposals(data.blocks,data.database,data.profile,data.emphasis),data.profile,solveTiming);
  try{localStorage.setItem(STORAGE,JSON.stringify(data));storageError=false;}catch{storageError=true;}
}
function checkpoint(){ui.undo.push(structuredClone(data));if(ui.undo.length>20)ui.undo.shift();}
function toast(message,error=false){const el=document.querySelector('#toast');el.textContent=message;el.className=`visible${error?' error':''}`;clearTimeout(ui.toastTimer);ui.toastTimer=setTimeout(()=>el.className='',error?9500:4200);}
function downloadFile(blob,filename){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
let downloadingRoutine=false;
async function downloadRoutine(){
  if(downloadingRoutine)return;
  const errors=validateSession(data.blocks,data.database,data.filters);
  if(errors.length)return toast(errors[0],true);
  downloadingRoutine=true;
  try{
    const sheet=routineSheet(data);
    const bytes=await renderRoutinePdf(sheet);
    const name=sheet.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').slice(0,110);
    downloadFile(new Blob([bytes],{type:'application/pdf'}),`ImpulsaFit - ${name}.pdf`);
    toast('Ficha de la rutina descargada en PDF.');
  }catch{
    toast('No se ha podido descargar la ficha. Vuelve a pulsar «Descargar rutina PDF».',true);
  }finally{
    downloadingRoutine=false;
  }
}
function commit(message){persist();render();if(message)toast(message);}
function selectOptions(items,selected){return Object.entries(items).map(([k,v])=>`<option value="${esc(k)}" ${String(selected)===k?'selected':''}>${esc(v)}</option>`).join('');}
function button(action,label,i,{cls='',extra='',title=''}={}){return `<button type="button" class="${cls}" data-action="${action}" ${extra} ${title?`title="${esc(title)}" aria-label="${esc(title)}"`:''}>${i?icon(i):''}${label?`<span class="button-text">${label}</span>`:''}</button>`;}
function sum(){return data.blocks.reduce((s,b)=>s+b.targetSeconds,0);}
function exercisesCount(){return data.blocks.reduce((s,b)=>s+b.slots.length,0);}
function dateLabel(date){try{return new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(date));}catch{return '';}}
function avoidIds(){
  const previous=data.filters.avoidLast&&data.saved.find(record=>programKey(record)===programKey(data));
  return previous?previous.blocks.flatMap(b=>b.slots.map(s=>s.exerciseId)):[];
}
function runGenerate(blockId=null,slotId=null,scope=null,phase=null){
  const hypertrophy=isHypertrophyPlan(data);
  const wholeSession=!blockId&&!slotId&&!scope&&!phase;
  const blockIds=hypertrophy&&phase==='main'?data.blocks.filter(isHypertrophyWork).map(block=>block.id):null;
  const result=generate(data.blocks,data.database,data.filters,{blockId,blockIds,slotId,phase,avoidIds:avoidIds(),scope});
  if(result.error&&(!wholeSession||validateSession(data.blocks,data.database,data.filters).length)){
    return toast(readableError(result.error),true);
  }
  if(wholeSession){
    const standard=!hypertrophy&&data.profile!=='principiante';
    const blocks=varySessionProgramming(result.blocks??data.blocks,{profile:data.profile,hypertrophy});
    if(!blocks){
      const fixed=data.blocks.find(block=>block.timingLocked&&block.targetSeconds%60!==0);
      if(fixed)return toast(`«${fixed.name}» tiene un tiempo fijado con segundos. Introduce su duración en minutos enteros y vuelve a generar.`,true);
      if(hypertrophy)return toast(`Revisa las duraciones en minutos enteros y el total de los bloques con EMS. El máximo previsto es ${HYPERTROPHY_LIMIT/60} minutos.`,true);
      return toast('Revisa la duración de los bloques en minutos enteros.',true);
    }
    const durations=blocks.some((b,i)=>b.targetSeconds!==data.blocks[i].targetSeconds);
    if(result.error&&!durations)return toast(readableError(result.error),true);
    checkpoint();
    data.blocks=blocks;
    const timingNotice=durations?(standard?'Duraciones ajustadas a minutos enteros.':'Duraciones en minutos enteros y ciclos recalculados.'):'';
    const exerciseNotice=result.error?'Amplía el material o los criterios para cambiar los ejercicios.':'Ejercicios renovados.';
    commit([timingNotice,exerciseNotice].filter(Boolean).join(' '));
    return;
  }
  if(hypertrophy){
    const varied=varyHypertrophyTiming(data.blocks,result.blocks,{enabled:data.filters.varyTiming===true});
    checkpoint();data.blocks=varied.blocks;
    commit(varied.changed?`Ejercicios y ciclos actualizados en ${varied.changed} ${varied.changed===1?'bloque':'bloques'}.`:'Ejercicios renovados y reparto muscular recalculado.');
    return;
  }
  const varied=varyMetabolicTiming(data.blocks,result.blocks,{enabled:data.filters.varyTiming!==false,beginner:data.profile==='principiante',solve:solveTiming});
  checkpoint();data.blocks=varied.blocks;const timeNotice=(varied.changed?`Ejercicios renovados y ON/OFF variado en ${varied.changed} ${varied.changed===1?'bloque':'bloques'}.`: '')+(varied.skipped?' Algún bloque conserva su patrón por los límites de duración o vueltas.':'');commit(timeNotice||(slotId?'Ejercicio cambiado. Se mantienen su candado y los tiempos del bloque.':phase==='main'?'Principal renovado. Tus básicos de fuerza se conservan.':scope==='block'?'Bloque recompuesto con otros patrones y familias. Reparto y candados conservados.':blockId?'Bloque renovado. Se mantienen los ejercicios fijados.':'Sesión renovada según el material y la complejidad seleccionados.'));
}
function readableError(s){for(const [k,v] of Object.entries(PATTERNS))s=s.replace(`· ${k}»`,`· ${v}»`);return s;}
function header(){return `<header class="header"><div class="brand-group"><div class="brand">Impulsa<span>Fit</span></div><div class="brand-divider"></div><div class="header-caption">ESTUDIO DE PROGRAMACIÓN EMS</div></div><div class="header-right"><span class="mode-pill">${isHypertrophyPlan(data)?'EMS hipertrofia':'EMS metabólico'}</span>${button('help','Cómo funciona',null,{cls:'small ghost'})}${button('install-app','Instalar app','install',{cls:'small install-action',title:'Instalar app'})}${button('export','Copia de seguridad','archive',{cls:'small',title:'Exportar copia de seguridad (JSON)'})}</div></header><nav class="nav" aria-label="Secciones">${[['session','Crear sesión',null],['database','Banco de ejercicios',bankCount()],['saved','Sesiones guardadas',data.saved.length]].map(([p,label,count])=>`<button data-action="page" data-page="${p}" class="${ui.page===p?'active':''}" ${ui.page===p?'aria-current="page"':''}>${label}${count!==null?` <span class="count">${count}</span>`:''}</button>`).join('')}</nav>`;}
function config(){
  const hypertrophy=isHypertrophyPlan(data),beginner=data.profile==='principiante';
  const profiles=hypertrophy?Object.fromEntries(Object.entries(PROFILES).filter(([key])=>key!=='principiante')):PROFILES;
  const equipment=hypertrophy
    ? [['sala',EQUIPMENT.sala],...Object.entries(EQUIPMENT).filter(([key])=>!GYM_EQUIPMENT.includes(key))]
    : Object.entries(EQUIPMENT).filter(([key])=>key!=='sala');
  const exclusions=[
    ['noFloor','Ejercicios tumbado o en suelo'],['noOverhead','Brazos por encima de la cabeza'],
    ['noTravel','Desplazamientos por la sala'],['avoidLast','Ejercicios de la última sesión guardada']
  ];
  return `<details class="config panel" ${innerWidth>760?'open':''}>
    <summary>Criterios de la sesión</summary>
    <div class="config-content">
      <div class="config-group programming-group">
        <label class="field-label" for="profile">Perfil de programación</label>
        <select id="profile" data-change="profile">${selectOptions(profiles,data.profile)}</select>
        <label class="field-label emphasis-label" for="emphasis">Énfasis de la sesión</label>
        <select id="emphasis" data-change="emphasis">${selectOptions(EMPHASES,data.emphasis)}</select>
        <p class="hint">${hypertrophy?'Perfil y énfasis orientan los complementos. Hipertrofia EMS se programa para personas ya adaptadas.':'Hombre → torso · Mujer → piernas/glúteos · Principiantes → iniciación equilibrada para ambos. El énfasis se puede adaptar al objetivo del cliente.'}</p>
      </div>
      ${hypertrophy?hypertrophyCriteriaFields():`<div class="config-group">
        <label class="field-label" for="template">Plantilla de partida</label>
        <select id="template" data-change="template">
          <option value="visual" ${data.template==='visual'?'selected':''}>${beginner?'Iniciación · 20 min · 6 bloques':'Metabólica · 35 min · 6 bloques'}</option>
          <option value="weekly" ${data.template==='weekly'?'selected':''}>Alternativa editable · 5 bloques</option>
        </select>
        <p class="hint">${beginner?'Base automática de iniciación; duración y estructura editables.':'Base de tus fichas metabólicas actuales; duración y estructura editables.'}</p>
      </div>`}
      <div class="config-group">
        <label class="field-label" for="variation">Amplitud al cambiar ejercicios</label>
        <select id="variation" data-change="variation">${selectOptions(VARIATION_MODES,data.filters.variation||(hypertrophy?'pattern':'zone'))}</select>
        <p class="hint">${hypertrophy?'Elige la amplitud para los bloques voluntarios. Cada ejercicio con EMS se renueva dentro de su patrón.':'Misma zona amplía los gestos. Todo el bloque también reorganiza los huecos. El reparto y los patrones básicos se conservan al generar.'}</p>
      </div>
      ${timingVariationControl(hypertrophy)}
      <div class="config-group">
        <label class="field-label" for="level">Complejidad del movimiento</label>
        <select id="level" data-change="filter" data-key="level" ${beginner?'disabled':''}>${selectOptions(MOVEMENT_LEVELS,data.filters.level)}</select>
        <p class="hint">${beginner?'Principiantes usa movimientos básicos con material sencillo.':hypertrophy?'La complejidad filtra la técnica y el material de las alternativas.':'Baja usa movimientos básicos. Media combina gestos sencillos. Alta propone secuencias compuestas y dinámicas. Metabólico prioriza el nivel elegido según tus filtros.'}</p>
      </div>
      <div class="config-group equipment-group">
        <span class="field-label eyebrow">Material disponible</span>
        <div class="check-list equipment-list">${equipment.map(([key,label])=>`<label class="check ${key==='sala'?'gym-option':''}"><input type="checkbox" data-change="equipment" value="${key}" ${data.filters.equipment.includes(key)?'checked':''}>${esc(label)}</label>`).join('')}</div>
        ${hypertrophy?'<p class="hint">Sala incluye de una vez las máquinas, las poleas y el multipower.</p>':''}
      </div>
      <div class="config-group equipment-group">
        <span class="field-label eyebrow">Excluir de la propuesta</span>
        <div class="check-list">${exclusions.map(([key,label])=>`<label class="check"><input type="checkbox" data-change="filter" data-key="${key}" ${data.filters[key]?'checked':''} ${beginner&&['noOverhead','noTravel'].includes(key)?'disabled':''}>${label}</label>`).join('')}</div>
      </div>
      <p class="config-note">La propuesta usa la amplitud que elijas y evita repetir ejercicios en la sesión. Prioriza familias distintas cuando hay alternativas. Si faltan alternativas compatibles, te lo indicará.<br><br>El banco inicial es editable. Los filtros organizan ejercicios; la adaptación a cada persona la decides tú.</p>
    </div>
  </details>`;
}
function sessionActivityStats(hypertrophy,timings){
 const stat=(label,seconds,detail)=>`<div class="stat"><div class="label">${label}</div><div class="value">${formatTime(seconds)} <small>min</small></div><div class="sub">${detail}</div></div>`;
 if(hypertrophy)return stat('Tiempo ON',timings.reduce((sum,timing)=>sum+(timing.work||0),0),'Suma de intervalos con corriente');
 const {work,continuous}=metabolicWorkSummary(data.blocks,timings);
 const delta=work-METABOLIC_ON_REFERENCE;
 const reference=data.profile==='principiante'?'Intervalos de trabajo'
   : `Referencia ${formatTime(METABOLIC_ON_REFERENCE)}${delta>0?` · +${formatTime(delta)}`:''}`;
 return stat('ON intermitente',work,reference)+stat('Calma continua',continuous,'Tiempo de relajación con EMS');
}
function sessionPage(){
  const hypertrophy=isHypertrophyPlan(data);
  const errors=validateSession(data.blocks,data.database,data.filters),allTimings=data.blocks.map(solveTiming);
  return `<main class="workspace">${programTabs()}<div class="page-heading"><div><div class="eyebrow muted" style="margin-bottom:10px">${hypertrophy?'MÉTODO ALEMÁN ADAPTADO':'GENERADOR METABÓLICO'}</div><h1>${hypertrophy?'Hipertrofia EMS':'Tu sesión. Tu criterio.'}</h1><p>${hypertrophy?'Full body por series para clientes adaptados.':'Cambia los ejercicios. Conserva la intención de cada bloque.'}</p></div><div class="page-actions">${button('undo','Deshacer','undo',{extra:ui.undo.length?'':'disabled',title:'Deshacer último cambio'})}${button('save','Guardar','save')}${button('download-routine','Descargar rutina PDF','download',{cls:'accent',extra:errors.length?'disabled':''})}${button('generate','Generar rutina','shuffle',{cls:'primary'})}${button('main','Renovar principal','shuffle',{extra:data.blocks.some(b=>hypertrophy?isHypertrophyWork(b):b.phase==='main')?'':'disabled'})}</div></div><div class="print-header"><div class="brand">Impulsa<span>Fit</span></div><h1>${esc(data.title)}</h1><p>${hypertrophy?'Hipertrofia EMS · Método alemán adaptado':'EMS metabólico'} · ${esc(PROFILES[data.profile])} · ${esc(EMPHASES[data.emphasis])} · ${formatTime(sum())} total · ${exercisesCount()} ejercicios · ${data.blocks.length} bloques · ${dateLabel(new Date().toISOString())}</p><p>Propuesta de ejercicios revisable por el entrenador. Parámetros del equipo definidos por el profesional.</p></div><div class="layout">${config()}<div class="content-column"><div class="stats${hypertrophy?'':' with-continuous'}"><div class="stat"><div class="label">Duración total</div><div class="value" id="totalDuration">${formatTime(sum())} <small>min</small></div><div class="sub">Incluye ON, OFF y ajustes finales</div></div><div class="stat"><div class="label">Estructura</div><div class="value">${data.blocks.length} <small>bloques</small></div><div class="sub">${exercisesCount()} ejercicios en total</div></div>${sessionActivityStats(hypertrophy,allTimings)}</div>${hypertrophy?hypertrophySummary():programmingSummary()+beginnerSummary()}<div class="session-title-row"><input class="session-title" aria-label="Nombre de la sesión" maxlength="140" data-change="title" value="${esc(data.title)}"><span class="autosaved">${storageError?'Exporta una copia':'Cambios guardados aquí'}</span></div>${errors.length?`<div class="validation ${data.blocks.some(b=>b.timingPolicy==='pending')?'pending-validation':''}" role="status"><b>${data.blocks.some(b=>b.timingPolicy==='pending')?'Completa los tiempos pendientes de configuración.':'Revisa la propuesta antes de guardar o descargar.'}</b><ul>${errors.slice(0,6).map(e=>`<li>${esc(e)}</li>`).join('')}</ul>${errors.length>6?`Y ${errors.length-6} incidencias más.`:''}</div>`:''}${hypertrophy?'':orderControl()}<div class="block-stack">${data.blocks.map((b,i)=>hypertrophy?hypertrophyBlockHTML(b,i):blockHTML(b,i)).join('')}</div>${hypertrophy?'':addBlockPanel()}<textarea class="session-notes" aria-label="Notas de la sesión" data-change="notes" maxlength="2000" placeholder="Notas de la sesión: cliente, cargas, observaciones…">${esc(data.notes)}</textarea><div class="print-notes print-final">${esc(data.notes)}</div><div class="session-footer"><div><b>Ficha para Wiemspro</b><br>Ejercicios y parámetros por bloque.</div>${button('download-routine','Descargar rutina PDF','download',{extra:errors.length?'disabled':''})}</div></div></div></main>`;
}
const durationValue=block=>block.targetSeconds%60===0?block.targetSeconds/60:formatTime(block.targetSeconds);
function durationField(block,attrs){
  const id=esc(block.id),name=esc(block.name);
  return `<div class="duration-field"><label for="duration-${id}">Duración (min)</label><input id="duration-${id}" aria-label="Duración de ${name} en minutos enteros" type="text" inputmode="numeric" data-change="duration" ${attrs} value="${durationValue(block)}" title="Minutos enteros, por ejemplo 5"></div>`;
}
function blockHTML(b,index){
  const t=solveTiming(b),continuous=b.phase==='recovery',program=wiemsproProgram(b),attrs=`data-block="${esc(b.id)}"`;
  return `<section id="block-${esc(b.id)}" class="block panel" aria-label="Bloque ${index+1}: ${esc(b.name)}"><div class="block-head"><div class="block-name"><span class="block-number">${String(index+1).padStart(2,'0')}</span><div><h2>${esc(b.name)}</h2><p class="phase">${PHASES[b.phase]} · ${b.slots.length} ejercicios</p></div></div><div class="block-buttons">${durationField(b,attrs)}${button('block',b.phase==='strength'?'Renovar fuerza':'Cambiar bloque','shuffle',{cls:'small',extra:attrs,title:b.phase==='strength'?'Renovar básicos de fuerza':`Proponer otros ejercicios para ${b.name}`})}</div></div>${t.error?pendingTiming(b,attrs,t.error):`<div class="timing-bar"><span><b>${continuous?'Trabajo':'ON'} ${t.on} s</b></span><span><b>OFF ${t.off} s</b></span><span class="timing-separator"></span><span><b>${t.rounds}</b> ${t.rounds===1?'vuelta':'vueltas'} · ${t.cycles} ${t.cycles===1?'intervalo':'intervalos'}</span><span class="auto">${icon('check')} Ajuste automático</span></div>`}${timingTools(b,attrs,t)}${stimulationPanel(b,t)}${b.phase==='strength'?strengthPolicy():''}${blockScopeControls(b)}<div>${b.slots.map((s,i)=>exerciseHTML(b,s,i,t)).join('')}</div><div class="block-tools">${button('add-slot','Añadir ejercicio','plus',{cls:'small text-button',extra:attrs})}${button('recompose',b.phase==='strength'?'Recombinar básicos':'Recomponer bloque','shuffle',{cls:'small',extra:attrs,title:`Recomponer ${b.name} con otros patrones`})}<span class="block-tools-spacer"></span>${button('move-block','','chevron',{cls:'small icon move-up',extra:attrs+' data-direction="-1"'+(index===0?' disabled':''),title:`Subir bloque ${b.name}`})}${button('move-block','','chevron',{cls:'small icon move-down',extra:attrs+' data-direction="1"'+(index===data.blocks.length-1?' disabled':''),title:`Bajar bloque ${b.name}`})}</div>${t.buffer?`<div class="buffer-note">${t.buffer} s al final para pausa o transición, sin corriente. El bloque suma exactamente ${formatTime(b.targetSeconds)}.</div>`:''}<details class="block-footer" data-expand="${esc(b.id)}" ${ui.expanded.has(b.id)?'open':''}><summary><span>Tiempos y criterios del bloque</span>${icon('chevron')}</summary><div class="block-config-grid"><label>Tipo de bloque<select data-change="block-phase" ${attrs}>${selectOptions(PHASES,b.phase)}</select></label><label>Organización<select data-change="sequence" ${attrs}>${selectOptions({circuit:'Circuito',pairs:'Parejas',exercise:'Minibloques por ejercicio'},b.sequence||'circuit')}</select></label><label>Nombre<input data-change="block-name" ${attrs} value="${esc(b.name)}" maxlength="140"></label><label>Vueltas<select data-change="round-mode" ${attrs}><option value="auto" ${b.roundMode==='auto'?'selected':''}>Automáticas</option><option value="manual" ${b.roundMode==='manual'?'selected':''}>Fijar número</option></select></label>${b.roundMode==='manual'?`<label>Número de vueltas<input type="number" min="1" max="100" data-change="rounds" ${attrs} value="${b.rounds}"></label>`:''}${program?'':`<label>${continuous?'Trabajo de referencia (s)':'ON de referencia (s)'}<input type="number" min="1" max="600" data-change="preferredOn" ${attrs} value="${b.preferredOn??''}"></label>${!continuous?`<label>OFF de referencia (s)<input type="number" min="1" max="600" data-change="preferredOff" ${attrs} value="${b.preferredOff??''}"></label>`:''}`}</div><p class="hint">El cálculo busca vueltas completas y un ON/OFF cercano a tu referencia. Si fijas las vueltas, mantiene ese número y recalcula los segundos. La pausa final resuelve los segundos que no pueden repartirse en ciclos iguales.</p><label class="block-note">Notas / parámetros EMS que tú definas<textarea data-change="block-notes" ${attrs} maxlength="2000" placeholder="Pulso, rampas, carga, observaciones…">${esc(b.notes)}</textarea></label>${!t.error?`<div class="block-formula">${b.slots.length} ejercicios × ${t.rounds} vueltas × (${t.on} s ${continuous?'trabajo':'ON'} + ${t.off} s OFF)${t.buffer?` + ${t.buffer} s de pausa final`:''} = <b>${formatTime(t.total)}</b>.<br>Orden: ${sequenceGroups(b).map(g=>`${g.join(' ↔ ')} × ${t.rounds}`).join('; después ')}. Cada ejercicio se realiza ${t.rounds} ${t.rounds===1?'vez':'veces'}. El OFF se cuenta también tras el último intervalo.</div>`:''}<div class="block-end-actions">${button('remove-block','Quitar bloque','trash',{cls:'small ghost danger',extra:attrs+(data.blocks.length===1?' disabled':'')})}</div></details>${b.notes?`<div class="print-notes">${esc(b.notes)}</div>`:''}${channelsPanel(b)}</section>`;
}
function exerciseHTML(b,s,index,t){
  const e=data.database.find(e=>e.id===s.exerciseId),valid=e&&eligible(e,b,s,data.filters),attrs=`data-block="${esc(b.id)}" data-slot="${esc(s.id)}"`;
  return `<article class="exercise ${s.locked?'locked':''} ${!valid?'invalid':''}"><div class="exercise-order">${index+1}</div><div><h3 class="${!e?'blank-exercise':''}">${e?esc(e.name):'Selecciona o genera un ejercicio'}</h3><div class="exercise-meta"><span>${esc(PATTERNS[s.pattern])}</span><span>${e?.equipment.length?e.equipment.map(k=>esc(EQUIPMENT[k]||k)).join(' + '):'Sin material'}</span>${e?`<span class="exercise-level">Complejidad ${MOVEMENT_LEVELS[e.level].toLowerCase()}</span>`:''}${s.locked?'<span>Fijado al generar</span>':''}</div>${e?`<p class="exercise-cue">${esc(e.cue)}</p><details><summary>Ver regresión y cambiar criterio</summary><p class="exercise-cue">${esc(e.regression)}</p><label class="tiny">Criterio del hueco<br><select aria-label="Criterio para ${esc(e.name)}" data-change="slot-pattern" ${attrs}>${selectOptions(PATTERNS,s.pattern)}</select></label><br>${button('pick','Explorar todo el bloque','edit',{cls:'small ghost text-button',extra:attrs})}<div class="slot-order-actions">${button('move-slot','Subir',null,{cls:'small ghost',extra:attrs+' data-direction="-1"'+(index===0?' disabled':'')})}${button('move-slot','Bajar',null,{cls:'small ghost',extra:attrs+' data-direction="1"'+(index===b.slots.length-1?' disabled':'')})}${button('remove-slot','Quitar hueco','trash',{cls:'small ghost danger',extra:attrs+(b.slots.length===1?' disabled':'')})}</div></details>`:`<label class="tiny">Criterio<select data-change="slot-pattern" ${attrs} aria-label="Criterio del hueco">${selectOptions(PATTERNS,s.pattern)}</select></label><div class="slot-order-actions">${button('move-slot','Subir',null,{cls:'small ghost',extra:attrs+' data-direction="-1"'+(index===0?' disabled':'')})}${button('move-slot','Bajar',null,{cls:'small ghost',extra:attrs+' data-direction="1"'+(index===b.slots.length-1?' disabled':'')})}${button('remove-slot','Quitar hueco','trash',{cls:'small ghost danger',extra:attrs+(b.slots.length===1?' disabled':'')})}</div>`}</div><div class="exercise-controls">${button('pick','Elegir','edit',{cls:'small ghost',extra:attrs,title:`Elegir ejercicio ${index+1} de ${b.name}`})}${button('lock','',s.locked?'lock':'unlock',{cls:`small icon ghost ${s.locked?'lock-on':''}`,extra:attrs+` aria-pressed="${s.locked}"`,title:s.locked?'Desbloquear ejercicio':'Conservar este ejercicio al generar'})}${button('exercise','Cambiar','shuffle',{cls:'small ghost',extra:attrs,title:`Cambiar solo ejercicio ${index+1} de ${b.name}`})}</div></article>`;
}
function databaseRows(){const rows=data.database.filter(bankMatch);return rows.length?rows.map(e=>`<div class="db-row ${e.enabled?'':'disabled'}"><div><div class="db-name">${esc(e.name)}${e.id.startsWith('ia-')?' <span class="tag">IA</span>':''}</div><div class="db-sub">${e.equipment.length?e.equipment.map(k=>esc(EQUIPMENT[k]||k)).join(' + '):'Sin material'} · ${esc(e.position)} · Complejidad ${MOVEMENT_LEVELS[e.level].toLowerCase()} · ${esc(availableBankPhases(e).map(k=>PHASES[k]).join(', '))}</div></div><div class="db-pattern"><span class="tag">${esc(PATTERNS[e.pattern])}</span><div class="db-sub">${esc(GROUPS[PATTERN_GROUP[e.pattern]]||'Global')}</div></div><label class="check db-enabled"><input type="checkbox" data-change="exercise-enabled" data-id="${esc(e.id)}" ${e.enabled?'checked':''}>Disponible</label>${button('edit-exercise','Editar','edit',{cls:'small db-edit',extra:`data-id="${esc(e.id)}"`})}</div>`).join(''):'<div class="empty-state"><p>No hay ejercicios que coincidan con estos filtros.</p></div>';}
function databasePage(){return `<main class="workspace"><div class="page-heading"><div><div class="eyebrow muted" style="margin-bottom:10px">TU BASE DE TRABAJO</div><h1>Banco de ejercicios</h1><p>${bankCount()} ejercicios y variantes editables para todos los bloques.</p></div><div class="page-actions">${button('ai-bank','Añadir con IA','sparkles',{cls:'accent'})}${button('add-exercise','Añadir ejercicio','plus',{cls:'primary'})}</div></div><div class="database-note">Busca por nombre, grupo muscular o material. Usa <b>Añadir con IA</b> para pedir una ficha y guardarla en el banco.</div><div class="phase-overview">${Object.entries(PHASES).map(([k,v])=>`<button class="phase-stat ${ui.phase===k?'selected':''}" data-action="bank-phase" data-phase="${k}"><b>${data.database.filter(e=>exerciseInBankPhase(e,k)).length}</b><span>${v}</span></button>`).join('')}</div><p class="hint bank-count-note">Una ficha puede estar disponible en varios bloques. El material adicional, como barra hexagonal, rack, asas, multipower, landmine o banco regulable, solo se usa si lo marcas como disponible. Los ejercicios de complejidad alta requieren seleccionar ese nivel en los criterios.</p><div class="toolbar bank-toolbar"><input class="search" id="dbSearch" aria-label="Buscar ejercicios" placeholder="Buscar: remo, glúteo, curl, plancha…" value="${esc(ui.query)}"><select id="dbPhase" aria-label="Filtrar por bloque"><option value="">Todos los bloques</option>${selectOptions(PHASES,ui.phase)}</select><select id="dbGroup" aria-label="Filtrar por zona"><option value="">Todas las zonas</option>${selectOptions(GROUPS,ui.group)}</select><select id="dbPattern" aria-label="Filtrar por patrón"><option value="">Todos los patrones</option>${selectOptions(PATTERNS,ui.pattern)}</select><select id="dbMaterial" aria-label="Filtrar por material"><option value="">Todo el material</option><option value="none" ${ui.material==='none'?'selected':''}>Sin material</option>${selectOptions(EQUIPMENT,ui.material)}</select>${button('clear-bank','Limpiar filtros',null,{cls:'small ghost'})}</div><p class="bank-results tiny muted" id="bankResultCount">${data.database.filter(bankMatch).length} fichas encontradas</p><div class="panel db-list" id="dbRows">${databaseRows()}</div></main>`;}
function savedPage(){return `<main class="workspace"><div class="page-heading"><div><div class="eyebrow muted" style="margin-bottom:10px">TU HISTORIAL</div><h1>Sesiones guardadas</h1><p>Recupera una propuesta o evita sus ejercicios al preparar la siguiente.</p></div>${button('export','Copia de seguridad (JSON)','archive')}</div>${!data.saved.length?`<div class="empty-state"><h2>Tu primera sesión empieza aquí.</h2><p>Guarda una propuesta desde «Crear sesión» para encontrarla en este espacio.</p></div>`:`<div class="saved-grid">${data.saved.map(s=>`<article class="saved-card panel"><div class="date">${dateLabel(s.date)}</div><h2>${esc(s.title)}</h2><p class="saved-programming">${isHypertrophyPlan(s)?'Hipertrofia · Método alemán adaptado':`${esc(PROFILES[s.profile]||PROFILES['sin-definir'])} · ${esc(EMPHASES[s.emphasis]||EMPHASES.equilibrado)}`}</p><p class="metrics">${formatTime(s.blocks.reduce((n,b)=>n+b.targetSeconds,0))} min · ${s.blocks.length} bloques · ${s.blocks.reduce((n,b)=>n+b.slots.length,0)} ejercicios</p><div class="saved-actions">${button('restore','Abrir sesión',null,{cls:'small',extra:`data-id="${esc(s.id)}"`})}${button('delete-saved','','trash',{cls:'small ghost danger',extra:`data-id="${esc(s.id)}"`,title:'Eliminar esta sesión guardada'})}</div></article>`).join('')}</div>`}</main>`;}
function helpPage(){return `<main class="workspace"><div class="page-heading"><div><h1>Cómo funciona</h1><p>Variedad con criterios claros y tiempos que cuadran.</p></div>${button('back-session','Volver a la sesión',null)}</div><article class="help panel"><h2>Hipertrofia y trabajo de sala</h2><p>El programa Hipertrofia abre una sesión full body por series con 20/40 o 30/40. Marca la casilla Sala para incluir las máquinas de una vez. Los bloques con EMS muestran el ciclo, los descansos y la sensación prevista por canal. Cada programa conserva su borrador al cambiar.</p><h2>Generar, conservar, cambiar</h2><p>«Renovar principal» cambia solo los bloques full body. En el metabólico estándar, «Generar rutina» cambia los ejercicios con las duraciones elegidas y conserva los básicos de fuerza. «Renovar fuerza» cambia explícitamente los básicos no fijados. «Elegir» y «Cambiar» permiten sustituir un ejercicio, también si tiene candado: el candado solo lo protege de los cambios de bloque o sesión. Revisa la progresión de los básicos tras 4–6 sesiones; la aplicación no los sustituye automáticamente por haber llegado a esa cifra.</p><p>Puedes mantener el patrón, variar dentro de la zona o recomponer todo el bloque. El cambio aleatorio conserva el reparto de zonas y los patrones básicos presentes en fuerza/full body; el selector manual permite cambiar también el criterio de un hueco. No se repite el mismo ejercicio dentro de la sesión ni se reutilizan los que acabas de sustituir. Se prefieren familias distintas a las que acabas de usar y a las ya presentes; si los filtros dejan pocas opciones, pueden repetirse familias con ejercicios diferentes.</p><h2>Duración del bloque y ON/OFF</h2><p>Escribe la duración en minutos enteros, por ejemplo 5 o 6. Con vueltas automáticas se busca un número entero de vueltas que mantenga el ciclo cerca de tu ON/OFF de referencia. Puedes fijar las vueltas desde «Tiempos y criterios». Se recalculan los segundos para que todos los ejercicios tengan el mismo número de exposiciones.</p><p>Cuando el total no se divide en ciclos iguales de segundos enteros, los segundos restantes aparecen como pausa final sin corriente. Esa pausa se realiza de forma manual; el programa no controla tu equipo EMS. El OFF se incluye también después del último ejercicio.</p><table><thead><tr><th>Ejemplo</th><th>Cálculo</th></tr></thead><tbody><tr><td>5:00 · 3 ejercicios · 2 vueltas</td><td>6 × (30 s ON + 20 s OFF) = 300 s</td></tr><tr><td>7:00 · 4 ejercicios · 2 vueltas fijadas</td><td>8 × (31 s ON + 21 s OFF) + 4 s de pausa = 420 s, con referencia 30/20</td></tr></tbody></table><h2>Perfiles y énfasis</h2><p>En «Criterios de la sesión», Hombre propone torso y Mujer propone piernas/glúteos. El énfasis es editable para ambos perfiles. La selección adapta los patrones del principal al énfasis y a los básicos de fuerza que ya elegiste. Conserva esos básicos, los candados y los tiempos de tus bloques. La plantilla de cinco bloques añade dos huecos al principal cuando hace falta conservar los patrones básicos y el énfasis. El panel muestra el reparto real; los bloqueados y tus elecciones manuales pueden modificarlo.</p><h2>Tiempos metabólicos variables</h2><p>Las referencias de la ficha base son Activación 30/10, Fuerza breve 20/30, Principal 25/20, Core 25/15 y Metabólico 30/20; relajación continua. La plantilla metabólica de seis bloques suma 35 minutos con 3 de activación, 5 de fuerza breve, 12 de Full body, 5 de Core, 5 de Metabólico y 5 de vuelta a la calma. Edita las duraciones en minutos enteros en los encabezados. «Generar rutina» usa esas duraciones y la pantalla muestra el total de la sesión. El ON intermitente se compara con la referencia ImpulsaFit de 17:10. El resumen indica el ON intermitente y la calma continua. Si tus ajustes fijados requieren más ON, muestra la diferencia respecto a la referencia. «Variar ON/OFF en cambios por bloque o ejercicio» aplica las variantes de ciclo a las sustituciones puntuales. «Fijar ON/OFF» protege los tiempos de ese bloque al generar la rutina completa.</p><p>La semana 9 usó circuito; las semanas 10 y 12, parejas; la 11, minibloques. En esas fichas se conservaron los ON/OFF. Las variantes temporales de la aplicación son nuevas opciones de programación. Puedes elegir circuito, parejas o minibloques en los criterios del bloque. Todo el OFF se reserva para recuperar y cambiar de tarea.</p><h2>Porcentajes automáticos por canal</h2><p>La aplicación propone los porcentajes del bloque a partir de sus ejercicios y del énfasis. Cada movimiento identifica grupos principales, de apoyo y de acompañamiento; se toman niveles de tus referencias de semana 12. Cambiar un remo por otra variante con los mismos grupos puede conservar los porcentajes. Sustituir un tirón por un empuje modifica el énfasis de dorsal y pecho cuando cambia el trabajo del conjunto. Los canales que se actualizan quedan resaltados.</p><p>No se requieren entradas manuales: se recalculan al cambiar ejercicios, criterios, perfil o énfasis. La relajación y activación mantienen sus referencias suaves. Son propuestas de programación, no mediciones de reclutamiento ni porcentajes intercambiables entre personas. Se parte del ajuste individual tolerado. EXTRA1 sigue sin uso; gemelos voluntarios.</p><h2>Perfil Principiantes automático</h2><p>Genera una sesión completa de iniciación: ejercicios básicos, duración de partida de 20 minutos, ON/OFF, vueltas y propuesta porcentual de los diez canales. Prioriza apoyos y material sencillo. Conserva los mismos criterios metabólicos de los demás perfiles: activación 30/10, fuerza 20/30, principal 25/20, core 25/15 y metabólico 30/20, con sus variantes y ajuste automático. La relajación es continua. La adaptación está en el volumen, ejercicios, Hz, sensación y porcentajes iniciales.</p><p>Al cambiar ejercicios se recalculan los grupos implicados y sus porcentajes iniciales; una variante muscular equivalente puede conservarlos. Al renovar la rutina se pueden variar los tiempos dentro de los criterios metabólicos compartidos. Puedes fijar ON/OFF, editar la duración y recuperar la referencia base. No se aumenta la dificultad ni la corriente automáticamente con las semanas.</p><p>Los porcentajes son referencias iniciales propias de esta plantilla, inferiores a las propuestas para clientes adaptados; no equivalen a una dosis individual calibrada. El entrenador revisa por canal la sensación y tolerancia del cliente, con orientación inicial cercana a 4/10. Esta plantilla metabólica se usa tras familiarización individual. No es un protocolo automático de primera exposición: el consenso propone fases cortas para esa primera toma de contacto. La distribución de ciclos largos y porcentajes es una decisión de programación. <a href="https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1174103/full" target="_blank" rel="noopener noreferrer">Referencia sobre familiarización WB-EMS</a>.</p><h2>Hz e intensidad por bloque</h2><p>Todos los perfiles y énfasis muestran frecuencia, sensación EMS objetivo de 0 a 10 y esfuerzo físico de 0 a 10. Hombre, Mujer y Sin especificar usan las referencias metabólicas de semana 12. Principiantes usa 40 Hz en fuerza, frecuencias no superiores a 50 Hz y sensación de referencia 4/10 en trabajo, con activación y relajación suaves.</p><p>Sensación EMS es la percepción de corriente que compruebas por canal. Esfuerzo físico es la exigencia del ejercicio; en el bloque metabólico adaptado, 7/10 es el máximo físico de referencia. Los porcentajes del dispositivo no se convierten a esta escala. La frecuencia se basa en el perfil y la fase. Los valores se guardan con la sesión. Las rampas de subida y bajada aparecen junto a los Hz y en la ficha PDF.</p><h2>Complejidad del movimiento</h2><p>Baja usa movimientos básicos. Media combina dos gestos sencillos. Alta añade secuencias compuestas, cambios de apoyo y coordinación. Al renovar el bloque metabólico se elige primero el nivel más alto compatible con tus criterios. Puedes explorar sus alternativas por familia en «Elegir».</p><h2>Elegir del banco</h2><p>El botón «Elegir» junto a cada ejercicio abre el banco de alternativas compatibles con ese bloque y tus filtros. Puedes buscar por nombre, familia o material. En fuerza, el selector de pierna abre todas las familias de esa zona; un empuje o un tirón empieza en su patrón. Puedes filtrar por familia o abrir todo el bloque. Los botones indican cuántas opciones compatibles hay por zona y por patrón. Elegir una ficha de otro patrón cambia el criterio del hueco. Se evitan duplicados dentro de la sesión.</p><h2>Montar y reorganizar bloques</h2><p>«Añadir ejercicio» abre directamente todas las opciones del bloque y recalcula los tiempos. «Recomponer bloque» cambia la distribución de los gestos entre huecos conservando el reparto de zonas y los candados. Puedes subir o bajar bloques, ordenar los ejercicios desde sus detalles, añadir bloques nuevos o cambiar su tipo desde «Tiempos y criterios». Al cambiar el tipo se usan sus referencias ON/OFF y se conserva la duración; revisa la nueva propuesta antes de aplicarla.</p><h2>La base la controlas tú</h2><p>Puedes añadir o editar las fichas, marcar sus bloques permitidos y desactivar los ejercicios que no quieras usar. Las plantillas iniciales proceden de tus PDF metabólicos de octubre (visual de 6 bloques y semanal de 5). Son puntos de partida editables. El banco inicial contiene ${SEED.filter(exercise=>availableBankPhases(exercise).length).length} propuestas para tu revisión.</p><h2>Añadir ejercicios con IA</h2><p>En el banco, usa «Añadir con IA» y escribe lo que buscas. Puedes consultar las coincidencias y pedir una ficha nueva. Revisa el material y los bloques antes de guardarla.</p><p>En «Programa EMS» puedes elegir un ciclo documentado de Wiemspro para el bloque. La ficha muestra juntos los Hz, el ON/OFF, las dos rampas y el ancho de pulso por canal. El cálculo usa vueltas completas y muestra los segundos restantes como pausa final. El tiempo del bloque lo ajustas a tu sesión. Usa el metabólico de 35 minutos con clientes adaptados y ajusta la sensación eléctrica de trabajo por canal, en torno a 5–6/10 en Borg CR10. <a href="https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1174103/full" target="_blank" rel="noopener noreferrer">Guía internacional WB-EMS</a>. <a href="${WIEMSPRO_DOSSIER}" target="_blank" rel="noopener noreferrer">Dossier de programas Wiemspro</a>.</p><h2>Guardado y copias</h2><p>Los cambios se guardan en este navegador. Las sesiones conservan una copia de sus fichas. Para trasladar el trabajo a otro dispositivo, exporta una copia JSON y después impórtala allí. No hay sincronización automática entre dispositivos.</p><p>«Descargar rutina PDF» genera la ficha breve de la sesión para Wiemspro, con los ejercicios y los ajustes de cada bloque.</p></article></main>`;}
function render(){root.innerHTML=header()+(ui.page==='database'?databasePage():ui.page==='saved'?savedPage():ui.page==='help'?helpPage():sessionPage())+`<footer class="app-footer"><span>ImpulsaFit · EMS Studio · Bloques flexibles</span><span>${storageError?'No se pudo guardar en este navegador. Exporta una copia.':'Guardado en este navegador · Sin sincronización entre dispositivos'} &nbsp; <button data-action="import">Importar copia</button></span></footer>`;}

document.addEventListener('toggle',event=>{const id=event.target.dataset?.expand;if(id){if(event.target.open)ui.expanded.add(id);else ui.expanded.delete(id);}},true);
document.addEventListener('input',event=>{
  if(event.target.id==='dbSearch'){ui.query=event.target.value;refreshBankRows();}
  if(event.target.id==='chooserSearch'&&ui.chooser){ui.chooser.query=event.target.value;refreshChooserRows();}
  if(event.target.id==='aiExerciseQuery'&&ui.ai&&!ui.ai.pending)updateAiQuery(event.target.value);
});
document.addEventListener('change',event=>{
  const el=event.target,type=el.dataset.change;
  if(['dbPattern','dbPhase','dbGroup','dbMaterial'].includes(el.id)){ui[{dbPattern:'pattern',dbPhase:'phase',dbGroup:'group',dbMaterial:'material'}[el.id]]=el.value;refreshBankRows();return;}
  if(el.id==='chooserFamily'&&ui.chooser){ui.chooser.family=el.value;refreshChooserRows();return;}
  if(el.id==='chooserPattern'&&ui.chooser){ui.chooser.pattern=el.value;ui.chooser.family='';refreshChooserRows();return;}
  if(!type)return;
  if(type==='ai-phase'&&ui.ai&&!ui.ai.pending){
    ui.ai.phase=el.value;ui.ai.proposals=[];ui.ai.message='';ui.ai.error=false;renderAiDialog();return;
  }
  if(type==='hypertrophy-setting')return changeHypertrophySetting(el.dataset.key,Number(el.value),el.dataset.block);
  if(type==='profile')return changeProgramming(el.value,defaultEmphasis(el.value));
  if(type==='emphasis')return changeProgramming(data.profile,el.value);
  if(type==='block-phase')return switchBlockPhase(el.dataset.block,el.value);
  const b=data.blocks.find(b=>b.id===el.dataset.block),s=b?.slots.find(s=>s.id===el.dataset.slot);
  if(type==='ems-program'){
    if(!b||isHypertrophyBlock(b)||data.profile==='principiante')return;
    const proposed={...b};
    if(el.value){
      proposed.emsProgram=el.value;
      if(!wiemsproProgram(proposed))return;
    }else delete proposed.emsProgram;
    checkpoint();
    data.blocks=data.blocks.map(block=>block===b?proposed:block);
    commit(el.value?'Programa Wiemspro aplicado a este bloque.':'Referencia ImpulsaFit recuperada.');
    return;
  }
  if(type==='duration'){
    const seconds=parseTime(el.value,{wholeMinutes:true});
    if(seconds===null){el.value=durationValue(b);return toast('Escribe minutos enteros entre 1 y 120, por ejemplo 5 o 6.',true);}
    checkpoint();b.targetSeconds=seconds;delete b.durationReference;commit(isHypertrophyBlock(b)?'Duración actualizada. Revisa las series y la pausa de cambio.':'Tiempos recalculados. Todos los ejercicios tienen las mismas vueltas.');return;
  }
  if(['preferredOn','preferredOff','rounds'].includes(type)){
    const value=Number(el.value),min=1,max=type==='rounds'?100:600;
    if(!Number.isInteger(value)||value<min||value>max){el.value=b[type];return toast(`Usa un número entero entre ${min} y ${max}.`,true);}
    checkpoint();b[type]=value;if(type!=='rounds'){b.timingPolicy=b.preferredOn==null||b.preferredOff==null?'pending':'custom';b.timingLocked=true;}commit();return;
  }
  if(type==='manual-exercise'){
    if(!el.value)return;const e=data.database.find(e=>e.id===el.value);
    if(!e||!eligible(e,b,s,data.filters))return toast('Este ejercicio no cumple los criterios del hueco.',true);
    if(data.blocks.some(x=>x.slots.some(y=>y.id!==s.id&&y.exerciseId===el.value))){render();return toast('Ese ejercicio ya está en otro hueco de la sesión.',true);}
    checkpoint();s.exerciseId=el.value;commit();return;
  }
  checkpoint();
  if(type==='template'){
    const blocks=applyEmphasis(makeTemplate(el.value),data.emphasis),r=data.profile==='principiante'?adaptBeginner(blocks,data.database,data.filters,{emphasis:data.emphasis,avoidIds:avoidIds()}):generate(blocks,data.database,data.filters,{avoidIds:avoidIds()});
    if(r.error){ui.undo.pop();render();return toast(readableError(r.error),true);}data.template=el.value;data.blocks=r.blocks;if(r.filters)data.filters=r.filters;commit('Plantilla cambiada. Puedes deshacer el cambio.');return;
  }
  if(type==='vary-timing'){data.filters.varyTiming=el.checked;commit(el.checked?'Los cambios por bloque o ejercicio también variarán ON/OFF.':'Los cambios por bloque o ejercicio conservarán el ON/OFF de referencia.');return;}
  if(type==='sequence'){b.sequence=el.value;commit('Organización del bloque actualizada. Se conservan ciclos y duración.');return;}
  if(type==='variation'){
    data.filters.variation=el.value;
    if(isHypertrophyPlan(data))for(const block of data.blocks)if(!isHypertrophyWork(block))block.variation='inherit';
    commit('Amplitud de cambios actualizada. Se aplicará en la próxima propuesta.');return;
  }
  if(type==='block-variation'){b.variation=el.value;commit();return;}
  if(type==='filter'){data.filters[el.dataset.key]=el.dataset.key==='level'?Number(el.value):el.checked;commit();return;}
  if(type==='equipment'){
    data.filters.equipment=el.checked?[...new Set([...data.filters.equipment,el.value])]:data.filters.equipment.filter(k=>k!==el.value);
    commit(el.value==='sala'?(el.checked?'Sala incluida. Las máquinas aparecen en Elegir y al renovar ejercicios.':'Material de sala desmarcado. Revisa los ejercicios y elige alternativas.'):undefined);
    return;
  }
  if(type==='title'){data.title=el.value.trim()||(isHypertrophyPlan(data)?'Hipertrofia · Full body':'Metabólica · Sesión nueva');commit();return;}
  if(type==='notes'){data.notes=el.value;persist();return;}
  if(type==='block-name'){b.name=el.value.trim()||PHASES[b.phase];commit();return;}
  if(type==='block-notes'){b.notes=el.value;persist();return;}
  if(type==='round-mode'){b.roundMode=el.value;const t=solveTiming({...b,roundMode:'auto'});if(el.value==='manual'&&!t.error)b.rounds=t.rounds;commit();return;}
  if(type==='slot-pattern'){s.pattern=el.value;s.exerciseId=null;s.locked=false;commit('Criterio cambiado. Genera o elige un ejercicio compatible.');return;}
  if(type==='exercise-enabled'){const e=data.database.find(e=>e.id===el.dataset.id);e.enabled=el.checked;commit();return;}
});
document.addEventListener('click',event=>{
  const el=event.target.closest('[data-action]');if(!el)return;
  const action=el.dataset.action,b=data.blocks.find(b=>b.id===el.dataset.block),s=b?.slots.find(s=>s.id===el.dataset.slot);
  if(action==='ai-bank')return openAiDialog();
  if(action==='ai-close')return closeAiDialog();
  if(action==='ai-connect')return runAiAction('Preparando la conexión…',async state=>{
    state.authorization=await createAiAuthorization();
    state.message='';
  });
  if(action==='ai-disconnect'&&ui.ai&&!ui.ai.pending){
    setAiKey('');ui.ai.authorization=null;ui.ai.proposals=[];ui.ai.message='';ui.ai.error=false;renderAiDialog();return;
  }
  if(action==='ai-generate')return requestAiProposals();
  if(action==='ai-accept')return acceptAiProposal(Number(el.dataset.index));
  if(action==='install-app')return installApp();
  if(action==='program')return switchProgram(el.dataset.program);
  if(action==='page'){ui.page=el.dataset.page;render();scrollTo(0,0);return;}
  if(action==='help'||action==='back-session'){ui.page=action==='help'?'help':'session';render();scrollTo(0,0);return;}
  if(action==='bank-phase'){ui.phase=ui.phase===el.dataset.phase?'':el.dataset.phase;render();return;}
  if(action==='clear-bank'){ui.query='';ui.pattern='';ui.phase='';ui.group='';ui.material='';render();return;}
  if(action==='chooser-scope'&&ui.chooser){const cb=data.blocks.find(x=>x.id===ui.chooser.blockId),cs=cb.slots.find(x=>x.id===ui.chooser.slotId);ui.chooser.family='';ui.chooser.pattern=el.dataset.scope==='pattern'?cs.pattern:el.dataset.scope;document.querySelector('#chooserPattern').value=ui.chooser.pattern;refreshChooserRows();return;}
  if(action==='lock-timing'){checkpoint();b.timingLocked=!b.timingLocked;commit(b.timingLocked?'Tiempos del bloque fijados al generar la rutina.':'ON/OFF disponible para variación.');return;}
  if(action==='vary-block-timing'){
    const hypertrophy=isHypertrophyWork(b);
    const options={forceBlock:b.id,beginner:data.profile==='principiante',solve:solveTiming};
    const vary=hypertrophy?varyHypertrophyTiming:varyMetabolicTiming;
    const result=vary(data.blocks,data.blocks,options);
    if(!result.changed)return toast('No hay otro ciclo compatible. Revisa la duración, las series o el candado.',true);
    checkpoint();data.blocks=result.blocks;
    commit(hypertrophy?'Ciclo de hipertrofia alternado. Revisa el nuevo tiempo ON.':'Nuevo ON/OFF metabólico. Los ejercicios, porcentajes y duración se conservan.');return;
  }
  if(action==='reset-timing'){
    const reset=isHypertrophyWork(b)
      ? {...b,preferredOn:HYPERTROPHY_ON[0],preferredOff:HYPERTROPHY_OFF,timingLocked:false}
      : resetMetabolicTiming(b,{beginner:data.profile==='principiante'});
    checkpoint();data.blocks=data.blocks.map(block=>block.id===b.id?reset:block);
    commit('ON/OFF de referencia recuperado. La duración elegida se conserva.');return;
  }
  if(action==='add-block')return addBlock(document.querySelector('#newBlockPhase').value);
  if(action==='recompose')return runGenerate(b.id,null,'block');
  if(action==='move-block'){const index=data.blocks.findIndex(x=>x.id===b.id),moved=moveItem(data.blocks,index,Number(el.dataset.direction));if(moved===data.blocks)return;checkpoint();data.blocks=moved;commit('Orden de bloques actualizado. Las duraciones se conservan.');document.getElementById('block-'+b.id)?.scrollIntoView({block:'nearest'});return;}
  if(action==='move-slot'){const index=b.slots.findIndex(x=>x.id===s.id),moved=moveItem(b.slots,index,Number(el.dataset.direction));if(moved===b.slots)return;checkpoint();b.slots=moved;commit('Orden de ejercicios actualizado. Los tiempos se conservan.');return;}
  if(action==='pick')return openChooser(b,s);
  if(action==='close-chooser'){document.querySelector('#chooserDialog').close();ui.chooser=null;return;}
  if(action==='choose-candidate')return chooseCandidate(el.dataset.id);
  if(action==='main')return runGenerate(null,null,null,'main');
  if(action==='generate')return runGenerate();
  if(action==='restore-order'){checkpoint();data.blocks=recommendedOrder(data.blocks);commit('Orden base restaurado: activación, fuerza, full body, core, metabólico y vuelta a la calma. Puedes deshacerlo.');return;}
  if(action==='chooser-filters'){document.querySelector('#chooserDialog').close();ui.chooser=null;const config=document.querySelector('.config');config.open=true;config.scrollIntoView({block:'start'});document.querySelector('#level').focus({preventScroll:true});return;}
  if(action==='block')return runGenerate(b.id);
  if(action==='exercise')return runGenerate(b.id,s.id);
  if(action==='undo'){if(ui.undo.length){data=ui.undo.pop();commit('Último cambio deshecho.');}return;}
  if(action==='lock'){if(!s.exerciseId)return toast('Selecciona un ejercicio antes de bloquearlo.',true);checkpoint();s.locked=!s.locked;commit();return;}
  if(action==='add-slot'){
    if(b.slots.length>=12)return toast('Esta versión permite hasta 12 ejercicios por bloque.',true);
    checkpoint();const patterns=PHASE_PATTERNS[b.phase],slot={id:uid(),pattern:patterns[b.slots.length%patterns.length],exerciseId:null,locked:false};b.slots.push(slot);commit();openChooser(b,slot);return;
  }
  if(action==='remove-slot'){if(b.slots.length<=1)return;checkpoint();const before=structuredClone(data.blocks);b.slots=b.slots.filter(x=>x.id!==s.id);if(!isHypertrophyBlock(b))data.blocks=varyMetabolicTiming(before,data.blocks,{enabled:data.filters.varyTiming!==false,beginner:data.profile==='principiante',solve:solveTiming}).blocks;commit('Ejercicio retirado. Tiempos y propuesta muscular recalculados.');return;}
  if(action==='remove-block'){if(data.blocks.length<=1)return;checkpoint();data.blocks=data.blocks.filter(x=>x.id!==b.id);commit('Bloque retirado. Puedes deshacer el cambio.');return;}
  if(action==='save'){
    const errors=validateSession(data.blocks,data.database,data.filters);if(errors.length)return toast(errors[0],true);
    checkpoint();const used=new Set(data.blocks.flatMap(b=>b.slots.map(s=>s.exerciseId)));
    data.saved.unshift({id:uid(),title:data.title,date:new Date().toISOString(),blocks:structuredClone(data.blocks),filters:structuredClone(data.filters),exercises:structuredClone(data.database.filter(e=>used.has(e.id))),notes:data.notes,template:data.template,profile:data.profile,emphasis:data.emphasis,programmingVersion:PROGRAMMING_VERSION});
    data.saved=data.saved.slice(0,200);commit('Sesión guardada con sus tiempos y sus fichas.');return;
  }
  if(action==='restore'){
    const record=data.saved.find(s=>s.id===el.dataset.id);if(!record)return;
    checkpoint();
    if(programKey(record)!==programKey(data))parkDraft(programKey(record));
    Object.assign(data,captureDraft(record));
    if(!isHypertrophyPlan(data)&&(record.programmingVersion||0)<PHASE_ORDER_VERSION)data.blocks=recommendedOrder(data.blocks);
    if(data.profile==='principiante')data.blocks=upgradeNoviceBlocks(data.blocks);
    for(const exercise of record.exercises){const i=data.database.findIndex(e=>e.id===exercise.id);if(i<0)data.database.push(structuredClone(exercise));else data.database[i]=structuredClone(exercise);}
    ui.page='session';commit('Sesión recuperada con sus fichas originales. Puedes deshacerlo.');scrollTo(0,0);return;
  }
  if(action==='delete-saved'){checkpoint();data.saved=data.saved.filter(s=>s.id!==el.dataset.id);commit('Sesión retirada del historial. Puedes deshacerlo.');return;}
  if(action==='download-routine')return downloadRoutine();
  if(action==='add-exercise'||action==='edit-exercise'){openExercise(action==='edit-exercise'?data.database.find(e=>e.id===el.dataset.id):null);return;}
  if(action==='close-dialog'){document.querySelector('#exerciseDialog').close();return;}
  if(action==='delete-exercise'){
    const id=el.dataset.id;checkpoint();data.database=data.database.filter(e=>e.id!==id);document.querySelector('#exerciseDialog').close();commit('Ficha eliminada. Si estaba en la sesión, genera una sustitución. Puedes deshacerlo.');return;
  }
  if(action==='export'){
    downloadFile(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),`ImpulsaFit_EMS_copia_${new Date().toISOString().slice(0,10)}.json`);
    toast('Copia exportada. Puedes importarla en otro dispositivo.');return;
  }
  if(action==='import'){document.querySelector('#importFile').click();return;}
});
aiDialog.addEventListener('cancel',event=>{event.preventDefault();closeAiDialog();});
aiDialog.addEventListener('keydown',event=>{
  if(event.target.id==='aiExerciseQuery'&&event.key==='Enter'&&aiKey&&!event.isComposing){
    event.preventDefault();requestAiProposals();
  }
});
aiDialog.addEventListener('submit',event=>{
  if(event.target.id!=='aiCodeForm'||!ui.ai?.authorization)return;
  event.preventDefault();
  const code=String(new FormData(event.target).get('code')||'');
  return runAiAction('Conectando con OpenRouter…',async(state,signal)=>{
    const key=await exchangeAiCode(code,state.authorization.verifier,{signal});
    if(ui.ai!==state)return;
    setAiKey(key);
    state.authorization=null;
    state.message='IA conectada. Ya puedes generar propuestas.';
  });
});
document.querySelector('#importFile').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{if(file.size>8_000_000)throw Error('El archivo supera 8 MB.');const imported=upgradeState(JSON.parse(await file.text()));checkpoint();data=imported;data.title=typeof data.title==='string'?data.title.slice(0,140):'Sesión importada';data.notes=typeof data.notes==='string'?data.notes.slice(0,2000):'';commit('Copia importada. Puedes deshacer la importación.');}
  catch(error){toast(`No se pudo importar: ${error.message}`,true);}finally{event.target.value='';}
});
function openExercise(existing){
  const e=existing||{id:uid(),name:'',pattern:'rodilla',family:'',phases:['main'],level:1,equipment:[],position:'de pie',flags:[],cue:'',regression:'',enabled:true};
  const dialog=document.querySelector('#exerciseDialog');
  dialog.innerHTML=`<form id="exerciseForm" data-id="${esc(e.id)}"><div class="dialog-head"><h2 id="dialogTitle">${existing?'Editar ficha':'Nuevo ejercicio'}</h2>${button('close-dialog','','close',{cls:'icon ghost',title:'Cerrar'})}</div><div class="dialog-body"><div class="form-grid"><label class="form-field wide">Nombre<input name="name" required maxlength="140" value="${esc(e.name)}"></label><label class="form-field">Patrón<select name="pattern">${selectOptions(PATTERNS,e.pattern)}</select></label><label class="form-field">Complejidad<select name="level">${selectOptions(MOVEMENT_LEVELS,e.level)}</select></label><label class="form-field">Familia / variante<input name="family" maxlength="100" value="${esc(e.family)}" placeholder="Ej. sentadilla"></label><label class="form-field">Posición<select name="position">${selectOptions({'de pie':'De pie',sentado:'Sentado',suelo:'En suelo',tumbado:'Tumbado'},e.position)}</select></label><label class="form-field wide">Indicaciones<textarea name="cue" maxlength="2000">${esc(e.cue)}</textarea></label><label class="form-field wide">Regresión / alternativa sencilla<textarea name="regression" maxlength="2000">${esc(e.regression)}</textarea></label></div><fieldset class="fieldset"><legend>Bloques en los que puede aparecer · elige al menos uno</legend><div class="checkbox-grid">${Object.entries(PHASES).map(([k,v])=>`<label class="check"><input name="phases" type="checkbox" value="${k}" ${e.phases.includes(k)?'checked':''}>${v}</label>`).join('')}</div></fieldset><fieldset class="fieldset"><legend>Material necesario · sin marcar = sin material</legend><div class="checkbox-grid">${Object.entries(EQUIPMENT).map(([k,v])=>`<label class="check"><input name="equipment" type="checkbox" value="${k}" ${e.equipment.includes(k)?'checked':''}>${v}</label>`).join('')}</div></fieldset><div class="check-list"><label class="check"><input type="checkbox" name="overhead" ${e.flags.includes('overhead')?'checked':''}>Eleva los brazos por encima de la cabeza</label><label class="check"><input type="checkbox" name="travel" ${e.flags.includes('desplazamiento')?'checked':''}>Requiere desplazamiento por la sala</label><label class="check"><input type="checkbox" name="enabled" ${e.enabled?'checked':''}>Disponible para generar propuestas</label></div></div><div class="dialog-actions">${existing?button('delete-exercise','Eliminar ficha','trash',{cls:'ghost danger small',extra:`data-id="${esc(e.id)}"`}):''}${button('close-dialog','Cancelar',null,{cls:'ghost'})}<button type="submit" class="primary">Guardar ficha</button></div></form>`;
  dialog.showModal();
  document.querySelector('#exerciseForm').addEventListener('submit',event=>{
    event.preventDefault();const f=new FormData(event.target),phases=f.getAll('phases');if(!phases.length)return toast('Marca al menos un bloque permitido.',true);
    const name=String(f.get('name')).trim();if(!name)return;
    checkpoint();const item={id:e.id,name,pattern:f.get('pattern'),family:String(f.get('family')).trim()||f.get('pattern'),phases,level:Number(f.get('level')),equipment:f.getAll('equipment'),position:f.get('position'),flags:[...(f.has('overhead')?['overhead']:[]),...(f.has('travel')?['desplazamiento']:[])],cue:String(f.get('cue')),regression:String(f.get('regression')),enabled:f.has('enabled')};
    if(e.components&&e.pattern===item.pattern)item.components=[...e.components];
    const index=data.database.findIndex(x=>x.id===e.id);if(index<0)data.database.push(item);else data.database[index]=item;dialog.close();commit('Ficha guardada. Se usará cuando cumpla los criterios del bloque.');
  });
}
let printDetails=[];
window.addEventListener('beforeprint',()=>{printDetails=[...document.querySelectorAll('.block-footer')].filter(d=>!d.open);printDetails.forEach(d=>d.open=true);});
window.addEventListener('afterprint',()=>{printDetails.forEach(d=>d.open=false);printDetails=[];});
if(!loadFailure)persist();render();
if(loadFailure||storageError)toast('No se pudo recuperar o guardar el trabajo anterior. Exporta una copia antes de cerrar.',true);
else if(programmingUpdated&&data.profile!=='principiante'&&!isHypertrophyPlan(data))toast('Plantilla metabólica actualizada.');
else if(catalogUpdated)toast('Banco actualizado con el nuevo repertorio metabólico. Pulsa «Cambiar bloque» para probarlo.');

function programmingSummary(){
 const c=emphasisDistribution(data.blocks,PATTERN_GROUP),locked=data.blocks.flatMap(b=>b.slots).filter(s=>s.locked).length;
 return `<div class="programming-summary"><div><span class="programming-profile">${esc(PROFILES[data.profile])}</span><b>${esc(EMPHASES[data.emphasis])}</b><p>Reparto de huecos en fuerza + full body: <strong>${c.torso} torso</strong> · <strong>${c.piernas} piernas/glúteos</strong>${c.core?` · ${c.core} core`:''}${c.global?` · ${c.global} global`:''}.</p></div><span class="tag">${locked?`${locked} bloqueados se conservan`:'Full body'}</span></div>`;
}
function changeProgramming(profile,emphasis){
 if(isHypertrophyPlan(data))return changeHypertrophyProgramming(profile,emphasis);
 const enteringBeginner=profile==='principiante'&&data.profile!=='principiante';
 const filters={...data.filters,beginner:profile==='principiante'};
 const source=profile!=='principiante'?data.blocks.map(b=>['pending','beginner'].includes(b.timingPolicy)?resetMetabolicTiming(b,{resetDuration:data.profile==='principiante'&&b.timingPolicy==='beginner'&&(b.durationReference??b.targetSeconds)===NOVICE_TIMINGS[b.phase].seconds}):b):data.blocks;
 const proposed=applyEmphasis(source,emphasis);
 const r=profile==='principiante'?adaptBeginner(data.blocks,data.database,filters,{emphasis,resetTiming:enteringBeginner,avoidIds:avoidIds()}):proposed.some(b=>b.slots.some(s=>!s.locked))?generate(proposed,data.database,filters,{avoidIds:avoidIds()}):{blocks:proposed};
 if(r.error){render();return toast(readableError(r.error),true);}
 checkpoint();data.profile=profile;data.emphasis=emphasis;data.blocks=r.blocks;data.filters=r.filters||filters;
 commit(enteringBeginner?`Principiantes: base de 20 min con ON/OFF, vueltas y porcentajes automáticos según los ejercicios. ${r.releasedPins?`${r.releasedPins===1?'Se ha sustituido 1 ejercicio fijado incompatible':`Se han sustituido ${r.releasedPins} ejercicios fijados incompatibles`}. `:''}Puedes editar los tiempos o deshacer el cambio.`:`Perfil ${PROFILES[profile]} · énfasis ${EMPHASES[emphasis]}. Duración y programación actualizadas; básicos compatibles conservados.`);
}
function bankMatch(e){
 return (ui.phase?exerciseInBankPhase(e,ui.phase):availableBankPhases(e).length>0)&&
   (!ui.pattern||e.pattern===ui.pattern)&&(!ui.group||PATTERN_GROUP[e.pattern]===ui.group)&&
   (!ui.material||(ui.material==='none'?!e.equipment.length:e.equipment.includes(ui.material)))&&matchesExerciseQuery(e,ui.query);
}
function availableBankPhases(exercise){return exercise.phases.filter(phase=>exerciseInBankPhase(exercise,phase));}
function bankCount(){return data.database.filter(exercise=>availableBankPhases(exercise).length).length;}
function refreshBankRows(){document.querySelector('#dbRows').innerHTML=databaseRows();document.querySelector('#bankResultCount').textContent=`${data.database.filter(bankMatch).length} fichas encontradas`;document.querySelectorAll('.phase-stat').forEach(el=>el.classList.toggle('selected',el.dataset.phase===ui.phase));}
function openChooser(block,slot){
 const initialPattern=isHypertrophyWork(block)?slot.pattern:block.phase==='strength'?(PATTERN_GROUP[slot.pattern]==='piernas'?'zone':slot.pattern):'all';
 ui.chooser={blockId:block.id,slotId:slot.id,pattern:initialPattern,family:'',query:''};
 const dialog=document.querySelector('#chooserDialog');
 dialog.innerHTML=`<div class="dialog-head"><div><div class="eyebrow muted" style="margin-bottom:5px">${esc(block.name)}</div><h2 id="chooserTitle">Elegir ejercicio</h2></div>${button('close-chooser','','close',{cls:'icon ghost',title:'Cerrar selector'})}</div><div class="chooser-filters"><label class="form-field">Buscar<input id="chooserSearch" type="search" placeholder="Nombre, familia o material…" autocomplete="off"></label><label class="form-field">Filtrar opciones<select id="chooserPattern" ${isHypertrophyWork(block)?'disabled':''}><option value="all" ${initialPattern==='all'?'selected':''}>Todo el bloque · todos los patrones</option><option value="zone" ${initialPattern==='zone'?'selected':''}>Misma zona · ${esc(GROUPS[PATTERN_GROUP[slot.pattern]])}</option>${selectOptions(PATTERNS,initialPattern)}</select></label>${(isHypertrophyBlock(block)||['strength','metabolic'].includes(block.phase))?'<label class="form-field chooser-family">Familia de movimiento<select id="chooserFamily" aria-label="Familia de movimiento"></select></label>':''}<p class="hint">Puedes elegir otro ejercicio aunque esté fijado al generar. Elegir otro patrón actualiza el criterio del hueco. Las opciones respetan el material y el nivel técnico seleccionados. ${data.profile==='principiante'?'Perfil Principiantes: solo complejidad básica y material sencillo.':''}</p><div class="chooser-filter-link">${button('chooser-filters','Revisar material y nivel',null,{cls:'small ghost text-button'})}</div></div><div id="chooserScopes" class="chooser-scopes"></div><div class="chooser-count" id="chooserResultCount" role="status"></div><div id="chooserRows" class="chooser-rows"></div>`;
 refreshChooserRows();dialog.showModal();document.querySelector('#chooserSearch').focus();
}
function refreshChooserRows(){
 const familySelect=document.querySelector('#chooserFamily');
 if(familySelect){const choices=manualCandidates(data.blocks,data.database,data.filters,{...ui.chooser,family:'',query:'',avoidIds:avoidIds()}),families=new Map();for(const e of choices)families.set(e.family,(families.get(e.family)||0)+1);if(ui.chooser.family&&!families.has(ui.chooser.family))ui.chooser.family='';familySelect.innerHTML='<option value="">Todas las familias compatibles</option>'+[...families].sort(([a],[b])=>(FAMILY_LABELS[a]||a).localeCompare(FAMILY_LABELS[b]||b,'es')).map(([key,count])=>`<option value="${esc(key)}" ${ui.chooser.family===key?'selected':''}>${esc(FAMILY_LABELS[key]||key)} · ${count}</option>`).join('');}
 const rows=manualCandidates(data.blocks,data.database,data.filters,{...ui.chooser,avoidIds:avoidIds()});
 const block=data.blocks.find(b=>b.id===ui.chooser.blockId),slot=block.slots.find(s=>s.id===ui.chooser.slotId);
 const levelCounts=Object.entries(MOVEMENT_LEVELS).map(([level,label])=>`${label} ${rows.filter(e=>e.level===Number(level)).length}`);
 const detail=block.phase==='metabolic'&&rows.length?` · ${levelCounts.join(' · ')}`:'';
 document.querySelector('#chooserResultCount').textContent=`${rows.length} ${rows.length===1?'opción compatible':'opciones compatibles'}${ui.chooser.pattern==='all'?' · todas las zonas y patrones del bloque':ui.chooser.pattern==='zone'?' · misma zona, distintos patrones':''}${detail}`;
 const active=['all','zone'].includes(ui.chooser.pattern)?ui.chooser.pattern:ui.chooser.pattern===slot.pattern?'pattern':null;
 const scopes=isHypertrophyWork(block)?[['pattern','Mismo patrón',slot.pattern]]:[['all','Todo el bloque','all'],['zone','Misma zona','zone'],['pattern','Mismo patrón',slot.pattern]];
 document.querySelector('#chooserScopes').innerHTML=scopes.map(([scope,label,pattern])=>{const count=manualCandidates(data.blocks,data.database,data.filters,{...ui.chooser,pattern,family:'',avoidIds:avoidIds()}).length;return `<button class="scope-chip ${active===scope?'active':''}" data-action="chooser-scope" data-scope="${scope}" aria-pressed="${active===scope}">${label} <b>${count}</b></button>`;}).join('');
 document.querySelector('#chooserRows').innerHTML=rows.length?rows.map(e=>`<article class="chooser-row"><div><h3>${esc(e.name)}</h3><div class="exercise-meta"><span>${esc(PATTERNS[e.pattern])}</span><span>${e.equipment.length?e.equipment.map(k=>esc(EQUIPMENT[k])).join(' + '):'Sin material'}</span><span>${esc(e.position)}</span><span class="exercise-level">Complejidad ${MOVEMENT_LEVELS[e.level].toLowerCase()}</span></div><p class="exercise-cue">${esc(e.cue)}</p><p class="chooser-regression">Familia: ${esc(FAMILY_LABELS[e.family]||e.family)} · Regresión: ${esc(e.regression)}</p></div>${e.id===slot.exerciseId?'<span class="tag">Actual</span>':button('choose-candidate','Usar',null,{cls:'small',extra:`data-id="${esc(e.id)}"`,title:`Usar ${e.name}`})}</article>`).join(''):'<div class="empty-state"><h3>Sin alternativas con estos filtros.</h3><p>Cambia el patrón o revisa el material y la complejidad de la sesión.</p></div>';
}
function chooseCandidate(id){
 if(!ui.chooser)return;
 const candidates=manualCandidates(data.blocks,data.database,data.filters,{...ui.chooser,avoidIds:avoidIds()}),exercise=candidates.find(e=>e.id===id);
 const block=data.blocks.find(b=>b.id===ui.chooser.blockId),slot=block?.slots.find(s=>s.id===ui.chooser.slotId);
 if(!exercise||!slot)return toast('Esta alternativa ya no está disponible. Reabre el selector.',true);
 useExerciseInSlot(slot,exercise);
}
function useExerciseInSlot(slot,exercise){
 checkpoint();
 const before=structuredClone(data.blocks);
 slot.pattern=exercise.pattern;slot.exerciseId=exercise.id;
 const hypertrophy=isHypertrophyPlan(data);
 const varied=varyEditedTiming(before,data.blocks);
 data.blocks=varied.blocks;
 document.querySelector('#chooserDialog').close();ui.chooser=null;
 commit(varied.changed?'Ejercicio elegido y ON/OFF renovado. Duración conservada y porcentajes recalculados según los músculos implicados.':hypertrophy?'Ejercicio elegido y reparto muscular recalculado.':'Ejercicio elegido. La duración se conserva.');
}

function varyEditedTiming(before,after){
 return isHypertrophyPlan(data)
   ? varyHypertrophyTiming(before,after,{enabled:data.filters.varyTiming===true})
   : varyMetabolicTiming(before,after,{enabled:data.filters.varyTiming!==false,beginner:data.profile==='principiante',solve:solveTiming});
}

function setAiKey(key){
 aiKey=key;
 try{
   if(key)sessionStorage.setItem(AI_CONNECTION,key);
   else sessionStorage.removeItem(AI_CONNECTION);
 }catch{}
}
function openAiDialog(){
 ui.ai={query:ui.query.slice(0,140),phase:ui.phase,authorization:null,pending:null,proposals:[],message:'',error:false};
 renderAiDialog();
 aiDialog.showModal();
 aiDialog.querySelector('#aiExerciseQuery').focus();
}
function closeAiDialog(){
 ui.ai?.pending?.abort();
 ui.ai=null;
 aiDialog.close();
}
function aiBankMatches({query,phase}){
 if(!query.trim())return '<p class="tiny muted">Escribe un ejercicio o grupo muscular para ver qué tienes ya en el banco.</p>';
 const rows=data.database.filter(exercise=>(phase?exerciseInBankPhase(exercise,phase):availableBankPhases(exercise).length>0)&&
   matchesExerciseQuery(exercise,query));
 if(!rows.length)return '<p class="tiny muted">El banco no tiene coincidencias para esta búsqueda.</p>';
 const examples=rows.slice(0,3).map(exercise=>esc(exercise.name)+(exercise.enabled?'':' (desactivado)'));
 return `<p class="tiny"><strong>${rows.length} ${rows.length===1?'coincidencia en el banco':'coincidencias en el banco'}</strong></p><p class="tiny muted">${examples.join(' · ')}${rows.length>examples.length?' · …':''}</p>`;
}
function updateAiQuery(query){
 const state=ui.ai;
 state.query=query;state.proposals=[];state.message='';state.error=false;
 aiDialog.querySelector('#aiBankMatches').innerHTML=aiBankMatches(state);
 aiDialog.querySelector('#aiProposalRows').replaceChildren();
 aiDialog.querySelector('#aiResultMessage').textContent='';
}
function renderAiDialog(){
 const state=ui.ai;
 const busy=state.pending?'disabled':'';
 const setup=state.authorization
   ? `<a href="${esc(state.authorization.url)}" target="_blank" rel="noopener noreferrer">Abrir OpenRouter y obtener el código</a>
      <form id="aiCodeForm" class="ai-connect-form">
        <label class="form-field">Código de autorización de OpenRouter
          <input name="code" type="password" maxlength="500" required autocomplete="off" autocapitalize="none" spellcheck="false" ${busy}>
        </label>
        <button type="submit" class="primary" ${busy}>Conectar</button>
      </form>`
   : button('ai-connect','Conectar IA gratuita','sparkles',{cls:'primary',extra:busy});
 const actions=aiKey
   ? `${button('ai-generate','Pedir propuestas a la IA','sparkles',{cls:'primary',extra:busy})}${button('ai-disconnect','Desconectar IA',null,{cls:'small ghost',extra:busy})}`
   : setup;
 aiDialog.innerHTML=`
   <div class="dialog-head"><h2 id="aiDialogTitle">Añadir ejercicios con IA</h2>${button('ai-close','','close',{cls:'icon ghost',title:'Cerrar propuestas'})}</div>
   <div class="dialog-body">
     <label class="form-field">¿Qué ejercicio buscas?<input id="aiExerciseQuery" type="search" maxlength="140" placeholder="Ej. curl de bíceps con mancuernas" autocomplete="off" value="${esc(state.query)}" ${busy}></label>
     <label class="form-field">Bloque<select data-change="ai-phase" ${busy}>${selectOptions({'':'Cualquier bloque',...PHASES},state.phase)}</select></label>
     <div id="aiBankMatches" role="status">${aiBankMatches(state)}</div>
     ${!aiKey?'<p class="tiny">Conecta tu cuenta de OpenRouter y pega aquí el código que te muestre. La conexión se guarda en esta ventana.</p>':''}
     <p class="tiny muted">Al pedir propuestas, la búsqueda y las fichas de referencia del catálogo inicial se envían a modelos gratuitos de OpenRouter.</p>
     <div class="ai-actions">${actions}</div>
     <p id="aiResultMessage" class="tiny ${state.error?'ai-error':'muted'}" role="status">${esc(state.message)}</p>
   </div>
   <div id="aiProposalRows" aria-label="Propuestas de IA">${state.proposals.length?`<div class="chooser-rows">${state.proposals.map((item,index)=>`
     <article class="chooser-row"><div><h3>${esc(item.name)}</h3>
     <p class="exercise-meta">${esc(PATTERNS[item.pattern])} · ${esc(item.equipment.map(key=>EQUIPMENT[key]).join(' + ')||'Sin material')} · ${esc(item.phases.map(phase=>PHASES[phase]).join(', '))}</p>
     <p class="exercise-cue">${esc(item.cue)}</p><p class="chooser-regression">${esc(item.regression)}</p></div>
     ${button('ai-accept','Añadir al banco',null,{cls:'small',extra:`data-index="${index}" ${busy}`})}</article>`).join('')}</div>`:''}</div>`;
}
async function runAiAction(message,operation){
 const state=ui.ai;
 if(!state||state.pending)return;
 const controller=new AbortController();
 const deadline=setTimeout(()=>controller.abort(),60000);
 state.pending=controller;state.message=message;state.error=false;
 renderAiDialog();
 try{await operation(state,controller.signal);}
 catch(error){
   if(ui.ai!==state)return;
   if(error.status===401)setAiKey('');
   if(state.authorization&&[400,401,403,404].includes(error.status))state.authorization=null;
   state.message=error.message;state.error=true;
 }finally{
   clearTimeout(deadline);
   if(ui.ai===state){state.pending=null;renderAiDialog();}
 }
}
function requestAiProposals(){
 return runAiAction('Generando propuestas…',async(state,signal)=>{
   state.proposals=await generateExerciseProposals(data.database,{
     query:state.query,phase:state.phase,key:aiKey,signal,exclude:state.proposals
   });
   state.message=state.proposals.length?'Revisa la técnica, el material y los bloques antes de añadir una ficha.':'La IA no devolvió fichas nuevas para esta búsqueda. Puedes ajustar la descripción o pedir otras propuestas.';
 });
}
function acceptAiProposal(index){
 const state=ui.ai,proposal=state?.proposals[index];
 if(!proposal||state.pending)return;
 const duplicated=data.database.some(item=>exerciseNameKey(item.name)===exerciseNameKey(proposal.name));
 if(duplicated||data.database.length>=3000){
   state.message=duplicated?'Ya tienes una ficha con ese nombre.':'El banco ha alcanzado el máximo de 3000 fichas.';
   state.error=true;renderAiDialog();return;
 }
 const item={...proposal,id:'ia-'+uid()};
 checkpoint();
 data.database.push(item);
 state.proposals.splice(index,1);
 state.message='Ficha añadida al banco de ejercicios.';state.error=false;
 commit();renderAiDialog();
}

function blockScopeControls(b){
 const value=b.variation||'inherit';
 return `<div class="block-scope"><label>Amplitud al cambiar<select data-change="block-variation" data-block="${esc(b.id)}" aria-label="Amplitud de cambios de ${esc(b.name)}"><option value="inherit" ${value==='inherit'?'selected':''}>Usar criterio de sesión</option>${selectOptions(VARIATION_MODES,value)}</select></label><span>${esc(value==='inherit'?VARIATION_MODES[data.filters.variation||'zone']:VARIATION_MODES[value])}</span></div>`;
}
function addBlockPanel(){return `<div class="add-block-panel"><div><b>Añadir otro bloque</b><p>Elige su función; podrás cambiar duración y ejercicios.</p></div><label class="sr-only" for="newBlockPhase">Tipo del nuevo bloque</label><select id="newBlockPhase">${selectOptions(PHASES,'main')}</select>${button('add-block','Añadir bloque','plus',{cls:'small',extra:data.blocks.length>=16?'disabled':''})}</div>`;}
function addBlock(phase){
 if(data.blocks.length>=16)return toast('Puedes incluir hasta 16 bloques.',true);
 const block=data.profile==='principiante'?beginnerBlock(createBlock(phase,uid())):createBlock(phase,uid()),proposed=insertBlock(data.blocks,block);
 const r=generate(proposed,data.database,data.filters,{blockId:block.id,scope:'block',avoidIds:avoidIds()});
 if(r.error)return toast(readableError(r.error),true);
 checkpoint();data.blocks=r.blocks;commit('Bloque añadido. Ajusta su duración y elige los ejercicios que quieras.');document.getElementById('block-'+block.id)?.scrollIntoView({block:'start'});
}
function switchBlockPhase(id,phase){
 const original=data.blocks.find(b=>b.id===id);if(!original||phase===original.phase)return;
 const proposed=data.blocks.map(b=>b.id===id?(data.profile==='principiante'?beginnerBlock(changePhase(b,phase),{preserveDuration:true}):changePhase(b,phase)):b),r=generate(proposed,data.database,data.filters,{blockId:id,scope:'block',avoidIds:avoidIds()});
 if(r.error){render();return toast(readableError(r.error),true);}
 checkpoint();data.blocks=recommendedOrder(r.blocks);ui.expanded.add(id);commit('Tipo de bloque actualizado y colocado en el orden de la sesión.');
}

function strengthPolicy(){return `<div class="strength-policy"><b>Básicos estables · siempre editables</b><p>Se conservan al renovar el principal o generar la rutina cuando son compatibles con tus filtros. Usa Elegir o Cambiar para sustituir uno, o Renovar fuerza para cambiar el bloque. Revisa su progresión tras 4–6 sesiones.</p></div>`;}
function orderControl(){const ordered=recommendedOrder(data.blocks);return ordered.some((b,i)=>b.id!==data.blocks[i].id)?`<div class="order-control">${button('restore-order','Restaurar orden base',null,{cls:'small ghost text-button'})}<span>Activación → fuerza → full body → core → metabólico → calma</span></div>`:'';}

function beginnerSummary(){
 if(data.profile!=='principiante')return '';
 return `<div class="beginner-summary"><div><span class="programming-profile">INICIACIÓN METABÓLICA</span><b>Sesión completa para principiantes</b><p>Base de 20 min · ejercicios básicos con apoyos · mismos criterios ON/OFF metabólicos · Hz y sensación inicial adaptados por bloque · porcentajes automáticos por grupo muscular.</p><p>Para iniciación tras familiarización individual. Sensación EMS cercana a 4/10 en los bloques de trabajo; comprobarla por canal. La primera toma de contacto se pauta presencialmente. ${sum()>BEGINNER_TOTAL_SECONDS?`Duración personalizada: ${formatTime(sum())}.`:'La progresión la decides tras valorar la tolerancia del cliente.'}</p></div></div>`;
}
function timingVariationControl(hypertrophy){
 const enabled=hypertrophy?data.filters.varyTiming===true:data.filters.varyTiming!==false;
 const hint=hypertrophy
   ? 'Opcional. Alterna 20/40 y 30/40 en los bloques con EMS que cambies si el nuevo ciclo cabe y el ON/OFF está libre.'
   : `Combinaciones metabólicas por bloque, respetando duración y vueltas.${data.profile==='principiante'?' Menor volumen y sensación de iniciación.':''} Puedes fijar el patrón de cualquier bloque.`;
 return `<div class="config-group timing-variation-control"><label class="check"><input type="checkbox" data-change="vary-timing" ${enabled?'checked':''}>Variar ON/OFF en cambios por bloque o ejercicio</label><p class="hint">${hint}</p></div>`;
}
function pendingTiming(b,attrs,error){
 if(b.timingPolicy!=='pending')return `<div class="validation">${esc(error)} Amplía el bloque o revisa sus vueltas y referencias.</div>`;
 return `<div class="timing-pending"><b>ON/OFF por definir</b><label>ON (s)<input type="number" min="1" max="600" data-change="preferredOn" ${attrs} value="${b.preferredOn??''}" aria-label="ON pendiente de ${esc(b.name)}"></label><label>OFF (s)<input type="number" min="1" max="600" data-change="preferredOff" ${attrs} value="${b.preferredOff??''}" aria-label="OFF pendiente de ${esc(b.name)}"></label><span>Configura el patrón individual de iniciación.</span></div>`;
}
function timingTools(b,attrs,t){
 if(b.phase==='recovery')return `<div class="timing-tools"><span>Relajación continua · ${formatTime(b.targetSeconds)} · OFF 0 s</span></div>`;
 const program=wiemsproProgram(b);
 if(program){
  return `<div class="timing-tools"><span>Ciclo Wiemspro · ${program.on} s ON / ${program.off} s OFF</span><div>
    ${button('lock-timing',b.timingLocked?'Duración fijada':'Fijar duración',b.timingLocked?'lock':'unlock',{cls:'small ghost',extra:attrs+' aria-pressed="'+Boolean(b.timingLocked)+'"'})}
  </div></div>`;
 }
 const pending=b.timingPolicy==='pending';
 return `<div class="timing-tools"><span>${pending?'Pendiente de configuración':`Referencia ${b.preferredOn} s ON / ${b.preferredOff} s OFF${!t.error&&(t.on!==b.preferredOn||t.off!==b.preferredOff)?' · ajustada al bloque':''}`}</span><div>${button('vary-block-timing','Variar ON/OFF','shuffle',{cls:'small ghost',extra:attrs+((pending||b.timingLocked)?' disabled':'')})}${button('lock-timing',b.timingLocked?'ON/OFF fijado':'Fijar ON/OFF',b.timingLocked?'lock':'unlock',{cls:'small ghost',extra:attrs+' aria-pressed="'+Boolean(b.timingLocked)+'"'+(pending?' disabled':'')})}${button('reset-timing','Referencia base',null,{cls:'small ghost',extra:attrs})}</div></div>`;
}
function channelsPanel(b){
 const c=proposeChannels(b,data.database,data.profile,data.emphasis);
 return `<section class="channels-panel" aria-label="Porcentajes por canal de ${esc(b.name)}"><div class="channels-head"><b>Propuesta automática por grupo muscular · %</b><span class="channel-auto-label">${c.source==='pending'?(c.reason==='exercise'?'Completa los ejercicios':'Referencia individual pendiente'):'Según ejercicios del bloque'}</span></div>${c.focus?.length?`<p class="channel-focus">Grupos principales: ${c.focus.map(esc).join(' · ')}</p>`:''}<div class="channels-grid">${CHANNELS.map((name,index)=>`<div class="channel-field ${c.changed?.includes(index)?'channel-changed':''}"><span>${name}</span><div><b class="channel-value">${c.values[index]===null?'—':c.values[index]+' %'}</b>${c.changed?.includes(index)?'<span class="channel-change-label">Actualizado</span>':''}</div></div>`).join('')}</div><p>${c.source==='pending'?(c.reason==='exercise'?'Selecciona los ejercicios para calcular los porcentajes. ':'Pendiente de calibración individual. '):''}${data.profile==='principiante'?'Referencias iniciales de iniciación, propuestas según los músculos implicados. Comprobar y ajustar la sensación individual por canal.':'Propuesta basada en tus referencias y los músculos implicados. El ajuste real parte del nivel ya tolerado por el cliente.'} EXTRA1 sin uso; gemelos voluntarios.</p></section>`;
}

function stimulationPanel(block,timing){
 const hypertrophy=isHypertrophyBlock(block);
 const p=hypertrophy?hypertrophyStimulation(block):stimulationForBlock(block,data.profile,timing);
 const range=values=>values[0]===values[1]?String(values[0]):values.join('–');
 const note=hypertrophy
   ? (isHypertrophyWork(block)?'Referencia para el canal principal. Repeticiones controladas y 3–4 en reserva.':'Trabajo voluntario. El esfuerzo es una referencia de esta fase.')
   : data.profile==='principiante'
     ? 'Referencia de iniciación. Ajusta la sensación eléctrica por canal.'
     : 'Ajusta la sensación eléctrica por canal en tu equipo.';
 const ramps=p.rampUp!==null;
 return `<section class="stimulation-panel" aria-label="Parámetros EMS de ${esc(block.name)}">
   <div class="stimulation-grid${ramps?' with-ramps':''}">
     <div><span>Frecuencia EMS</span><b class="stimulation-hz">${p.hz} <small>Hz</small></b></div>
     ${ramps?`<div><span>Rampa de subida</span><b>${formatRamp(p.rampUp)}</b></div>
       <div><span>Rampa de bajada</span><b>${formatRamp(p.rampDown)}</b></div>`:''}
     <div><span>Sensación EMS · 0–10</span><b class="stimulation-ems">${range(p.ems)} <small>/10</small></b></div>
     <div><span>Esfuerzo físico · 0–10</span><b class="stimulation-rpe">${range(p.rpe)} <small>/10${block.phase==='metabolic'&&data.profile!=='principiante'?' máx.':''}</small></b></div>
   </div><p class="stimulation-note">${note}</p>
   ${hypertrophy||data.profile==='principiante'?'':wiemsproControl(block,p.program)}
 </section>`;
}

function wiemsproControl(block,selected){
 const options=WIEMSPRO_PROGRAMS.filter(program=>program.phase===block.phase);
 if(!options.length)return '';
 const choices={'':'Referencia ImpulsaFit',...Object.fromEntries(options.map(program=>[
  program.id,`${program.name} · ${program.hz} Hz`
 ]))};
 return `<div class="ems-program">
   <label for="ems-program-${esc(block.id)}">Programa EMS de ${esc(block.name)}</label>
   <select id="ems-program-${esc(block.id)}" data-change="ems-program" data-block="${esc(block.id)}">
     ${selectOptions(choices,selected?.id||'')}
   </select>
   ${selected?`<details class="ems-pulse"><summary>Ancho de pulso por canal</summary>
     <dl>${selected.pulseWidths.map((width,index)=>`<div><dt>${CHANNELS[index]}</dt><dd>${width} µs</dd></div>`).join('')}</dl>
   </details>`:''}
 </div>`;
}

function programKey(plan){return isHypertrophyPlan(plan)?'hypertrophy':'metabolic';}

function captureDraft(plan){
  return structuredClone({
    blocks:plan.blocks,filters:plan.filters,template:plan.template||'visual',
    title:plan.title,notes:plan.notes||'',profile:plan.profile||'sin-definir',
    emphasis:plan.emphasis||'equilibrado'
  });
}

function parkDraft(nextProgram){
  data.drafts={...data.drafts,[programKey(data)]:captureDraft(data)};
  delete data.drafts[nextProgram];
}

function switchProgram(program){
  if(!['metabolic','hypertrophy'].includes(program)||program===programKey(data))return;
  let next=data.drafts?.[program];
  if(!next&&program==='hypertrophy'){
    const filters={...data.filters,beginner:false,varyTiming:false,variation:'pattern'};
    next={
      template:HYPERTROPHY_TEMPLATE,profile:'sin-definir',emphasis:'equilibrado',
      filters,blocks:initialHypertrophyBlocks(data.database,filters,eligible),
      title:'Hipertrofia · Full body',notes:''
    };
  }
  if(!next){
    next=fresh();
    const result=generate(next.blocks,data.database,next.filters);
    if(result.blocks)next.blocks=result.blocks;
  }
  checkpoint();
  parkDraft(program);
  Object.assign(data,captureDraft(next));
  ui.page='session';
  commit();
  scrollTo(0,0);
}

function programTabs(){
  const selected=programKey(data);
  return `<div class="program-tabs" role="group" aria-label="Tipo de sesión">${[
    ['metabolic','Metabólico'],['hypertrophy','Hipertrofia']
  ].map(([key,label])=>button('program',label,null,{
    cls:`small ${selected===key?'active':'ghost'}`,
    extra:`data-program="${key}" aria-pressed="${selected===key}"`
  })).join('')}</div>`;
}

function changeHypertrophyProgramming(profile,emphasis){
  if(profile==='principiante'||!Object.hasOwn(PROFILES,profile)||!Object.hasOwn(EMPHASES,emphasis))return;
  let blocks=data.blocks;
  if(emphasis!==data.emphasis){
    const previous=blocks.find(block=>block.id==='hip-accessories');
    blocks=applyHypertrophyEmphasis(blocks,emphasis);
    const accessories=blocks.find(block=>block.id==='hip-accessories');
    const changed=accessories?.slots.filter((slot,index)=>slot!==previous.slots[index])||[];
    const avoid=avoidIds();
    for(const slot of changed){
      const result=generate(blocks,data.database,data.filters,{slotId:slot.id,scope:'pattern',avoidIds:avoid});
      if(result.error){render();return toast(readableError(result.error),true);}
      blocks=result.blocks;
    }
  }
  checkpoint();
  Object.assign(data,{profile,emphasis,blocks});
  commit(`Énfasis de los complementos · ${EMPHASES[emphasis]}.`);
}

function changeHypertrophySetting(key,value,blockId){
  const allowed={preferredOn:HYPERTROPHY_ON,hz:HYPERTROPHY_HZ,restSeconds:HYPERTROPHY_REST,rounds:[1,2,3,4]};
  if(!isHypertrophyPlan(data)||!allowed[key]?.includes(value))return;
  const affected=block=>isHypertrophyWork(block)&&(!blockId||blockId===block.id);
  const updated=data.blocks.map(block=>{
    if(!affected(block))return block;
    const next={...block,[key]:value};
    if(blockId&&key==='preferredOn')next.timingLocked=true;
    return next;
  });
  const invalid=updated.filter(affected).find(block=>solveTiming(block).error);
  if(invalid){render();return toast(`${invalid.name}. ${solveTiming(invalid).error}`,true);}
  checkpoint();data.blocks=updated;commit('Programación de hipertrofia actualizada.');
}

function hypertrophySettingControl(key,label,values,format,blocks,block){
  const choices=Object.fromEntries(values.map(value=>[value,format(value)]));
  const current=[...new Set(blocks.map(item=>item[key]))];
  const mixed=current.length!==1;
  const attrs=block?`data-block="${esc(block.id)}" aria-label="${esc(label)} de ${esc(block.name)}"`:'';
  return `<label class="${block?'':'field-label'}">${label}<select data-change="hypertrophy-setting" data-key="${key}" ${attrs}>
    ${mixed?'<option value="" disabled selected>Por bloque</option>':''}${selectOptions(choices,mixed?'':current[0])}
  </select></label>`;
}

function hypertrophyCriteriaFields(block){
  const work=block?[block]:data.blocks.filter(isHypertrophyWork);
  if(!work.length)return '';
  const controls=[
    hypertrophySettingControl('preferredOn','Ciclo eléctrico ON / OFF',HYPERTROPHY_ON,n=>`${n} s ON / ${HYPERTROPHY_OFF} s OFF`,work,block),
    hypertrophySettingControl('hz','Frecuencia de trabajo',HYPERTROPHY_HZ,n=>`${n} Hz`,work,block),
    hypertrophySettingControl('restSeconds','Recuperación entre series',HYPERTROPHY_REST,n=>`${n} s sin corriente`,work,block)
  ];
  if(block)return controls.join('');
  return controls.map(control=>`<div class="config-group">${control}</div>`).join('')+
    '<p class="hint hyp-config-note">Ajustes comunes para la fase EMS. La recuperación incluye el OFF eléctrico. Puedes ajustar cada ejercicio desde sus criterios.</p>';
}

function hypertrophySummary(){
  const programmed=plannedEmsSeconds(data.blocks);
  return `<div class="programming-summary hypertrophy-summary">
    <div><span class="programming-profile">MÉTODO ALEMÁN ADAPTADO · CLIENTE ADAPTADO</span>
    <b>${esc(EMPHASES[data.emphasis])} · trabajo por series</b>
    <p>${formatTime(programmed)} de bloques con EMS de un máximo previsto de ${formatTime(HYPERTROPHY_LIMIT)}, incluidas pausas y transiciones. Énfasis aplicado a los complementos.</p></div>
  </div>
  <details class="method-details panel">
    <summary>Criterios de la ficha de hipertrofia</summary>
    <p><b>Referencia y adaptación.</b> El ensayo alemán de Kemmler usó 85 Hz y 6/4 s durante 20 minutos. La plantilla ImpulsaFit usa 80–85 Hz, cuatro ejercicios con EMS y los ciclos de sala de 20/40 y 30/40. <a href="https://doi.org/10.1155/2016/9236809" target="_blank" rel="noopener noreferrer">Ensayo de referencia</a></p>
    <p><b>Preparación.</b> Dos minutos de movimiento suave y unos 90 s de aproximación ligera por patrón principal. Prepara la carga y comprueba el contacto antes de activar.</p>
    <p><b>Series.</b> Dos series de partida por ejercicio. Haz repeticiones controladas durante el ON y registra las que caben. La ficha usa 8–12 como referencia y 10–12 en femoral, ajustadas al tiempo disponible. Termina con 3–4 repeticiones en reserva.</p>
    <p><b>Ajuste eléctrico.</b> Frecuencia de referencia 80–85 Hz. Rampa orientativa de la ficha 0,8 s. Mantén el pulso del programa verificado por canal. La ficha recoge 350 µs en piernas y glúteos, 300 en lumbar, abdomen y dorsal, 250 en trapecio, 200 en pecho y 150 en brazo como referencias Wiemspro.</p>
    <p><b>Descansos.</b> Usa un programa dinámico compatible con el ciclo elegido. Pausa el equipo para la recuperación adicional y antes de cambiar de máquina. Si termina la serie antes del ON previsto, pausa la estimulación.</p>
    <p><b>Complementos.</b> El énfasis orienta los ejercicios de sala. La ficha propone dos series con unas tres repeticiones en reserva. Sus ejemplos incluyen hip thrust 10–12 repeticiones y 90 s de pausa, laterales y gemelos 12–15 y 60–90 s, y dead bug cinco repeticiones por lado y 45–60 s.</p>
    <p><b>Progresión.</b> Registra carga, repeticiones, esfuerzo y sensación por canal. Revisa la recuperación a las 24–48 h. Sube el menor incremento de carga cuando mantengas técnica, margen y recuperación. Cambia una variable cada vez.</p>
    <p><b>Aplicación.</b> Sesión para una persona ya adaptada, con técnica conocida y supervisión presencial. La sensación por canal orienta el ajuste individual. Los porcentajes reales corresponden a esa calibración.</p>
  </details>`;
}

function hypertrophyBlockHTML(block,index){
  const work=isHypertrophyWork(block);
  const timing=solveTiming(block);
  const attrs=`data-block="${esc(block.id)}"`;
  const status=work?`${block.rounds} ${block.rounds===1?'serie':'series'} · EMS`:'Trabajo voluntario · Sin EMS';
  return `<section class="block panel hypertrophy-block" id="block-${esc(block.id)}" aria-label="Bloque ${index+1} ${esc(block.name)}">
    <div class="block-head">
      <div class="block-name"><span class="block-number">${String(index+1).padStart(2,'0')}</span><div><h2>${esc(block.name)}</h2><p class="phase">${status}</p></div></div>
      <div class="block-buttons">
        ${durationField(block,attrs)}
        ${button('block','Cambiar bloque','shuffle',{cls:'small',extra:attrs,title:`Proponer otros ejercicios para ${block.name}`})}
      </div>
    </div>
    ${work?hypertrophyWorkDetails(block,timing,attrs):`<div class="timing-bar"><b>Sin EMS</b><span>${formatTime(block.targetSeconds)} de trabajo voluntario</span></div>`}
    ${stimulationPanel(block)}
    ${work?'':blockScopeControls(block)}
    ${block.slots.map((slot,i)=>work?hypertrophyExerciseHTML(block,slot,i):exerciseHTML(block,slot,i,timing)).join('')}
    ${hypertrophyBlockTools(block,index,attrs)}
    <details class="block-footer" data-expand="${esc(block.id)}" ${ui.expanded.has(block.id)?'open':''}>
      <summary><span>Tiempos y criterios del bloque</span>${icon('chevron')}</summary>
      <div class="block-config-grid">
        <label>Nombre<input data-change="block-name" ${attrs} value="${esc(block.name)}" maxlength="140"></label>
        ${work?hypertrophyCriteriaFields(block):''}
      </div>
      <label class="block-note">Carga, repeticiones y ajuste real<textarea data-change="block-notes" ${attrs} maxlength="2000" placeholder="Anota carga, repeticiones y ajuste individual de canales…">${esc(block.notes)}</textarea></label>
    </details>
    ${block.notes?`<div class="print-notes">${esc(block.notes)}</div>`:''}
    ${hypertrophyMusclePanel(block)}
  </section>`;
}

function hypertrophyBlockTools(block,index,attrs){
  if(isHypertrophyWork(block)){
    return `<div class="block-tools"><span class="muted tiny">Orden de ejercicios con EMS</span><span class="block-tools-spacer"></span>${[-1,1].map(direction=>{
      const neighbour=data.blocks[index+direction];
      const disabled=!neighbour||!isHypertrophyWork(neighbour);
      const label=direction<0?'Subir':'Bajar';
      return button('move-block','', 'chevron',{
        cls:`small icon ${direction<0?'move-up':'move-down'}`,
        extra:`${attrs} data-direction="${direction}"${disabled?' disabled':''}`,title:`${label} bloque ${block.name}`
      });
    }).join('')}</div>`;
  }
  return `<div class="block-tools">
    ${button('add-slot','Añadir ejercicio','plus',{cls:'small text-button',extra:attrs+(block.slots.length>=12?' disabled':'')})}
    ${button('recompose','Recomponer bloque','shuffle',{cls:'small',extra:attrs,title:`Recomponer ${block.name} con otros patrones`})}
  </div>`;
}

function hypertrophyWorkDetails(block,timing,attrs){
  return `<div class="timing-bar"><b>ON ${block.preferredOn} s</b><b>OFF ${block.preferredOff} s</b>
      <span>${block.rounds} ${block.rounds===1?'serie':'series'}</span>
      <label class="hip-series">Series<select aria-label="Series de ${esc(block.name)}" data-change="hypertrophy-setting" data-key="rounds" ${attrs}>${selectOptions({1:'1',2:'2',3:'3',4:'4'},block.rounds)}</select></label>
    </div>
    ${timing.error?`<div class="validation">${esc(timing.error)}</div>`:`<div class="hyp-rest">
      ${timing.rounds>1?`Recuperación entre series ${block.restSeconds} s. Incluye ${timing.off} s OFF${timing.extraRest?` y ${timing.extraRest} s de pausa manual`:''}. `:''}
      ${timing.buffer?`${formatTime(timing.buffer)} adicionales sin corriente tras el último OFF para recuperar y cambiar.`:''}
    </div>`}
    ${timingTools(block,attrs,timing)}`;
}

function hypertrophyMusclePanel(block){
  const work=isHypertrophyWork(block);
  const {percentages,sensations,focus}=hypertrophyMuscleProposal(block,data.database);
  const status=percentages?'Según ejercicios del bloque':'Completa los ejercicios';
  return `<section class="channels-panel" aria-label="Porcentajes por grupo muscular de ${esc(block.name)}">
    <div class="channels-head"><b>Reparto muscular estimado · %</b><span class="channel-auto-label">${status}</span></div>
    ${focus.length?`<p class="channel-focus">Grupos principales · ${focus.map(esc).join(' · ')}</p>`:''}
    <div class="channels-grid">${HYPERTROPHY_GROUPS.map((name,index)=>{
      const voluntary=index>=CHANNELS.length;
      if(voluntary&&!percentages?.[index])return '';
      const disconnected=name==='EXTRA1';
      const value=disconnected?'0 %':percentages?`${percentages[index]} %`:'—';
      const sensation=voluntary?'Voluntario':disconnected||!work?'EMS apagada':!percentages?'Sensación pendiente':sensations[index]==='0'?'EMS apagada':`EMS ${sensations[index]} /10`;
      return `<div class="channel-field"><span>${name}</span><b class="channel-value">${value}</b><span class="hyp-channel-note">${sensation}</span></div>`;
    }).join('')}</div>
    <p>${work?'El porcentaje expresa el énfasis de los ejercicios. Ajusta la corriente por canal según la sensación y la calibración individual.':'Porcentaje de énfasis en el trabajo voluntario. Todos los canales quedan apagados.'}</p>
  </section>`;
}

function hypertrophyExerciseHTML(block,slot,index){
  const exercise=data.database.find(e=>e.id===slot.exerciseId);
  const valid=exercise&&eligible(exercise,block,slot,data.filters);
  const attrs=`data-block="${esc(block.id)}" data-slot="${esc(slot.id)}"`;
  const material=exercise?.equipment.length?exercise.equipment.map(key=>EQUIPMENT[key]).join(' + '):'Sin material';
  return `<article class="exercise ${slot.locked?'locked':''} ${valid?'':'invalid'}">
    <div class="exercise-order">${index+1}</div>
    <div><h3>${exercise?esc(exercise.name):'Selecciona un ejercicio compatible'}</h3>
      <div class="exercise-meta"><span>${esc(PATTERNS[slot.pattern])}</span><span>${esc(material)}</span>
      ${exercise?`<span class="exercise-level">Complejidad ${MOVEMENT_LEVELS[exercise.level].toLowerCase()}</span>`:''}
      ${slot.locked?'<span>Fijado al generar</span>':''}</div>
      ${exercise?`<p class="exercise-cue">${esc(exercise.cue)}</p><details><summary>Ver regresión</summary><p>${esc(exercise.regression)}</p></details>`:''}
    </div>
    <div class="exercise-controls">
      ${button('pick','Elegir','edit',{cls:'small ghost',extra:attrs,title:`Elegir ejercicio ${index+1} de ${block.name}`})}
      ${button('lock','',slot.locked?'lock':'unlock',{cls:`small icon ghost ${slot.locked?'lock-on':''}`,extra:`${attrs} aria-pressed="${slot.locked}"`,title:slot.locked?'Desbloquear ejercicio':'Conservar este ejercicio al generar'})}
      ${button('exercise','Cambiar','shuffle',{cls:'small ghost',extra:attrs,title:`Cambiar solo ejercicio ${index+1} de ${block.name}`})}
    </div>
  </article>`;
}
