// Escapes free-text panel fields so they can't collide with serialization
// delimiters ('!' between config values, '-' between tokens, ';' between hash
// segments) or URL-special characters.
//
// encodeURIComponent already escapes ; & : / = ? # space and most specials, but it
// LEAVES - and ! (and ' ( ) * ~) untouched — so we additionally escape - and !,
// which are our structural delimiters. Everything decodeURIComponent reverses.

export function escapeText(s: string): string {
  return encodeURIComponent(s).replace(/-/g, '%2D').replace(/!/g, '%21');
}

export function unescapeText(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    // Malformed percent sequence: fall back to the raw string rather than throwing
    // (a single bad field shouldn't discard the whole board).
    return s;
  }
}
