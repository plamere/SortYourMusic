import { hasValidToken, exchangeCodeForToken, getAccessToken } from './auth.js';
import { getCurrentUser } from './api.js';
import { getState, setState, subscribe } from './state.js';
import { qs } from './utils/dom.js';
import { renderLanding } from './views/landing.js';
import { renderPlaylists } from './views/playlists.js';
import { renderTracks } from './views/tracks.js';
import { renderFaq } from './views/faq.js';

// View containers
let landingEl, playlistsEl, tracksEl, faqEl, infoEl;

// Track last selected playlist so popstate can restore it
let lastPlaylist = null;

function showView(name) {
  setState({ view: name });

  landingEl.classList.toggle('active', name === 'landing');
  playlistsEl.classList.toggle('active', name === 'playlists');
  tracksEl.classList.toggle('active', name === 'tracks');
  faqEl.classList.toggle('active', name === 'faq');
}

function pushState(viewName, data = {}) {
  history.pushState({ view: viewName, ...data }, '', null);
}

function updateInfo(state) {
  if (infoEl) {
    infoEl.textContent = state.info || '';
  }
}

async function initApp() {
  landingEl = qs('#view-landing');
  playlistsEl = qs('#view-playlists');
  tracksEl = qs('#view-tracks');
  faqEl = qs('#view-faq');
  infoEl = qs('#info-bar');

  subscribe(updateInfo);

  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    const viewName = e.state?.view;
    if (!viewName || viewName === 'landing') {
      renderLanding(landingEl);
      showView('landing');
    } else if (viewName === 'faq') {
      renderFaq(faqEl);
      showView('faq');
    } else if (viewName === 'playlists') {
      enterPlaylistsView(false);
    } else if (viewName === 'tracks' && lastPlaylist) {
      enterTracksView(lastPlaylist, false);
    } else {
      // Fallback: go to playlists if authenticated
      if (hasValidToken() && getState().user) {
        enterPlaylistsView(false);
      } else {
        renderLanding(landingEl);
        showView('landing');
      }
    }
  });

  // Check for auth callback
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (error) {
    renderLanding(landingEl);
    showView('landing');
    setState({ info: "Authorization denied. Please try again." });
    history.replaceState({ view: 'landing' }, '', window.location.pathname);
    return;
  }

  if (code) {
    history.replaceState({ view: 'landing' }, '', window.location.pathname);
    try {
      await exchangeCodeForToken(code);
    } catch {
      renderLanding(landingEl);
      showView('landing');
      setState({ info: "Failed to complete authentication." });
      return;
    }
  }

  if (hasValidToken()) {
    try {
      const user = await getCurrentUser();
      setState({ user });
      enterPlaylistsView(false);
      history.replaceState({ view: 'playlists' }, '', null);
    } catch {
      renderLanding(landingEl);
      showView('landing');
      history.replaceState({ view: 'landing' }, '', null);
    }
  } else {
    renderLanding(landingEl);
    showView('landing');
    history.replaceState({ view: 'landing' }, '', null);
  }

  // Wire up nav brand click
  const brand = qs('.nav-brand');
  if (brand) {
    brand.addEventListener('click', (e) => {
      e.preventDefault();
      if (hasValidToken() && getState().user) {
        enterPlaylistsView(true);
      } else {
        renderLanding(landingEl);
        showView('landing');
        pushState('landing');
      }
    });
  }

  // Wire FAQ link
  const faqLink = qs('#faq-link');
  if (faqLink) {
    faqLink.addEventListener('click', (e) => {
      e.preventDefault();
      renderFaq(faqEl);
      showView('faq');
      pushState('faq');
    });
  }
}

function enterPlaylistsView(push = true) {
  renderPlaylists(playlistsEl, (playlist) => {
    enterTracksView(playlist, true);
  });
  showView('playlists');
  if (push) pushState('playlists');
}

function enterTracksView(playlist, push = true) {
  lastPlaylist = playlist;
  renderTracks(tracksEl, playlist);
  showView('tracks');
  if (push) pushState('tracks');
}

// Boot
document.addEventListener('DOMContentLoaded', initApp);
