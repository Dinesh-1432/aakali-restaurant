const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const htmlEntry = path.join(root, 'index.html');
const ignoredDirs = new Set(['node_modules', '.git', 'tmp']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkJavaScriptFiles() {
  const files = walk(root);
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
      cwd: root,
      encoding: 'utf8'
    });

    if (result.status !== 0) {
      process.stderr.write(result.stderr || result.stdout);
      throw new Error(`JavaScript syntax check failed: ${path.relative(root, file)}`);
    }
  }

  console.log(`Checked ${files.length} JavaScript files.`);
}

function checkInlineScripts() {
  const html = fs.readFileSync(htmlEntry, 'utf8');
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((script) => script.trim().length > 0);

  scripts.forEach((script, index) => {
    try {
      new vm.Script(script, {
        filename: `${path.basename(htmlEntry)} inline script ${index + 1}`
      });
    } catch (error) {
      throw new Error(`Inline script ${index + 1} failed syntax check: ${error.message}`);
    }
  });

  console.log(`Checked ${scripts.length} inline HTML script(s).`);
}

checkJavaScriptFiles();
checkInlineScripts();
console.log('Project checks passed.');
