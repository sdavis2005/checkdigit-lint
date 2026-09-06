#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { checkLine } from "./validate.js";

function usage(): never {
  process.stderr.write("usage: checkdigit-lint <file>\n");
  process.exit(2);
}

function formatError(file: string, lineNumber: number, rawLine: string, column: number, message: string): string {
  const location = `${file}:${lineNumber}:${column}`;
  const pointer = " ".repeat(column - 1) + "^";
  return `${location}: error: ${message}\n  ${rawLine}\n  ${pointer}\n`;
}

function main(): void {
  const file = process.argv[2];
  if (file === undefined) {
    usage();
  }

  let contents: string;
  try {
    contents = readFileSync(file, "utf8");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    process.stderr.write(`checkdigit-lint: could not read '${file}': ${reason}\n`);
    process.exit(2);
  }

  const lines = contents.split(/\r?\n/);
  let checked = 0;
  let invalid = 0;

  lines.forEach((rawLine, index) => {
    if (rawLine.trim().length === 0) return;
    const lineNumber = index + 1;
    checked++;

    const result = checkLine(rawLine);
    if (result.issue !== undefined) {
      invalid++;
      process.stderr.write(formatError(file, lineNumber, rawLine, result.issue.column, result.issue.message));
    }
  });

  const valid = checked - invalid;
  process.stdout.write(`${checked} code(s) checked, ${valid} valid, ${invalid} invalid\n`);
  process.exit(invalid > 0 ? 1 : 0);
}

main();
