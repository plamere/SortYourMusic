/**
 * Format milliseconds as m:ss
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format an ISO date string as just the date portion
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  return dateStr; // Spotify already gives YYYY-MM-DD or YYYY
}
