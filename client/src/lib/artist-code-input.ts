const STAFF_ARTIST_CODE_PATTERN = /^[A-Z]{3}-[0-9]{3}-[A-Z]{3}$/i;
const ARTIST_CODE_PREFIX_PATTERN = /^VA[_-]/i;

export function isStaffArtistCode(value: string): boolean {
  return STAFF_ARTIST_CODE_PATTERN.test(value.trim());
}

export function isArtistCodeLoginInput(value: string): boolean {
  const input = value.trim();
  return ARTIST_CODE_PREFIX_PATTERN.test(input) || isStaffArtistCode(input);
}
