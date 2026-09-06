import { expectedCheckDigit, kindForLength, displayDigit, type CodeKind } from "./checksum.js";
import { parseLine, type Token } from "./parse.js";

export interface CodeIssue {
  column: number;
  message: string;
}

export interface CodeResult {
  kind: CodeKind | undefined;
  issue: CodeIssue | undefined;
}

function digitValue(token: Token): number {
  return token.char === "X" ? 10 : Number(token.char);
}

export function checkLine(raw: string): CodeResult {
  const parsed = parseLine(raw);
  if (!parsed.ok) {
    return { kind: undefined, issue: { column: parsed.column, message: parsed.message } };
  }

  const { tokens } = parsed;
  const kind = kindForLength(tokens.length);
  if (kind === undefined) {
    const column = tokens.length > 0 ? tokens[tokens.length - 1]!.column + 1 : 1;
    return {
      kind: undefined,
      issue: {
        column,
        message: `expected 10 digits (ISBN-10), 12 digits (UPC-A), or 13 digits (EAN-13), got ${tokens.length}`,
      },
    };
  }

  // 'X' is only meaningful as the ISBN-10 check digit; anywhere else it is
  // not a valid digit for any of the three formats.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.char !== "X") continue;
    const isLastOfIsbn10 = kind === "ISBN-10" && i === tokens.length - 1;
    if (!isLastOfIsbn10) {
      return {
        kind,
        issue: {
          column: token.column,
          message: "'X' is only valid as the final check digit of a 10-digit ISBN",
        },
      };
    }
  }

  const body = tokens.slice(0, -1).map(digitValue);
  const actualToken = tokens[tokens.length - 1]!;
  const actual = digitValue(actualToken);
  const expected = expectedCheckDigit(kind, body);

  if (actual !== expected) {
    return {
      kind,
      issue: {
        column: actualToken.column,
        message: `invalid check digit for ${kind}: expected ${displayDigit(expected)}, got ${displayDigit(actual)}`,
      },
    };
  }

  return { kind, issue: undefined };
}
