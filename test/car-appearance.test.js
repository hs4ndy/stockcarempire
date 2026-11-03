const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {entries}=require('./helpers/race-sources.cjs');
function context(){const store=new Map(),c=vm.createContext({console,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});for(const [f,s]of entries(['js/data.js','js/game.js']))vm.runInContext(s,c,{filename:f});return c;}
test('legacy appearance has safe defaults without modifying the saved car',()=>{
 const c=context();assert.equal(vm.runInContext(`(()=>{const old={number:3,color:'#123456'},before=JSON.stringify(old),look=carAppearance(old);return look.stripes&&look.stripeColor==='#f2f3e9'&&look.numberColor==='#f2f3e9'&&JSON.stringify(old)===before&&carAppearance(null).stripes;})()`,c),true);
});
test('career save/load preserves cosmetic settings and equipment values',()=>{
 const c=context();assert.equal(vm.runInContext(`(()=>{newGame('Team','Driver','Car');const car=game.cars[0],power=careerRacePower(car,70);Object.assign(car,{stripes:false,stripeColor:'#ffcc00',numberColor:'#22ff88'});if(!saveToSlot(0))return false;loadFromSlot(0);const loaded=game.cars[0],look=carAppearance(loaded);return !look.stripes&&look.stripeColor==='#ffcc00'&&look.numberColor==='#22ff88'&&careerRacePower(loaded,70)===power;})()`,c),true);
});
test('stripe overlay is finite, indexed and contained within the existing Gen-7 body envelope',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('assets/cars/racing-stripes.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/cars/stock-car-model.js','utf8'),c);
 assert.equal(vm.runInContext(`(()=>{const s=SC_RACING_STRIPES,p=SC_STOCK_CAR_MODEL.parts.paint.position;if(s.index.length!==292*3||!s.position.every(Number.isFinite)||!s.index.every(i=>Number.isInteger(i)&&i>=0&&i<s.position.length/3))return false;for(const axis of [0,2]){const body=p.filter((v,i)=>i%3===axis),stripe=s.position.filter((v,i)=>i%3===axis);if(Math.min(...stripe)<Math.min(...body)||Math.max(...stripe)>Math.max(...body))return false;}return true;})()`,c),true);
});
