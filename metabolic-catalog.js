export const METABOLIC_CATALOG_VERSION = 6;

export const METABOLIC_FAMILY_LABELS = {
  cardiomarcha: 'Marcha activa y rodillas',
  cardiolateral: 'Pasos laterales y cambios de apoyo',
  cardiocajon: 'Subidas y toques al cajón',
  cardioconos: 'Recorridos entre conos',
  cardioesqui: 'Pasos de esquiador',
  cardiolinea: 'Coordinación sobre línea',
  cardiocomba: 'Comba y giros de muñeca',
  cardioboxeo: 'Boxeo de sombra',
  cardioskaters: 'Skaters',
  cardioburpee: 'Burpees por pasos',
  cardiojack: 'Step jacks sin salto',
  cardioalcance: 'Pasos con alcances',
  cardiobalon: 'Cardio con balón ligero',
  cardiocarga: 'Cardio con carga ligera'
};

const basic = [
  ['marcha-braceo', 'Marcha activa con braceo', 'cardiomarcha', 'locomocion hombro', '', 'Alterna los apoyos y acompaña cada paso con el brazo contrario.'],
  ['rodillas-alternas', 'Rodillas alternas y toque de mano contraria', 'cardiomarcha', 'locomocion rodilla antirotacion', '', 'Alterna rodillas con toque cruzado a una altura cómoda.'],
  ['lateral-junta', 'Paso lateral activo y junta', 'cardiolateral', 'locomocion abduccion', '', 'Abre y reúne los pies al ritmo del braceo sin cruzarlos.'],
  ['esqui-apoyos', 'Paso de esquiador con braceo alterno', 'cardioesqui', 'locomocion cadera hombro', '', 'Alterna un pie delante y otro atrás mediante pasos cortos.'],
  ['linea-puntas', 'Puntas alternas delante y detrás de una línea', 'cardiolinea', 'locomocion gemelo', '', 'Toca la referencia con un pie y vuelve al centro antes de cambiar de lado.'],
  ['cajon-toque', 'Toques alternos al cajón bajo', 'cardiocajon', 'locomocion rodilla', 'step', 'Toca la parte superior con la punta de un pie y alterna.'],
  ['cajon-subida', 'Subida y bajada alterna al cajón bajo', 'cardiocajon', 'locomocion rodilla cadera', 'step', 'Sube y baja por pasos. Apoya toda la planta en el cajón y alterna el pie que inicia.'],
  ['conos-paso-lateral', 'Desplazamiento lateral de cono a cono', 'cardioconos', 'locomocion abduccion rodilla', 'conos', 'Camina de lado entre dos conos sin cruzar los pies. Frena antes de cambiar de sentido.', {travel:true}],
  ['comba-simulada-marcha', 'Comba simulada con marcha alterna', 'cardiocomba', 'locomocion gemelo hombro', '', 'Gira las muñecas junto a las caderas mientras alternas los pies.'],
  ['boxeo-rectos', 'Boxeo de sombra con rectos alternos', 'cardioboxeo', 'empuje antirotacion locomocion', '', 'Alterna golpes al aire desde la guardia con cambios suaves de peso.'],
  ['skater-toque-corto', 'Skater de paso corto sin salto', 'cardioskaters', 'abduccion rodilla locomocion', '', 'Da un paso lateral y toca detrás con la punta del pie libre. Alterna lados.'],
  ['burpee-pared', 'Burpee por pasos con apoyo en pared', 'cardioburpee', 'rodilla empuje antiextension', '', 'Apoya las manos en la pared, da dos pasos atrás, regresa por pasos y recupera la postura alta.'],
  ['jack-bajo', 'Step jack con apertura a la altura del pecho', 'cardiojack', 'abduccion hombro locomocion', '', 'Abre un pie y los brazos, vuelve al centro y cambia de lado.'],
  ['sentadilla-golpe', 'Sentadilla corta y golpe recto al aire', 'cardioalcance', 'rodilla empuje antirotacion', '', 'Baja con control y da un golpe alterno al recuperar la postura alta.'],
  ['balon-paso-toque', 'Paso lateral continuo con balón al pecho', 'cardiobalon', 'abduccion antiextension locomocion', 'balon', 'Con un balón ligero cerca del pecho, alterna paso y toque con el pie libre.']
];

