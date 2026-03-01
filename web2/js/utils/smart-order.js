/**
 * Compute artist separation order for tracks.
 * Assigns a `smart` property (0-based index) to each track.
 * This tries to equally distribute artists throughout the playlist.
 *
 * @param {Array} items - Array of playlist items (each with .track)
 */
export function smartOrder(items) {
  const length = items.length;
  if (length === 0) return;

  // Count how many tracks each artist has
  const artistCounts = {};
  for (const item of items) {
    if (!item.track?.artists?.[0]) continue;
    const artist = item.track.artists[0].name;
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
  }

  const artistCountsSoFar = {};
  const out = [];
  const remaining = items.slice();

  while (remaining.length > 0) {
    let bestDelta = Infinity;
    let bestIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      if (!item.track?.artists?.[0]) continue;

      const artist = item.track.artists[0].name;
      const desiredPct = artistCounts[artist] / length;
      const nextPct = ((artistCountsSoFar[artist] || 0) + 1) / (out.length + 1);
      const delta = Math.abs(nextPct - desiredPct);

      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = i;
      }
    }

    const bestItem = remaining.splice(bestIndex, 1)[0];
    bestItem.track.smart = out.length;
    out.push(bestItem);

    const artist = bestItem.track.artists[0].name;
    artistCountsSoFar[artist] = (artistCountsSoFar[artist] || 0) + 1;
  }
}
