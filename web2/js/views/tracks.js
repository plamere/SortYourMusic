import { el, qs, qsa } from '../utils/dom.js';
import { getState, setState } from '../state.js';
import { getPlaylistTracks, getAudioFeatures, getAlbums, createPlaylist, setPlaylistTracks } from '../api.js';
import { formatDuration, formatDate } from '../utils/format.js';
import { smartOrder } from '../utils/smart-order.js';
import { categorizePlaylist } from './playlists.js';

// Column definitions
const COLUMNS = [
  { key: 'order',    label: '#',       title: 'Original track order', numeric: true,  colClass: 'col-order' },
  { key: 'title',    label: 'Title',   title: 'Track title',          numeric: false, colClass: 'col-title' },
  { key: 'artist',   label: 'Artist',  title: 'Primary artist',       numeric: false, colClass: 'col-artist' },
  { key: 'release',  label: 'Release', title: 'Release date',         numeric: false, colClass: 'col-release' },
  { key: 'added',    label: 'Added',   title: 'Date added to playlist', numeric: false, colClass: 'col-release' },
  { key: 'bpm',      label: 'BPM',     title: 'Tempo in BPM',         numeric: true,  colClass: 'col-num' },
  { key: 'energy',   label: 'Energy',  title: 'Overall energy',       numeric: true,  colClass: 'col-num' },
  { key: 'dance',    label: 'Dance',   title: 'Danceability',         numeric: true,  colClass: 'col-num' },
  { key: 'loud',     label: 'Loud',    title: 'Loudness in dB',       numeric: true,  colClass: 'col-num' },
  { key: 'valence',  label: 'Valence', title: 'How positive',         numeric: true,  colClass: 'col-num' },
  { key: 'length',   label: 'Length',  title: 'Duration',             numeric: true,  colClass: 'col-num' },
  { key: 'acoustic', label: 'Acoustic',title: 'Acousticness',         numeric: true,  colClass: 'col-num' },
  { key: 'pop',      label: 'Pop.',    title: 'Popularity',           numeric: true,  colClass: 'col-num' },
  { key: 'asep',     label: 'A.Sep',   title: 'Artist separation',    numeric: true,  colClass: 'col-num' },
  { key: 'rnd',      label: 'Rnd',     title: 'Random shuffle',       numeric: true,  colClass: 'col-num' },
];

function validAddedAt(dateStr) {
  if (!dateStr || dateStr.startsWith('1970')) return null;
  return dateStr;
}

function isPlaylistWritable(playlist) {
  const state = getState();
  if (!state.user) return false;
  if (playlist.owner?.id !== state.user.id) return false;
  if (playlist.id?.startsWith('37i9dQZF')) return false;
  return true;
}

// Module-level state
let allItems = [];
let albumDates = {};
let sortCol = 0;
let sortDir = 'asc';
let savedState = null;
let audio = null;
let playingTrackId = null;
let forceDisableSave = false;

