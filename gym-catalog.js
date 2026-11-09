// Sala is a single inventory selection. Each machine is identified by its exercise name.
const rows = [
  ['prensa', 'Prensa de piernas bilateral', 'rodilla', 'prensa', 'sentado', 'Mantén pelvis y espalda apoyadas. Baja hasta el recorrido que puedas controlar.', {level:1}],
  ['prensa-unilateral', 'Prensa de piernas unilateral', 'rodilla', 'prensa', 'sentado', 'Alinea la rodilla con el pie y conserva la pelvis estable. Alterna la pierna entre series.'],
  ['hack', 'Sentadilla en máquina hack', 'rodilla', 'sentadillamaquina', 'de pie', 'Coloca los pies antes de desbloquear y usa un recorrido que conserve el apoyo.'],
  ['pendular', 'Sentadilla pendular en máquina', 'rodilla', 'sentadillamaquina', 'de pie', 'Ensaya el recorrido y los topes con poca carga. Mantén todo el pie apoyado.'],
  ['extensora', 'Extensión de rodillas en máquina', 'rodilla', 'extensionrodilla', 'sentado', 'Alinea el eje de la máquina con la rodilla y controla el retorno.', {level:1}],
  ['extensora-unilateral', 'Extensión unilateral de rodilla en máquina', 'rodilla', 'extensionrodilla', 'sentado', 'Ajusta el rodillo y alterna la pierna entre series. Evita el impulso.'],
  ['femoral-sentado', 'Curl femoral sentado en máquina', 'flexionrodilla', 'curlfemoral', 'sentado', 'Ajusta eje, apoyo del muslo y rodillo. Flexiona y regresa sin mover la pelvis.', {level:1}],
  ['femoral-tumbado', 'Curl femoral tumbado en máquina', 'flexionrodilla', 'curlfemoral', 'tumbado', 'Mantén la cadera apoyada y flexiona la rodilla sin arquear la espalda.', {level:1}],
  ['femoral-unilateral', 'Curl femoral unilateral en máquina sentada', 'flexionrodilla', 'curlfemoral', 'sentado', 'Sujeta el muslo y alterna la pierna en la siguiente serie.'],
  ['glute-drive', 'Hip thrust en máquina glute drive', 'cadera', 'hipthrust', 'sentado', 'Ajusta la almohadilla sobre la pelvis. Extiende la cadera sin hiperextender la espalda.'],
  ['patada-gluteo', 'Extensión de cadera en máquina de glúteos', 'cadera', 'extensioncadera', 'de pie', 'Sujeta los apoyos y mueve el muslo desde la cadera. Controla el regreso.'],
  ['abductora', 'Abducción de cadera en máquina', 'abduccion', 'abduccionmaquina', 'sentado', 'Abre las piernas dentro de un recorrido cómodo y evita el rebote.', {level:1}],
  ['aductora', 'Aducción de cadera en máquina', 'cadera', 'aduccionmaquina', 'sentado', 'Acerca las piernas con control. Ajusta el inicio para mantener un apoyo estable.', {level:1}],
  ['buenos-dias', 'Buenos días en multipower', 'cadera', 'bisagra', 'de pie', 'Ensaya la bisagra y ajusta los topes. Lleva la cadera atrás con rodillas suaves y carga controlable.', {level:3}],
  ['press-pecho', 'Press de pecho horizontal en máquina', 'empuje', 'pressmaquina', 'sentado', 'Ajusta el asiento para que los agarres queden a la altura del pecho. Controla la vuelta.', {level:1}],
  ['press-inclinado', 'Press inclinado de pecho en máquina', 'empuje', 'pressmaquina', 'sentado', 'Apoya la espalda, mantén muñecas alineadas y ajusta el recorrido al hombro.'],
  ['press-convergente', 'Press convergente de pecho en máquina', 'empuje', 'pressmaquina', 'sentado', 'Empuja con ambos brazos a la vez y regresa con el respaldo como apoyo.'],
  ['contractor', 'Aperturas en contractor de pecho', 'empuje', 'apertura', 'sentado', 'Ajusta los apoyos a una altura cómoda. Acerca los brazos sin forzar la apertura.'],
  ['press-hombros', 'Press de hombros en máquina', 'hombro', 'pressvertical', 'sentado', 'Con la espalda apoyada, presiona dentro de un recorrido cómodo.', {flags:['overhead']}],
  ['laterales', 'Elevación lateral en máquina', 'hombro', 'lateral', 'sentado', 'Eleva los brazos sin encoger los hombros ni balancear el tronco.', {level:1}],
  ['jalon', 'Jalón al pecho en máquina', 'tiron', 'jalon', 'sentado', 'Sujeta los muslos y dirige los codos hacia los costados. Mantén el tronco estable.', {flags:['overhead']}],
  ['jalon-neutro', 'Jalón neutro en polea alta', 'tiron', 'jalon', 'sentado', 'Baja el agarre hacia el pecho sin balancear el cuerpo. Regresa con control.', {flags:['overhead']}],
  ['remo-sentado', 'Remo sentado en máquina', 'tiron', 'remomaquina', 'sentado', 'Ajusta el asiento y tira hacia las costillas. Evita impulsar el tronco.', {level:1}],
  ['remo-apoyado', 'Remo con apoyo de pecho en máquina', 'tiron', 'remoapoyado', 'sentado', 'Comprueba el contacto del chaleco y lleva los codos hacia atrás con control.', {level:1}],
  ['dominadas-asistidas', 'Dominada en máquina asistida', 'tiron', 'dominadas', 'de pie', 'Elige una asistencia que permita subir y bajar sin balanceo.', {flags:['overhead']}],
  ['fondos-asistidos', 'Fondos en máquina asistida', 'empuje', 'fondos', 'de pie', 'Elige asistencia suficiente y ajusta la profundidad a un recorrido cómodo.'],
  ['contractor-inverso', 'Apertura posterior en contractor inverso', 'hombro', 'aperturaposterior', 'sentado', 'Mantén el pecho apoyado y abre sin elevar los hombros.'],
  ['biceps', 'Curl de bíceps en máquina', 'biceps', 'curlmaquina', 'sentado', 'Alinea codos con el eje y controla la bajada.', {level:1}],
  ['triceps', 'Extensión de tríceps en máquina', 'triceps', 'tricepsmaquina', 'sentado', 'Mantén estable el brazo y extiende el codo dentro del recorrido cómodo.', {level:1}],
  ['gemelo-pie', 'Elevación de gemelos en máquina de pie', 'gemelo', 'gemelomaquina', 'de pie', 'Apoya el antepié y eleva los talones sin rebotes.', {level:1}],
  ['gemelo-sentado', 'Elevación de gemelos en máquina sentada', 'gemelo', 'gemelomaquina', 'sentado', 'Ajusta el apoyo sobre el muslo y controla el recorrido del tobillo.', {level:1}],
  ['abdominales', 'Flexión de tronco en máquina abdominal', 'flexiontronco', 'abdominalmaquina', 'sentado', 'Exhala al flexionar y evita tirar del cuello.', {phase:'core'}],
  ['cinta', 'Marcha cómoda en cinta', 'locomocion', 'cinta', 'de pie', 'Empieza despacio, con una cadencia fácil y sin fatiga.', {phase:'activation',level:1}],
  ['bici', 'Pedaleo suave en bicicleta estática', 'locomocion', 'bici', 'sentado', 'Ajusta el sillín y pedalea con resistencia ligera.', {phase:'activation',level:1}],
  ['eliptica', 'Elíptica a ritmo cómodo', 'locomocion', 'eliptica', 'de pie', 'Usa una cadencia regular y resistencia suave.', {phase:'activation',level:1}],
  ['remo-ergometro', 'Remo suave en ergómetro', 'locomocion', 'ergometro', 'sentado', 'Empuja con las piernas y acompaña con un tirón suave. Regresa con control.', {phase:'activation'}]
];

export const GYM_RECORDS = rows.map(([key,name,pattern,family,position,cue,options={}])=>({
  id:`sala-${key}`,name,pattern,family,position,cue,
  phases:[options.phase||'main'],level:options.level||2,equipment:['sala'],flags:options.flags||[],
  regression:'Reduce carga y recorrido hasta recuperar una ejecución cómoda.',
  enabled:true,catalogVersion:5
}));

// Existing equipment also unlocked by Sala inside the hypertrophy programme.
export const GYM_EQUIPMENT = ['sala','multipower','polea'];
