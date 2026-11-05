const test=require('node:test'),assert=require('node:assert/strict'),vm=require('vm');const {entries}=require('./helpers/race-sources.cjs');function ctx(){const c=vm.createContext({console,localStorage:{getItem(){return null},setItem(){},removeItem(){}}});for(const [f,s]of entries(['js/data.js','js/game.js']))vm.runInContext(s,c);return c;}
test('Premier retains every non-relegated identity and strength across rollover',()=>{assert.equal(vm.runInContext(`(()=>{newGame('T','D','C');game.currentSeries=2;game.season.aiTeams=generateAITeams(2);rebuildStandings();const cars=game.season.aiTeams.flatMap(t=>t.cars);const parker=cars.find(c=>c.driverName==='Parker Holt');parker.power=.98;game.season.standings.forEach((e,i)=>e.points=1000-i);game.season.standings.find(e=>e.id===parker.id).points=9999;const before=cars.map(c=>({...c})),removed=new Set(getStandings().slice(-3).map(c=>c.id));endSeason();const after=game.season.aiTeams.flatMap(t=>t.cars);return after.length===39&&before.filter(c=>!removed.has(c.id)).every(c=>after.some(a=>a.id===c.id&&a.driverName===c.driverName&&a.power===c.power))&&after.find(c=>c.driverName==='Parker Holt').power===.98&&after.every(c=>!removed.has(c.id));})()`,ctx()),true);});
test('AI cosmetics vary deterministically without gameplay random calls',()=>{assert.equal(vm.runInContext(`(()=>{const a=Array.from({length:50},(_,i)=>aiCarAppearance('driver'+i));return a.some(c=>!c.stripes)&&new Set(a.map(c=>c.stripeColor)).size>=4&&JSON.stringify(aiCarAppearance('Parker'))===JSON.stringify(aiCarAppearance('Parker'));})()`,ctx()),true);});

test('championship venues pin only the upcoming Challenger and Premier finales', () => {
  const c = ctx();
  assert.equal(vm.runInContext(`(() => {
    const calendars = SERIES.map((_, series) => generateCalendar(series));
    const grassroots = JSON.stringify(calendars[0]);
    setChampionshipVenue(calendars[0], 0);
    if (JSON.stringify(calendars[0]) !== grassroots) return false;
    const expected = ['Oasis Speedway', 'Southwest Florida Speedway'];
    return [1, 2].every(series => {
      const calendar = calendars[series], last = calendar.at(-1);
      if (last.raceNum !== (series === 1 ? 26 : 36) || last.trackName !== expected[series - 1]) return false;
      if (calendar.slice(0, -1).some(race => TRACKS.find(t => t.id === race.trackId).finaleOnly)) return false;
      const past = {...calendar[0], raceNum:last.raceNum, status:'completed'};
      calendar[calendar.length - 1] = past;
      setChampionshipVenue(calendar, series);
      if (past.trackName === expected[series - 1]) return false;
      past.status = 'upcoming';
      setChampionshipVenue(calendar, series);
      return past.trackName === expected[series - 1] && TRACKS.find(t => t.id === past.trackId).name === past.trackName;
    });
  })()`, c), true);
});
