import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID } from '@/constants/config';
import type { Translate } from '@/i18n/translate';

export type GoogleAccount = {
  accessToken: string;
  email: string;
  name: string | null;
};

// Android reports a misconfigured OAuth client (wrong package name or SHA-1)
// as CommonStatusCodes.DEVELOPER_ERROR.
const DEVELOPER_ERROR = '10';

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

/** Opens the native Google account picker. Resolves null if the user cancels. */
export async function signInWithGoogle(): Promise<GoogleAccount | null> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;

  const { accessToken } = await GoogleSignin.getTokens();
  return { accessToken, email: response.data.user.email, name: response.data.user.name };
}

/** Forgets the Google account so the next sign-in shows the account picker. */
export async function signOutGoogle(): Promise<void> {
  await GoogleSignin.signOut();
}

/** Only the web flow returns via redirect; native sign-in resolves in place. */
export async function consumeGoogleRedirect(): Promise<GoogleAccount | null> {
  return null;
}

export function describeGoogleError(error: unknown, t: Translate): string {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.IN_PROGRESS:
        return t('signin.alreadyInProgress');
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return t('signin.playServices');
      case DEVELOPER_ERROR:
        return t('signin.developerError');
    }
  }
  return t('signin.error', { detail: error instanceof Error ? error.message : String(error) });
}
