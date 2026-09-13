const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=(file,name)=>vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8')+';'+name);
const env=load('assets/environment/environment-model.js','SC_ENVIRONMENT');
const stands=load('assets/grandstands/grandstand-models.js','SC_GRANDSTANDS');
test('ground pads contain every series footprint and keep the racing corridor clear',()=>{
  for(const [id,m] of Object.entries(env.models)) {
    const stand=stands.models[id];
    const xs=Object.values(stand.parts).flatMap(g=>Array.from(g.position).filter((_,i)=>i%3===0));
    assert.ok(m.frontX<stand.frontX+Math.min(...xs));
    assert.ok(m.backX>stand.frontX+Math.max(...xs));
    let triangles=0;
    for(const [name,g] of Object.entries(m.parts)) {
      assert.ok([...g.position,...g.normal,...g.uv].every(Number.isFinite));
      assert.equal(g.position.length,g.normal.length); assert.equal(g.uv.length,g.position.length/3*2);
      assert.ok(g.index.every(i=>Number.isInteger(i)&&i>=0&&i<g.position.length/3));
      for(let i=0;i<g.position.length;i+=3) {
        assert.deepEqual(Array.from(g.normal.slice(i,i+3)),[0,1,0]);
        assert.ok(Math.abs(g.position[i])>=11.2);
        assert.equal(g.position[i+1],name==='grass'?-.025:-.015);
        assert.ok(g.position[i+2]===0 || g.position[i+2]===60);
      }
      // A repeatable module has an integral number of texture tiles in Z.
      for(let i=1;i<g.uv.length;i+=2) assert.ok(Number.isInteger(g.uv[i]));
      triangles+=g.index.length/3;
    }
    assert.equal(triangles,12);
  }
});
test('environment texture bundle matches the Blender PNGs',()=>{
  for(const [name,url] of Object.entries(env.textures)) {
    assert.ok(url.startsWith('data:image/png;base64,'));
    assert.deepEqual(Buffer.from(url.split(',')[1],'base64'),fs.readFileSync(path.join(root,'assets/environment',name+'.png')));
  }
});
