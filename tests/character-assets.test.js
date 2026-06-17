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
    alt: "凪（農園長）",
    path: "assets/characters/nagi-farm-manager-v2.svg",
  },
  {
    label: "蓮",
    alt: "蓮（収穫担当）",
    path: "assets/characters/ren-harvest-manager-v2.svg",
  },
];

for (const character of characters) {
  const assetPath = path.join(root, character.path);
  assert.equal(fs.existsSync(assetPath), true, `${character.label} image should exist`);
  const assetSource = fs.readFileSync(assetPath, "utf8");
  assert.match(assetSource, /viewBox="0 0 512 512"/, `${character.label} image should keep a 512px viewBox`);
  assert.match(assetSource, new RegExp(`<title id="title">${character.alt}</title>`), `${character.label} image should include an accessible title`);
  assert.match(appSource, new RegExp(character.path.replaceAll("/", "\\/")), `${character.label} image should be referenced in markup`);
  assert.match(appSource, new RegExp(`alt="${character.alt}"`), `${character.label} image should have a useful alt label`);
}

assert.doesNotMatch(styleSource, /background-image: url\("assets\/characters\//, "character images should not be CSS backgrounds");

console.log("ok - character images are present and referenced");
