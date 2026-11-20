function rewatchOrder(targetId, movies) {
  const byId = new Map(movies.map(movie => [movie.id, movie]));
  if (!byId.has(targetId)) throw new Error('MOVIE_NOT_FOUND');
  const state = new Map();
  const ordered = [];
  function visit(id) {
    if (state.get(id) === 1) throw new Error('CIRCULAR_DEPENDENCY');
    if (state.get(id) === 2) return;
    const movie = byId.get(id);
    if (!movie) throw new Error('INVALID_PREREQUISITE');
    state.set(id, 1);
    for (const prerequisite of movie.prerequisites) visit(prerequisite);
    state.set(id, 2);
    ordered.push(movie);
  }
  visit(targetId);
  ordered.pop(); // target is visited last
  return { movies: ordered, total: ordered.length,
    watchedCount: ordered.filter(movie => movie.watched).length,
    remainingMinutes: ordered.filter(movie => !movie.watched).reduce((sum, movie) => sum + movie.runtime, 0) };
}
function minimumBundles(sizes, groupSize) {
  const dp = Array(groupSize + 1).fill(Infinity);
  const chosen = Array(groupSize + 1).fill(null);
  dp[0] = 0;
  for (let seats = 1; seats <= groupSize; seats++) {
    for (const size of sizes) {
      if (size <= seats && dp[seats - size] + 1 < dp[seats]) {
        dp[seats] = dp[seats - size] + 1;
        chosen[seats] = size;
      }
    }
  }
  if (!Number.isFinite(dp[groupSize])) return { possible: false, totalBundles: null, bundles: [] };
  const counts = new Map();
  for (let seats = groupSize; seats > 0;) {
    const size = chosen[seats];
    counts.set(size, (counts.get(size) || 0) + 1);
    seats -= size;
  }
  return { possible: true, totalBundles: dp[groupSize], bundles: [...counts].sort((a,b)=>b[0]-a[0]).map(([size,quantity])=>({size,quantity})) };
}
module.exports = { rewatchOrder, minimumBundles };
