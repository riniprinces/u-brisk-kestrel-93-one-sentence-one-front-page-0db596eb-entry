// One Sentence, One Front Page — make.fun bounty entry
//
// This program takes the front-page headline for 23 November 2026 from
// entry.txt, checks it against every rule of the bounty, and copies it to
// /output/entry.txt exactly as written so the AI judge reads the same line.
//
// Rules enforced here:
//   * the headline is a single sentence (one terminal punctuation mark)
//   * it is between 1 and 200 characters long
//   * it contains no leading or trailing whitespace
//   * the file is valid UTF-8 and holds nothing but the headline

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const HEADLINE =
  "Democrats seize 258 House seats, their biggest majority since 1992, and vow to rein in Trump from January.";

const RULES = {
  minLength: 1,
  maxLength: 200,
  terminalMarks: /[.!?]$/,
  sentenceEndings: /[.!?]/g,
} as const;

const botDir = resolve(process.env.MAKEFUN_BOT_DIR ?? "/bot");
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");
const inputFile = join(botDir, "entry.txt");
const outputFile = join(outputDir, "entry.txt");

class HeadlineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HeadlineError";
  }
}

function loadHeadline(path: string): string {
  if (!existsSync(path)) {
    throw new HeadlineError(`Cannot find the headline file: ${path}`);
  }
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (cause) {
    throw new HeadlineError(
      `entry.txt is not readable as UTF-8 text: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }
  // Tolerate a single trailing newline from editors; anything else is part
  // of the headline and must pass validation as-is.
  return raw.endsWith("\n") ? raw.slice(0, -1) : raw;
}

function checkLength(headline: string): void {
  const n = [...headline].length;
  if (n < RULES.minLength) {
    throw new HeadlineError("The headline is empty; write one sentence.");
  }
  if (n > RULES.maxLength) {
    throw new HeadlineError(
      `The headline is ${n} characters, ${n - RULES.maxLength} over the 200-character limit.`,
    );
  }
}

function checkSingleSentence(headline: string): void {
  if (headline.trim() !== headline) {
    throw new HeadlineError(
      "The headline starts or ends with whitespace; trim it first.",
    );
  }
  const endings = headline.match(RULES.sentenceEndings) ?? [];
  if (endings.length === 0) {
    throw new HeadlineError(
      "The headline has no sentence-ending mark; end it with a full stop.",
    );
  }
  if (endings.length > 1) {
    throw new HeadlineError(
      `The headline ends ${endings.length} sentences; a front page carries exactly one.`,
    );
  }
  if (!RULES.terminalMarks.test(headline)) {
    throw new HeadlineError(
      "The sentence-ending mark must be the last character of the headline.",
    );
  }
}

function checkHeadline(headline: string): void {
  checkLength(headline);
  checkSingleSentence(headline);
  if (/\s{2,}/.test(headline)) {
    throw new HeadlineError("The headline contains a double space.");
  }
}

function publish(headline: string): void {
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, headline, "utf-8");
  const written = readFileSync(outputFile, "utf-8");
  if (written !== headline) {
    throw new HeadlineError(
      "Verification failed: the output file does not match the headline.",
    );
  }
}

function run(): number {
  const headline = loadHeadline(inputFile);

  if (headline !== HEADLINE) {
    console.warn(
      "[warn] entry.txt does not match the headline constant baked into main.ts.",
    );
  }

  checkHeadline(headline);
  publish(headline);

  const chars = [...headline].length;
  console.log(`[ok] Headline valid: ${chars} characters, one sentence.`);
  console.log(`[ok] ${inputFile} -> ${outputFile}`);
  console.log(headline);
  return 0;
}

try {
  process.exitCode = run();
} catch (error) {
  if (error instanceof HeadlineError) {
    console.error(`[error] ${error.message}`);
  } else {
    console.error(
      `[error] Unexpected failure: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  process.exitCode = 1;
}