export async function renderTracks(container, playlist) {
  container.innerHTML = '';
  allItems = [];
  albumDates = {};
  sortCol = 0;
  sortDir = 'asc';
  forceDisableSave = true;
  playingTrackId = null;
  if (audio) { audio.pause(); audio = null; }

  window.scrollTo(0, 0);

  // Build UI structure
  const titleLink = el('a', { href: playlist.uri }, playlist.name);

  // Playlist metadata
  const state = getState();
  const userId = state.user?.id;
  const category = categorizePlaylist(playlist, userId);
  const categoryLabels = { mine: 'Mine', personalized: 'Personalized', spotify: 'Spotify', other: 'Other' };

  const metaParts = [];
  if (playlist.owner?.display_name) {
    metaParts.push(el('span', {}, `by ${playlist.owner.display_name}`));
  }
  metaParts.push(el('span', {}, `${playlist.tracks.total} tracks`));
  metaParts.push(el('span', { class: 'playlist-tag' }, categoryLabels[category]));
  if (playlist.public) {
    metaParts.push(el('span', { class: 'playlist-tag' }, 'Public'));
  }
  if (playlist.collaborative) {
    metaParts.push(el('span', { class: 'playlist-tag' }, 'Collaborative'));
  }

  const createdEl = el('span', {});
  metaParts.push(createdEl);

  const metaLine = el('div', { class: 'playlist-meta' },
    ...metaParts.flatMap((part, i) => i > 0 ? [el('span', { class: 'playlist-meta-sep' }, '\u00B7'), part] : [part])
  );

  const rawDesc = playlist.description;
  const description = (typeof rawDesc === 'string' && rawDesc.trim() && rawDesc !== 'null')
    ? rawDesc.trim()
    : null;
  const descriptionEl = description
    ? el('div', { class: 'playlist-description' }, description)
    : null;

  // Save button group
  const saveBtnLabel = el('span', {}, 'Save New Playlist');
  const saveBtnSpinner = el('span', { class: 'spinner--inline spinner' });
  const saveBtn = el('button', {
    class: 'btn btn--primary btn--sm',
    disabled: 'disabled',
    on: { click: () => doSave(playlist, true) },
  },
    saveBtnSpinner,
    ' ',
    saveBtnLabel
  );

  const dropdownToggle = el('button', {
    class: 'btn btn--primary btn--sm',
    disabled: 'disabled',
    on: { click: toggleDropdown },
  }, el('span', { class: 'caret' }));

  const canOverwrite = isPlaylistWritable(playlist);

  const dropdownMenuItems = [
    el('a', { href: '#', on: { click: (e) => { e.preventDefault(); doSave(playlist, true); } } }, 'Save New Playlist'),
  ];
  if (canOverwrite) {
    dropdownMenuItems.push(
      el('a', { href: '#', on: { click: (e) => { e.preventDefault(); doSave(playlist, false); } } }, 'Overwrite Playlist')
    );
  }
  const dropdownMenu = el('div', { class: 'dropdown-menu' }, ...dropdownMenuItems);

  // Only show the split dropdown if there are multiple options
  const saveGroup = canOverwrite
    ? el('div', { class: 'btn-group dropdown' }, saveBtn, dropdownToggle, dropdownMenu)
    : saveBtn;

  // BPM filter
  const minBpm = el('input', { type: 'number', class: 'form-input', placeholder: '0', style: { width: '80px' } });
  const maxBpm = el('input', { type: 'number', class: 'form-input', placeholder: '1000', style: { width: '80px' } });
  const includeDoubleInput = el('input', { type: 'checkbox', checked: 'checked' });
  const checkIndicator = el('span', { class: 'checkbox-indicator' });

  const filterBar = el('div', { class: 'filter-bar' },
    el('div', { class: 'form-inline' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'BPM Min:'),
        minBpm
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label' }, 'Max:'),
        maxBpm
      ),
      el('label', { class: 'checkbox-custom' },
        includeDoubleInput,
        checkIndicator,
        el('span', { class: 'checkbox-label' }, 'Include doubled BPM')
      )
    )
  );

  // Table
  const thead = el('thead', {},
    el('tr', {},
      ...COLUMNS.map((col, i) =>
        el('th', {
          title: col.title,
          class: i === sortCol ? `sort-${sortDir}` : '',
          on: { click: () => handleSort(i, tbody, minBpm, maxBpm, includeDoubleInput, saveBtn, dropdownToggle) },
        }, col.label)
      )
    )
  );

  const colgroup = el('colgroup', {},
    ...COLUMNS.map(col => el('col', { class: col.colClass }))
  );

  const tbody = el('tbody', {});
  const table = el('table', { class: 'track-table' }, colgroup, thead, tbody);
  const tableWrap = el('div', { class: 'track-table-wrap' }, table);

  const spinnerWrap = el('div', { class: 'spinner-center' }, el('div', { class: 'spinner' }));

  const toolbar = el('div', { class: 'track-toolbar' },
    saveGroup
  );

  const imageUrl = playlist.images?.[0]?.url;
  const headerInfo = el('div', { class: 'playlist-header-info' },
    el('h2', { class: 'track-title' }, titleLink),
    metaLine,
    ...(descriptionEl ? [descriptionEl] : [])
  );

  const playlistHeader = imageUrl
    ? el('div', { class: 'playlist-header' },
        el('img', { class: 'playlist-header-image', src: imageUrl, alt: playlist.name }),
        headerInfo
      )
    : el('div', { class: 'playlist-header' }, headerInfo);

  const view = el('div', { class: 'tracks-view container' },
    playlistHeader,
    spinnerWrap,
    el('div', { class: 'track-controls', style: { display: 'none' } },
      toolbar,
      filterBar,
      tableWrap
    )
  );

  container.appendChild(view);

  const controlsEl = qs('.track-controls', view);

  // Wire filter events
  const onFilterChange = () => {
    renderRows(tbody, allItems, minBpm, maxBpm, includeDoubleInput);
    updateSaveState(saveBtn, dropdownToggle, minBpm, maxBpm, includeDoubleInput);
  };
  minBpm.addEventListener('input', onFilterChange);
  maxBpm.addEventListener('input', onFilterChange);
  includeDoubleInput.addEventListener('change', onFilterChange);

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!saveGroup.contains(e.target)) {
      dropdownMenu.classList.remove('open');
    }
  });

  // Load tracks
  let oldestAddedAt = null;

  try {
    setState({ info: 'Loading tracks...' });

    const items = await getPlaylistTracks(playlist.id, playlist.owner.id, async (pageItems, allSoFar) => {
      // Track oldest added_at for "created" date
      for (const item of pageItems) {
        const addedAt = validAddedAt(item.added_at);
        if (addedAt && (!oldestAddedAt || addedAt < oldestAddedAt)) {
          oldestAddedAt = addedAt;
        }
      }
      // Fetch audio features + album dates for this page
      const ids = [];
      const albumIds = [];

      for (const item of pageItems) {
        if (item.track && !item.is_local && item.track.id && item.track.type !== 'episode') {
          ids.push(item.track.id);
          if (item.track.album?.id && !(item.track.album.id in albumDates) && !albumIds.includes(item.track.album.id)) {
            albumIds.push(item.track.album.id);
          }
        }
      }

      // Fetch audio features + albums (non-fatal if these fail)
      let features = [];
      let albums = [];
      try {
        [features, albums] = await Promise.all([
          getAudioFeatures(ids).catch(() => []),
          getAlbums(albumIds).catch(() => []),
        ]);
      } catch { /* continue without enrichment data */ }

      // Map features
      const fmap = {};
      for (const f of features) {
        if (f?.id) fmap[f.id] = f;
      }

      for (const item of pageItems) {
        if (item.track?.id && fmap[item.track.id]) {
          item.track.enInfo = fmap[item.track.id];
        } else if (item.track) {
          item.track.enInfo = item.track.enInfo || {};
        }
        if (item.track) {
          item.track.rnd = Math.random() * 10000;
        }
      }

      // Map album dates
      for (const album of albums) {
        if (album?.id) {
          albumDates[album.id] = album.release_date;
        }
      }

      setState({ info: `Loaded ${allSoFar.length} tracks...` });

      // Progressive render
      allItems = allSoFar;
      controlsEl.style.display = '';
      renderRows(tbody, allItems, minBpm, maxBpm, includeDoubleInput);
    });

    // Final: compute smart order and re-render
    allItems = items;
    spinnerWrap.remove();

    // Update created date from oldest added_at
    if (oldestAddedAt) {
      createdEl.textContent = `Created ${oldestAddedAt.slice(0, 10)}`;
    } else {
      // Remove the separator before the empty created element
      const sep = createdEl.previousElementSibling;
      if (sep?.classList.contains('playlist-meta-sep')) sep.remove();
      createdEl.remove();
    }

    if (allItems.length === 0) {
      setState({ info: '' });
      const emptyMsg = el('div', { class: 'empty-message' },
        el('p', {}, 'This playlist has no playable tracks.'),
        el('p', { class: 'empty-hint' }, 'Use your browser\'s back button to return.')
      );
      view.appendChild(emptyMsg);
      return;
    }

    smartOrder(allItems);
    renderRows(tbody, allItems, minBpm, maxBpm, includeDoubleInput);

    controlsEl.style.display = '';
    forceDisableSave = false;
    saveState(minBpm, maxBpm, includeDoubleInput);
    updateSaveState(saveBtn, dropdownToggle, minBpm, maxBpm, includeDoubleInput);
    setState({ info: '' });
  } catch (err) {
    spinnerWrap.remove();
    setState({ info: `Error: ${err.message}` });
  }
}

