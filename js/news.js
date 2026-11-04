// Post-race reports are transient. Photos never consume career save storage.
let pendingRaceNews = null;
let raceNewsReader = 0;
const raceNewsLastVariants = new Map();
let raceNewsReporter = -1;

function newsOrdinal(n) {
  const rem=n%100;
  return `${n}${rem>=11 && rem<=13 ? 'th' : ({1:'st',2:'nd',3:'rd'}[n%10] || 'th')}`;
}

function newsEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function createRaceNews(context, random = Math.random) {
  const articles=RACE_NEWS_ARTICLES[context.seriesId]?.[context.position];
  if (!articles) throw new Error('No news article for this series/position.');
  const key=`${context.seriesId}-${context.position}`;
  const last=raceNewsLastVariants.get(key);
  const choices=articles.filter(a=>a.id!==last);
  const article=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
  raceNewsLastVariants.set(key,article.id);
  raceNewsReporter=(raceNewsReporter+1+Math.floor(random()*(RACE_NEWS_REPORTERS.length-1)))%RACE_NEWS_REPORTERS.length;
  const fill=text=>text.replace(/\{(player|track|position)\}/g,(_,name)=>({player:context.playerName,track:context.trackName,position:newsOrdinal(context.position)}[name]));
  const paragraphs=context.dnf ? [
    `${context.playerName} was classified ${newsOrdinal(context.position)} in the ${context.seriesName} at ${context.trackName}, with a DNF recorded. The entry did not finish the race.`,
    'The finishing classification and the retirement tell different parts of the story. The team needs to review the interruption before drawing conclusions about its performance. A stronger next outing starts with understanding what can be improved and preparing the car to return to competition.'
  ] : article.paragraphs.map(fill);
  paragraphs.push(context.standing ?
    `After this race, ${context.playerName} is ${newsOrdinal(context.standing.position)} in the championship standings with ${context.standing.points} points. This event contributed ${context.points} points to that total.` :
    context.career ? 'The Career standings are currently unavailable. The recorded race classification remains the official result.' : 'This was a Quick Race exhibition. The result stands on its own; no Career championship points or finances are affected.');
  return {
    id:article.id, headline:context.dnf ? `${context.playerName} classified ${newsOrdinal(context.position)} after DNF at ${context.trackName}` : fill(article.headline),
    reporter:RACE_NEWS_REPORTERS[raceNewsReporter], paragraphs,
    quote:context.dnf ? 'We need to understand what happened and be ready to go racing again.' : article.quote,
    raceDetail:[context.winner ? `${context.winner} won the race.` : '',
      context.gridPosition ? `${context.playerName} started ${newsOrdinal(context.gridPosition)} and was classified ${newsOrdinal(context.position)}${context.position<context.gridPosition ? `, a net gain of ${context.gridPosition-context.position} places` : context.position>context.gridPosition ? `, ${context.position-context.gridPosition} places behind the starting position` : ', matching the starting position'}.` : ''].filter(Boolean).join(' '),
    playerName:context.playerName,
    closing:context.nextTrack ? `The next scheduled stop is ${context.nextTrack}. For ${context.playerName}, attention now turns to preparing for that event.` : context.standing ? 'The scheduled races for this season are complete. The final standings are available in Career before the team begins its next chapter.' : 'The next challenge is a fresh race, with a new result to earn.',
    position:context.position
  };
}

let lastQuitNewsId = null;
function createQuitRaceNews(context, random = Math.random) {
  const choices = RACE_QUIT_NEWS_ARTICLES.filter(a => a.id !== lastQuitNewsId);
  const article = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  lastQuitNewsId = article.id;
  raceNewsReporter = (raceNewsReporter + 1 + Math.floor(random() * (RACE_NEWS_REPORTERS.length - 1))) % RACE_NEWS_REPORTERS.length;
  const fill = text => text.replace(/\{(player|track|series)\}/g, (_, key) => ({player:context.playerName, track:context.trackName, series:context.seriesName}[key]));
  return {id:article.id, headline:fill(article.headline), reporter:RACE_NEWS_REPORTERS[raceNewsReporter],
    paragraphs:article.paragraphs.map(fill), playerName:context.playerName, position:context.position,
    closing:context.nextTrack ? `The next stop is ${context.nextTrack}. Reaching the finish would be a promising change of approach.` : 'The season schedule is complete. This early exit will remain in the record long after the car has been parked.'};
}

