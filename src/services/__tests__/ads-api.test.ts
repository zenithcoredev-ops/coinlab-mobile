import { createRewardedIntent, getRewardedIntentStatus, logAdImpression } from '../ads-api';

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
const respond = (body: unknown) => fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body, headers: { get: () => null } });
const call = () => ({ url: String(fetchMock.mock.calls[0][0]), init: fetchMock.mock.calls[0][1] });

describe('ads API', () => {
  it('POST /ads/rewarded/intent', async () => {
    const intent = { intentId: 'i1', ssv: { userId: 'u', customData: 'c' }, expiresAt: 'x' };
    respond(intent);
    expect(await createRewardedIntent('tok')).toEqual(intent);
    expect(call().url).toMatch(/\/ads\/rewarded\/intent$/);
    expect(call().init).toMatchObject({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer tok' }) });
  });

  it('GET /ads/rewarded/:intentId', async () => {
    respond({ status: 'granted' });
    expect(await getRewardedIntentStatus('tok', 'i/1')).toBe('granted');
    expect(call().url).toMatch(/\/ads\/rewarded\/i%2F1$/);
    expect(call().init.method).toBe('GET');
  });

  it('POST /ads/impressions', async () => {
    respond({});
    const impression = {
      clientEventId: 'e1',
      adUnitId: 'unit',
      format: 'rewarded' as const,
      valueMicros: '1000',
      currencyCode: 'USD',
      precision: 'PRECISE',
      adSourceName: null,
      responseId: null,
    };
    await logAdImpression('tok', impression);
    expect(call().url).toMatch(/\/ads\/impressions$/);
    expect(JSON.parse(call().init.body)).toEqual(impression);
  });
});
