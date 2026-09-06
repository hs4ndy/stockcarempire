// ============================================================
// STOCK CAR EMPIRE - Game Data Constants
// ============================================================

const SERIES = [
  {
    id: 'grassroots',
    name: 'Grassroots Cup',
    shortName: 'GRC',
    level: 0,
    racesPerSeason: 18,
    carClass: 'stock',
    entryFee: 500,
    prize: [5000,3500,2500,2000,1800,1600,1400,1200,1100,1000,900,800,700,600,500,400,300,200,150,100],
    points: [40,35,31,28,25,22,20,18,16,14,12,10,8,6,4,3,2,1,0,0],
    promotionSpots: 3,
    relegationSpots: 0,
    fieldSize: 20,
    color: '#3fb950',
    description: 'Entry-level racing on small ovals and short tracks.'
  },
  {
    id: 'challenger',
    name: 'Challenger Series',
    shortName: 'CS',
    level: 1,
    racesPerSeason: 26,
    carClass: 'modified',
    entryFee: 2500,
    prize: [25000,18000,14000,11000,9000,8000,7000,6000,5500,5000,4500,4000,3500,3000,2500,2000,1500,1000,750,500,400,300,250,200,150,100],
    points: [50,45,41,38,35,32,30,28,26,24,22,20,18,16,14,12,10,8,6,4,3,2,1,0,0,0],
    promotionSpots: 3,
    relegationSpots: 3,
    fieldSize: 26,
    color: '#58a6ff',
    description: 'Mid-level series with bigger tracks and higher stakes.'
  },
  {
    id: 'premier',
    name: 'Premier Cup Series',
    shortName: 'PCS',
    level: 2,
    racesPerSeason: 36,
    carClass: 'premier',
    entryFee: 12000,
    prize: [200000,150000,120000,100000,85000,75000,65000,55000,50000,45000,40000,36000,32000,28000,25000,22000,20000,18000,16000,14000,12000,10000,8000,6000,4000,3000,2000,1500,1000,750,600,500,400,300,200,100],
    points: [60,55,51,48,45,42,40,38,36,34,32,30,28,26,24,22,20,18,16,14,12,10,8,6,4,3,2,1,0,0,0,0,0,0,0,0],
    promotionSpots: 0,
    relegationSpots: 3,
    fieldSize: 36,
    color: '#e3b341',
    description: 'The pinnacle of stock car racing. The biggest stages, biggest money.'
  }
];

