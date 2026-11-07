/**
 * True when the URL looks like a Supabase password-recovery link: `type=recovery`, an access token, or a
 * `code` / `token_hash` (PKCE and OTP links), in the query string or the hash.
 */
export function hasRecoveryLink(search: string, hash: string): boolean {
  const q = new URLSearchParams(search.replace(/^\?/, ''));
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  if (h.get('type') === 'recovery' || q.get('type') === 'recovery') return true;
  return ['access_token', 'code', 'token_hash'].some((k) => Boolean(h.get(k) || q.get(k)));
}

// Supabase strips the token from the URL as soon as it reads it, so remember whether the page was opened with one.
const openedWithRecoveryLink =
  typeof window !== 'undefined' && hasRecoveryLink(window.location.search, window.location.hash);

export function arrivedWithRecoveryLink(): boolean {
  return openedWithRecoveryLink;
}
