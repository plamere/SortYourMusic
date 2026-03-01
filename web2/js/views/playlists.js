import { el, qs } from '../utils/dom.js';
import { getState, setState } from '../state.js';
import { getAllUserPlaylists } from '../api.js';

let abortController = null;
let cachedWrapper = null;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Mine' },
  { key: 'personalized', label: 'Personalized' },
  { key: 'spotify', label: 'Spotify' },
  { key: 'other', label: 'Others' },
  { key: 'collaborative', label: 'Collaborative' },
];

export function categorizePlaylist(playlist, userId) {
  const isPersonalized = playlist.id.startsWith('37i9dQZF');
  if (isPersonalized) return 'personalized';
  if (playlist.owner.id === 'spotify') return 'spotify';
  if (playlist.owner.id === userId) return 'mine';
  return 'other';
}

export function invalidatePlaylistCache() {
  cachedWrapper = null;
}

export async function renderPlaylists(container, onSelectPlaylist) {
  // If we have a cached view, just re-attach it
  if (cachedWrapper) {
    container.innerHTML = '';
    container.appendChild(cachedWrapper);
    return;
  }

  // Abort any previous playlist loading
  if (abortController) abortController.abort();
  abortController = new AbortController();
  const { signal } = abortController;

  container.innerHTML = '';

  const header = el('div', { class: 'playlists-header' },
    el('h2', { class: 'playlists-title' }, 'Pick a playlist')
  );

  // Filter dropdown
  const counts = { all: 0, mine: 0, personalized: 0, spotify: 0, other: 0, collaborative: 0 };

  const filterSelect = el('select', {
    class: 'playlist-filter-select',
    on: {
      change: () => applyFilter(grid, filterSelect.value, searchInput.value, matchCount),
    }
  });
  for (const { key, label } of FILTERS) {
    filterSelect.appendChild(el('option', { value: key }, label));
  }

  const searchInput = el('input', {
    class: 'playlist-search',
    type: 'text',
    placeholder: 'Filter by name\u2026',
    on: {
      input: () => applyFilter(grid, filterSelect.value, searchInput.value, matchCount),
    }
  });

  const matchCount = el('span', { class: 'playlist-match-count' });

  const filterBar = el('div', { class: 'playlist-filters' },
    el('label', { class: 'playlist-filter-label' }, 'Show:'),
    filterSelect,
    searchInput,
    matchCount
  );

  const grid = el('div', { class: 'playlist-grid' });
  const progressBar = el('div', { class: 'playlist-progress-bar' });
  const progressWrap = el('div', { class: 'playlist-progress' }, progressBar);
  const loadingMsg = el('div', { class: 'playlist-loading-msg' }, 'Getting your playlists...');

  const wrapper = el('div', { class: 'playlists-view container' },
    header,
    filterBar,
    progressWrap,
    loadingMsg,
    grid
  );

  container.appendChild(wrapper);
  cachedWrapper = wrapper;

  const userId = getState().user?.id;

  const wrappedOnSelect = (playlist) => {
    onSelectPlaylist(playlist);
  };

  let renderedCount = 0;

  const updateFilterCounts = () => {
    const options = filterSelect.options;
    for (let i = 0; i < options.length; i++) {
      const { key, label } = FILTERS[i];
      options[i].textContent = `${label} (${counts[key]})`;
    }
  };

  try {
    const playlists = await getAllUserPlaylists((batch, total) => {
      loadingMsg.textContent = `Loaded ${batch.length} playlists...`;
      if (total) {
        const pct = Math.min(100, Math.round((batch.length / total) * 100));
        progressBar.style.width = `${pct}%`;
      }
      // Only append new cards since last render
      const newItems = batch.slice(renderedCount);
      appendCards(grid, newItems, wrappedOnSelect, userId, counts);
      applyFilter(grid, filterSelect.value, searchInput.value, matchCount);
      renderedCount = batch.length;
    }, { signal });

    setState({ playlists });
    updateFilterCounts();
    progressWrap.remove();
    loadingMsg.remove();
  } catch (err) {
    if (err.name === 'AbortError' || signal.aborted) return;
    cachedWrapper = null;
    progressWrap.remove();
    loadingMsg.remove();
    grid.innerHTML = '';
    grid.appendChild(el('p', { style: { color: 'var(--color-danger)', textAlign: 'center', gridColumn: '1/-1' } },
      `Error loading playlists: ${err.message}`
    ));
  }
}

function applyFilter(grid, filterKey, searchText, matchCountEl) {
  const query = (searchText || '').toLowerCase();
  const cards = grid.querySelectorAll('.playlist-card');
  let visible = 0;
  for (const card of cards) {
    let catOk;
    if (filterKey === 'all') catOk = true;
    else if (filterKey === 'collaborative') catOk = !!card.dataset.collab;
    else catOk = card.dataset.category === filterKey;

    const nameOk = !query || card.dataset.name.includes(query);
    const show = catOk && nameOk;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  }
  if (matchCountEl) {
    const isFiltered = filterKey !== 'all' || query;
    matchCountEl.textContent = isFiltered ? `${visible} of ${cards.length}` : '';
  }
}

function appendCards(grid, playlists, onSelect, userId, counts) {
  for (const playlist of playlists) {
    const imageUrl = getPlaylistImage(playlist);
    const category = categorizePlaylist(playlist, userId);
    counts[category]++;
    counts.all++;
    if (playlist.collaborative) counts.collaborative++;

    const imageEl = imageUrl
      ? el('img', { class: 'playlist-card-image', src: imageUrl, alt: playlist.name, loading: 'lazy' })
      : el('div', { class: 'playlist-card-placeholder' }, '\u266B');

    const card = el('div', {
      class: 'playlist-card',
      'data-category': category,
      'data-collab': playlist.collaborative ? '1' : '',
      'data-name': playlist.name.toLowerCase(),
      on: { click: () => onSelect(playlist) },
    },
      imageEl,
      el('div', { class: 'playlist-card-name', title: playlist.name }, playlist.name),
      el('div', { class: 'playlist-card-meta' }, `${playlist.tracks.total} tracks`)
    );

    grid.appendChild(card);
  }
}

function getPlaylistImage(playlist) {
  if (!playlist.images || playlist.images.length === 0) return null;
  if (playlist.images.length === 1) return playlist.images[0].url;

  // Pick the smallest image that is at least 300x300 (sharp on retina).
  const minSize = 300;
  const sorted = [...playlist.images]
    .filter(img => img.width && img.height)
    .sort((a, b) => a.width - b.width);

  const match = sorted.find(img => img.width >= minSize && img.height >= minSize);
  return (match || playlist.images[0]).url;
}