const TRACKS = [
  // Entry series tracks
  { id: 't01', name: 'Thunder Creek Speedway',   type: 'short_oval',    length: 0.5,  series: [0,1],   speedW: 0.7, handW: 1.3, laps: 200 },
  { id: 't02', name: 'Pinewood Raceway',          type: 'short_oval',    length: 0.75, series: [0,1],   speedW: 0.8, handW: 1.2, laps: 160 },
  { id: 't03', name: 'Blue Ridge Circuit',        type: 'road_course',   length: 1.8,  series: [0,1,2], speedW: 0.8, handW: 1.2, laps: 65  },
  { id: 't04', name: 'Lakeside Speedway',         type: 'intermediate',  length: 1.5,  series: [0,1,2], speedW: 1.0, handW: 1.0, laps: 200 },
  { id: 't05', name: 'Capital Motor Speedway',    type: 'intermediate',  length: 1.0,  series: [0,1],   speedW: 0.95,handW: 1.05,laps: 250 },
  { id: 't06', name: 'Riverside Short Track',     type: 'short_oval',    length: 0.5,  series: [0],     speedW: 0.7, handW: 1.3, laps: 200 },
  { id: 't07', name: 'Dusty Creek Speedway',      type: 'short_oval',    length: 0.625,series: [0,1],   speedW: 0.75,handW: 1.25,laps: 180 },
  { id: 't08', name: 'Valley Fairgrounds Oval',   type: 'short_oval',    length: 0.4,  series: [0],     speedW: 0.65,handW: 1.35,laps: 250 },
  // Challenger & Premier tracks
  { id: 't09', name: 'Southland Motor Speedway',  type: 'intermediate',  length: 1.5,  series: [1,2],   speedW: 1.0, handW: 1.0, laps: 200 },
  { id: 't10', name: 'Gateway International',     type: 'intermediate',  length: 2.0,  series: [1,2],   speedW: 1.1, handW: 0.95,laps: 160 },
  { id: 't11', name: 'Coastal Road Circuit',      type: 'road_course',   length: 2.4,  series: [1,2],   speedW: 0.85,handW: 1.2, laps: 60  },
  { id: 't12', name: 'Midwest Speedway',          type: 'intermediate',  length: 1.5,  series: [1,2],   speedW: 1.0, handW: 1.0, laps: 200 },
  { id: 't13', name: 'Heritage Raceway',          type: 'intermediate',  length: 1.33, series: [1,2],   speedW: 0.97,handW: 1.03,laps: 220 },
  { id: 't14', name: 'Mountainview Speedway',     type: 'intermediate',  length: 1.5,  series: [1,2],   speedW: 1.0, handW: 1.0, laps: 200 },
  // Premier only
  { id: 't15', name: 'Eagle Superspeedway',       type: 'superspeedway', length: 2.5,  series: [2],     speedW: 1.35,handW: 0.75,laps: 200 },
  { id: 't16', name: 'National Motor Speedway',   type: 'superspeedway', length: 2.66, series: [2],     speedW: 1.4, handW: 0.7, laps: 188 },
  { id: 't17', name: 'Grand Prix Circuit',        type: 'road_course',   length: 3.0,  series: [2],     speedW: 0.8, handW: 1.3, laps: 55  },
  { id: 't18', name: 'Premier Oval Classic',      type: 'intermediate',  length: 1.5,  series: [2],     speedW: 1.0, handW: 1.0, laps: 200 },
  { id: 't19', name: 'Diamond State Speedway',    type: 'intermediate',  length: 1.0,  series: [2],     speedW: 0.95,handW: 1.05,laps: 300 },
  { id: 't20', name: 'Sunset Superspeedway',      type: 'superspeedway', length: 2.5,  series: [2],     speedW: 1.35,handW: 0.75,laps: 200 },
];

// ─── Upgrades ────────────────────────────────────────────────
// Three tiers, and you may fit at most MAX_PER_TIER parts from each one.
// A tier only opens once the tier below it is full, so every purchase is a
// real choice instead of a checklist you eventually buy out.
const MAX_PER_TIER = 3;

const UPGRADE_TIERS = [
  { tier: 1, name: 'Foundation',  blurb: 'Bolt-on basics. Cheap gains to get the car competitive.' },
  { tier: 2, name: 'Performance', blurb: 'Serious hardware. Bigger gains, bigger invoices.' },
  { tier: 3, name: 'Elite',       blurb: 'Factory-level programmes reserved for front-running teams.' },
];

