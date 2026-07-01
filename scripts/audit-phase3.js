#!/usr/bin/env node

/**
 * Phase 3 Architecture Audit Script
 *
 * Validates that Phase 3 guardrails are respected:
 *   1. computeCRI() reuses matchTeacherToJob() — no duplicate scoring logic
 *   2. No DB writes (insert/update/upsert) in Phase 3 rule-layer files
 *   3. No intelligence domain event emission in Phase 3 rule-layer code
 *   4. CRI terminology only in teacher-facing files
 *   5. No engine imports in UI components (presentation-only rule)
 *
 * Usage: node scripts/audit-phase3.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let violations = [];
let warnings = [];
let passed = 0;

// ── Helpers ────────────────────────────────────────────────────

function walkDir(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
      results.push(...walkDir(full, extensions));
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}

function relativePath(filePath) {
  return path.relative(ROOT, filePath);
}

function addViolation(rule, file, detail) {
  violations.push({ rule, file: relativePath(file), detail });
}

function addWarning(rule, file, detail) {
  warnings.push({ rule, file: relativePath(file), detail });
}

function pass(rule) {
  passed++;
}

// ── Rule-layer files ───────────────────────────────────────────

const RULE_LAYER_DIR = path.join(ROOT, "src/lib");
const RULE_LAYER_FILES = walkDir(RULE_LAYER_DIR, [".ts", ".tsx"]);

const CRI_FILES = walkDir(path.join(ROOT, "src"), [".ts", ".tsx"]).filter(
  (f) => /cri|career.?readiness/i.test(path.basename(f)) && !f.includes("node_modules")
);

const INTELLIGENCE_DIR = path.join(ROOT, "src/intelligence");
const UI_COMPONENTS_DIR = path.join(ROOT, "src/components");
const PAGES_DIR = path.join(ROOT, "src/pages");

// ── Audit 1: computeCRI must reuse matchTeacherToJob ───────────

console.log("\n🔍  Audit 1: computeCRI reuses matchTeacherToJob\n");

const matchingFile = path.join(ROOT, "src/lib/matching.ts");
if (fs.existsSync(matchingFile)) {
  const content = readFile(matchingFile);
  const hasComputeCRI = /computeCRI|compute_cri|computeCareerReadiness/i.test(content);
  const hasMatchCall = /matchTeacherToJob/i.test(content);

  if (hasComputeCRI && !hasMatchCall) {
    addViolation("GUARDRAIL-1", matchingFile, "computeCRI exists but does not call matchTeacherToJob — duplicate logic risk");
  } else if (hasComputeCRI && hasMatchCall) {
    console.log("   ✅ computeCRI found and references matchTeacherToJob");
    pass("GUARDRAIL-1");
  } else {
    console.log("   ℹ️  computeCRI not found in matching.ts (may not be implemented yet)");
    pass("GUARDRAIL-1");
  }
} else {
  console.log("   ℹ️  src/lib/matching.ts not found");
}

// ── Audit 2: No DB writes in rule-layer files ──────────────────

console.log("\n🔍  Audit 2: No DB writes in rule-layer code\n");

const DB_WRITE_PATTERNS = [
  /\.insert\s*\(/,
  /\.update\s*\(/,
  /\.upsert\s*\(/,
  /\.delete\s*\(/,
  /\.rpc\s*\(/,
];

for (const file of RULE_LAYER_FILES) {
  const content = readFile(file);
  for (const pattern of DB_WRITE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      // Check if it's importing supabase
      if (/supabase/.test(content)) {
        addViolation("GUARDRAIL-2", file, `DB write detected: ${match[0]}`);
      }
    }
  }
}

if (!violations.some((v) => v.rule === "GUARDRAIL-2")) {
  console.log("   ✅ No DB writes found in rule-layer files");
  pass("GUARDRAIL-2");
}

// ── Audit 3: No intelligence event emission in Phase 3 code ────

console.log("\n🔍  Audit 3: No intelligence event emission in rule-layer code\n");

const EVENT_PATTERNS = [
  /intelligence\.match_score/,
  /intelligence\.skill_gap/,
  /intelligence\.cri/,
  /emit\s*\(\s*["']intelligence\./,
  /domainEventBus.*emit/,
];

for (const file of RULE_LAYER_FILES) {
  const content = readFile(file);
  for (const pattern of EVENT_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      addViolation("GUARDRAIL-3", file, `Intelligence event reference in rule layer: ${match[0]}`);
    }
  }
}

if (!violations.some((v) => v.rule === "GUARDRAIL-3")) {
  console.log("   ✅ No intelligence event emission in rule-layer code");
  pass("GUARDRAIL-3");
}

// ── Audit 4: CRI terminology only in teacher-facing contexts ───

console.log("\n🔍  Audit 4: CRI terminology in correct contexts\n");

const SCHOOL_FACING_DIRS = [
  path.join(ROOT, "src/pages/app/school"),
  path.join(ROOT, "src/components/talent-search"),
];

for (const dir of SCHOOL_FACING_DIRS) {
  const files = walkDir(dir, [".ts", ".tsx"]);
  for (const file of files) {
    const content = readFile(file);
    // Check for CRI terminology in school-facing files (CRI is teacher-facing)
    if (/\bCRI\b/.test(content) || /CareerReadiness(?!.*Match)/i.test(content)) {
      // CriScoreBadge in school context is OK (it shows teacher CRI to schools)
      const basename = path.basename(file);
      if (!basename.includes("Intelligence") && !basename.includes("Cri")) {
        addWarning("GUARDRAIL-4", file, "CRI/CareerReadiness terminology found in school-facing file — verify it's used appropriately");
      }
    }
  }
}

if (!warnings.some((w) => w.rule === "GUARDRAIL-4")) {
  console.log("   ✅ CRI terminology correctly scoped to teacher-facing contexts");
  pass("GUARDRAIL-4");
} else {
  console.log("   ⚠️  Warnings found (see below)");
}

// ── Audit 5: UI components don't import engines directly ───────

console.log("\n🔍  Audit 5: UI components don't import engine logic\n");

const ENGINE_IMPORT_PATTERNS = [
  /from\s+["'].*\/matching\/engine\//,
  /from\s+["'].*\/cri\/engine\//,
  /from\s+["'].*\/gaps\/engine\//,
  /from\s+["'].*\/recommendations\/engine\//,
  /from\s+["'].*\/lib\/matching["']/,
];

const uiFiles = [
  ...walkDir(UI_COMPONENTS_DIR, [".ts", ".tsx"]),
  ...walkDir(PAGES_DIR, [".ts", ".tsx"]),
];

for (const file of uiFiles) {
  const content = readFile(file);
  for (const pattern of ENGINE_IMPORT_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      addViolation("GUARDRAIL-5", file, `Direct engine import in UI: ${match[0]}`);
    }
  }
}

if (!violations.some((v) => v.rule === "GUARDRAIL-5")) {
  console.log("   ✅ UI components do not import engine logic directly");
  pass("GUARDRAIL-5");
}

// ── Audit 6: Intelligence adapters don't import engines ────────

console.log("\n🔍  Audit 6: Intelligence adapters don't import engines\n");

const adapterDirs = [
  path.join(ROOT, "src/intelligence/adapters"),
  path.join(ROOT, "src/intelligence/consumption/adapters"),
  path.join(ROOT, "src/career"),
];

for (const dir of adapterDirs) {
  const files = walkDir(dir, [".ts", ".tsx"]);
  for (const file of files) {
    const content = readFile(file);
    for (const pattern of ENGINE_IMPORT_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        addViolation("GUARDRAIL-6", file, `Engine import in adapter/career layer: ${match[0]}`);
      }
    }
  }
}

if (!violations.some((v) => v.rule === "GUARDRAIL-6")) {
  console.log("   ✅ Adapter and Career OS layers don't import engines");
  pass("GUARDRAIL-6");
}

// ── Audit 7: No DB writes in adapter/career layers ─────────────

console.log("\n🔍  Audit 7: No DB writes in adapter/career layers\n");

for (const dir of adapterDirs) {
  const files = walkDir(dir, [".ts", ".tsx"]);
  for (const file of files) {
    const content = readFile(file);
    if (/supabase/.test(content)) {
      for (const pattern of DB_WRITE_PATTERNS) {
        const match = content.match(pattern);
        if (match) {
          addViolation("GUARDRAIL-7", file, `DB write in adapter/career layer: ${match[0]}`);
        }
      }
    }
  }
}

if (!violations.some((v) => v.rule === "GUARDRAIL-7")) {
  console.log("   ✅ No DB writes in adapter/career layers");
  pass("GUARDRAIL-7");
}

// ── Report ─────────────────────────────────────────────────────

console.log("\n" + "═".repeat(60));
console.log("  Phase 3 Architecture Audit Report");
console.log("═".repeat(60));
console.log(`\n  ✅ Passed:     ${passed}`);
console.log(`  ❌ Violations: ${violations.length}`);
console.log(`  ⚠️  Warnings:   ${warnings.length}`);

if (violations.length > 0) {
  console.log("\n── Violations ──────────────────────────────────────────\n");
  for (const v of violations) {
    console.log(`  ❌ [${v.rule}] ${v.file}`);
    console.log(`     ${v.detail}\n`);
  }
}

if (warnings.length > 0) {
  console.log("\n── Warnings ────────────────────────────────────────────\n");
  for (const w of warnings) {
    console.log(`  ⚠️  [${w.rule}] ${w.file}`);
    console.log(`     ${w.detail}\n`);
  }
}

console.log("");
process.exit(violations.length > 0 ? 1 : 0);
