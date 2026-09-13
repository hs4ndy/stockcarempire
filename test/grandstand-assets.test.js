const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'assets/grandstands/grandstand-models.js'),'utf8'),context);
const asset=vm.runInContext('SC_GRANDSTANDS',context);
test('grandstand assets have distinct 1/2/4-deck architecture and bounded LOD geometry',()=>{
  let lastHeight=0;
  for(const [id,decks] of [['grassroots',1],['challenger',2],['premier',4]]) {
    const m=asset.models[id];assert.equal(m.deckCount,decks);assert.equal(m.decks.length,decks);
    assert.ok(m.height>lastHeight);lastHeight=m.height;
    const counts=[];
    for(const parts of [m.parts,m.distantParts]) {
      let triangles=0;
      for(const g of Object.values(parts)) {
        assert.equal(g.position.length,g.normal.length);assert.equal(g.uv.length,g.position.length/3*2);
        assert.ok([...g.position,...g.normal,...g.uv].every(Number.isFinite));
        assert.ok(g.index.every(i=>Number.isInteger(i)&&i>=0&&i<g.position.length/3));
        assert.ok(g.position.filter((_,i)=>i%3===0).every(x=>x+m.frontX>18));
        assert.ok(g.position.filter((_,i)=>i%3===2).every(z=>z>=-.5&&z<=60.5));
        triangles+=g.index.length/3;
      }
      counts.push(triangles);
    }
    assert.ok(counts[1]<counts[0]*.6);assert.ok(counts[0]<25000);
  }
});
test('embedded crowd texture matches the Blender image and works without external requests',()=>{
  assert.ok(asset.crowdTexture.startsWith('data:image/png;base64,'));
  assert.deepEqual(Buffer.from(asset.crowdTexture.split(',')[1],'base64'),fs.readFileSync(path.join(root,'assets/grandstands/seated-crowd.png')));
});
test('Premier tiers recede behind the previous seating rake and retain their canopy in both LODs',()=>{
  const m=asset.models.premier;
  for(let i=1;i<m.decks.length;i++) {
    const [start,base,rows,tread,rise]=m.decks[i-1];
    assert.ok(m.decks[i][0]>=start+rows*tread+1,'upper tier must clear the lower seating rows');
    const gap=m.decks[i][1]-(base+(rows-1)*rise);
    assert.ok(gap>3 && gap<10,'tier separation must leave a compact suite/concourse band');
  }
  const [start,base,rows,tread,rise]=m.decks[3];
  const roofY=base+(rows-1)*rise+5;
  for(const parts of [m.parts,m.distantParts]) {
    const roof=[];
    for(let i=0;i<parts.trim.position.length;i+=3) {
      if(Math.abs(parts.trim.position[i+1]-roofY)<.2) roof.push(parts.trim.position[i]);
    }
    assert.ok(Math.min(...roof)<=start-3 && Math.max(...roof)>=start+rows*tread+3,
      'canopy must follow and cover the recessed top deck');
  }
});
