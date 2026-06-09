const fs = require("fs");
const path = require("path");

const targetFile = path.join(
  __dirname,
  "..",
  "node_modules",
  "enhanced-resolve",
  "lib",
  "Resolver.js"
);

if (!fs.existsSync(targetFile)) {
  console.log("enhanced-resolve not found, skipping patch");
  process.exit(0);
}

let content = fs.readFileSync(targetFile, "utf-8");
let modified = false;

// The finishResolved function as it currently exists (patched):
const patchedVersion = `\t\tconst finishResolved = (result) => {
\t\t\tconst resultPath = result.path;
\t\t\tif (resultPath === false) return callback(null, false, result);
\t\t\tconst resultQuery = result.query ?? "";
\t\t\treturn callback(
\t\t\t\tnull,
\t\t\t\t\`\${resultPath}\${resultQuery}\${result.fragment || ""}\`,
\t\t\t\tresult,
\t\t\t);
\t\t};`;

// The original version that has the null-byte escape bug:
const originalVersion = `\t\tconst finishResolved = (result) => {
\t\t\tconst resultPath = result.path;
\t\t\tif (resultPath === false) return callback(null, false, result);
\t\t\tconst escapedPath = resultPath.includes("#")
\t\t\t\t? resultPath.replace(HASH_ESCAPE_RE, "\\0#")
\t\t\t\t: resultPath;
\t\t\tconst resultQuery = result.query;
\t\t\tlet escapedQuery;
\t\t\tif (resultQuery) {
\t\t\t\tescapedQuery = resultQuery.includes("#")
\t\t\t\t\t? resultQuery.replace(HASH_ESCAPE_RE, "\\0#")
\t\t\t\t\t: resultQuery;
\t\t\t} else {
\t\t\t\tescapedQuery = "";
\t\t\t}
\t\t\treturn callback(
\t\t\t\tnull,
\t\t\t\t\`\${escapedPath}\${escapedQuery}\${result.fragment || ""}\`,
\t\t\t\tresult,
\t\t\t);
\t\t};`;

// Try to match original (unpatched) first
if (content.includes(originalVersion)) {
  content = content.replace(originalVersion, patchedVersion);
  modified = true;
  console.log(
    "Patched enhanced-resolve: removed null-byte # escape in resolved paths"
  );
} else if (content.includes(patchedVersion)) {
  console.log("enhanced-resolve already patched, skipping");
} else {
  // Try more flexible matching - look for the hash escape regex usage
  const hashEscapeRegex = /resultPath\.includes\("#"\)\s*\?\s*resultPath\.replace\(/;
  if (hashEscapeRegex.test(content)) {
    // Replace the entire finishResolved function
    const finishResolvedMatch = content.match(
      /const finishResolved = \(result\) => \{[\s\S]*?\};/
    );
    if (finishResolvedMatch) {
      content = content.replace(finishResolvedMatch[0], patchedVersion);
      modified = true;
      console.log(
        "Patched enhanced-resolve (flexible match): removed null-byte # escape"
      );
    }
  } else {
    // Check if HASH_ESCAPE_RE is defined but not used
    const hasHashEscapeRe = content.includes("const HASH_ESCAPE_RE");
    const hasEscapedPath = content.includes("escapedPath");
    if (hasHashEscapeRe && !hasEscapedPath) {
      console.log(
        "enhanced-resolve: HASH_ESCAPE_RE defined but no longer used (looks already patched)"
      );
    } else {
      console.warn(
        "Warning: Could not find expected pattern in enhanced-resolve. The version may have changed."
      );
      console.warn(
        "Windows paths containing '#' may produce null-byte errors."
      );
    }
  }
}

if (modified) {
  fs.writeFileSync(targetFile, content, "utf-8");
  console.log("enhanced-resolve patched successfully");
}
