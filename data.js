import {EXTRA_ROWS} from './catalog.js';
import {STRENGTH_RECORDS,FAMILY_LABELS as STRENGTH_FAMILY_LABELS} from './strength-catalog.js';
import {METABOLIC_RECORDS,METABOLIC_FAMILY_LABELS} from './metabolic-catalog.js';
import {GYM_RECORDS} from './gym-catalog.js';
export const FAMILY_LABELS={...STRENGTH_FAMILY_LABELS,...METABOLIC_FAMILY_LABELS};
export const MOVEMENT_LEVELS={1:'Baja',2:'Media',3:'Alta'};
export const PATTERNS = {
  rodilla: 'Dominante de rodilla', cadera: 'Dominante de cadera', empuje: 'Empuje',
  tiron: 'Tirón', antirotacion: 'Antirrotación', antiextension: 'Control central', antilateral: 'Control lateral',
  locomocion: 'Marcha y coordinación', global: 'Movimiento global',
  movilidad: 'Movilidad suave', respiracion: 'Respiración', biceps:'Bíceps', triceps:'Tríceps',
  hombro:'Hombros y escápulas', flexionrodilla:'Flexión de rodilla · isquios', abduccion:'Abducción · glúteo medio',
  gemelo:'Gemelos y sóleo', flexiontronco:'Flexión controlada de tronco'
};
export const PHASES = { activation:'Activación', strength:'Fuerza breve', main:'Full body', core:'Core', metabolic:'Metabólico', recovery:'Vuelta a la calma' };
export const EQUIPMENT = { banco:'Banco', step:'Step', mancuernas:'Mancuernas', kettlebell:'Kettlebell', banda:'Banda con anclaje', barra:'Barra', disco:'Disco', balon:'Balón', colchoneta:'Colchoneta', minibanda:'Minibanda', polea:'Polea', trx:'TRX', fitball:'Fitball',hexagonal:'Barra hexagonal',rack:'Rack con soportes y topes',bancoAjustable:'Banco regulable',paralelas:'Asas para flexiones',multipower:'Multipower',landmine:'Anclaje landmine' };
export const DEFAULT_EQUIPMENT=['banco','step','mancuernas','kettlebell','banda','barra','disco','balon','colchoneta'];
EQUIPMENT.sala='Sala';
export const GROUPS={torso:'Torso',piernas:'Piernas / glúteos',core:'Core',global:'Global',movilidad:'Movilidad / calma'};
export const PATTERN_GROUP={rodilla:'piernas',cadera:'piernas',flexionrodilla:'piernas',abduccion:'piernas',gemelo:'piernas',empuje:'torso',tiron:'torso',biceps:'torso',triceps:'torso',hombro:'torso',antirotacion:'core',antiextension:'core',antilateral:'core',flexiontronco:'core',locomocion:'global',global:'global',movilidad:'movilidad',respiracion:'movilidad'};
const rows = [
  ['Marcha en el sitio','locomocion','marcha','activation,metabolic',1,'','de pie','','Apoyos estables y ritmo controlado.','Reducir la elevación de rodilla.'],
  ['Paso lateral con toque','locomocion','lateral','activation,metabolic',1,'','de pie','','Dar un paso lateral y reunir los pies sin cruzarlos.','Acortar el paso.'],
  ['Talón alterno al frente','locomocion','talon','activation,metabolic',1,'','de pie','','Alternar apoyos del talón por delante del cuerpo.','Mantener un apoyo cercano.'],
  ['Marcha con brazos alternos','locomocion','marcha','activation,metabolic',1,'','de pie','','Coordinar brazos y piernas manteniendo el tronco estable.','Mover los brazos con menor amplitud.'],
  ['Toque alterno al step','locomocion','step','activation,metabolic',1,'step','de pie','','Tocar el step alternando los pies, sin saltar.','Usar una altura menor.'],
  ['Paso atrás alterno y regreso','locomocion','paso','activation,metabolic',1,'','de pie','','Llevar un pie atrás y volver a la posición inicial.','Reducir la distancia del paso.'],
  ['Marcha con apoyo en banco','locomocion','marcha','activation,metabolic',1,'banco','de pie','','Apoyar una mano y alternar elevaciones suaves de rodilla.','Elevar menos la rodilla.'],
  ['Pasos laterales entre marcas','locomocion','lateral','metabolic',1,'disco','de pie','desplazamiento','Moverse entre dos marcas sin cruzar los pies.','Acercar las marcas.'],
  ['Sentadilla parcial a banco','rodilla','sentadilla','activation,strength,main',1,'banco','de pie','','Acercar la cadera al banco con recorrido controlado.','Elevar el banco o reducir amplitud.'],
  ['Sentarse y levantarse del banco','rodilla','sentadilla','activation,strength,main',1,'banco','de pie','','Apoyar ambos pies y levantarse sin impulso brusco.','Usar un asiento más alto.'],
  ['Sentadilla con alcance frontal','rodilla','sentadilla','activation,strength,main',1,'','de pie','','Descender con control y llevar los brazos al frente.','Hacer un recorrido parcial.'],
  ['Sentadilla lateral parcial','rodilla','lateral','activation,main',2,'','de pie','','Desplazar la cadera a un lado y volver al centro.','Reducir la amplitud lateral.'],
  ['Sentadilla goblet a banco','rodilla','sentadilla','strength,main',1,'kettlebell,banco','de pie','','Mantener la carga próxima al pecho y tocar el banco.','Retirar la carga.'],
  ['Sentadilla con disco al pecho','rodilla','sentadilla','strength,main',1,'disco','de pie','','Sujetar el disco cerca del cuerpo y controlar el descenso.','Reducir la carga o el recorrido.'],
  ['Step-up alterno sin carga','rodilla','step','strength,main',1,'step','de pie','','Apoyar el pie completo, subir y bajar sin dejarse caer.','Reducir la altura.'],
  ['Step-up con mancuernas','rodilla','step','strength,main',2,'step,mancuernas','de pie','','Alternar la pierna de subida con carga junto al cuerpo.','Retirar las mancuernas.'],
  ['Zancada estática con apoyo','rodilla','zancada','strength,main',2,'banco','de pie','','Con apoyo estable, flexionar ambas rodillas sin perder el equilibrio.','Acortar el recorrido.'],
  ['Sentadilla con dos mancuernas','rodilla','sentadilla','strength,main',2,'mancuernas','de pie','','Mantener las cargas junto al cuerpo y bajar de forma controlada.','Usar menos carga.'],
  ['Bisagra de cadera sin carga','cadera','bisagra','activation,strength,main',1,'','de pie','','Llevar la cadera atrás manteniendo el tronco estable.','Reducir el recorrido.'],
  ['Bisagra con manos en la cadera','cadera','bisagra','activation,main',1,'','de pie','','Guiar la cadera hacia atrás y regresar sin arquear el tronco.','Practicar cerca de una pared.'],
  ['Peso muerto con kettlebell elevada','cadera','bisagra','strength,main',2,'kettlebell,step','de pie','','Partir de la carga elevada y extender la cadera con control.','Reducir la carga.'],
  ['Peso muerto sumo con kettlebell','cadera','bisagra','strength,main',2,'kettlebell','de pie','','Con base amplia, levantar la carga próxima al cuerpo.','Elevar el punto de partida.'],
  ['Peso muerto rumano con mancuernas','cadera','bisagra','strength,main',2,'mancuernas','de pie','','Deslizar las cargas junto a las piernas mediante una bisagra controlada.','Usar menos carga y recorrido.'],
  ['Puente de glúteos bilateral','cadera','puente','strength,main',1,'colchoneta','suelo','','Elevar la pelvis manteniendo apoyos estables.','Reducir la altura.'],
  ['Puente con disco sobre la pelvis','cadera','puente','strength,main',2,'colchoneta,disco','suelo','','Sujetar la carga y elevar la pelvis de forma controlada.','Retirar el disco.'],
  ['Extensión de cadera de pie con apoyo','cadera','extension','activation,strength,main',1,'banco','de pie','','Llevar una pierna atrás sin mover el tronco.','Usar menos amplitud.'],
  ['Remo de pie con banda','tiron','remo','activation,strength,main',1,'banda','de pie','','Llevar los codos atrás con el tronco quieto.','Reducir la tensión.'],
  ['Remo unilateral con apoyo','tiron','remo','strength,main',1,'mancuernas,banco','de pie','','Apoyar una mano y llevar la mancuerna hacia la cadera.','Usar menos carga.'],
  ['Remo con dos mancuernas','tiron','remo','strength,main',2,'mancuernas','de pie','','Mantener una bisagra estable y acercar las cargas al tronco.','Hacerlo con apoyo.'],
  ['Remo sentado con banda','tiron','remo','activation,strength,main',1,'banda,banco','sentado','','Sentarse alto y tirar sin balancear el cuerpo.','Reducir la tensión.'],
  ['Apertura de banda al pecho','tiron','apertura','activation,main',1,'banda','de pie','','Separar las manos con un recorrido cómodo y controlado.','Usar una banda más suave.'],
  ['Remo con barra ligera','tiron','remo','strength,main',2,'barra','de pie','','Acercar la barra al tronco sin variar la posición de la espalda.','Reducir carga y recorrido.'],
  ['Remo alto con banda al esternón','tiron','remoalto','activation,strength,main',2,'banda','de pie','','Tirar hacia la parte alta del pecho sin elevar los hombros.','Reducir tensión y altura.'],
  ['Retracción escapular de pie','tiron','escapular','activation',1,'','de pie','','Acercar suavemente las escápulas con brazos relajados.','Reducir el recorrido.'],
  ['Flexión en pared','empuje','flexion','activation,strength,main',1,'','de pie','','Acercar el pecho a la pared manteniendo el cuerpo alineado.','Acercar los pies a la pared.'],
  ['Flexión inclinada en banco','empuje','flexion','strength,main',1,'banco','de pie','','Flexionar los codos con manos apoyadas en banco estable.','Usar un apoyo más alto.'],
  ['Press de pecho con banda','empuje','press','strength,main',1,'banda','de pie','','Empujar al frente con anclaje seguro detrás del cuerpo.','Reducir la tensión.'],
  ['Press de pecho en suelo','empuje','press','strength,main',1,'mancuernas,colchoneta','suelo','','Empujar las mancuernas y bajar hasta un apoyo suave de brazos.','Reducir la carga.'],
  ['Press de pecho en banco','empuje','press','strength,main',2,'mancuernas,banco','tumbado','','Bajar y empujar las cargas con apoyos estables.','Reducir la carga y el recorrido.'],
  ['Press con disco al frente','empuje','press','strength,main',1,'disco','de pie','','Alejar el disco del pecho sin balancear el tronco.','Usar un disco más ligero.'],
  ['Press de hombros sentado','empuje','vertical','strength,main',2,'mancuernas,banco','sentado','overhead','Empujar las cargas en un recorrido cómodo sobre la cabeza.','Reducir la carga o el recorrido.'],
  ['Pallof press de pie','antirotacion','pallof','core',1,'banda','de pie','','Extender brazos al frente resistiendo el giro del tronco.','Usar menos tensión.'],
  ['Pallof press sentado','antirotacion','pallof','core',1,'banda,banco','sentado','','Con apoyo sentado, extender brazos sin girar.','Acortar el recorrido.'],
  ['Sujeción lateral de mancuerna','antilateral','cargaunilateral','core',1,'mancuernas','de pie','','Sostener la carga a un lado con el tronco erguido.','Usar menos carga.'],
  ['Pallof con paso corto lateral','antirotacion','pallof','core',2,'banda','de pie','desplazamiento','Dar un paso corto manteniendo brazos y pelvis estables.','Hacer el ejercicio sin paso.'],
  ['Apoyo unilateral de mano en pared','antirotacion','apoyounilateral','core',1,'','de pie','','Mantener el cuerpo estable al presionar suavemente con una mano.','Reducir la inclinación.'],
  ['Dead bug con talón al suelo','antiextension','deadbug','core',1,'colchoneta','suelo','','Alternar el apoyo del talón manteniendo el tronco estable.','Mover una pierna con menor recorrido.'],
  ['Plancha inclinada en banco','antiextension','plancha','core',1,'banco','de pie','','Mantener el cuerpo alineado con manos en el banco.','Usar un apoyo más alto.'],
  ['Plancha de antebrazos con rodillas','antiextension','plancha','core',1,'colchoneta','suelo','','Apoyar rodillas y antebrazos sin hundir el tronco.','Acortar el tiempo y revisar la postura.'],
  ['Deslizamiento alterno de talón','antiextension','deadbug','core',1,'colchoneta','suelo','','Deslizar un talón cada vez sin mover la pelvis.','Reducir la distancia.'],
  ['Marcha con carga frontal estática','antiextension','marchacarga','core',2,'disco','de pie','','Alternar apoyos con el disco cerca del pecho y tronco estable.','Hacerlo sin carga.'],
  ['Empuje isométrico de manos contra pared','antiextension','pared','core',1,'','de pie','','Presionar suavemente la pared manteniendo costillas y pelvis controladas.','Acercarse a la pared.'],
  ['Sentadilla y elevación de talones','global','sentadillatalon','metabolic',1,'','de pie','','Encadenar una sentadilla parcial y una elevación de talones sin saltar.','Separar ambos movimientos.'],
  ['Paso lateral y empuje de brazos','global','lateralempuje','metabolic',1,'','de pie','','Coordinar un paso lateral con extensión de brazos al frente.','Reducir la amplitud.'],
  ['Marcha con toque de manos al frente','global','marchabrazos','metabolic',1,'','de pie','','Alternar las piernas y tocar las manos al frente sin girar el tronco.','Reducir el ritmo.'],
  ['Paso atrás con alcance frontal','global','pasoalcance','metabolic',1,'','de pie','','Alternar un paso atrás y llevar brazos al frente de forma controlada.','Acortar el paso.'],
  ['Boxeo al frente sin giros','global','boxeo','metabolic',1,'','de pie','','Alternar brazos al frente manteniendo base estable y sin golpes bruscos.','Reducir el alcance.'],
  ['Step-touch con balón al pecho','global','stepbalon','metabolic',1,'balon','de pie','','Paso lateral y reunión de pies con el balón próximo al cuerpo.','Hacerlo sin balón.'],
  ['Sentarse y levantarse con alcance','global','sentadillaalcance','metabolic',1,'banco','de pie','','Levantarse del banco y extender brazos al frente.','Elevar el asiento.'],
  ['Paso diagonal corto y regreso','global','diagonal','metabolic',2,'','de pie','','Alternar pasos diagonales cortos con regreso al centro.','Cambiar a pasos al frente.'],
  ['Movilidad suave de hombros','movilidad','hombros','recovery',1,'','de pie','','Mover hombros y brazos en un recorrido cómodo.','Hacerlo sentado.'],
  ['Balanceo suave de tobillos','movilidad','tobillos','recovery',1,'banco','de pie','','Con apoyo, alternar el peso entre talones y antepiés.','Reducir el recorrido.'],
  ['Movilidad de manos y muñecas','movilidad','munecas','recovery',1,'','de pie','','Abrir y cerrar manos con movimientos suaves de muñeca.','Hacerlo sentado.'],
  ['Movilidad de tobillo sentado','movilidad','tobillos','recovery',1,'banco','sentado','','Alternar talón y punta con los pies apoyados.','Reducir la amplitud.'],
  ['Respiración tranquila de pie','respiracion','respiracionpie','recovery',1,'','de pie','','Mantener postura cómoda y respiración natural.','Hacerlo sentado.'],
  ['Respiración sentada con apoyo','respiracion','respiracionsentada','recovery',1,'banco','sentado','','Apoyar los pies y respirar sin forzar.','Elegir una posición más cómoda.'],
  ['Respiración tumbado con pies apoyados','respiracion','respiracionsuelo','recovery',1,'colchoneta','suelo','','Descansar con pies apoyados y respiración tranquila.','Cambiar a posición sentada.'],
  ['Respiración con gemelos en banco','respiracion','respiracionsuelo','recovery',1,'banco,colchoneta','suelo','','Apoyar las piernas en el banco y mantener respiración cómoda.','Apoyar los pies en el suelo.']
];
const toRecord=(r,id,catalogVersion)=>({id,name:r[0],pattern:r[1],family:r[2],phases:r[3].split(','),level:r[4],equipment:r[5]?r[5].split(','):[],position:r[6],flags:r[7]?r[7].split(','):[],cue:r[8],regression:r[9],enabled:true,catalogVersion});
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const existingNames=new Set(rows.map(r=>normalize(r[0])));
export const SEED = rows.map((r,i)=>toRecord(r,`base-${i+1}`,1)).concat(EXTRA_ROWS.map((r,i)=>toRecord(r,`catalog-${String(i+1).padStart(3,'0')}`,2)).concat(STRENGTH_RECORDS,METABOLIC_RECORDS,GYM_RECORDS).filter(e=>{const name=normalize(e.name);if(existingNames.has(name))return false;existingNames.add(name);return true;}));
const block=(id,name,phase,seconds,on,off,patterns)=>({id,name,phase,targetSeconds:seconds,preferredOn:on,preferredOff:off,roundMode:'auto',rounds:1,timingPolicy:'metabolic',sequence:phase==='main'?'pairs':'circuit',notes:'',slots:patterns.map((pattern,i)=>({id:`${id}-${i}`,pattern,exerciseId:null,locked:false}))});
export function makeTemplate(type='visual') {
  if(type==='weekly') return [
    block('activation','Activación','activation',300,30,10,['locomocion','rodilla','tiron']),
    block('main','Full body','main',900,25,20,['rodilla','cadera','tiron','empuje']),
    block('core','Core','core',360,25,15,['antirotacion','antiextension']),
    block('metabolic','Metabólico','metabolic',360,30,20,['locomocion','global','global']),
    block('recovery','Vuelta a la calma','recovery',180,180,0,['respiracion'])
  ];
  return [
    block('activation','Activación','activation',240,30,10,['locomocion','rodilla','tiron']),
    block('strength','Fuerza breve','strength',300,20,30,['rodilla','empuje']),
    block('main','Full body','main',720,25,20,['cadera','rodilla','tiron','empuje']),
    block('core','Core','core',240,25,15,['antirotacion','antiextension']),
    block('metabolic','Metabólico','metabolic',300,30,20,['locomocion','global']),
    block('recovery','Vuelta a la calma','recovery',300,300,0,['respiracion'])
  ];
}
