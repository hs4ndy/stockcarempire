// Static gallery, one on-demand 3D renderer. Never creates a renderer per award.
let trophyFilter = 'all', trophyPage = 0, trophyGallery = [], trophyViewer = null;
function trophyDate(t) { return `Year ${t.year}${t.kind === 'championship' ? ' · Season champion' : t.race ? ` · Race ${t.race}` : ' · Race not recorded'}`; }
function trophyDetails(t) {
  const esc = careerArchiveEscape;
  const row = (name, value) => `<div class="team-stat"><span>${name}</span><span>${esc(String(value ?? 'Not recorded'))}</span></div>`;
  return row('Series', SERIES[t.series]?.name) + row('Year', t.year) + (t.kind === 'championship'
    ? row('Championship finish', '1st') + row('Season wins', t.wins) + row('Points', t.points) + row('Starts', t.starts) + row('Top 5 finishes', t.top5) + row('Top 10 finishes', t.top10)
    : row('Race', t.race) + row('Track', t.track) + row('Started', t.startingPosition ? `${t.startingPosition}${ordinal(t.startingPosition)}` : null) + row('Finished', '1st') + row('Points', t.points) + row('Cash earned', t.earnings != null ? fmt$(t.earnings) : null) + row('Car', t.carName) + row('Difficulty', t.difficulty ? difficultyById(t.difficulty).name : null) + row('Race type', t.simulated === true ? 'Simulated' : t.simulated === false ? 'Driven' : null))
    + (t.historical ? '<p class="muted-text small trophy-history-note">Recovered from your saved career. Missing event details were not recorded in that version.</p>' : '');
}
function renderTrophyCase(awards = ensureTrophies()) {
  trophyGallery = [...awards].sort((a,b) => b.year-a.year || (b.kind==='championship'?1000:b.race||0)-(a.kind==='championship'?1000:a.race||0));
  const filtered = trophyGallery.map((t,i)=>({t,i})).filter(({t})=>trophyFilter==='all'||t.kind===trophyFilter);
  const pages = Math.max(1, Math.ceil(filtered.length/24)); trophyPage = Math.min(trophyPage,pages-1);
  const wins=awards.filter(t=>t.kind==='win').length,titles=awards.length-wins;
  return `<div class="trophy-heading"><div><h2>Trophy Case</h2><p class="muted-text">${wins} race ${wins===1?'win':'wins'} · ${titles} ${titles===1?'championship':'championships'}</p></div><label class="trophy-filter">Show<select class="form-select" id="trophy-filter" onchange="filterTrophies(this.value)"><option value="all" ${trophyFilter==='all'?'selected':''}>All trophies</option><option value="win" ${trophyFilter==='win'?'selected':''}>Race wins</option><option value="championship" ${trophyFilter==='championship'?'selected':''}>Championships</option></select></label></div>
  ${!filtered.length ? `<div class="trophy-empty"><h3>${awards.length ? 'No trophies in this view' : 'Your first trophy is waiting'}</h3><p>${awards.length ? 'Choose another view to see your collection.' : 'Win a Career race or a season championship to earn a trophy. Every victory gets its own place here.'}</p></div>` : `<div class="trophy-grid">${filtered.slice(trophyPage*24,(trophyPage+1)*24).map(({t,i})=>`<article class="trophy-card"><button class="trophy-preview" onclick="openTrophyViewer(${i})" aria-label="View ${careerArchiveEscape(trophyTitle(t))} in 3D, ${careerArchiveEscape(trophyDate(t))}"><img src="${SC_TROPHY_THUMBNAILS[trophyModelKey(t)]}" alt="${careerArchiveEscape(trophyTitle(t))}" width="480" height="400" loading="lazy"><span>View in 3D</span></button><div class="trophy-caption"><h3>${careerArchiveEscape(trophyTitle(t))}</h3><p>${careerArchiveEscape(trophyDate(t))}</p><p class="muted-text small">${t.track?careerArchiveEscape(t.track):t.kind==='championship'?`${t.wins ?? 0} wins this season`:'Historical win'}</p><details class="trophy-more"><summary>More</summary>${trophyDetails(t)}</details></div></article>`).join('')}</div>`}
  ${pages>1?`<div class="trophy-pagination"><button class="btn btn-secondary" onclick="pageTrophies(-1)" ${trophyPage===0?'disabled':''}>Previous</button><span>Page ${trophyPage+1} of ${pages}</span><button class="btn btn-secondary" onclick="pageTrophies(1)" ${trophyPage===pages-1?'disabled':''}>Next</button></div>`:''}`;
}
function refreshTrophyGallery() {
  const archive=document.getElementById('archived-trophies-content');
  if(archive) archive.innerHTML=renderTrophyCase(trophyGallery);
  else renderTab('trophies');
}
function filterTrophies(value) { trophyFilter=['all','win','championship'].includes(value)?value:'all';trophyPage=0;refreshTrophyGallery();document.getElementById('trophy-filter')?.focus(); }
function pageTrophies(delta) {trophyPage=Math.max(0,trophyPage+delta);refreshTrophyGallery();document.querySelector('.trophy-heading')?.scrollIntoView({block:'start'});}

