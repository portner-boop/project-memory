#!/usr/bin/env node
'use strict';

// Ставит скиллы RepoMind в проект.
//
//   npx repomind-skills            в текущую папку
//   npx repomind-skills ../proj    в указанную
//   npx repomind-skills --force    перезаписать существующие

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'skills');

const args = process.argv.slice(2).filter((a) => a !== 'init');
const force = args.includes('--force');
const help = args.includes('-h') || args.includes('--help');
const target = path.resolve(args.find((a) => !a.startsWith('-')) || process.cwd());

if (help) {
  console.log(`
  Ставит скиллы RepoMind в проект.

    npx repomind-skills            в текущую папку
    npx repomind-skills ../proj    в указанную
    npx repomind-skills --force    перезаписать существующие

  Дальше в Claude Code или Codex:  /docs-init
`);
  process.exit(0);
}

if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  console.error(`нет такой папки: ${target}`);
  process.exit(1);
}

const agentsDir = path.join(target, '.agents', 'skills');
const claudeDir = path.join(target, '.claude', 'skills');
fs.mkdirSync(agentsDir, { recursive: true });
fs.mkdirSync(claudeDir, { recursive: true });

let added = 0;
let kept = 0;

for (const name of fs.readdirSync(SRC).sort()) {
  const from = path.join(SRC, name);
  if (!fs.statSync(from).isDirectory()) continue;

  const dest = path.join(agentsDir, name);

  if (fs.existsSync(dest) && !force) {
    console.log(`=  ${name} — уже есть, пропускаю`);
    kept++;
  } else {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(from, dest, { recursive: true });
    console.log(`+  ${name}`);
    added++;
  }

  // Claude Code читает .claude/skills, Codex — .agents/skills.
  // Держим один настоящий файл и ссылку на него.
  const link = path.join(claudeDir, name);
  const isLink = fs.existsSync(link) && fs.lstatSync(link).isSymbolicLink();

  if (isLink || !fs.existsSync(link)) {
    fs.rmSync(link, { recursive: true, force: true });
    try {
      fs.symlinkSync(path.join('..', '..', '.agents', 'skills', name), link, 'dir');
    } catch {
      fs.cpSync(dest, link, { recursive: true }); // Windows без прав на symlink
      console.log('   (symlink недоступен — скопировал)');
    }
  }
}

console.log(`
Готово: добавлено ${added}, оставлено как было ${kept}.

Дальше — в Claude Code или Codex из папки проекта:

    /docs-init

Агент осмотрит проект и развернёт структуру памяти.`);