// ---- Sorting ----

function handleSort(colIndex, tbody, minBpm, maxBpm, includeDouble, saveBtn, dropdownToggle) {
  if (colIndex === sortCol) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortCol = colIndex;
    // For rnd and asep, direction doesn't matter
    sortDir = 'asc';
  }

  // Re-randomize if clicking rnd
  if (COLUMNS[colIndex].key === 'rnd') {
    for (const item of allItems) {
      if (item.track) item.track.rnd = Math.random() * 10000;
    }
  }

  sortItems();

  // Update header classes
  const headers = tbody.closest('table').querySelectorAll('th');
  headers.forEach((th, i) => {
    th.className = i === sortCol ? `sort-${sortDir}` : '';
  });

  renderRows(tbody, allItems, minBpm, maxBpm, includeDouble);
  updateSaveState(saveBtn, dropdownToggle, minBpm, maxBpm, includeDouble);
}

function sortItems() {
  const col = COLUMNS[sortCol];
  const dir = sortDir === 'asc' ? 1 : -1;

  allItems.sort((a, b) => {
    const va = getCellValue(a, sortCol);
    const vb = getCellValue(b, sortCol);

    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;

    if (col.numeric) {
      return (va - vb) * dir;
    }
    return String(va).localeCompare(String(vb)) * dir;
  });
}

