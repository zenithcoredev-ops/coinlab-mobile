import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';

import { gatherConsent, initializeAds, showPrivacyOptions } from '../consent';

jest.mock('react-native-google-mobile-ads', () => {
  const initialize = jest.fn().mockResolvedValue([]);
  return {
    __esModule: true,
    default: () => ({ initialize }),
    AdsConsent: {
      requestInfoUpdate: jest.fn(),
      loadAndShowConsentFormIfRequired: jest.fn(),
      getConsentInfo: jest.fn(),
      showPrivacyOptionsForm: jest.fn(),
    },
    AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED', UNKNOWN: 'UNKNOWN' },
  };
});

const consent = AdsConsent as jest.Mocked<typeof AdsConsent>;
const info = (canRequestAds: boolean, status = 'NOT_REQUIRED') => ({ canRequestAds, privacyOptionsRequirementStatus: status }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  consent.requestInfoUpdate.mockResolvedValue({} as any);
  consent.loadAndShowConsentFormIfRequired.mockResolvedValue({} as any);
  consent.getConsentInfo.mockResolvedValue(info(true, 'REQUIRED'));
});

describe('consent', () => {
  it('updates the status, shows the form if required, then reports what may be done', async () => {
    expect(await gatherConsent()).toEqual({ canRequestAds: true, privacyOptionsRequired: true });
    expect(consent.requestInfoUpdate.mock.invocationCallOrder[0]).toBeLessThan(consent.loadAndShowConsentFormIfRequired.mock.invocationCallOrder[0]);
  });

  it('falls back to the stored choice when the update fails (offline)', async () => {
    consent.requestInfoUpdate.mockRejectedValue(new Error('offline'));
    consent.getConsentInfo.mockResolvedValue(info(true));
    expect(await gatherConsent()).toEqual({ canRequestAds: true, privacyOptionsRequired: false });
  });

  it('allows no ads when nothing can be read', async () => {
    consent.getConsentInfo.mockRejectedValue(new Error('native module missing'));
    expect(await gatherConsent()).toEqual({ canRequestAds: false, privacyOptionsRequired: false });
  });

  it('reopens the consent form from Privacy options and returns the new choice', async () => {
    consent.getConsentInfo.mockResolvedValue(info(false, 'REQUIRED'));
    expect(await showPrivacyOptions()).toEqual({ canRequestAds: false, privacyOptionsRequired: true });
    expect(consent.showPrivacyOptionsForm).toHaveBeenCalled();
  });

  it('starts the SDK once, however often it is asked', async () => {
    await Promise.all([initializeAds(), initializeAds()]);
    await initializeAds();
    expect(mobileAds().initialize).toHaveBeenCalledTimes(1);
  });
});
