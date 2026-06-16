"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "kaizen-farm-app.js"), "utf8");
const styleSource = fs.readFileSync(path.join(root, "kaizen-farm.css"), "utf8");

const characters = [
  {
    label: "凪",
    path: "assets/characters/nagi-farm-manager.jpg",
  },
  {
    label: "蓮",
    path: "assets/characters/ren-harvest-manager.jpg",
  },
];

for (const character of characters) {
  const assetPath = path.join(root, character.path);
  assert.equal(fs.existsSync(assetPath), true, `${character.label} image should exist`);
  assert.match(styleSource, new RegExp(character.path.replaceAll("/", "\\/")), `${character.label} image should be referenced`);
  assert.match(appSource, character.label === "凪" ? /なぎ/ : /れん/, `${character.label} should keep a text fallback`);
}

console.log("ok - character images are present and referenced");
