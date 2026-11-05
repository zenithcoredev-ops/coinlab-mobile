import { ApiError } from '../api';
import { INVITE_CODE_MAX_LENGTH, inviteErrorKey, isInviteCodeFormat, normalizeInviteCode, submitInviteCode } from '../friends-api';

describe('invite code format', () => {
  it('normalizes case, spaces and look-alike dashes, keeping the prefix as typed', () => {
    expect(normalizeInviteCode('  wago-ab3x9 ')).toBe('WAGO-AB3X9');
    expect(normalizeInviteCode('clb-ab3x9')).toBe('CLB-AB3X9');
    expect(normalizeInviteCode('WAGO – AB3X9')).toBe('WAGO-AB3X9');
    expect(normalizeInviteCode('WAGO\u2014AB3X9')).toBe('WAGO-AB3X9');
    expect(normalizeInviteCode('WAGO\u2212AB3X9')).toBe('WAGO-AB3X9');
  });

  it('accepts the current WAGO- codes and the older CLB- ones', () => {
    expect(isInviteCodeFormat('WAGO-AB3X9')).toBe(true);
    expect(isInviteCodeFormat('wago-ab3x9')).toBe(true);
    expect(isInviteCodeFormat(' WAGO - AB3X9 ')).toBe(true);
    expect(isInviteCodeFormat('CLB-AB3X9')).toBe(true);
    expect(isInviteCodeFormat('clb-ab3x9')).toBe(true);
  });

  it('does not tie the prefix to one length', () => {
    expect(isInviteCodeFormat('WA-AB3X9')).toBe(true);
    expect(isInviteCodeFormat('WALIGO-AB3X9')).toBe(true);
  });

  it('fits the longest accepted code in the input', () => {
    expect('WALIGOXX-AB3X9'.length).toBeLessThanOrEqual(INVITE_CODE_MAX_LENGTH);
    expect('WAGO-AB3X9'.length).toBeLessThanOrEqual(INVITE_CODE_MAX_LENGTH);
  });

  it('rejects anything else', () => {
    expect(isInviteCodeFormat('')).toBe(false);
    expect(isInviteCodeFormat('WAGO-AB3X')).toBe(false);
    expect(isInviteCodeFormat('WAGO-AB3X99')).toBe(false);
    expect(isInviteCodeFormat('WAGO-AB3X!')).toBe(false);
    expect(isInviteCodeFormat('WAG0-AB3X9')).toBe(false); // a digit in the prefix
    expect(isInviteCodeFormat('W-AB3X9')).toBe(false);
    expect(isInviteCodeFormat('WAGOAB3X9')).toBe(false);
    expect(isInviteCodeFormat('AB3X9')).toBe(false);
  });
});

describe('inviteErrorKey', () => {
  it('maps backend codes to translation keys', () => {
    expect(inviteErrorKey(new ApiError('x', 400, undefined, 'already_referred'))).toBe('friends.err.alreadyReferred');
    expect(inviteErrorKey(new ApiError('x', 400, undefined, 'not_found'))).toBe('friends.err.notFound');
  });

  it('returns undefined for unknown failures', () => {
    expect(inviteErrorKey(new ApiError('x', 500))).toBeUndefined();
    expect(inviteErrorKey(new Error('network'))).toBeUndefined();
  });
});

describe('submitInviteCode', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, bonusClb: 25 }), headers: { get: () => null } });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  const sent = () => JSON.parse(fetchMock.mock.calls[0][1].body).code;

  it('sends the normalized code; an old CLB- code goes as typed and the server maps it', async () => {
    await submitInviteCode('tok', ' wago – ab3x9 ');
    expect(sent()).toBe('WAGO-AB3X9');
    fetchMock.mockClear();
    await submitInviteCode('tok', 'clb-ab3x9');
    expect(sent()).toBe('CLB-AB3X9');
  });
});