// base = price for the entry-level Stock Car; higher classes scale it up.
// Five options per tier but only three slots (more with a Data Analyst), so
// there is always something left on the table.
const UPGRADE_POOL = [
  // Tier 1
  { id: 'engine_tune', tier: 1, name: 'Engine Tune',         base: 3500, effect: { speed: 8 } },
  { id: 'susp_kit',    tier: 1, name: 'Suspension Kit',       base: 2800, effect: { handling: 9 } },
  { id: 'rel_package', tier: 1, name: 'Reliability Package',  base: 2200, effect: { reliability: 12 } },
  { id: 'race_brakes', tier: 1, name: 'Racing Brakes',        base: 3200, effect: { handling: 7, reliability: 5 } },
  { id: 'ballast_kit', tier: 1, name: 'Ballast Kit',          base: 2600, effect: { handling: 6, speed: 3 } },
  // Tier 2
  { id: 'perf_engine', tier: 2, name: 'Performance Engine',   base: 9500, effect: { speed: 14 } },
  { id: 'aero_pkg',    tier: 2, name: 'Aero Package',         base: 6800, effect: { speed: 5, handling: 6 } },
  { id: 'data_sys',    tier: 2, name: 'Data Analytics',       base: 7400, effect: { speed: 4, handling: 4, reliability: 4 } },
  { id: 'gearbox',     tier: 2, name: 'Close-Ratio Gearbox',  base: 6200, effect: { speed: 7, handling: 3 } },
  { id: 'cooling_pkg', tier: 2, name: 'Cooling Package',      base: 5800, effect: { reliability: 9, speed: 3 } },
  // Tier 3
  { id: 'wind_tunnel', tier: 3, name: 'Wind Tunnel Program',  base: 16000, effect: { speed: 9, handling: 6 } },
  { id: 'chassis_jig', tier: 3, name: 'Chassis Jig',          base: 14000, effect: { handling: 11, reliability: 4 } },
  { id: 'sim_program', tier: 3, name: 'Simulator Program',    base: 15000, effect: { speed: 6, handling: 6, reliability: 5 } },
  { id: 'pit_package', tier: 3, name: 'Pit Crew Package',     base: 12000, effect: { reliability: 14 } },
  { id: 'shaker_rig',  tier: 3, name: 'Seven-Post Rig',       base: 17000, effect: { handling: 8, speed: 5, reliability: 3 } },
];

function buildUpgrades(mult) {
  return UPGRADE_POOL.map(u => ({
    id: u.id, tier: u.tier, name: u.name, effect: u.effect,
    cost: Math.round(u.base * mult / 100) * 100,
  }));
}

// How many parts from a given tier are fitted to this car
function tierInstalled(car, tier, cls) {
  const list = (cls || CAR_CLASSES[car.classId]).upgrades;
  return (car.appliedUpgrades || []).filter(id => {
    const u = list.find(x => x.id === id);
    return u && u.tier === tier;
  }).length;
}

// A tier is available once the one below it has its base three parts fitted.
// Analyst slots are a bonus on top, so hiring one never re-locks a later tier.
function tierUnlocked(car, tier, cls) {
  if (tier <= 1) return true;
  return tierInstalled(car, tier - 1, cls) >= MAX_PER_TIER;
}

const CAR_CLASSES = {
  stock: {
    name: 'Stock Car',
    description: 'Entry-level cars for the Grassroots Cup',
    buyCost: 18000,
    sellValue: 9000,
    repairCostPerPoint: 80,
    baseStats: { speed: 42, handling: 45, reliability: 58 },
    upgrades: buildUpgrades(1)
  },
  modified: {
    name: 'Modified Car',
    description: 'Higher-spec cars for the Challenger Series',
    buyCost: 70000,
    sellValue: 35000,
    repairCostPerPoint: 300,
    baseStats: { speed: 62, handling: 62, reliability: 58 },
    upgrades: buildUpgrades(3.4)
  },
  premier: {
    name: 'Premier Car',
    description: 'Top-of-the-line cars for the Premier Cup Series',
    buyCost: 380000,
    sellValue: 190000,
    repairCostPerPoint: 1500,
    baseStats: { speed: 80, handling: 80, reliability: 65 },
    upgrades: buildUpgrades(15)
  }
};