function getCellValue(item, colIndex) {
  const track = item.track;
  if (!track) return null;

  const info = track.enInfo || {};

  switch (COLUMNS[colIndex].key) {
    case 'order':    return track.which;
    case 'title':    return track.name;
    case 'artist':   return track.artists?.[0]?.name || '';
    case 'release':  return albumDates[track.album?.id] || null;
    case 'added':    { const a = validAddedAt(item.added_at); return a ? a.slice(0, 10) : null; }
    case 'bpm':      return info.tempo != null ? Math.round(info.tempo) : null;
    case 'energy':   return info.energy != null ? Math.round(info.energy * 100) : null;
    case 'dance':    return info.danceability != null ? Math.round(info.danceability * 100) : null;
    case 'loud':     return info.loudness != null ? Math.round(info.loudness) : null;
    case 'valence':  return info.valence != null ? Math.round(info.valence * 100) : null;
    case 'length':   return info.duration_ms || track.duration_ms || null;
    case 'acoustic': return info.acousticness != null ? Math.round(info.acousticness * 100) : null;
    case 'pop':      return Math.round(track.popularity || 0);
    case 'asep':     return track.smart != null ? Math.round(track.smart) : null;
    case 'rnd':      return track.rnd != null ? Math.round(track.rnd) : null;
    default:         return null;
  }
}

function getDisplayValue(item, colIndex) {
  const val = getCellValue(item, colIndex);
  if (val == null) return '';
  if (COLUMNS[colIndex].key === 'length') return formatDuration(val);
  if (COLUMNS[colIndex].key === 'order') return val + 1;
  return val;
}

