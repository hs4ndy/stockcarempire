// Career-only partnerships. Private deterministic RNG never consumes racing randomness.
function freshSponsorship() {
  let seed=2166136261;for(const c of game.teamName+game.driverName)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  return {version:1,series:game.currentSeries,contracts:[],offers:[],milestones:[],recent:[],processed:[],weekend:0,sequence:0,seed,totalEarned:0,completed:0,podiums:0,hasDebuted:false,notice:false};
}
function sponsorRandom() {const s=game.sponsorship;s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function sponsorCompany(id) {return SPONSOR_CATALOG.find(c=>c.id===id);}
function sponsorshipCapacity() {return SPONSOR_CAPACITY[game.currentSeries];}
function sponsorIncome() {return (game.sponsorship?.contracts||[]).reduce((n,c)=>n+c.pay,0);}
function sponsorUnread() {return (game?.sponsorship?.offers||[]).filter(o=>!o.read).length;}
function directorApproachBonus() {return Math.max(0,...(game.staff||[]).filter(s=>s.typeId==='commercial_director').map(s=>staffEffects(s).approachBonus||0));}
function convertSponsorDirectors() {
  for(const s of game.staff||[])if(s.typeId==='commercial_director') {
    const c=STAFF_CANDIDATES.find(c=>c.id===s.candidateId)||STAFF_CANDIDATES.find(c=>c.typeId===s.typeId&&c.overall===79);
    s.effects={...c.effects};
  }
}
function addSponsorOffer(company,reason,guaranteed=false) {
  const s=game.sponsorship;
  if(!company||!sponsorshipCapacity()[company.tier]||s.contracts.some(c=>c.companyId===company.id)||s.offers.some(o=>o.companyId===company.id))return false;
  const factor=1+staffTotal('sponsorBonus'),rate=company.tier==='primary'?.5:.25;
  const pay=Math.round(company.pay*factor),bonus=Math.round(company.pay*rate*factor);
  s.offers.push({id:'offer'+(++s.sequence),companyId:company.id,pay,bonus,endYear:game.season.year+company.seasons-1,expires:s.weekend+3,reason,guaranteed,read:false});
  while(s.offers.length>8){const index=s.offers.findIndex(o=>!o.guaranteed);s.offers.splice(index<0?0:index,1);}
  return true;
}
function sponsorStarters(reason,winning=false,allTiers=true) {
  const companies=SPONSOR_CATALOG.filter(c=>c.series===game.currentSeries);
  addSponsorOffer(companies.find(c=>c.tier==='primary'&&(winning?c.winningDebut:c.gate==='A')),reason,true);
  if(allTiers)for(const tier of ['secondary','tertiary'])addSponsorOffer(companies.find(c=>c.tier===tier&&c.gate==='A'),reason);
}
function migrateSponsorship() {
  if(game.sponsorship?.version===1)return false;
  game.sponsorship=freshSponsorship();game.sponsorship.hasDebuted=!!game.history?.length||game.season.calendar.some(r=>r.status==='completed');game.sponsorship.podiums=game.season.calendar.filter(r=>r.status==='completed'&&r.playerResult?.position>=1&&r.playerResult.position<=3).length;convertSponsorDirectors();delete game.activeSponsors;
  sponsorStarters('Welcome to the new sponsorship system');game.sponsorship.notice=true;
  return true;
}
function sponsorEligibility(company) {
  const s=game.sponsorship,me=(game.season.standings||[]).find(e=>e.id==='player')||{};
  const calendar=game.season.calendar.filter(r=>r.status==='completed');
  // Only observed player results and recorded standings/history count.
  const recent=s.recent,has=n=>recent.some(p=>p<=n);
  const sorted=getStandings(),rank=sorted.findIndex(e=>e.id==='player')+1;
  const gates={A:calendar.length>0||s.completed>0,B:(me.top10||0)>0||has(10),C:(me.top5||0)>0||has(5),D:(s.podiums||0)>0||has(3),E:(me.wins||0)>0||has(1),F:recent.slice(-5).filter(p=>p<=10).length>=3,G:(me.races||0)>=5&&rank>0&&rank<=5,H:(game.history||[]).some(h=>h.series===SERIES[company.series].name&&h.champion)};
  return company.series===game.currentSeries&&!!gates[company.gate];
}
function expireSponsorOffers() {const s=game.sponsorship;s.offers=s.offers.filter(o=>o.expires>s.weekend);}
function processSponsorWeekend(position,skipped=false) {
  const s=game.sponsorship,key=game.season.year+':'+game.season.raceIndex;
  if(s.processed.includes(key))return 0;
  s.processed.push(key);s.weekend++;expireSponsorOffers();
  if(skipped)return 0;
  const payment=s.contracts.reduce((n,c)=>{const tier=sponsorCompany(c.companyId).tier;return n+c.pay+(position<=(tier==='primary'?1:tier==='secondary'?5:10)?c.bonus:0);},0);
  game.money+=payment;s.totalEarned+=payment;s.lastPayment=payment;
  s.completed++;if(position<=3)s.podiums=(s.podiums||0)+1;s.recent.push(position);if(s.recent.length>5)s.recent.shift();
  const milestoneKeys=[];
  for(const [name,yes]of [['win',position===1],['podium',position<=3],['top5',position<=5],['consistent',s.recent.filter(p=>p<=10).length>=3],['championship',sponsorEligibility({series:game.currentSeries,gate:'G'})]]) {
    if(yes&&(name==='win'||!s.milestones.includes(name))){milestoneKeys.push(name);if(!s.milestones.includes(name))s.milestones.push(name);}
  }
  if(!s.hasDebuted){s.hasDebuted=true;sponsorStarters(position===1?'Winning debut':'Your first completed race',position===1,false);return payment;}
  const milestone=milestoneKeys.length>0;
  if(!milestone&&sponsorRandom()>=.20+directorApproachBonus())return payment;
  let candidates=SPONSOR_CATALOG.filter(c=>sponsorEligibility(c)&&sponsorshipCapacity()[c.tier]&&!s.contracts.some(a=>a.companyId===c.id)&&!s.offers.some(o=>o.companyId===c.id));
  // Empty tiers and improvements receive priority, with independent seeded variation.
  candidates=candidates.map(c=>({c,priority:s.contracts.filter(a=>sponsorCompany(a.companyId).tier===c.tier).length<sponsorshipCapacity()[c.tier]?2:c.pay>Math.min(...s.contracts.filter(a=>sponsorCompany(a.companyId).tier===c.tier).map(a=>sponsorCompany(a.companyId).pay))?1:0,r:sponsorRandom()})).sort((a,b)=>b.priority-a.priority||b.r-a.r);
  for(const {c}of candidates.slice(0,milestone?2:1))addSponsorOffer(c,milestone?'Performance milestone: '+milestoneKeys.join(', '):'A company noticed your team');
  return payment;
}
function rolloverSponsorship(oldSeries) {
  const s=game.sponsorship;
  s.contracts=s.contracts.filter(c=>c.endYear>=game.season.year);s.offers=[];s.milestones=[];s.recent=[];s.completed=0;s.podiums=0;
  if(oldSeries!==game.currentSeries){s.contracts=[];s.series=game.currentSeries;sponsorStarters('New series partnership opportunities');}
  else {
    if(!s.contracts.some(c=>sponsorCompany(c.companyId).tier==='primary'))sponsorStarters('Primary partnership renewal',false,false);
    if(game.history?.at(-1)?.champion)for(const c of SPONSOR_CATALOG.filter(c=>c.series===game.currentSeries&&c.gate==='H')){if(s.offers.length>=2)break;addSponsorOffer(c,'Championship partnership interest');}
  }
}
function acceptSponsorOffer(id,replacementId=null) {
  const s=game.sponsorship,o=s.offers.find(o=>o.id===id);if(!o||o.expires<=s.weekend)return {ok:false,msg:'This offer is no longer available.'};
  const c=sponsorCompany(o.companyId),contracts=s.contracts.filter(a=>sponsorCompany(a.companyId).tier===c.tier);
  if(s.contracts.some(a=>a.companyId===c.id))return {ok:false,msg:'Already partnered.'};
  if(contracts.length>=sponsorshipCapacity()[c.tier]&&!contracts.some(a=>a.id===replacementId))return {ok:false,msg:'Choose the contract to replace.'};
  const before=JSON.stringify(s);
  if(contracts.length>=sponsorshipCapacity()[c.tier])s.contracts=s.contracts.filter(a=>a.id!==replacementId);
  s.contracts.push({...o,id:'contract'+(++s.sequence)});s.offers=s.offers.filter(a=>a.id!==id);
  if(currentSlot!==null&&!saveToSlot(currentSlot)){game.sponsorship=JSON.parse(before);return {ok:false,msg:'Could not save the contract. Please try again.'};}
  return {ok:true};
}
function declineSponsorOffer(id) {const s=game.sponsorship,before=JSON.stringify(s);s.offers=s.offers.filter(o=>o.id!==id);if(currentSlot!==null&&!saveToSlot(currentSlot)){game.sponsorship=JSON.parse(before);return false;}return true;}
