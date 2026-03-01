export const SPOTIFY_CLIENT_ID = '31469b011d4941bf8dd4ac9cf8495bac';

export const SPOTIFY_REDIRECT_URI = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? `http://127.0.0.1:${window.location.port}/`
  : 'https://sortyourmusic.playlistmachinery.com/';
