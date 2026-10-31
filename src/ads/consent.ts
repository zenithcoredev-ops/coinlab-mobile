import mobileAds, { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } from 'react-native-google-mobile-ads';

export type ConsentState = {
  /** Ads may be requested (consent given, or not needed where the user is). */
  canRequestAds: boolean;
  /** The user must be able to reopen the consent choices (Profile → Privacy options). */
  privacyOptionsRequired: boolean;
};

const NONE: ConsentState = { canRequestAds: false, privacyOptionsRequired: false };

async function readConsent(): Promise<ConsentState> {
  const info = await AdsConsent.getConsentInfo();
  return {
    canRequestAds: info.canRequestAds,
    privacyOptionsRequired: info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
  };
}

/**
 * Google's UMP flow, once per launch: refresh the consent status and show the consent form where
 * it's required (EEA, UK). If refreshing fails (offline), consent given on an earlier launch still
 * counts, so the stored state is read either way.
 */
export async function gatherConsent(): Promise<ConsentState> {
  try {
    await AdsConsent.requestInfoUpdate();
    await AdsConsent.loadAndShowConsentFormIfRequired();
  } catch {
    // Fall through to whatever was stored.
  }
  return readConsent().catch(() => NONE);
}

/** Profile → Privacy options: reopens the consent form, then returns the new state. */
export async function showPrivacyOptions(): Promise<ConsentState> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
  } catch {
    // Closed or failed: keep whatever is stored.
  }
  return readConsent().catch(() => NONE);
}

let initialized: Promise<unknown> | null = null;

/** Starts the Mobile Ads SDK; only ever called once consent allows requesting ads. */
export function initializeAds(): Promise<unknown> {
  initialized ??= mobileAds()
    .initialize()
    .catch(() => {
      initialized = null;
    });
  return initialized;
}
