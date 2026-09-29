import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : path.endsWith(".ts") ? [path] : [];
  });
}

/** Source text without comments, so documentation can mention browser APIs freely. */
function code(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("architecture", () => {
  it("keeps src/core pure: no DOM, browser APIs, OSMD, storage or imports from outer layers", () => {
    const forbidden = [
      /from\s+["']opensheetmusicdisplay["']/,
      /from\s+["']\.\.\/(adapters|input|ui)\//,
      /from\s+["']\.\.\/app["']/,
      /\bdocument\./,
      /\bwindow\./,
      /\bnavigator\./,
      /\blocalStorage\b/,
      /\bindexedDB\b/,
      /\brequestAnimationFrame\b/,
      /\bperformance\.now\(/,
      /\bDate\.now\(/,
      /\bMath\.random\(/,
    ];
    const problems: string[] = [];
    for (const file of filesUnder("src/core")) {
      const text = code(file);
      for (const pattern of forbidden) {
        if (pattern.test(text)) problems.push(`${file}: ${pattern}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("keeps OSMD inside the adapter and view layers", () => {
    const allowed = new Set(["src/adapters/osmd-steps.ts", "src/ui/score-view.ts"]);
    const users = filesUnder("src").filter((file) =>
      /from\s+["']opensheetmusicdisplay["']/.test(code(file)),
    );
    expect(users.filter((file) => !allowed.has(file.replaceAll("\\", "/")))).toEqual([]);
  });
});
