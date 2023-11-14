function _snakeCaseB(s: string): string {
  const len = s.length;
  if (len < 2) return s.toLowerCase();

  const upper = s.toUpperCase();
  const lower = s.toLowerCase();
  let out = lower.charAt(0);

  for (let i = 1; i < len; i++) {
    const char = s.charAt(i);
    const prevChar = s.charAt(i - 1);

    const upperChar = upper.charAt(i);
    const lowerChar = lower.charAt(i);

    const lowerPrevChar = lower.charAt(i - 1);
    const charIsWordChar = /[a-z]/i.test(char);
    const prevCharIsWordChar = /[a-z]/i.test(prevChar);

    if (charIsWordChar && char == upperChar) {
      if (prevCharIsWordChar && prevChar == lowerPrevChar) {
        out += '_';
      }
    }

    out += lowerChar;
  }

  return out;
}

export function _snakeCase(s: string): string {
  const len = s.length;
  if (len < 2) return s.toLowerCase();

  let out = s.charAt(0).toLowerCase();

  for (let i = 1; i < len; i++) {
    const char = s.charAt(i);
    const prevChar = s.charAt(i - 1);

    const upperChar = char.toUpperCase();
    const lowerChar = char.toLowerCase();

    const lowerPrevChar = prevChar.toLowerCase();
    const charIsWordChar = /[a-z]/i.test(char);
    const prevCharIsWordChar = /[a-z]/i.test(prevChar);

    if (charIsWordChar && char == upperChar) {
      if (prevCharIsWordChar && prevChar == lowerPrevChar) {
        out += '_';
      }
    }

    out += lowerChar;
  }

  return out;
}