import { isInviteCodeFormat, normalizeInviteCode } from '../friends-api';

describe('invite code format', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeInviteCode('  clb-ab3x9 ')).toBe('CLB-AB3X9');
  });

  it('accepts CLB- plus five letters/digits', () => {
    expect(isInviteCodeFormat('CLB-AB3X9')).toBe(true);
    expect(isInviteCodeFormat('clb-ab3x9')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isInviteCodeFormat('')).toBe(false);
    expect(isInviteCodeFormat('CLB-AB3X')).toBe(false);
    expect(isInviteCodeFormat('CLB-AB3X99')).toBe(false);
    expect(isInviteCodeFormat('XYZ-AB3X9')).toBe(false);
    expect(isInviteCodeFormat('CLB-AB3X!')).toBe(false);
  });
});
