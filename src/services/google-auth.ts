import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID } from '@/constants/config';

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

/** Only the web flow returns via redirect; native sign-in resolves in place. */
export async function consumeGoogleRedirect(): Promise<GoogleAccount | null> {
  return null;
}

export function describeGoogleError(error: unknown): string {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.IN_PROGRESS:
        return 'Giris zaten devam ediyor';
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return 'Google Play Hizmetleri bulunamadi veya guncel degil';
      case DEVELOPER_ERROR:
        return 'Google yapilandirma hatasi: Android OAuth istemcisinin paket adi ve SHA-1 degerini kontrol et';
    }
  }
  return 'Hata: ' + (error instanceof Error ? error.message : String(error));
}
