function carAppearance(car={}) {car=car||{};return {stripes:car.stripes!==false,stripeColor:/^#[0-9a-f]{6}$/i.test(car.stripeColor||'')?car.stripeColor:'#f2f3e9',numberColor:/^#[0-9a-f]{6}$/i.test(car.numberColor||'')?car.numberColor:'#f2f3e9'};}

function careerPrimaryLogoId(){return (game?.sponsorship?.contracts||[]).find(c=>sponsorCompany(c.companyId)?.tier==='primary')?.companyId||null;}

function aiCarAppearance(identity){let hash=2166136261;for(const c of String(identity))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;return {stripes:hash%4!==0,stripeColor:['#f2f3e9','#202630','#d4233c','#e0a800','#3498db','#7d5ac7'][hash%6],numberColor:'#f2f3e9'};}
