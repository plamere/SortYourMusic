import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from '../config.js';

const SCOPES = 'playlist-read-private playlist-modify-private playlist-modify-public';
const TOKEN_KEY = 'sym_tokens';

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, x => possible[x % possible.length]).join('');
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function redirectToSpotifyAuth() {
  const codeVerifier = generateRandomString(64);
  localStorage.setItem('code_verifier', codeVerifier);

  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64urlEncode(hashed);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    scope: SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function exchangeCodeForToken(code) {
  const codeVerifier = localStorage.getItem('code_verifier');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) throw new Error('Token exchange failed');

  const data = await response.json();
  saveTokens(data);
  return data;
}

export async function refreshAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens?.refresh_token) throw new Error('No refresh token');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!response.ok) throw new Error('Token refresh failed');

  const data = await response.json();
  saveTokens(data);
  return data;
}

function saveTokens(data) {
  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || getStoredTokens()?.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function getStoredTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY));
  } catch {
    return null;
  }
}

export function getAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) return null;
  if (Date.now() > tokens.expires_at - 60000) return null; // expired or about to
  return tokens.access_token;
}

export function hasValidToken() {
  return getAccessToken() !== null;
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('code_verifier');
}
