/**
 * Simple reactive state store with change subscribers.
 */

const state = {
  user: null,
  playlists: [],
  currentPlaylist: null,
  tracks: [],         // Array of playlist items (each with .track)
  albumDates: {},      // album.id -> release_date
  view: 'landing',     // 'landing' | 'playlists' | 'tracks' | 'faq'
  sortColumn: 0,       // column index
  sortDirection: 'asc',
  loading: false,
  info: '',
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(updates) {
  Object.assign(state, updates);
  for (const fn of listeners) {
    fn(state);
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