// ---- BPM Filter ----

function inRange(val, min, max) {
  return (isNaN(min) && isNaN(max)) ||
         (isNaN(min) && val <= max) ||
         (min <= val && isNaN(max)) ||
         (min <= val && val <= max);
}

function passesFilter(item, minBpmInput, maxBpmInput, includeDoubleInput) {
  const min = parseInt(minBpmInput.value, 10);
  const max = parseInt(maxBpmInput.value, 10);
  if (isNaN(min) && isNaN(max)) return true;

  const bpmCol = COLUMNS.findIndex(c => c.key === 'bpm');
  const bpm = getCellValue(item, bpmCol);
  if (bpm == null) return true;

  const includeDouble = includeDoubleInput.checked;
  return inRange(bpm, min, max) || (includeDouble && inRange(bpm * 2, min, max));
}

// ---- Rendering ----

function renderRows(tbody, items, minBpm, maxBpm, includeDouble) {
  tbody.innerHTML = '';

  for (const item of items) {
    if (!passesFilter(item, minBpm, maxBpm, includeDouble)) continue;

    const isEpisode = item.track?.type === 'episode';
    const tr = el('tr', {
      class: isEpisode ? 'episode' : '',
      on: { click: () => handleRowClick(item, tr, tbody) },
      dataset: { trackId: item.track?.id || '' },
    },
      ...COLUMNS.map((col, i) => {
        let cls = col.numeric ? 'num' : '';
        if (col.key === 'title' || col.key === 'artist') cls = 'col-text';
        return el('td', { class: cls }, String(getDisplayValue(item, i)));
      })
    );

    tbody.appendChild(tr);
  }
}

// ---- Audio Preview ----

function handleRowClick(item, tr, tbody) {
  const track = item.track;
  if (!track) return;

  if (playingTrackId === track.id) {
    // Stop
    if (audio) audio.pause();
    playingTrackId = null;
    tr.classList.remove('playing');
  } else {
    // Stop previous
    if (audio) audio.pause();
    const prev = qs('tr.playing', tbody);
    if (prev) prev.classList.remove('playing');

    playingTrackId = track.id;
    tr.classList.add('playing');

    if (track.preview_url) {
      audio = new Audio(track.preview_url);
      audio.play().catch(() => {});
      audio.addEventListener('ended', () => {
        playingTrackId = null;
        tr.classList.remove('playing');
      });
    }
  }
}

// ---- Save State Tracking ----

function getCurrentState(minBpm, maxBpm, includeDouble) {
  return {
    sortCol,
    sortDir,
    minBpm: parseInt(minBpm.value, 10),
    maxBpm: parseInt(maxBpm.value, 10),
    includeDouble: includeDouble.checked,
  };
}

function saveState(minBpm, maxBpm, includeDouble) {
  savedState = getCurrentState(minBpm, maxBpm, includeDouble);
}

function isSavable(minBpm, maxBpm, includeDouble) {
  if (!savedState) return false;
  const current = getCurrentState(minBpm, maxBpm, includeDouble);
  return JSON.stringify(current) !== JSON.stringify(savedState);
}

function updateSaveState(saveBtn, dropdownToggle, minBpm, maxBpm, includeDouble) {
  const canSave = !forceDisableSave && isSavable(minBpm, maxBpm, includeDouble);
  if (saveBtn) saveBtn.disabled = !canSave;
  if (dropdownToggle) dropdownToggle.disabled = !canSave;
}

// ---- Dropdown ----

function toggleDropdown(e) {
  e.stopPropagation();
  const menu = e.target.closest('.dropdown').querySelector('.dropdown-menu');
  menu.classList.toggle('open');
}

// ---- Save ----

function getCurSortName() {
  const col = COLUMNS[sortCol];
  if (col.key === 'rnd' || col.key === 'asep') {
    return col.label;
  }
  const prefix = sortDir === 'asc' ? 'increasing ' : 'decreasing ';
  return prefix + col.label;
}

