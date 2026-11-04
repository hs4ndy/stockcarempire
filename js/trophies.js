// Career award ledger. Records facts at award time; legacy totals never invent race details.
const TROPHY_SERIES_KEYS = ['grassroots', 'challenger', 'premier'];
function trophyModelKey(trophy) {
  return `${TROPHY_SERIES_KEYS[trophy.series]}-${trophy.kind}`;
}
function trophyTitle(trophy) {
  return `${SERIES[trophy.series]?.name || 'Unknown series'} ${trophy.kind === 'championship' ? 'Championship' : 'Winner'} Trophy`;
}
function ensureTrophies(state = game) {
  if (!state || Array.isArray(state.trophies)) return state?.trophies || [];
  const awards = [];
  for (const history of state.history || []) {
    const series = SERIES.findIndex(s => s.name === history.series);
    if (series < 0) continue;
    for (let i = 0; i < (history.wins || 0); i++) awards.push({
      id: `legacy:${history.year}:${series}:win:${i}`, kind: 'win', series,
      year: history.year, race: null, historical: true,
    });
    if (history.champion || history.finalPos === 1) awards.push({
      id: `title:${history.year}:${series}`, kind: 'championship', series,
      year: history.year, wins: history.wins || 0, historical: true,
    });
  }
  (state.season?.calendar || []).forEach((race, index) => {
    const result = race.playerResult;
    if (race.status === 'completed' && result?.position === 1 && !result.dnf) awards.push({
      id: `win:${state.season.year}:${state.currentSeries}:${index + 1}`,
      kind: 'win', series: state.currentSeries, year: state.season.year, race: index + 1,
      track: TRACKS.find(t => t.id === race.trackId)?.name || null,
      startingPosition: result.startingPosition || null, points: race.playerPoints ?? result.points ?? null,
      earnings: race.earnings ?? result.prize ?? null, simulated: result.simulated ?? null, historical: true,
    });
  });
  // Some old saves retain the standings total but not all per-race results.
  const wins = state.season?.standings?.find(e => e.id === 'player')?.wins || 0;
  const recovered = awards.filter(t => t.kind === 'win' && t.year === state.season?.year).length;
  for (let i = recovered; i < wins; i++) awards.push({
    id: `legacy:${state.season.year}:${state.currentSeries}:current:${i}`, kind: 'win',
    series: state.currentSeries, year: state.season.year, race: null, historical: true,
  });
  state.trophies = awards;
  return awards;
}
function awardRaceTrophy(result, state = game) {
  const awards = ensureTrophies(state);
  if (!state || !result?.isPlayer || result.position !== 1 || result.dnf) return;
  const race = state.season.calendar[state.season.raceIndex];
  const id = `win:${state.season.year}:${state.currentSeries}:${state.season.raceIndex + 1}`;
  if (awards.some(t => t.id === id)) return;
  awards.push({id, kind: 'win', unclaimed: true, series: state.currentSeries, year: state.season.year,
    race: state.season.raceIndex + 1, track: TRACKS.find(t => t.id === race?.trackId)?.name || null,
    startingPosition: result.startingPosition || null, points: result.points ?? null,
    earnings: result.prize ?? null, simulated: result.simulated ?? null,
    difficulty: state.difficulty, carName: state.cars.find(c => c.id === result.carId)?.name || null,
    carNumber: state.cars.find(c => c.id === result.carId)?.number ?? null,
  });
}
function awardChampionshipTrophy(entry, state = game) {
  const awards = ensureTrophies(state);
  const id = `title:${state.season.year}:${state.currentSeries}`;
  if (awards.some(t => t.id === id)) return;
  awards.push({id, kind: 'championship', series: state.currentSeries, year: state.season.year,
    wins: entry?.wins || 0, points: entry?.points || 0, starts: entry?.races || 0,
    top5: entry?.top5 || 0, top10: entry?.top10 || 0,
  });
}
