const test=require('node:test');
const assert=require('node:assert/strict');
const {rewatchOrder,minimumBundles}=require('../src/logic');
test('rewatch order is topological, unique, excludes target, counts watched',()=>{
 const movies=[{id:1,prerequisites:[],watched:true,runtime:100},{id:2,prerequisites:[1],watched:false,runtime:120},{id:3,prerequisites:[1,2],watched:false,runtime:150}];
 const result=rewatchOrder(3,movies);
 assert.deepEqual(result.movies.map(m=>m.id),[1,2]);assert.equal(result.watchedCount,1);assert.equal(result.remainingMinutes,120);
});
test('detects indirect cycle',()=>assert.throws(()=>rewatchOrder(1,[{id:1,prerequisites:[2]},{id:2,prerequisites:[1]}]),/CIRCULAR_DEPENDENCY/));
test('booking examples',()=>{
 assert.equal(minimumBundles([1,3,4],6).totalBundles,2);
 assert.equal(minimumBundles([2,5],11).totalBundles,4);
 assert.equal(minimumBundles([6,9,20],44).totalBundles,4);
 assert.equal(minimumBundles([4,6],7).possible,false);
});
