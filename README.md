
# Sort Your Music

Sort your Spotify playlists by tempo, energy, danceability, and more. Pick a playlist, click a column to sort, and save the new order back to Spotify.

Live at [sortyourmusic.playlistmachinery.com](https://sortyourmusic.playlistmachinery.com/)

## Note

This app was originally written around 2012 and the tech reflects that era — jQuery, Bootstrap 3, inline JS, no build system. It still works and does its job, but don't look to it as a model of modern web development.

## Sortable Attributes

| Attribute | Description |
|-----------|-------------|
| BPM | Tempo in beats per minute |
| Energy | Overall intensity (0–100) |
| Danceability | How suitable for dancing (0–100) |
| Loudness | Average volume in dB |
| Valence | Musical positivity / mood (0–100) |
| Length | Track duration |
| Acousticness | How acoustic the track is (0–100) |
| Popularity | Spotify popularity score (0–100) |
| Artist Separation | Maximizes spacing between same-artist tracks |
| Shuffle | Random order |

A BPM filter lets you narrow results to a specific tempo range, with an option to include doubled BPM values.

## Local Development

No build step, bundler, or package manager. The app is a single-page static site.

1. Clone the repo
2. Copy `web/config.js` and set your Spotify app credentials:
   ```js
   var SPOTIFY_CLIENT_ID = 'your-client-id';
   var SPOTIFY_REDIRECT_URI = 'http://localhost:8000/';
   ```
3. Serve the `web/` directory with any static file server:
   ```sh
   cd web && python3 -m http.server 8000
   ```
4. Open `http://localhost:8000` and log in with Spotify

### Spotify App Setup

Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) with the following settings:

- **Redirect URI:** must match `SPOTIFY_REDIRECT_URI` in `config.js`
- **Scopes used:** `playlist-read-private`, `playlist-modify-private`, `playlist-modify-public`

Authentication uses the Authorization Code + PKCE flow (no client secret needed).

## Deploy

```sh
cd web && ./deploy
```

This rsyncs the `web/` directory to the production server.

## Tech Stack

- Vanilla JavaScript (no build step)
- jQuery 1.11, Bootstrap 3, Underscore.js
- [DataTables](https://datatables.net/) for sortable columns
- [Q.js](https://github.com/kriskowal/q) for promises
- Spotify Web API for playlist and audio feature data

## Architecture

All application code lives in `web/index.html` (HTML + inline JS). Key files:

| File | Purpose |
|------|---------|
| `web/index.html` | Entire app: markup, styles, and all JS logic |
| `web/config.js` | Spotify OAuth client ID and redirect URI |
| `web/styles.css` | Dark theme and custom styling |
| `web/lib/` | Vendored JS libraries |
| `web/dist/` | Bootstrap CSS and fonts |
