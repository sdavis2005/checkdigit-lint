// Turns one raw input line into an ordered list of significant characters
// (digits and 'X'), each tagged with its 1-indexed column in the *original*
// line. Separators are dropped but never renumber anything after them, so a
// reported column always lines up under the source line when printed back.

export interface Token {
  char: string; // '0'-'9' or 'X'
  column: number;
}

export interface ParsedLine {
  ok: true;
  tokens: Token[];
}

export interface ParseError {
  ok: false;
  column: number;
  message: string;
}

const SEPARATORS = new Set([" ", "\t", "-"]);

export function parseLine(raw: string): ParsedLine | ParseError {
  const tokens: Token[] = [];
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (SEPARATORS.has(ch)) {
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      tokens.push({ char: ch, column: i + 1 });
      continue;
    }
    if (ch === "X" || ch === "x") {
      tokens.push({ char: "X", column: i + 1 });
      continue;
    }
    return {
      ok: false,
      column: i + 1,
      message: `unexpected character '${ch}' (expected a digit, 'X', '-', or a space)`,
    };
  }
  return { ok: true, tokens };
}
