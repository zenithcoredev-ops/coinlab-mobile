import { ApiError } from '@/services/api';
import { logAdImpression } from '@/services/ads-api';
import { flushImpressions, impressionFromPaidEvent, recordImpression } from '../impressions';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-google-mobile-ads', () => ({
  RevenuePrecisions: { 0: 'UNKNOWN', 1: 'ESTIMATED', 2: 'PUBLISHER_PROVIDED', 3: 'PRECISE', UNKNOWN: 0, ESTIMATED: 1, PUBLISHER_PROVIDED: 2, PRECISE: 3 },
}));
jest.mock('@/services/ads-api', () => ({ logAdImpression: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const send = logAdImpression as jest.Mock;
const paid = {
  currency: 'USD',
  precision: 3,
  value: 0.0123,
  valueMicros: '12300',
  responseInfo: { responseId: 'resp-1', loadedAdapterResponse: { adSourceName: 'AdMob Network' } },
} as any;
const queued = async () => JSON.parse((await AsyncStorage.getItem('coinlab_ad_impressions')) ?? '[]');

beforeEach(async () => {
  await AsyncStorage.clear();
  send.mockReset().mockResolvedValue({});
});

describe('impressionFromPaidEvent', () => {
  it('maps the paid event to POST /ads/impressions, with nothing about the user', () => {
    const imp = impressionFromPaidEvent(paid, 'unit-1', 'interstitial');
    expect(imp).toEqual({
      clientEventId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
      adUnitId: 'unit-1',
      format: 'interstitial',
      valueMicros: '12300',
      currencyCode: 'USD',
      precision: 'PRECISE',
      adSourceName: 'AdMob Network',
      responseId: 'resp-1',
    });
    expect(impressionFromPaidEvent(paid, 'unit-1', 'interstitial').clientEventId).not.toBe(imp.clientEventId);
  });

  it('derives micros from the value when the SDK has no exact micros', () => {
    const imp = impressionFromPaidEvent({ ...paid, valueMicros: null, responseInfo: undefined, precision: 1 }, 'u', 'rewarded');
    expect(imp).toMatchObject({ valueMicros: '12300', precision: 'ESTIMATED', adSourceName: null, responseId: null });
  });
});

describe('impression queue', () => {
  const imp = (id: string) => ({ ...impressionFromPaidEvent(paid, 'u', 'interstitial'), clientEventId: id });

  it('sends queued impressions oldest first and clears them', async () => {
    await recordImpression(imp('a'));
    await recordImpression(imp('b'));
    await flushImpressions('tok');
    expect(send.mock.calls.map(([, i]) => i.clientEventId)).toEqual(['a', 'b']);
    expect(await queued()).toEqual([]);
  });

  it('keeps them for later when offline or the server fails, and without a session', async () => {
    await recordImpression(imp('a'));
    await flushImpressions(null);
    expect(send).not.toHaveBeenCalled();
    send.mockRejectedValue(new TypeError('Network request failed'));
    await flushImpressions('tok');
    send.mockRejectedValue(new ApiError('', 503));
    await flushImpressions('tok');
    expect((await queued()).map((i: any) => i.clientEventId)).toEqual(['a']);
  });

  it('drops one the server refuses (e.g. no endpoint yet) so it cannot block the rest', async () => {
    await recordImpression(imp('a'));
    await recordImpression(imp('b'));
    send.mockRejectedValueOnce(new ApiError('Not found', 404));
    await flushImpressions('tok');
    expect(send).toHaveBeenCalledTimes(2);
    expect(await queued()).toEqual([]);
  });

  it('holds at most 200, dropping the oldest', async () => {
    await AsyncStorage.setItem('coinlab_ad_impressions', JSON.stringify(Array.from({ length: 200 }, (_, i) => imp(`old-${i}`))));
    await recordImpression(imp('new'));
    const q = await queued();
    expect(q).toHaveLength(200);
    expect(q[0].clientEventId).toBe('old-1');
    expect(q[199].clientEventId).toBe('new');
  });
});