function createTrophyStage(container, key) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x101316);
  const camera=new THREE.PerspectiveCamera(35,1,.1,80),model=new THREE.Group();scene.add(model);
  // Tiny local studio reflection panels; no external environment/image requests.
  const faces=Array.from({length:6},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#424c5a';x.fillRect(0,0,64,64);x.fillStyle=i===2?'#ffffff':'#c8d2dd';x.fillRect(8,3,13,58);x.fillStyle='#7c8796';x.fillRect(44,0,8,64);return c;});
  const env=new THREE.CubeTexture(faces);env.encoding=THREE.sRGBEncoding;env.needsUpdate=true;
  const colors={gold:0xd9ad52,silver:0xcbd3dc,dark:0x20252c,wood:0x38251d,blue:0x286397};
  for(const part of SC_TROPHY_MODELS[key].parts){
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));if(part.indices)geo.setIndex(part.indices);
    const metal=['silver','gold'].includes(part.material);
    const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:new THREE.Color(colors[part.material]).convertSRGBToLinear(),metalness:metal?.82:.12,roughness:metal?.23:.5,envMap:env,envMapIntensity:.9}));mesh.castShadow=true;mesh.receiveShadow=true;model.add(mesh);
  }
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshStandardMaterial({color:new THREE.Color(0x101316).convertSRGBToLinear(),roughness:.8}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xe1e9f6,0x272521,.85));
  const light=new THREE.SpotLight(0xfff4df,2.5,25,.7,.6,1);light.position.set(-3,6,4);light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.normalBias=.015;scene.add(light);scene.add(light.target);
  const fill=new THREE.DirectionalLight(0xb5d5ff,.8);fill.position.set(4,3,-3);scene.add(fill);
  const bounds=new THREE.Box3().setFromObject(model),sphere=bounds.getBoundingSphere(new THREE.Sphere());
  const state={renderer,scene,model,camera,yaw:.25,elevation:.20,zoom:1,disposed:false,frame:0};
  state.draw=()=>{if(state.disposed)return;const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const fov=Math.min(THREE.MathUtils.degToRad(17.5),Math.atan(Math.tan(THREE.MathUtils.degToRad(17.5))*camera.aspect));const distance=sphere.radius/Math.sin(fov)*1.17*state.zoom;camera.position.set(Math.sin(state.yaw)*Math.cos(state.elevation)*distance,sphere.center.y+Math.sin(state.elevation)*distance,Math.cos(state.yaw)*Math.cos(state.elevation)*distance);camera.lookAt(sphere.center);light.target.position.copy(sphere.center);renderer.render(scene,camera);};
  state.render=()=>{if(state.frame||state.disposed)return;state.frame=requestAnimationFrame(()=>{state.frame=0;state.draw();});};
  state.dispose=()=>{state.disposed=true;cancelAnimationFrame(state.frame);state.resize?.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();o.shadow?.map?.dispose();});env.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  state.resize=new ResizeObserver(state.render);state.resize.observe(container);state.render();return state;
}
function openTrophyViewer(index) {
  if(trophyViewer)return;const award=trophyGallery[index];if(!award)return;
  const previous=document.activeElement,shield=[...document.body.children].filter(e=>e.tagName!=='SCRIPT').map(e=>[e,e.inert]);shield.forEach(([e])=>e.inert=true);
  const overlay=document.createElement('div');overlay.id='trophy-viewer';overlay.className='trophy-viewer';overlay.role='dialog';overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','trophy-viewer-title');
  overlay.innerHTML=`<div class="trophy-viewer-header"><h2 id="trophy-viewer-title">${careerArchiveEscape(trophyTitle(award))}</h2><button class="btn btn-secondary" id="trophy-close">Close</button></div><div class="trophy-viewer-layout"><section class="trophy-stage"><div class="trophy-viewport"></div><div class="trophy-controls"><button class="btn btn-secondary" data-view="left" aria-label="Rotate left">Rotate left</button><button class="btn btn-secondary" data-view="right" aria-label="Rotate right">Rotate right</button><button class="btn btn-secondary" data-view="in" aria-label="Zoom in">+</button><button class="btn btn-secondary" data-view="out" aria-label="Zoom out">−</button><button class="btn btn-ghost" data-view="reset">Reset</button></div><p class="muted-text small">Drag to rotate · Scroll to zoom · Arrow keys rotate</p><p id="trophy-view-error" role="status"></p></section><section class="trophy-event"><h3>${careerArchiveEscape(trophyDate(award))}</h3>${trophyDetails(award)}</section></div>`;
  document.body.append(overlay);const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';trophyViewer={overlay,previous,shield,oldOverflow};
  try{
    const stage=createTrophyStage(overlay.querySelector('.trophy-viewport'),trophyModelKey(award));trophyViewer.stage=stage;
    const canvas=stage.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','3D trophy. Arrow keys rotate; plus and minus zoom.');let pointer=null;
    const move=(yaw=0,elevation=0,zoom=0)=>{stage.yaw+=yaw;stage.elevation=clamp(stage.elevation+elevation,.02,1.25);stage.zoom=clamp(stage.zoom+zoom,.8,1.7);stage.render();};
    canvas.onpointerdown=e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
    canvas.onpointermove=e=>{if(!pointer||e.pointerId!==pointer.id)return;move(-(e.clientX-pointer.x)*.009,(e.clientY-pointer.y)*.007);pointer.x=e.clientX;pointer.y=e.clientY;};canvas.onpointerup=canvas.onpointercancel=()=>pointer=null;
    canvas.onwheel=e=>{e.preventDefault();move(0,0,e.deltaY*.001);};
    canvas.onkeydown=e=>{const steps={ArrowLeft:[.15,0,0],ArrowRight:[-.15,0,0],ArrowUp:[0,.1,0],ArrowDown:[0,-.1,0],'+':[0,0,-.1],'=':[0,0,-.1],'-':[0,0,.1]};if(steps[e.key]){e.preventDefault();move(...steps[e.key]);}};
    overlay.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const v=b.dataset.view;if(v==='reset'){Object.assign(stage,{yaw:.25,elevation:.20,zoom:1});stage.render();}else move(v==='left'?.25:v==='right'?-.25:0,0,v==='in'?-.1:v==='out'?.1:0);});
  }catch(e){console.warn('Trophy preview',e);overlay.querySelector('#trophy-view-error').textContent='The 3D view could not start. Your trophy and its record are safe.';overlay.querySelector('.trophy-viewport').innerHTML=`<img src="${SC_TROPHY_THUMBNAILS[trophyModelKey(award)]}" alt="${careerArchiveEscape(trophyTitle(award))}">`;overlay.querySelectorAll('[data-view]').forEach(b=>b.disabled=true);}
  overlay.querySelector('#trophy-close').onclick=closeTrophyViewer;
  overlay.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closeTrophyViewer();}if(e.key==='Tab'){const focus=[...overlay.querySelectorAll('button:not(:disabled),canvas[tabindex]')],first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};overlay.querySelector('#trophy-close').focus();
}
function closeTrophyViewer(){const s=trophyViewer;if(!s)return;trophyViewer=null;s.stage?.dispose();s.overlay.remove();s.shield.forEach(([e,was])=>e.inert=was);document.body.style.overflow=s.oldOverflow;s.previous?.focus({preventScroll:true});}
function showArchivedTrophies(index){
  const archive=getHallOfFame()[index];if(!archive)return;
  if(document.getElementById('archived-trophies-modal'))return;trophyPage=0;trophyFilter='all';
  const previous=document.activeElement,oldOverflow=document.body.style.overflow,shield=[...document.body.children].filter(e=>e.tagName!=='SCRIPT').map(e=>[e,e.inert]);shield.forEach(([e])=>e.inert=true);
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay" id="archived-trophies-modal" role="dialog" aria-modal="true" aria-labelledby="archived-trophies-title"><div class="modal trophy-archive"><div class="modal-header"><h3 id="archived-trophies-title">${careerArchiveEscape(archive.driverName)} · Trophies</h3><button class="btn btn-secondary" id="archived-trophies-close">Close</button></div><div class="modal-body" id="archived-trophies-content">${renderTrophyCase(archive.trophies||[])}</div></div></div>`);
  const overlay=document.getElementById('archived-trophies-modal'),close=()=>{overlay.remove();shield.forEach(([e,was])=>e.inert=was);document.body.style.overflow=oldOverflow;previous?.focus({preventScroll:true});};
  document.body.style.overflow='hidden';overlay.querySelector('#archived-trophies-close').onclick=close;
  overlay.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const focus=[...overlay.querySelectorAll('button:not(:disabled),select,summary')],first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};overlay.querySelector('#archived-trophies-close').focus();
}
