// Check-digit math for the three code formats this tool understands.
// All three reduce to "weighted sum of body digits, check digit fills the
// remainder to a multiple of the modulus" but the weights and modulus differ
// enough (and the ISBN-10 'X' sentinel is odd enough) that a single generic
// function would need more branching than just writing three functions.

export type CodeKind = "ISBN-10" | "UPC-A" | "EAN-13";

export function kindForLength(digitCount: number): CodeKind | undefined {
  switch (digitCount) {
    case 10:
      return "ISBN-10";
    case 12:
      return "UPC-A";
    case 13:
      return "EAN-13";
    default:
      return undefined;
  }
}

// Same three formats, but keyed on the length of the body alone (full length
// minus the check digit) — what --generate sees, since the whole point is
// that the check digit isn't there yet.
export function kindForBodyLength(bodyLength: number): CodeKind | undefined {
  switch (bodyLength) {
    case 9:
      return "ISBN-10";
    case 11:
      return "UPC-A";
    case 12:
      return "EAN-13";
    default:
      return undefined;
  }
}

// body has 9 digits (0-9). Result is 0-10, where 10 is displayed as 'X'.
export function isbn10CheckDigit(body: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    sum += body[i]! * (10 - i);
  }
  return (11 - (sum % 11)) % 11;
}

// body has 11 digits. Odd positions (1st, 3rd, ...) weight 3, even weight 1.
export function upcACheckDigit(body: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const weight = i % 2 === 0 ? 3 : 1;
    sum += body[i]! * weight;
  }
  return (10 - (sum % 10)) % 10;
}

// body has 12 digits. Odd positions weight 1, even weight 3 (mirror of UPC-A).
export function ean13CheckDigit(body: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const weight = i % 2 === 0 ? 1 : 3;
    sum += body[i]! * weight;
  }
  return (10 - (sum % 10)) % 10;
}

export function expectedCheckDigit(kind: CodeKind, body: readonly number[]): number {
  switch (kind) {
    case "ISBN-10":
      return isbn10CheckDigit(body);
    case "UPC-A":
      return upcACheckDigit(body);
    case "EAN-13":
      return ean13CheckDigit(body);
  }
}

export function displayDigit(value: number): string {
  return value === 10 ? "X" : String(value);
}
