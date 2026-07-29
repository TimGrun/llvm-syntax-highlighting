const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const grammarPath = path.join(root, "syntaxes", "llvm.tmLanguage.json");
const grammar = JSON.parse(fs.readFileSync(grammarPath, "utf8"));

function visitRules(node, callback) {
  if (Array.isArray(node)) {
    node.forEach((item) => visitRules(item, callback));
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  callback(node);
  Object.values(node).forEach((value) => visitRules(value, callback));
}

function matchingRules(repositoryName, text) {
  const repository = grammar.repository[repositoryName];
  assert(repository, `Missing repository entry: ${repositoryName}`);

  return (repository.patterns || []).filter(
    (rule) => rule.match && new RegExp(rule.match).test(text),
  );
}

function assertMatches(repositoryName, text, expectedScope) {
  const rules = matchingRules(repositoryName, text);
  assert(rules.length > 0, `${repositoryName} does not match: ${text}`);

  if (expectedScope) {
    assert(
      rules.some(
        (rule) =>
          rule.name === expectedScope ||
          Object.values(rule.captures || {}).some(
            (capture) => capture.name === expectedScope,
          ),
      ),
      `${text} does not receive scope ${expectedScope}`,
    );
  }
}

assert.equal(grammar.scopeName, "source.ll");
assert.equal(grammar.name, "LLVM IR");

const repositoryNames = new Set(Object.keys(grammar.repository));
for (const pattern of grammar.patterns) {
  if (pattern.include && pattern.include.startsWith("#")) {
    assert(
      repositoryNames.has(pattern.include.slice(1)),
      `Unresolved include: ${pattern.include}`,
    );
  }
}

const topLevelIncludes = grammar.patterns.map((pattern) => pattern.include);
assert(
  topLevelIncludes.indexOf("#comments") < topLevelIncludes.indexOf("#symbols"),
  "Comments must take precedence over symbols",
);
assert(
  topLevelIncludes.indexOf("#strings") < topLevelIncludes.indexOf("#symbols"),
  "Strings must take precedence over symbols",
);

let regexCount = 0;
visitRules(grammar, (rule) => {
  for (const property of ["match", "begin", "end"]) {
    if (typeof rule[property] === "string") {
      new RegExp(rule[property]);
      regexCount += 1;
    }
  }
});

const expectations = [
  ["symbols", "%tmp1.sroa.34.i.as5", "variable.other.local.llvm"],
  ["symbols", "@cont_483974", "variable.other.global.llvm"],
  ["symbols", "@llvm.amdgcn.s.barrier(", "entity.name.function.llvm"],
  ["symbols", "%struct.list = type", "entity.name.type.llvm"],
  ["symbols", "!DICompileUnit(", "entity.name.type.metadata.llvm"],
  ["symbols", "#4", "variable.other.attribute-group.llvm"],
  ["labels", "if.then.i.i:", "entity.name.label.llvm"],
  ["labels", "label %if.else.i.i", "variable.other.label.llvm"],
  ["types", "ptr addrspace(4)", "storage.type.primitive.llvm"],
  ["instructions", "#dbg_value", "keyword.instruction.llvm"],
  ["instructions", "atomicrmw xchg", "keyword.instruction.llvm"],
  ["instructions", "or disjoint i64", "keyword.instruction.llvm"],
  ["modifiers", "nuw nsw nneg disjoint", "storage.modifier.llvm"],
  ["modifiers", "memory(inaccessiblemem: readwrite)", "storage.modifier.llvm"],
  ["modifiers", "amdgpu_cs", "storage.modifier.llvm"],
  ["constants", "poison", "constant.language.llvm"],
  ["constants", "DW_OP_LLVM_fragment", "constant.other.debug.llvm"],
  ["numbers", "0.000000e+00", "constant.numeric.float.llvm"],
  ["numbers", "-2147483648", "constant.numeric.integer.llvm"],
];

for (const expectation of expectations) {
  assertMatches(...expectation);
}

const fixturePaths = [path.join("lib", "test.ll"), path.join("lib", "example.ll")];
const sigilPattern = /(?<![-a-zA-Z$._0-9])[%@!#][-a-zA-Z$._0-9]+/g;
let sigilCount = 0;

for (const fixturePath of fixturePaths) {
  if (!fs.existsSync(path.join(root, fixturePath))) {
    continue;
  }
  const source = fs.readFileSync(path.join(root, fixturePath), "utf8");
  const sigils = new Set(source.match(sigilPattern) || []);
  const unclassified = [...sigils].filter(
    (token) =>
      matchingRules("symbols", token).length === 0 &&
      matchingRules("instructions", token).length === 0,
  );

  assert.deepEqual(
    unclassified,
    [],
    `${fixturePath} contains unclassified sigil tokens`,
  );
  sigilCount += sigils.size;
}

console.log(
  `Grammar validation passed: ${regexCount} regexes, ${expectations.length} scope checks, ${sigilCount} fixture tokens.`,
);