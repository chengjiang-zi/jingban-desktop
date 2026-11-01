import test from 'node:test';
import assert from 'node:assert/strict';
import {understandingScore} from '../lib/understanding.mjs';
test('understanding is bounded, duplicate-insensitive and recalculated after deletion',()=>{
 assert.equal(understandingScore().score,0);
 const note={text:'我喜欢蓝色。'},fact={memory:'我喜欢蓝色'};
 assert.deepEqual(understandingScore([note],[fact,fact]),understandingScore([note]));
 assert.ok(understandingScore([note]).score>understandingScore([],[fact]).score);
 assert.equal(understandingScore([],[]).score,0);
 assert.equal(understandingScore(Array.from({length:300},(_,i)=>({text:'信息'+i}))).score,100);
});
