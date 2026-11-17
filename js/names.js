// Username rules. MUST match the regex in firestore.rules (usernames + users) – ASCII only, so that lower-casing is identical everywhere.
export const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _.-]{1,22}[A-Za-z0-9]$/;
export const NAME_HELP = 'Use 3–24 characters: letters, numbers, space, dot, dash or underscore (start and end with a letter or number).';
export const nameError = n => (NAME_RE.test(n) ? '' : NAME_HELP);
// Turns any text (e.g. a Discord display name with emoji/accents) into the closest valid username, or '' if nothing usable is left.
export function cleanName(s) {
  let n = String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 _.-]/g, '').replace(/\s+/g, ' ').trim();
  n = n.slice(0, 24).replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
  return NAME_RE.test(n) ? n : '';
}
