
# Sort Your Music

Sort your Spotify playlists by tempo, energy, danceability, and more. Pick a playlist, click a column to sort, and save the new order back to Spotify.

Live at [sortyourmusic.playlistmachinery.com](https://sortyourmusic.playlistmachinery.com/)

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

## Versions

There are two versions of the app in this repo:

- **[`web/`](web/)** — The original version (~2012). jQuery, Bootstrap 3, everything inline in one file. See [`web/README.md`](web/README.md).
- **[`web2/`](web2/)** — Modern rewrite (2026). Vanilla ES modules, modular file structure, no framework. See [`web2/README.md`](web2/README.md).

## Spotify App Setup

Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) with the following settings:

- **Redirect URI:** must match `SPOTIFY_REDIRECT_URI` in `config.js`
- **Scopes used:** `playlist-read-private`, `playlist-modify-private`, `playlist-modify-public`

Authentication uses the Authorization Code + PKCE flow (no client secret needed).

## Deploy

Each version has its own deploy script:

```sh
cd web && ./deploy    # rsyncs to production server
cd web2 && ./deploy   # rsyncs to production server
```