const STAFF_TYPES = [
  {
    id: 'crew_chief',
    name: 'Crew Chief',
    description: 'Improves race strategy and pit stop timing. Adds a position bonus on race day.',
    weeklyCost: [1800, 3500, 7000],
    bonus: 'Earns +1 to +3 positions in race results',
    max: 1
  },
  {
    id: 'engineer',
    name: 'Race Engineer',
    description: 'Optimizes car setup between races. Adds flat speed/handling to your best car.',
    weeklyCost: [1400, 2800, 5500],
    bonus: '+4 effective speed/handling on assigned car',
    max: 2
  },
  {
    id: 'mechanic',
    name: 'Senior Mechanic',
    description: 'Reduces car repair costs and improves reliability.',
    weeklyCost: [900, 1800, 3600],
    bonus: '25% discount on all repair costs',
    max: 3
  },
  {
    id: 'data_analyst',
    name: 'Data Analyst',
    description: 'Pores over practice data to find the quick way round, and identifies extra parts your crew can fit.',
    weeklyCost: [1600, 3200, 6400],
    bonus: 'Stronger qualifying, plus one extra upgrade slot per tier',
    max: 2
  },
  {
    id: 'commercial_director',
    name: 'Commercial Director',
    description: 'Works the paddock and the boardroom, opening room on the car for more backers than you could land alone.',
    weeklyCost: [2200, 4400, 8800],
    bonus: '+2 sponsor slots each (up to 7 deals in total)',
    max: 2
  }
];

// ── Commercial Director effects ─────────────────────────────
const BASE_SPONSOR_SLOTS = 3;
const SLOTS_PER_DIRECTOR = 2;
const MAX_SPONSOR_SLOTS  = 7;

function commercialDirectorCount() {
  return (typeof game !== 'undefined' && game && game.staff)
    ? game.staff.filter(s => s.typeId === 'commercial_director').length
    : 0;
}

// How many sponsor deals you may run at once
function sponsorSlots() {
  return Math.min(
    MAX_SPONSOR_SLOTS,
    BASE_SPONSOR_SLOTS + commercialDirectorCount() * SLOTS_PER_DIRECTOR
  );
}

// ── Data Analyst effects ────────────────────────────────────
// Each analyst sharpens qualifying and opens another slot in every upgrade
// tier, so a well-staffed team can fit more parts than a bare-bones one.
const ANALYST_QUALI_BONUS = 7;   // qualifying score per analyst
const ANALYST_TIER_SLOTS  = 1;   // extra parts allowed per tier, per analyst

function analystCount() {
  return (typeof game !== 'undefined' && game && game.staff)
    ? game.staff.filter(s => s.typeId === 'data_analyst').length
    : 0;
}

// Upgrade slots available per tier, including anything the analysts unlock
function tierCapacity() {
  return MAX_PER_TIER + analystCount() * ANALYST_TIER_SLOTS;
}

const HIREABLE_DRIVERS = [
  { id: 'drv01', name: 'Jake Rivers',              skill: 72, aggression: 65, morale: 80, weeklyCost: 3500 },
  { id: 'drv02', name: 'Maria Santos',             skill: 68, aggression: 50, morale: 85, weeklyCost: 2900 },
  { id: 'drv03', name: 'Bobby "Flash" Thompson',   skill: 65, aggression: 82, morale: 70, weeklyCost: 2500 },
  { id: 'drv04', name: 'Tommy Keane',              skill: 54, aggression: 58, morale: 90, weeklyCost: 1600 },
  { id: 'drv05', name: 'Sandra Lee',               skill: 76, aggression: 48, morale: 88, weeklyCost: 4500 },
  { id: 'drv06', name: 'Dave "Rocket" Morrison',   skill: 70, aggression: 78, morale: 72, weeklyCost: 3200 },
  { id: 'drv07', name: 'Cal Johnson',              skill: 61, aggression: 55, morale: 82, weeklyCost: 2100 },
  { id: 'drv08', name: 'Rico Valdez',              skill: 81, aggression: 68, morale: 75, weeklyCost: 5500 },
  { id: 'drv09', name: 'Tina Park',               skill: 56, aggression: 42, morale: 95, weeklyCost: 1500 },
  { id: 'drv10', name: 'Frank "Bull" Dawson',      skill: 64, aggression: 90, morale: 65, weeklyCost: 2600 },
  { id: 'drv11', name: 'Lisa Chen',               skill: 74, aggression: 58, morale: 85, weeklyCost: 4000 },
  { id: 'drv12', name: 'Steve Hartley',            skill: 59, aggression: 62, morale: 78, weeklyCost: 2000 },
  { id: 'drv13', name: 'Anita Ramos',              skill: 78, aggression: 55, morale: 82, weeklyCost: 4800 },
  { id: 'drv14', name: 'Derek "Ice" Simmons',      skill: 83, aggression: 44, morale: 80, weeklyCost: 6000 },
  { id: 'drv15', name: 'Pat O\'Brien',             skill: 63, aggression: 70, morale: 75, weeklyCost: 2400 },
];

