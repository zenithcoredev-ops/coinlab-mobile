import { ApiError } from '../api';
import { MAX_MESSAGE_LENGTH, messageProblem, ticketErrorKey } from '../support-api';

describe('messageProblem', () => {
  it('requires a meaningful message', () => {
    expect(messageProblem('')).toBe('tooShort');
    expect(messageProblem('   help   ')).toBe('tooShort');
    expect(messageProblem('My session did not start')).toBeNull();
  });

  it('caps the length', () => {
    expect(messageProblem('x'.repeat(MAX_MESSAGE_LENGTH))).toBeNull();
    expect(messageProblem('x'.repeat(MAX_MESSAGE_LENGTH + 1))).toBe('tooLong');
  });
});

describe('ticketErrorKey', () => {
  it('maps server codes to messages', () => {
    expect(ticketErrorKey(new ApiError('', 400, undefined, 'message_too_short'))).toBe('support.err.tooShort');
    expect(ticketErrorKey(new ApiError('', 429, 30, 'too_many_open'))).toBe('support.err.tooManyOpen');
  });

  it('treats a plain 429 as rate limiting', () => {
    expect(ticketErrorKey(new ApiError('Too many requests', 429, 120))).toBe('support.err.rateLimited');
  });

  it('falls back to a generic failure', () => {
    expect(ticketErrorKey(new ApiError('', 500))).toBe('support.err.failed');
    expect(ticketErrorKey(new Error('network'))).toBe('support.err.failed');
  });
});
