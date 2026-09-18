#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { checkLine, generateLine } from "./validate.js";
import { parseCodeKind, type CodeKind } from "./checksum.js";

function usage(): never {
  process.stderr.write("usage: checkdigit-lint [--generate] [--type isbn10|upc-a|ean13|issn] <file>\n");
  process.exit(2);
}

function formatError(file: string, lineNumber: number, rawLine: string, column: number, message: string): string {
  const location = `${file}:${lineNumber}:${column}`;
  const pointer = " ".repeat(column - 1) + "^";
  return `${location}: error: ${message}\n  ${rawLine}\n  ${pointer}\n`;
}

function parseArgs(argv: string[]): { generate: boolean; file: string; type: CodeKind | undefined } {
  let generate = false;
  let type: CodeKind | undefined;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--generate") {
      generate = true;
      continue;
    }
    if (arg === "--type" || arg.startsWith("--type=")) {
      const value = arg === "--type" ? argv[++i] : arg.slice("--type=".length);
      if (value === undefined) {
        process.stderr.write("checkdigit-lint: --type requires a value (isbn10, upc-a, ean13, or issn)\n");
        usage();
      }
      const parsed = parseCodeKind(value);
      if (parsed === undefined) {
        process.stderr.write(`checkdigit-lint: unknown --type '${value}' (expected isbn10, upc-a, ean13, or issn)\n`);
        usage();
      }
      type = parsed;
      continue;
    }
    if (arg.startsWith("-")) {
      process.stderr.write(`checkdigit-lint: unknown option '${arg}'\n`);
      usage();
    }
    positional.push(arg);
  }

  const file = positional[0];
  if (file === undefined) {
    usage();
  }
  return { generate, file, type };
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

function runValidate(file: string, lines: string[], type: CodeKind | undefined): void {
  let checked = 0;
  let invalid = 0;

  lines.forEach((rawLine, index) => {
    if (rawLine.trim().length === 0) return;
    const lineNumber = index + 1;
    checked++;

    const result = checkLine(rawLine, type);
    if (result.issue !== undefined) {
      invalid++;
      process.stderr.write(formatError(file, lineNumber, rawLine, result.issue.column, result.issue.message));
    }
  });

  const valid = checked - invalid;
  process.stdout.write(`${checked} code(s) checked, ${valid} valid, ${invalid} invalid\n`);
  process.exit(invalid > 0 ? 1 : 0);
}

function runGenerate(file: string, lines: string[], type: CodeKind | undefined): void {
  let processed = 0;
  let failed = 0;

  lines.forEach((rawLine, index) => {
    if (rawLine.trim().length === 0) return;
    const lineNumber = index + 1;
    processed++;

    const result = generateLine(rawLine, type);
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
  const { generate, file, type } = parseArgs(process.argv.slice(2));
  const lines = readLines(file);

  if (generate) {
    runGenerate(file, lines, type);
  } else {
    runValidate(file, lines, type);
  }
}

main();
