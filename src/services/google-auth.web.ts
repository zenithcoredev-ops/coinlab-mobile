import * as Linking from 'expo-linking';

import { GOOGLE_WEB_CLIENT_ID } from '@/constants/config';

export type GoogleAccount = {
  accessToken: string;
  email: string;
  name: string | null;
};

// Must match an authorized redirect URI of the web OAuth client.
const redirectUri = Linking.createURL('');

/** Redirects the page to Google; the result is read by consumeGoogleRedirect after reload. */
export async function signInWithGoogle(): Promise<GoogleAccount | null> {
  window.location.href =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    `?client_id=${GOOGLE_WEB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&response_type=token' +
    `&scope=${encodeURIComponent('openid profile email')}`;
  // The page is navigating away; never resolve.
  return new Promise(() => {});
}

/** Reads the access token Google put in the URL hash after the redirect, if any. */
export async function consumeGoogleRedirect(): Promise<GoogleAccount | null> {
  const hash = window.location.hash;
  if (!hash.includes('access_token=')) return null;

  const accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
  window.history.replaceState(null, '', window.location.pathname);
  if (!accessToken) return null;

  const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userInfo = await res.json();
  return { accessToken, email: userInfo.email, name: userInfo.name ?? null };
}

export function describeGoogleError(error: unknown): string {
  return 'Hata: ' + (error instanceof Error ? error.message : String(error));
}
