
# Sort Your Music — Modern Rewrite (`web2/`)

A 2026 rewrite of Sort Your Music. Vanilla ES modules, CSS custom properties, no framework, no build step.

## Tech

- Vanilla JavaScript (ES modules)
- CSS custom properties for theming
- Spotify Web API (Authorization Code + PKCE)
- No framework, no bundler, no dependencies

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Entry point and page shell |
| `config.js` | Spotify OAuth client ID and redirect URI |
| `js/app.js` | Application bootstrap and routing |
| `js/auth.js` | OAuth / PKCE authentication flow |
| `js/api.js` | Spotify API helpers |
| `js/state.js` | Application state management |
| `js/views/landing.js` | Landing / login page |
| `js/views/playlists.js` | Playlist list view |
| `js/views/tracks.js` | Track table with sorting and filtering |
| `js/views/faq.js` | FAQ section |
| `js/utils/dom.js` | DOM helper utilities |
| `js/utils/format.js` | Formatting utilities |
| `js/utils/smart-order.js` | Artist separation sorting algorithm |
| `css/` | Modular stylesheets (variables, layout, components, etc.) |

## Local Dev

```sh
npx serve -l 8000
```

Don't use `python3 -m http.server` — its single-threaded nature causes `ERR_SOCKET_NOT_CONNECTED` errors when loading many ES modules concurrently.

Open `http://127.0.0.1:8000` and log in with Spotify.

## Deploy

```sh
./deploy
```

Rsyncs the directory to the production server.
