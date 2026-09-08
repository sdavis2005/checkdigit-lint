#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { checkLine, generateLine } from "./validate.js";

function usage(): never {
  process.stderr.write("usage: checkdigit-lint [--generate] <file>\n");
  process.exit(2);
}

function formatError(file: string, lineNumber: number, rawLine: string, column: number, message: string): string {
  const location = `${file}:${lineNumber}:${column}`;
  const pointer = " ".repeat(column - 1) + "^";
  return `${location}: error: ${message}\n  ${rawLine}\n  ${pointer}\n`;
}

function parseArgs(argv: string[]): { generate: boolean; file: string } {
  let generate = false;
  const positional: string[] = [];

  for (const arg of argv) {
    if (arg === "--generate") {
      generate = true;
    } else if (arg.startsWith("-")) {
      process.stderr.write(`checkdigit-lint: unknown option '${arg}'\n`);
      usage();
    } else {
      positional.push(arg);
    }
  }

  const file = positional[0];
  if (file === undefined) {
    usage();
  }
  return { generate, file };
}

function readLines(file: string): string[] {
  let contents: string;
  try {
    contents = readFileSync(file, "utf8");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    process.stderr.write(`checkdigit-lint: could not read '${file}': ${reason}\n`);
    process.exit(2);
  }
  return contents.split(/\r?\n/);
}

function runValidate(file: string, lines: string[]): void {
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

function runGenerate(file: string, lines: string[]): void {
  let processed = 0;
  let failed = 0;

  lines.forEach((rawLine, index) => {
    if (rawLine.trim().length === 0) return;
    const lineNumber = index + 1;
    processed++;

    const result = generateLine(rawLine);
    if (result.issue !== undefined) {
      failed++;
      process.stderr.write(formatError(file, lineNumber, rawLine, result.issue.column, result.issue.message));
    } else {
      process.stdout.write(`${result.code}\n`);
    }
  });

  if (failed > 0) {
    process.stderr.write(`${processed} code(s) processed, ${failed} failed\n`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

function main(): void {
  const { generate, file } = parseArgs(process.argv.slice(2));
  const lines = readLines(file);

  if (generate) {
    runGenerate(file, lines);
  } else {
    runValidate(file, lines);
  }
}

main();
