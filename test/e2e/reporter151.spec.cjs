const {test,expect}=require('playwright/test');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const reporters=[['Sophia Calabrese','sophia-calabrese'],['Michael Williams','michael-williams'],['Kenzie Wright','kenzie-wright']];
for(const [name,slug] of reporters) for(const offline of [false,true]) {
  test(`reporter illustration above quote ${name} ${offline?'offline phone':'source'}`,async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width:offline?390:1440,height:offline?844:900});
    await page.goto(pathToFileURL(path.resolve(offline?'releases/Stock-Car-Empire.html':'index.html')).href);
    const expected='data:image/jpeg;base64,'+fs.readFileSync(`assets/reporters/${slug}.jpg`).toString('base64');
    expect(await page.evaluate(({name,expected})=>SC_REPORTER_IMAGES[name]===expected,{name,expected})).toBe(true);
    await page.evaluate(name=>{
      newGame('Team','Driver','Car');window.beforeReporter151=JSON.stringify(game);
      const policy=document.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content="img-src 'none'";document.head.append(policy);
      pendingRaceNews={mode:'career',simulated:true,reports:[{headline:'A race to remember',reporter:name,
        playerName:'Driver',quote:'We kept working together and brought the car home.',
        paragraphs:['Driver brought the car home after a hard-fought race.','The team now turns its attention to the next event.','The championship continues next weekend.'],closing:'The team is ready.'}]};
      const finish=document.createElement('canvas');finish.width=1024;finish.height=576;
      pendingRaceNews.photo={canvas:finish,leaderName:'Driver'};
      showRaceNews(0);
    },name);
    const canvas=page.locator('blockquote canvas');
    await expect(canvas).toHaveAttribute('data-news-reporter',name);
    await expect(canvas).toHaveAttribute('data-loaded','true');
    const layout=await canvas.evaluate(el=>{
      const pixels=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
      return {beforeQuote:el.nextElementSibling.tagName==='P',pixels:pixels.some((n,i)=>i%4!==3&&n>0),
        overflow:el.getBoundingClientRect().width>el.parentElement.getBoundingClientRect().width};
    });
    expect(layout).toEqual({beforeQuote:true,pixels:true,overflow:false});
    const sizes=await page.evaluate(()=>{
      const finish=document.querySelector('.race-news-photo canvas').getBoundingClientRect();
      const interview=document.querySelector('.race-news-interview').getBoundingClientRect();
      return [Math.abs(finish.width-interview.width),Math.abs(finish.height-interview.height),Math.abs(finish.left-interview.left)];
    });
    expect(sizes.every(delta=>delta<1)).toBe(true);
    await canvas.evaluate(el=>el.parentElement.scrollIntoView({block:'center'}));
    fs.mkdirSync('.impeccable/review',{recursive:true});
    await page.screenshot({path:`.impeccable/review/reporter152-${slug}-${offline?'mobile':'desktop'}.png`});
    expect(await page.evaluate(()=>JSON.stringify(game)===window.beforeReporter151)).toBe(true);
    await page.evaluate(()=>{pendingRaceNews.reports[0].quote=null;showRaceNews(0);});
    await expect(page.locator('blockquote')).toHaveCount(0);
    if (!offline && name==='Sophia Calabrese') {
      await page.evaluate(()=>{
        reporterBitmaps.clear();
        window.createImageBitmap=()=>Promise.reject(new Error('Decoder unavailable'));
        pendingRaceNews.reports[0].quote='The report remains readable.';
        showRaceNews(0);
      });
      await expect(page.locator('blockquote canvas')).toHaveAttribute('aria-label','Interview image unavailable');
      await expect(page.locator('blockquote')).toContainText('The report remains readable.');
    }
    expect(errors).toEqual([]);
  });
}
