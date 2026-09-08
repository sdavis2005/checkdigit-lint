import { expectedCheckDigit, kindForLength, kindForBodyLength, displayDigit, type CodeKind } from "./checksum.js";
import { parseLine, type Token } from "./parse.js";

export interface CodeIssue {
  column: number;
  message: string;
}

export interface CodeResult {
  kind: CodeKind | undefined;
  issue: CodeIssue | undefined;
}

export interface GenerateResult {
  kind: CodeKind | undefined;
  code: string | undefined;
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

// Takes a code body with the check digit missing (9 digits for ISBN-10, 11
// for UPC-A, 12 for EAN-13) and appends the correct check digit. Unlike
// checkLine, an 'X' anywhere is always an error here — it only ever means
// "this is the check digit", and the whole point of --generate is that the
// check digit isn't part of the input yet.
export function generateLine(raw: string): GenerateResult {
  const parsed = parseLine(raw);
  if (!parsed.ok) {
    return { kind: undefined, code: undefined, issue: { column: parsed.column, message: parsed.message } };
  }

  const { tokens } = parsed;
  const kind = kindForBodyLength(tokens.length);
  if (kind === undefined) {
    const column = tokens.length > 0 ? tokens[tokens.length - 1]!.column + 1 : 1;
    return {
      kind: undefined,
      code: undefined,
      issue: {
        column,
        message: `expected 9 digits (ISBN-10), 11 digits (UPC-A), or 12 digits (EAN-13) body, got ${tokens.length}`,
      },
    };
  }

  for (const token of tokens) {
    if (token.char === "X") {
      return {
        kind,
        code: undefined,
        issue: { column: token.column, message: "'X' cannot appear in a code body; it is only ever a check digit" },
      };
    }
  }

  const body = tokens.map(digitValue);
  const check = expectedCheckDigit(kind, body);
  return { kind, code: raw + displayDigit(check), issue: undefined };
}