const AI_TEAM_TEMPLATES = [
  { name: 'Apex Motorsports',        color: '#e74c3c', aggression: 0.70, basePower: 0.60 },
  { name: 'Blue Thunder Racing',     color: '#3498db', aggression: 0.60, basePower: 0.55 },
  { name: 'Green Machine Racing',    color: '#2ecc71', aggression: 0.50, basePower: 0.48 },
  { name: 'Golden Eagle Motors',     color: '#f39c12', aggression: 0.65, basePower: 0.58 },
  { name: 'Black Diamond Racing',    color: '#9b59b6', aggression: 0.75, basePower: 0.62 },
  { name: 'Ironclad Racing',         color: '#95a5a6', aggression: 0.55, basePower: 0.50 },
  { name: 'Sunrise Motorsports',     color: '#e67e22', aggression: 0.60, basePower: 0.52 },
  { name: 'Coastal Speed Team',      color: '#1abc9c', aggression: 0.50, basePower: 0.46 },
  { name: 'Mountain Peak Racing',    color: '#d35400', aggression: 0.70, basePower: 0.56 },
  { name: 'Valley Speedworks',       color: '#8e44ad', aggression: 0.65, basePower: 0.54 },
  { name: 'Frontier Racing',         color: '#c0392b', aggression: 0.68, basePower: 0.57 },
  { name: 'Liberty Motorsports',     color: '#2980b9', aggression: 0.55, basePower: 0.49 },
  { name: 'Thunder Road Racing',     color: '#27ae60', aggression: 0.72, basePower: 0.61 },
  { name: 'Highline Racing Co.',     color: '#f1c40f', aggression: 0.60, basePower: 0.53 },
  { name: 'Redline Performance',     color: '#e8001d', aggression: 0.78, basePower: 0.63 },
  { name: 'Pacific Speed Lab',       color: '#16a085', aggression: 0.52, basePower: 0.47 },
  { name: 'Heartland Motorsports',   color: '#7f8c8d', aggression: 0.58, basePower: 0.51 },
  { name: 'Summit Racing Group',     color: '#d4ac0d', aggression: 0.62, basePower: 0.55 },
  { name: 'Vortex Speed Co.',        color: '#a569bd', aggression: 0.66, basePower: 0.56 },
  { name: 'Cardinal Racing',         color: '#cb4335', aggression: 0.64, basePower: 0.54 },
  { name: 'Nighthawk Motorsports',   color: '#1f618d', aggression: 0.69, basePower: 0.59 },
  { name: 'Desert Sun Racing',       color: '#d68910', aggression: 0.57, basePower: 0.50 },
  { name: 'Platinum Speed Works',    color: '#839192', aggression: 0.61, basePower: 0.53 },
  { name: 'Crimson Tide Racing',     color: '#922b21', aggression: 0.74, basePower: 0.60 },
  { name: 'Northern Star Racing',    color: '#154360', aggression: 0.53, basePower: 0.48 },
  { name: 'Lone Star Motorsports',   color: '#b7950b', aggression: 0.67, basePower: 0.57 },
  { name: 'Storm Chaser Racing',     color: '#4a235a', aggression: 0.71, basePower: 0.58 },
  { name: 'Pacific Crest Racing',    color: '#0e6655', aggression: 0.56, basePower: 0.49 },
  { name: 'Iron Horse Racing',       color: '#784212', aggression: 0.73, basePower: 0.61 },
  { name: 'Wildfire Motorsports',    color: '#ca6f1e', aggression: 0.76, basePower: 0.62 },
  { name: 'Silver Bullet Racing',    color: '#616a6b', aggression: 0.59, basePower: 0.52 },
  { name: 'Thunderbolt Speed Co.',   color: '#1a5276', aggression: 0.63, basePower: 0.55 },
  { name: 'Gold Rush Racing',        color: '#9a7d0a', aggression: 0.68, basePower: 0.58 },
  { name: 'Dark Horse Motorsports',  color: '#2e4057', aggression: 0.72, basePower: 0.60 },
  { name: 'Eagle Eye Racing',        color: '#1e8449', aggression: 0.55, basePower: 0.50 },
];

