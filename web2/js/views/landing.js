import { el, qs } from '../utils/dom.js';
import { redirectToSpotifyAuth } from '../auth.js';

export function renderLanding(container) {
  container.innerHTML = '';

  const landing = el('div', { class: 'landing' },
    el('div', { class: 'hero-card' },
      el('h1', { class: 'hero-title' }, 'Sort Your Music'),
      el('p', { class: 'hero-description' },
        'Sort your Spotify playlists by any of a wide range of musical attributes such as tempo, loudness, valence, energy, danceability, popularity and more.'
      ),
      el('p', { class: 'hero-prompt' }, 'Login with your Spotify account to get started'),
      el('button', {
        class: 'btn btn--primary btn--lg',
          on: { click: () => {
            const forceDialog = localStorage.getItem('force_show_dialog') === 'true';
            localStorage.removeItem('force_show_dialog');
            redirectToSpotifyAuth(forceDialog);
        }},
      }, 'Login with Spotify'),
      el('div', { class: 'hero-trust' },
        el('p', {}, 'Sorting playlists since 2012 · Millions of playlists sorted'),
        el('p', {},
          'Open source on ',
          el('a', { href: 'https://github.com/plamere/SortYourMusic', target: '_blank', rel: 'noopener' }, 'GitHub'),
          ' · Runs entirely in your browser'
        )
      )
    )
  );

  container.appendChild(landing);
}
