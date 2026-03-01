import { getAccessToken, refreshAccessToken } from './auth.js';

const BASE = 'https://api.spotify.com/v1';

/**
 * Authenticated fetch wrapper for the Spotify API.
 * Automatically retries once on 401 by refreshing the token.
 */
async function spotifyFetch(url, options = {}, signal) {
  let token = getAccessToken();
  if (!token) {
    try {
      const data = await refreshAccessToken();
      token = data.access_token;
    } catch {
      throw new Error('Not authenticated');
    }
  }

  const doFetch = async (accessToken) => {
    const resp = await fetch(url, {
      ...options,
      signal,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (resp.status === 401) return null; // signal retry
    if (resp.status === 204 || resp.status === 202) return undefined;
    if (!resp.ok) throw new Error(`Spotify API error: ${resp.status}`);
    return resp.json();
  };

  let result = await doFetch(token);
  if (result === null) {
    // Token expired, refresh and retry
    const data = await refreshAccessToken();
    result = await doFetch(data.access_token);
    if (result === null) throw new Error('Authentication failed after refresh');
  }
  return result;
}

// ---- User ----

export async function getCurrentUser() {
  return spotifyFetch(`${BASE}/me`);
}

// ---- Playlists ----

export async function getAllUserPlaylists(onBatch, { signal } = {}) {
  let url = `${BASE}/me/playlists?limit=50`;
  const all = [];

  while (url) {
    signal?.throwIfAborted();
    const data = await spotifyFetch(url, {}, signal);
    if (!data) break;
    const items = data.items.filter(p => p.tracks.total > 0);
    all.push(...items);
    if (onBatch) onBatch(all, data.total);
    url = data.next;
  }

  return all;
}

// ---- Tracks ----

export async function getPlaylistTracks(playlistId, ownerId, onPage) {
  let url = `${BASE}/users/${ownerId}/playlists/${playlistId}/tracks?limit=50`;
  const allItems = [];

  while (url) {
    const data = await spotifyFetch(url);
    if (!data) break;
    const page = data.tracks ? data.tracks : data;
    const items = page.items || [];

    // Tag each item with its original index
    for (const item of items) {
      if (item.track) {
        item.track.which = allItems.length;
        allItems.push(item);
      }
    }

    if (onPage) await onPage(items, allItems);
    url = page.next;
  }

  return allItems;
}

// ---- Audio Features ----

export async function getAudioFeatures(ids) {
  if (ids.length === 0) return [];

  const all = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const data = await spotifyFetch(`${BASE}/audio-features?ids=${batch.join(',')}`);
    if (data?.audio_features) {
      all.push(...data.audio_features);
    }
  }
  return all;
}

// ---- Albums ----

export async function getAlbums(ids) {
  if (ids.length === 0) return [];

  const all = [];
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    const data = await spotifyFetch(`${BASE}/albums?ids=${batch.join(',')}`);
    if (data?.albums) {
      all.push(...data.albums);
    }
  }
  return all;
}

// ---- Save / Create ----

export async function createPlaylist(userId, name, isPublic, description = '') {
  return spotifyFetch(`${BASE}/users/${userId}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name, public: isPublic, description }),
  });
}

export async function setPlaylistTracks(playlistId, uris) {
  // First chunk replaces (PUT), subsequent chunks append (POST)
  const chunkSize = 100;

  for (let i = 0; i < uris.length; i += chunkSize) {
    const chunk = uris.slice(i, i + chunkSize);
    if (i === 0) {
      await spotifyFetch(`${BASE}/playlists/${playlistId}/tracks`, {
        method: 'PUT',
        body: JSON.stringify({ uris: chunk }),
      });
    } else {
      await spotifyFetch(`${BASE}/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ uris: chunk }),
      });
    }
  }
}
