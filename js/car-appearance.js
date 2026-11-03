function carAppearance(car={}) {car=car||{};return {stripes:car.stripes!==false,stripeColor:/^#[0-9a-f]{6}$/i.test(car.stripeColor||'')?car.stripeColor:'#f2f3e9',numberColor:/^#[0-9a-f]{6}$/i.test(car.numberColor||'')?car.numberColor:'#f2f3e9'};}

function careerPrimaryLogoId(){return (game?.sponsorship?.contracts||[]).find(c=>sponsorCompany(c.companyId)?.tier==='primary')?.companyId||null;}
