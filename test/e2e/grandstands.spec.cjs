const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {test, expect} = require('playwright/test');

for (const [series, decks, mode] of [[0,1,'desktop'],[1,2,'desktop'],[2,4,'desktop'],[2,4,'mobile'],[2,4,'file']]) {
  test(`series ${series} has ${decks} decks on both sides (${mode})`, async ({browser}, testInfo) => {
    const context=await browser.newContext({viewport:mode==='mobile'?{width:844,height:390}:{width:1440,height:900},deviceScaleFactor:mode==='mobile'?2:1});
    const page=await context.newPage(); const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error' && /texture|CORS|WebGL/i.test(m.text())) errors.push(m.text());});
    await page.route('**/three.min.js',route=>route.fulfill({path:path.resolve(__dirname,'../../node_modules/three/build/three.min.js'),contentType:'application/javascript'}));
    await page.goto(mode==='file'?pathToFileURL(path.resolve(__dirname,'../../index.html')).href:'/');
    await page.locator('#btn-quick-race').click();
    await page.locator('.quick-series-btn').nth(series).click();
    await page.waitForFunction(()=>window._r3d?.racing && window._r3d?.grandstandGroup?.children.every(m=>!m.material.map || m.material.map.image?.naturalWidth>0));
    const metadata=await page.evaluate(()=>{
      const e=window._r3d; e.paused=true; e.paceMode=false; cancelAnimationFrame(e._raf);
      return {...e.grandstandGroup.userData,selected:e.config.seriesId};
    });
    expect(metadata.seriesId).toBe(['grassroots','challenger','premier'][series]);
    expect(metadata.selected).toBe(metadata.seriesId); expect(metadata.decks).toBe(decks);
    expect(metadata.height).toBeGreaterThan([5,25,65][series]);
    if(series===2) expect(metadata.height).toBeCloseTo(68.26,2);
    for(const z of [120,7500,15000]) {
      const report=await page.evaluate(z=>{
        const e=window._r3d, p=e.player;
        const oldZ=p.z;
        for(const c of e.cars) {c.z+=z-oldZ;c.mesh.position.set(c.x,0,c.z);}
        p.speed=210; p.lv=0; e._updateCamera(1); e._updateHUD(1);
        e.scene.updateMatrixWorld(true);
        let left=0,right=0,finite=true,clear=true,triangles=0;
        const matrix=new THREE.Matrix4(),v=new THREE.Vector3();
        for(const m of e.grandstandGroup.children) {
          finite &&= ['position','normal','uv'].every(a=>Array.from(m.geometry.attributes[a].array).every(Number.isFinite));
          finite &&= Array.from(m.geometry.index.array).every(i=>i<m.geometry.attributes.position.count);
          triangles+=m.count*m.geometry.index.count/3;
          for(let i=0;i<m.count;i++) {
            m.getMatrixAt(i,matrix); v.setFromMatrixPosition(matrix);
            if(v.x<0) left++; else right++;
            clear &&= Math.abs(v.x)>=20 && matrix.determinant()>0;
          }
        }
        e.renderer.autoClear=true;e.renderer.render(e.scene,e.camera);
        e.renderer.autoClear=false;e._renderMirror();e.renderer.autoClear=true;
        return {left,right,finite,clear,triangles,center:e._grandstandCenter,
          expected:Math.floor(z/e._grandstandModel.pitch),meshes:e.grandstandGroup.children.length};
      },z);
      expect(report.left).toBe(report.right);expect(report.left).toBeGreaterThan(0);
      expect(report.finite && report.clear).toBe(true);expect(report.center).toBe(report.expected);
      expect(report.meshes).toBeLessThanOrEqual(14);expect(report.triangles).toBeLessThan(900000);
      await page.screenshot({path:testInfo.outputPath(`grandstands-${z}.png`)});
      console.log(JSON.stringify({series,mode,z,...report}));
    }
    // Close architectural view verifies stepped rows, deck gaps and the roof.
    await page.evaluate(()=>{
      const e=window._r3d, height=e._grandstandModel.height, x=e._grandstandModel.frontX;
      e.camera.fov=62;e.camera.position.set(-5,height*.45+5,e.player.z-35);
      e.camera.lookAt(x+8,height*.4,e.player.z+30);e.camera.updateProjectionMatrix();
      e.renderer.render(e.scene,e.camera);
    });
    await page.screenshot({path:testInfo.outputPath('architecture.png')});
    expect(errors).toEqual([]); await context.close();
  });
}