const medium = [
  ['cajon-subida-rodilla', 'Subida al cajón con rodilla alterna', 'cardiocajon', 'locomocion rodilla cadera antiextension', 'step', 'Sube apoyando toda la planta, eleva la otra rodilla y baja por pasos. Cambia de lado.'],
  ['cajon-lateral', 'Subida lateral al cajón bajo y regreso', 'cardiocajon', 'locomocion abduccion rodilla', 'step', 'Colócate de lado, sube con el pie cercano y baja al mismo punto con control. Cambia de lado.'],
  ['esqui-doble', 'Doble paso de esquiador y cambio de pierna', 'cardioesqui', 'locomocion cadera hombro', '', 'Haz dos cambios de apoyo delante y detrás con braceo y repite desde el lado contrario.'],
  ['linea-cuatro-toques', 'Cuatro toques alrededor de una línea', 'cardiolinea', 'locomocion rodilla abduccion', '', 'Combina dos toques delante y dos a los lados alrededor del punto de partida.'],
  ['rodillas-talones', 'Rodillas y talones alternos con braceo', 'cardiomarcha', 'locomocion rodilla flexionrodilla hombro', '', 'Encadena dos elevaciones de rodilla y dos talones atrás sin dejar de alternar los apoyos.'],
  ['lateral-rodilla', 'Doble paso lateral y rodilla arriba', 'cardiolateral', 'locomocion abduccion rodilla', '', 'Da dos pasos cortos hacia un lado, eleva la rodilla libre y vuelve al centro.'],
  ['conos-lateral-toque', 'Desplazamiento lateral y toque a dos conos', 'cardioconos', 'locomocion abduccion rodilla antirotacion', 'conos', 'Muévete de lado, frena junto al cono y toca la parte superior con la mano más próxima.', {travel:true}],
  ['conos-slalom', 'Slalom entre conos con pasos activos', 'cardioconos', 'locomocion cadera abduccion', 'conos', 'Rodea los conos con pasos cortos y cambia de dirección de forma progresiva.', {travel:true}],
  ['comba-paso-real', 'Comba con paso alterno sin salto', 'cardiocomba', 'locomocion gemelo hombro', 'comba', 'Pasa la cuerda despacio bajo un pie y después el otro, con un apoyo en el suelo. Si pierdes el ritmo, detén la cuerda.', {regression:'Simula la comba con las muñecas y marcha en el sitio.'}],
  ['boxeo-paso-lateral', 'Boxeo jab-cross con paso lateral', 'cardioboxeo', 'empuje antirotacion locomocion abduccion', '', 'Haz dos rectos al aire con los pies firmes y acompáñalos de un paso lateral corto.'],
  ['boxeo-rodilla', 'Boxeo de sombra y rodilla contraria', 'cardioboxeo', 'empuje rodilla antirotacion locomocion', '', 'Alterna dos rectos con una elevación de rodilla al recuperar la guardia.'],
  ['skater-alcance', 'Skater con alcance cruzado sin salto', 'cardioskaters', 'abduccion rodilla cadera antirotacion', '', 'Pasa el peso de lado a lado y alcanza hacia delante con la mano contraria.'],
  ['burpee-banco', 'Burpee inclinado por pasos en banco', 'cardioburpee', 'rodilla cadera empuje antiextension', 'banco', 'Apoya las manos en un banco estable, lleva los pies atrás de uno en uno y regresa por pasos.', {regression:'Haz la secuencia con las manos en la pared.'}],
  ['burpee-suelo', 'Burpee en el suelo por pasos sin salto', 'cardioburpee', 'rodilla cadera empuje antiextension', 'colchoneta', 'Camina hacia la plancha con las manos apoyadas y vuelve a levantarte de uno en uno.', {position:'suelo',regression:'Apoya las manos en un banco estable.'}],
  ['jack-rodilla', 'Step jack y rodilla cruzada', 'cardiojack', 'abduccion hombro antirotacion rodilla', '', 'Abre y cierra los apoyos por pasos y toca la rodilla contraria al volver al centro.'],
  ['zancada-paso-golpe', 'Paso atrás y dos golpes al aire', 'cardioalcance', 'rodilla cadera empuje antirotacion', '', 'Marca un paso atrás corto, recupera la base y lanza dos rectos sin carga.'],
  ['balon-paso-press', 'Paso lateral y empuje de balón ligero', 'cardiobalon', 'abduccion empuje antiextension locomocion', 'balon', 'Al reunir los pies, aleja el balón a la altura del pecho y tráelo de vuelta.']
];

