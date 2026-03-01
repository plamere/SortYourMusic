import { el, qs } from '../utils/dom.js';
import { redirectToSpotifyAuth } from '../auth.js';

export function renderLanding(container) {
  container.innerHTML = '';

  const landing = el('div', { class: 'landing' },
    el('div', { class: 'hero-card' },
      el('h1', { class: 'hero-title' }, 'Sort Your Music'),
      el('p', { class: 'hero-description' },
        'Sort your Spotify playlists by any of a wide range of musical attributes such as tempo, loudness, valence, energy, danceability, popularity and more. Now with ',
        el('strong', {}, 'Filters'),
        '!'
      ),
      el('p', { class: 'hero-prompt' }, 'Login with your Spotify account to get started'),
      el('button', {
        class: 'btn btn--primary btn--lg',
        on: { click: () => redirectToSpotifyAuth() },
      }, 'Login with Spotify')
    )
  );

  container.appendChild(landing);
}
