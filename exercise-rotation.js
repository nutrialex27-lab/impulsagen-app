export const RECENT_EXERCISE_LIMIT=40;

// A change of grip or equipment can share a movement family for rotation.
// The original catalog families are still available as search filters.
const MOVEMENT_FAMILIES={
  rodilla:[[/^(sentadilla|sumo)/,'sentadilla'],[/^(zancada|bulgara)/,'zancada'],[/^step/,'step']],
  cadera:[[/^(bisagra|rumano|pesomuerto)/,'bisagra'],[/^puente/,'puente'],[/^extension/,'extensioncadera']],
  empuje:[[/^flexion/,'flexion'],[/^(vertical|pressvertical)$/,'pressvertical'],[/^press/,'press']],
  tiron:[
    [/^remoapoyado/,'remoapoyado'],
    [/^remo(invertido|suspension)/,'remopeso'],
    [/^(remopunta|meadows)/,'remopunta'],
    [/^remo(polea|maquina)/,'remosentado'],
    [/^(remo|pendlay)/,'remo'],
    [/^jalon(?!recto)/,'jalon']
  ],
  antiextension:[[/^plancha/,'plancha'],[/^(deadbug|deslizamiento|marchasupina)/,'deadbug']],
  antilateral:[[/^(cargaunilateral|sostenlateral)/,'sostenlateral']],
  flexiontronco:[[/^crunch/,'crunch']]
};

export function rotationFamily(exercise){
  const {pattern,family}=exercise;
  const match=MOVEMENT_FAMILIES[pattern]?.find(([form])=>form.test(family));
  return `${pattern}:${match?.[1]??family}`;
}

export function rememberExercise(block,previousId){
  if(!previousId)return;
  const older=block.recentExerciseIds??[];
  block.recentExerciseIds=[previousId,...older.filter(id=>id!==previousId)].slice(0,RECENT_EXERCISE_LIMIT);
}

export function exerciseRecency(block,records){
  const exercises=new Map(),families=new Map();
  for(const [index,id] of (block.recentExerciseIds??[]).entries()){
    exercises.set(id,index);
    const exercise=records.get(id);
    if(exercise){
      const family=rotationFamily(exercise);
      if(!families.has(family))families.set(family,index);
    }
  }
  return {exercises,families};
}
