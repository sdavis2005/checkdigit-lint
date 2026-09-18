# checkdigit-lint

A command-line tool that checks whether ISBN, ISSN, and barcode numbers in a
file have valid check digits. Point it at a text file with one code per line
and it tells you exactly which lines are wrong, down to the column of the
bad digit.

It understands four formats, auto-detected by digit count after stripping
hyphens and spaces:

- ISSN (8 digits, last one may be `X`)
- ISBN-10 (10 digits, last one may be `X`)
- UPC-A (12 digits)
- EAN-13 / ISBN-13 (13 digits)

## Why

Check digits catch typos, not fraud: a single mistyped or transposed digit
in an ISBN or barcode almost always fails the checksum. That makes them
useful to validate in bulk — a spreadsheet of ISBNs exported from a catalog,
a list of UPCs pasted from a supplier, a CSV column dumped to a text file.
This tool is for checking a batch of those against a terminal, in a script,
or in CI, without pulling in a barcode library.

## Usage

```
checkdigit-lint <file>
```

Given `codes.txt`:

```
978-0-306-40615-9
0-306-40615-2
036000291455
9780306406157
```

Running:

```
$ node dist/main.js codes.txt
codes.txt:1:17: error: invalid check digit for EAN-13: expected 7, got 9
  978-0-306-40615-9
                  ^
codes.txt:3:12: error: invalid check digit for UPC-A: expected 2, got 5
  036000291455
           ^
4 code(s) checked, 2 valid, 2 invalid
```

(Lines 2 and 4 are the ISBN-10 and ISBN-13 forms of the same real book and
both check out; lines 1 and 3 each have one digit changed from a valid code,
enough to fail the checksum.)

The exit code is `1` if any line failed, `0` if every line checked out. Blank
lines are skipped. Hyphens and spaces inside a code are ignored, but any
other character — a stray letter, a comma from a badly exported CSV — is
reported as a parse error at its exact column, before checksum validation
even runs.

## Overriding the format

Auto-detection picks a format by digit count alone, so a UPC-A with a digit
dropped by a typo (11 digits instead of 12) doesn't fail as "wrong length" —
it gets silently reinterpreted as an ISBN-10 and checked against the wrong
math entirely. If you know every line in a file is meant to be one format,
pin it with `--type`:

```
checkdigit-lint --type upc-a codes.txt
```

Accepted values (case-insensitive): `isbn10`, `upc-a` (or `upc`), `ean13`,
`issn`. `--type=upc-a` works too. With `--type` set, a code whose digit count
doesn't match that format is reported as a length error naming the forced
format, instead of falling through to auto-detection. `--type` applies to
`--generate` as well, checked against body length instead of full length.

## Generating a missing check digit

`--generate` runs the tool the other way around: point it at a file of code
*bodies* — the digits with the check digit left off — and it appends the
correct one to each line.

```
checkdigit-lint --generate bodies.txt
```

Given `bodies.txt`:

```
978-0-306-40615
0-306-40615
03600029145
```

Running:

```
$ node dist/main.js --generate bodies.txt
978-0-306-40615-9
0-306-40615-2
036000291455
```

The body length picks the format the same way full-code length does, minus
the check digit: 7 digits for ISSN, 9 for ISBN-10, 11 for UPC-A, 12 for
EAN-13. `X` isn't accepted anywhere in the input, since in every one of
these formats it can only ever be the check digit itself, never a body
digit. Parse and length errors are reported the same way as in the default
mode, with a line and column pointer.

## Building

There are no dependencies to install. Compile with the TypeScript compiler
you already have, or install `typescript` yourself:

```
npx tsc
node dist/main.js codes.txt
```

## Status

Early. It validates ISBN-10, ISSN, UPC-A, and EAN-13, can generate a missing
check digit, and lets you pin the format with `--type`. It doesn't yet
handle ISMN, read from stdin, or have a test suite. See the roadmap in the
project tracker for what's next.