const AI_DRIVER_NAMES = [
  'Alex Turner','Ryan Walsh','Chris Morales','Jordan Blake','Casey Quinn',
  'Taylor Frost','Morgan Hill','Drew Saunders','Quinn Barrett','Sam Kowalski',
  'Riley Cross','Austin Ward','Peyton Hayes','Cameron Knox','Jesse Briggs',
  'Avery Stone','Parker Holt','Logan Dean','Spencer Fox','Hunter Nash',
  'Dylan Carr','Reece Manning','Bryce Lawson','Cole Harmon','Tanner Boyd',
  'Wade Price','Grant Murphy','Cody Fisher','Seth Ellis','Trey Shaw',
  'Brady Grant','Evan Pierce','Zack Powell','Nate Gray','Troy Bell',
  'Lance Dunn','Kyle Steele','Dale Sutton','Rex Chambers','Ray Norris',
];

// ─── Difficulty ──────────────────────────────────────────────
// Beginner is the original balance: hook onto a team-mate and the win looks
// after itself. Each step up makes the AI quicker on track, stronger in the
// simulation and less willing to let you cruise in the draft.
const DIFFICULTIES = [
  { id: 'beginner', name: 'Beginner',
    blurb: 'Relaxed. Draft a team-mate and the win takes care of itself.',
    aiSpeed: 1.00, aiPower: 1.00, aiAggro: 1.00, playerDraft: 1.00, racecraft: 0 },
  { id: 'amateur',  name: 'Amateur',
    blurb: 'The field keeps you honest. You have to work the draft.',
    aiSpeed: 1.035, aiPower: 1.06, aiAggro: 1.12, playerDraft: 0.94, racecraft: 0.30 },
  { id: 'semipro',  name: 'Semi-Pro',
    blurb: 'Racers who use the draft to recover and defend their line.',
    aiSpeed: 1.065, aiPower: 1.12, aiAggro: 1.22, playerDraft: 0.88, racecraft: 0.65 },
  { id: 'pro',      name: 'Pro',
    blurb: 'Everyone is fast, works the tow and holds their ground.',
    aiSpeed: 1.09,  aiPower: 1.18, aiAggro: 1.30, playerDraft: 0.82, racecraft: 1.00 },
];

const DEFAULT_DIFFICULTY = 'beginner';

function difficultyById(id) {
  return DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[0];
}

// ─── Team size limits ────────────────────────────────────────
// A four-car operation is the biggest anyone fields.
const MAX_TEAM_CARS    = 4;
const MAX_HIRED_DRIVERS = 4;

// ─── Charity ─────────────────────────────────────────────────
// Giving back buys goodwill. Cost scales with the series you race in, the
// reputation gained tapers as you become well known, and you can only give
// once per race weekend so it cannot simply be bought to the top.
const CHARITY_CAUSES = [
  { id: 'ch_local',    name: 'Local Youth Racing Fund',
    blurb: 'Karting seats for kids who could never afford one.',
    mult: 0.35, rep: 3 },
  { id: 'ch_safety',   name: 'Driver Safety Foundation',
    blurb: 'Research into barriers, belts and better seats.',
    mult: 0.9,  rep: 6 },
  { id: 'ch_hospital', name: "Children's Hospital Appeal",
    blurb: 'The cause every driver in the garage puts their name to.',
    mult: 2.0,  rep: 11 },
];