async function doSave(playlist, createNew) {
  const renderedUris = getRenderedUris();

  if (renderedUris.length === 0) {
    alert('Cannot save: no tracks after filtering');
    return;
  }

  const saveBtn = qs('.tracks-view .btn-group .btn:first-child') || qs('.tracks-view .track-toolbar > .btn');
  const dropdownToggle = qs('.tracks-view .btn-group .btn:nth-child(2)');
  const label = saveBtn?.querySelector('span:last-child');
  const originalLabel = label?.textContent || 'Save New Playlist';

  forceDisableSave = true;
  if (saveBtn) saveBtn.disabled = true;
  if (dropdownToggle) dropdownToggle.disabled = true;
  if (saveBtn) saveBtn.classList.add('saving');
  if (label) label.textContent = 'Saving...';

  // Close dropdown
  const menu = qs('.dropdown-menu.open');
  if (menu) menu.classList.remove('open');

  try {
    const state = getState();
    let targetPlaylist;

    if (createNew) {
      const sortName = getCurSortName();
      const prevDesc = (typeof playlist.description === 'string' && playlist.description.trim() && playlist.description !== 'null')
        ? playlist.description.trim() + ' - '
        : '';
      const desc = `${prevDesc}Sorted by ${sortName} with SortYourMusic`;
      targetPlaylist = await createPlaylist(
        state.user.id,
        `${playlist.name} ordered by ${sortName}`,
        playlist.public,
        desc
      );
    } else {
      targetPlaylist = playlist;
    }

    await setPlaylistTracks(targetPlaylist.id, renderedUris);

    // Update saved state
    const minBpmEl = qs('.tracks-view input[type="number"]');
    const maxBpmEl = qsa('.tracks-view input[type="number"]')[1];
    const includeDoubleEl = qs('.tracks-view input[type="checkbox"]');
    if (minBpmEl && maxBpmEl && includeDoubleEl) {
      saveState(minBpmEl, maxBpmEl, includeDoubleEl);
    }

    // Show success in the button, then revert
    if (label) {
      label.textContent = createNew ? 'Playlist Created!' : 'Playlist Updated!';
      if (saveBtn) saveBtn.classList.remove('saving');
      if (saveBtn) saveBtn.classList.add('saved');
      setTimeout(() => {
        if (label) label.textContent = originalLabel;
        if (saveBtn) saveBtn.classList.remove('saved');
      }, 3000);
    }
  } catch (err) {
    if (label) label.textContent = originalLabel;
    let msg;
    if (err.message?.includes('403') || err.message?.includes('404')) {
      msg = "This playlist can't be modified. It may be owned by Spotify or another user. Try \"Save New Playlist\" instead.";
    } else {
      msg = `Error saving: ${err.message}`;
    }
    alert(msg);
  } finally {
    forceDisableSave = false;
    if (saveBtn) saveBtn.classList.remove('saving');

    const minBpmEl = qs('.tracks-view input[type="number"]');
    const maxBpmEl = qsa('.tracks-view input[type="number"]')[1];
    const includeDoubleEl = qs('.tracks-view input[type="checkbox"]');
    if (minBpmEl && maxBpmEl && includeDoubleEl) {
      updateSaveState(saveBtn, dropdownToggle, minBpmEl, maxBpmEl, includeDoubleEl);
    }
  }
}

function getRenderedUris() {
  const rows = qsa('.track-table tbody tr');
  const uris = [];
  for (let i = 0; i < rows.length; i++) {
    const trackId = rows[i].dataset.trackId;
    if (trackId) {
      // Find the item
      const item = allItems.find(it => it.track?.id === trackId);
      const uri = item?.track?.uri;
      if (uri?.startsWith('spotify:track:') || uri?.startsWith('spotify:episode:')) {
        uris.push(uri);
      }
    }
  }
  return uris;
}