const high = [
  ['cajon-toques-subida', 'Dos toques y subida al cajón bajo', 'cardiocajon', 'locomocion rodilla cadera gemelo', 'step', 'Encadena dos toques de punta y una subida por pasos. Alterna el lado que empieza.'],
  ['cajon-lateral-rodilla', 'Subida lateral al cajón y rodilla al centro', 'cardiocajon', 'locomocion abduccion rodilla cadera', 'step', 'Sube de lado con la planta completa, eleva la rodilla libre y baja con control.'],
  ['linea-frontal-lateral', 'Pasos de coordinación al frente y a los lados', 'cardiolinea', 'locomocion rodilla abduccion antirotacion', '', 'Haz dos apoyos al frente y dos laterales sobre una línea imaginaria, sin fase aérea.'],
  ['lateral-paso-v', 'Doble paso lateral y marcha en V', 'cardiolateral', 'locomocion abduccion cadera hombro', '', 'Encadena dos pasos laterales con una apertura y un cierre en V alrededor del punto de partida.'],
  ['esqui-rodilla-cruzada', 'Paso de esquiador y rodilla cruzada', 'cardioesqui', 'locomocion cadera rodilla antirotacion', '', 'Haz dos cambios escalonados de apoyo y toca la rodilla contraria al volver.'],
  ['pies-activos-rodilla', 'Pies activos en el sitio y marcha de rodillas', 'cardiomarcha', 'locomocion rodilla gemelo hombro', '', 'Encadena cuatro pasos cortos y dos elevaciones de rodilla, manteniendo siempre un apoyo.'],
  ['conos-lateral-frente', 'Ida lateral y regreso frontal entre conos', 'cardioconos', 'locomocion abduccion rodilla antirotacion', 'conos', 'Avanza de lado entre conos, frena y regresa de frente con pasos cortos.', {travel:true}],
  ['conos-triangulo', 'Triángulo entre conos con cambios de dirección', 'cardioconos', 'locomocion abduccion cadera rodilla', 'conos', 'Dibuja el triángulo alternando avance frontal y pasos laterales. Frena en cada vértice.', {travel:true}],
  ['comba-simulada-ritmo', 'Comba simulada con cambios de ritmo y apoyo', 'cardiocomba', 'locomocion gemelo abduccion hombro', '', 'Simula el giro de muñecas y alterna cuatro pasos en el sitio con dos toques laterales.'],
  ['comba-giro-lateral', 'Comba con giro lateral y cambio de apoyo', 'cardiocomba', 'hombro locomocion gemelo abduccion', 'comba', 'Gira la cuerda al lado del cuerpo y alterna los apoyos. Cambia de lado con la cuerda detenida.', {regression:'Haz los giros sin cuerda y con pasos más cortos.'}],
  ['boxeo-esquiva', 'Boxeo jab-cross-gancho y esquiva', 'cardioboxeo', 'empuje antirotacion rodilla cadera', '', 'Encadena dos rectos, un gancho suave y una flexión breve de rodillas al volver a la guardia.'],
  ['boxeo-conos', 'Boxeo de sombra con desplazamiento entre conos', 'cardioboxeo', 'empuje antirotacion abduccion locomocion', 'conos', 'Desplázate de lado hasta el cono, estabiliza los pies y haz dos golpes al aire antes de volver.', {travel:true}],
  ['boxeo-cajon', 'Subida al cajón y boxeo al bajar', 'cardioboxeo', 'rodilla cadera empuje antirotacion locomocion', 'step', 'Completa la subida y la bajada por pasos. Con ambos pies en el suelo, combina dos rectos al aire.'],
  ['skater-rodilla', 'Skater con rodilla cruzada y regreso', 'cardioskaters', 'abduccion rodilla cadera antirotacion', '', 'Apoya el pie lateral, junta los apoyos y lleva la rodilla contraria hacia la mano antes de repetir.'],
  ['skater-doble-lado', 'Doble skater lateral con toque alterno', 'cardioskaters', 'abduccion rodilla cadera locomocion', '', 'Encadena dos pasos de patinador en cada sentido. Marca el toque atrás con el pie libre.'],
  ['burpee-banco-rodilla', 'Burpee en banco y dos rodillas alternas', 'cardioburpee', 'rodilla cadera empuje antiextension locomocion', 'banco', 'Completa el burpee por pasos en banco estable y, de pie, alterna dos rodillas antes de repetir.', {regression:'Practica el burpee de pared y las rodillas por separado.'}],
  ['burpee-suelo-boxeo', 'Burpee por pasos y dos rectos de boxeo', 'cardioburpee', 'rodilla cadera empuje antiextension antirotacion', 'colchoneta', 'Regresa de la plancha por pasos y, una vez de pie, termina con dos golpes al aire.', {position:'suelo',regression:'Haz el burpee con apoyo en banco y reduce la amplitud de los golpes.'}],
  ['jack-alcance-rodilla', 'Step jack, alcance cruzado y rodilla', 'cardiojack', 'abduccion hombro antirotacion rodilla', '', 'Abre por pasos, alcanza en diagonal y acerca la rodilla al recuperar el apoyo central.'],
  ['balon-paso-diagonal', 'Pasos diagonales y empuje de balón', 'cardiobalon', 'rodilla empuje antirotacion locomocion', 'balon', 'Da un paso corto en diagonal y extiende el balón ligero al frente al recuperar la base.'],
  ['mancuernas-paso-carga', 'Marcha activa con carga ligera y toque lateral', 'cardiocarga', 'abduccion locomocion antilateral rodilla', 'mancuernas', 'Sostén las mancuernas ligeras junto al cuerpo y encadena dos marchas y un toque lateral.']
];

const regressions = {
  1: 'Acorta el paso y reduce la amplitud de los brazos.',
  2: 'Reduce el ritmo y practica un gesto cada vez.',
  3: 'Separa la secuencia en dos gestos con pasos más cortos.'
};

export const METABOLIC_RECORDS = [basic, medium, high].flatMap((rows, index) =>
  rows.map(([slug, name, family, movements, material, cue, details = {}]) => {
    const level = index + 1;
    const components = movements.split(' ');
    return {
      id: 'metabolic-cardio-' + slug, name, family, components,
      pattern: components[0] === 'locomocion' ? 'locomocion' : 'global',
      phases: ['metabolic'], level, equipment: material ? [material] : [],
      position: details.position || 'de pie', flags: details.travel ? ['desplazamiento'] : [],
      cue, regression: details.regression || regressions[level],
      enabled: true, catalogVersion: METABOLIC_CATALOG_VERSION
    };
  })
);