function prepareCareerNews(race, result, photo, simulated=false, quitDNF=false) {
  const series=SERIES[game.currentSeries];
  const standings=getStandings(), index=standings.findIndex(s=>s.id==='player');
  const next=currentRace();
  pendingRaceNews={mode:'career', photo:quitDNF ? null : (photo || null), simulated, suppressPhoto:quitDNF,
    reports:[(quitDNF ? createQuitRaceNews : createRaceNews)({seriesId:series.id,seriesName:series.name,
      playerName:game.driverName,trackName:TRACKS.find(t=>t.id===race.trackId)?.name || 'the circuit',career:true,
      winner:photo?.leaderName,gridPosition:photo?.grid?.player,
      position:result.position,dnf:result.dnf,points:result.points,
      standing:index<0 ? null : {position:index+1,points:standings[index].points},
      nextTrack:next ? TRACKS.find(t=>t.id===next.trackId)?.name : null})]};
}

function showRaceNews(reader=0) {
  if (!pendingRaceNews?.reports.length) { finishRaceNews(); return; }
  raceNewsReader=Math.min(reader,pendingRaceNews.reports.length-1);
  document.getElementById('results-modal')?.remove();
  document.getElementById('race-news-modal')?.remove();
  showScreen(pendingRaceNews.mode==='career' ? 'game' : 'intro');
  document.querySelectorAll('.screen').forEach(s=>s.inert=true);
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay" id="race-news-modal" role="dialog" aria-modal="true" aria-labelledby="news-modal-title"><div class="modal modal-wide race-news-modal"><div class="modal-header"><h3 id="news-modal-title">Race News</h3></div><div class="modal-body" id="race-news-content">${renderRaceNews(pendingRaceNews,raceNewsReader)}</div><div class="modal-footer"><button class="btn btn-primary" id="btn-close-news" onclick="finishRaceNews()">${pendingRaceNews.mode==='career' ? 'Continue to Career' : 'Back to Menu'}</button></div></div></div>`);
  document.getElementById('race-news-modal').onkeydown=e=>{
    if(e.key!=='Tab') return;
    const buttons=[...e.currentTarget.querySelectorAll('button')],first=buttons[0],last=buttons[buttons.length-1];
    if(e.shiftKey && (document.activeElement===first || document.activeElement.id==='news-headline')) {e.preventDefault();last.focus();}
    else if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first.focus();}
  };
  document.getElementById('news-headline')?.focus({preventScroll:true});
}

