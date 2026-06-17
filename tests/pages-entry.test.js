"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");

assert.equal(fs.existsSync(indexPath), true, "index.html should exist for GitHub Pages root access");

const indexHtml = fs.readFileSync(indexPath, "utf8");

assert.match(indexHtml, /kaizen-farm\.html/, "index.html should link or redirect to kaizen-farm.html");
assert.match(indexHtml, /改善農園/, "index.html should identify the app in Japanese");

console.log("ok - GitHub Pages entry links to kaizen-farm.html");