function charityCost(cause, seriesLevel) {
  const series = SERIES[seriesLevel] || SERIES[0];
  return Math.round(series.prize[0] * cause.mult / 100) * 100;
}

// Reputation gained tapers hard as you approach the top
function charityRepGain(cause, currentRep) {
  const headroom = clamp((100 - currentRep) / 100, 0, 1);
  return Math.round(cause.rep * (0.25 + 0.75 * headroom) * 10) / 10;
}

// ─── Bank ────────────────────────────────────────────────────
// Borrow now, repay within `term` races. Miss the deadline and the balance
// starts compounding at LATE_RATE every race until it is cleared.
const LOAN_LATE_RATE = 0.09;   // per race, applied only after the term expires

const LOAN_OFFERS = [
  { id: 'ln_short', name: 'Short-Term Note', term: 4,  rate: 0.08, mult: 0.6,
    blurb: 'Small and quick. Cheapest interest, tightest deadline.' },
  { id: 'ln_std',   name: 'Standard Loan',   term: 8,  rate: 0.15, mult: 1.0,
    blurb: 'The usual deal. Reasonable size, reasonable window.' },
  { id: 'ln_long',  name: 'Long-Term Credit',term: 14, rate: 0.26, mult: 1.6,
    blurb: 'Biggest cheque and the most breathing room - you pay for both.' },
];

// Base borrowing power per series; reputation scales it up
const LOAN_BASE = [40000, 180000, 700000];

const SPONSOR_DEALS = [
  { id: 'sp01', name: 'QuickLube Oil',        weekly: 400,   bonus: 150,  cond: 'top10', level: 0 },
  { id: 'sp02', name: "Buster's Auto Parts",  weekly: 800,   bonus: 500,  cond: 'top5',  level: 0 },
  { id: 'sp03', name: 'Frontier Fuel Co.',    weekly: 650,   bonus: 900,  cond: 'win',   level: 0 },
  { id: 'sp04', name: 'National Tire Co.',    weekly: 2500,  bonus: 1800, cond: 'top5',  level: 1 },
  { id: 'sp05', name: 'Velocity Motors',      weekly: 4000,  bonus: 2500, cond: 'top3',  level: 1 },
  { id: 'sp06', name: 'Eagle Energy Drinks',  weekly: 3200,  bonus: 4500, cond: 'win',   level: 1 },
  { id: 'sp07', name: 'Premier Auto Insure',  weekly: 14000, bonus: 9000, cond: 'top5',  level: 2 },
  { id: 'sp08', name: 'National Bank Corp.',  weekly: 22000, bonus: 13000,cond: 'top3',  level: 2 },
  { id: 'sp09', name: 'Apex Racing Parts',    weekly: 18000, bonus: 28000,cond: 'win',   level: 2 },
];

const RACE_EVENTS = {
  caution: [
    'Yellow flag! Debris on the backstretch.',
    'Caution is out! Spin in turn 3.',
    'Yellow flag for a multi-car incident.',
    'Caution period - oil on the track.',
    'Full course yellow for a stalled car.',
  ],
  leadChange: [
    '{car} takes the lead on lap {lap}!',
    '{car} surges to the front!',
    'Position change at the top - {car} leads!',
    '{car} makes a bold move for the lead!',
  ],
  crash: [
    '{car} hits the wall and is done for the day.',
    'Big crash - {car} is out of the race.',
    '{car} gets into the fence and retires.',
  ],
  pitStop: [
    '{car} dives into pit road for tires and fuel.',
    'Strategy call - {car} pits under green.',
    '{car} makes an early pit stop.',
  ],
  good: [
    'Your car is flying today!',
    'Great setup - you\'re gaining ground!',
    'The crew chief nailed the strategy.',
    'Your pit crew executes a lightning-fast stop.',
  ],
  bad: [
    'Loose wheel - you lose several positions!',
    'Tight handling is hurting your lap times.',
    'You brush the wall and fall back.',
    'A slow pit stop drops you behind.',
  ]
};
