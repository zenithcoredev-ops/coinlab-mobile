import { ApiError } from '../api';
import { inviteErrorKey, isInviteCodeFormat, normalizeInviteCode } from '../friends-api';

describe('invite code format', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeInviteCode('  clb-ab3x9 ')).toBe('CLB-AB3X9');
  });

  it('accepts a three-letter prefix, a dash and five letters/digits', () => {
    expect(isInviteCodeFormat('CLB-AB3X9')).toBe(true);
    expect(isInviteCodeFormat('clb-ab3x9')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isInviteCodeFormat('')).toBe(false);
    expect(isInviteCodeFormat('CLB-AB3X')).toBe(false);
    expect(isInviteCodeFormat('CLB-AB3X99')).toBe(false);
    expect(isInviteCodeFormat('WAG-AB3X9')).toBe(true); // a renamed prefix still passes
    expect(isInviteCodeFormat('CL1-AB3X9')).toBe(false);
    expect(isInviteCodeFormat('CLBX-AB3X9')).toBe(false);
    expect(isInviteCodeFormat('CLB-AB3X!')).toBe(false);
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
