
# Sort Your Music — Original (`web/`)

The original version of Sort Your Music, written around 2012. All application code lives in a single `index.html` file — no build step, no bundler.

## Tech

- jQuery 1.11, Bootstrap 3, Underscore.js
- [DataTables](https://datatables.net/) for sortable columns
- [Q.js](https://github.com/kriskowal/q) for promises
- Spotify Web API (Authorization Code + PKCE)

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Entire app: markup, styles, and all JS logic |
| `config.js` | Spotify OAuth client ID and redirect URI |
| `styles.css` | Dark theme and custom styling |
| `lib/` | Vendored JS libraries |
| `dist/` | Bootstrap CSS and fonts |

## Local Dev

```sh
cd web && python3 -m http.server 8000
```

Open `http://localhost:8000` and log in with Spotify.

## Deploy

```sh
./deploy
```

Rsyncs the directory to the production server.
