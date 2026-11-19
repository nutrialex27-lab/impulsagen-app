import test from 'node:test';
import assert from 'node:assert/strict';
import {registroRoutine} from './registro-export.js';
import {makeTemplate} from './data.js';

function plan(){
 const blocks=makeTemplate();
 const database=blocks.flatMap(block=>block.slots.map((slot,index)=>({id:slot.id,name:block.name+' ejercicio '+(index+1)})));
 blocks.forEach(block=>block.slots.forEach(slot=>{slot.exerciseId=slot.id;}));
 return {title:'Prueba de ciclo',profile:'sin-definir',blocks,database};
}
test('exports the actual selected exercises and solved turns without changing the generator',()=>{
 const input=plan(),before=structuredClone(input),packet=registroRoutine(input,'test-routine');
 assert.deepEqual(input,before);
 assert.equal(packet.format,'registro-ems-routine');
 assert.deepEqual(packet.routine.blocks.filter(block=>['strength','fullBody','core','metabolic'].includes(block.phase)).map(block=>block.rounds),[3,4,4,3]);
 assert.equal(packet.routine.blocks[0].rounds,1);
 assert.equal(packet.routine.blocks[0].plannedRounds,2);
 assert.equal(packet.routine.blocks[2].exercises[0].name,'Full body ejercicio 1');
 input.database[0].name='Otro';
 assert.notEqual(packet.routine.blocks[0].exercises[0].name,'Otro');
});
test('repeated main blocks remain distinct and missing exercises fail clearly',()=>{
 const input=plan();
 const second=structuredClone(input.blocks[2]);second.id='another-main';input.blocks.push(second);
 const packet=registroRoutine(input,'test');
 assert.equal(packet.routine.blocks.at(-1).id,'fullBody-2');
 const ids=packet.routine.blocks.flatMap(block=>block.exercises.map(exercise=>exercise.id));
 assert.equal(ids.length,new Set(ids).size);
 input.blocks[0].slots[0].exerciseId='missing';
 assert.throws(()=>registroRoutine(input,'test'),/Completa todos los ejercicios/);
});
