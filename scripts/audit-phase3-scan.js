const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

function findInFiles(dir, pattern) {
  const results = [];
  function walk(current) {
    const files = fs.readdirSync(current);
    for (const file of files) {
      const full = path.join(current, file);
      if (file === "node_modules" || file === ".git" || file === "bun.lock" || file === "bun.lockb") continue;
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else {
        const content = fs.readFileSync(full, "utf8");
        if (content.includes(pattern)) {
          results.push(full);
        }
      }
    }
  }
  walk(dir);
  return results;
}

function check(label, pattern) {
  const res = findInFiles(ROOT, pattern);
  console.log("\n--------------------------------");
  console.log(label);
  console.log("pattern:", pattern);
  if (res.length === 0) {
    console.log("❌ NOT FOUND");
  } else {
    console.log("✅ FOUND in:");
    res.slice(0, 5).forEach(f => console.log("   ", path.relative(ROOT, f)));
  }
}

console.log("\n==== EduLink Phase 3 Audit ====\n");

/* Phase 3.3 */
check("Rejection Event", "hiring.application_rejected");
check("Rejection Taxonomy", "rejection_reasons");
check("Gap Refresh Intent", "skill_gap_refresh_requested");

/* Phase 3.4 */
check("Recommendation Engine", "recommendation");
check("Recommendation Snapshot", "TeacherRecommendationsSnapshot");

/* Phase 3.5 */
check("Verified Snapshot", "TeacherVerifiedStateSnapshot");
check("Verification Event", "document_verified");

console.log("\n==== Audit Complete ====");
