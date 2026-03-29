const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const destination = path.join(projectRoot, "android", "app", "src", "main", "assets", "www");

const allowedExtensions = new Set([
  ".html",
  ".js",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".ico",
  ".css",
  ".sql"
]);

const blockedFiles = new Set([
  "electron-main.js",
  "package.json",
  "package-lock.json"
]);

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });

let copied = 0;

for (const entry of fs.readdirSync(projectRoot, { withFileTypes: true })) {
  if (!entry.isFile()) continue;

  const fileName = entry.name;
  const extension = path.extname(fileName).toLowerCase();
  if (blockedFiles.has(fileName) || !allowedExtensions.has(extension)) {
    continue;
  }

  fs.copyFileSync(path.join(projectRoot, fileName), path.join(destination, fileName));
  copied += 1;
}

console.log(`Prepared Android web assets: ${copied} files copied to ${destination}`);