function renderRaceNews(news,reader) {
  const report=news.reports[reader], esc=newsEscape;
  const photo=news.photo;
  const image=news.suppressPhoto ? '' : photo?.dataUrl?.startsWith('data:image/jpeg;base64,') ? `<figure class="race-news-photo">
    <img src="${esc(photo.dataUrl)}" width="1024" height="576" alt="Trackside photograph of ${esc(photo.leaderName)} crossing the finish line.">
    <figcaption>${esc(photo.leaderName==='YOU' ? 'Player' : photo.leaderName.replace('PLAYER','Player'))} takes the checkered flag. Photo by Gavin Turnage</figcaption>
  </figure>` : `<div class="race-news-no-photo"><strong>Finish photo unavailable</strong><p>${news.simulated ? 'This race was simulated, so no trackside photograph was captured.' : 'A finish-line photograph could not be captured for this race.'}</p></div>`;
  return `
    ${news.reports.length>1 ? `<div class="race-news-readers" role="group" aria-label="Player report">${news.reports.map((r,i)=>`<button class="btn btn-secondary" aria-pressed="${i===reader}" onclick="showRaceNews(${i})">${esc(r.playerName)}</button>`).join('')}</div>` : ''}
    <article class="race-news-article" aria-labelledby="news-headline">
      <h2 id="news-headline" tabindex="-1">${esc(report.headline)}</h2>
      <p class="race-news-byline">By ${esc(report.reporter)}</p>
      ${image}
      <div class="race-news-copy">
        <p class="race-news-lead">${esc(report.paragraphs[0])}</p>
        <p>${esc(report.paragraphs[1])}</p>
        ${report.raceDetail ? `<p>${esc(report.raceDetail)}</p>` : ''}
        ${report.quote ? `<blockquote><p>“${esc(report.quote)}”</p><cite>${esc(report.playerName)}</cite></blockquote>` : ''}
        <p>${esc(report.paragraphs[2])}</p><p>${esc(report.closing)}</p>
      </div>
    </article>`;
}

function finishRaceNews() {
  const mode=pendingRaceNews?.mode || 'career';
  pendingRaceNews=null;
  document.getElementById('race-news-modal')?.remove();
  document.querySelectorAll('.screen').forEach(s=>s.inert=false);
  if(mode==='quick' || !game) { showScreen('intro'); document.getElementById('btn-quick-race')?.focus(); return; }
  showScreen('game'); updateHeader(); renderTab('dashboard');
  reportLoanNotes(); if(!showRetirementNotice()) checkSaveReminder();
  document.getElementById('btn-hdr-menu')?.focus();
}

function showCareerMilestoneNews(kind,data){
 document.getElementById('career-milestone-news')?.remove();const retirement=kind==='retirement',esc=newsEscape;
 const name=retirement?data.driverName:data.driver,reporter=RACE_NEWS_REPORTERS[(retirement?data.seasons:data.year)%RACE_NEWS_REPORTERS.length];
 const headline=retirement?`${name} closes a chapter in racing`:`${name} finishes ${data.playerPos}${ordinal(data.playerPos)} in the ${data.seriesName}`;
 const paragraphs=retirement?[`${name} has retired from ${data.teamName}, ending a career with ${data.wins} wins and ${data.titles} championships.`,`${data.seasons} completed seasons are preserved in the Hall of Fame. The final campaign was Year ${data.year} in the ${data.series}.`,`${data.season.races} starts and ${data.season.points} points were recorded in the final season. Vehicle records and the career recap can be revisited in the Hall of Fame.`]:[`${name} completed Year ${data.year} in the ${data.seriesName}, finishing ${data.playerPos}${ordinal(data.playerPos)} in the championship with ${data.wins} wins.`,data.message,`The season is now part of the career record. Preparation begins for the next campaign, with sponsorship offers and vehicle condition among the team's decisions.`];
 document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay" id="career-milestone-news" role="dialog" aria-modal="true" aria-labelledby="milestone-headline"><div class="modal modal-wide race-news-modal"><div class="modal-header"><h3>${retirement?'Retirement News':'Season News'}</h3></div><div class="modal-body"><article class="race-news-article"><h2 id="milestone-headline" tabindex="-1">${esc(headline)}</h2><p class="race-news-byline">By ${esc(reporter)}</p><div class="race-news-copy">${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div></article></div><div class="modal-footer"><button class="btn btn-primary" onclick="closeCareerMilestoneNews('${kind}')">${retirement?'Continue to Hall of Fame':'Continue to Career'}</button></div></div></div>`);document.getElementById('milestone-headline').focus();
}
function closeCareerMilestoneNews(kind){document.getElementById('career-milestone-news')?.remove();if(kind==='retirement')showHallOfFame();else if(game){delete game.pendingSeasonNews;saveGame();showTab('dashboard');}}
