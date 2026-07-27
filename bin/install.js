#!/usr/bin/env node
'use strict';

// Ставит скиллы RepoMind в проект.
//
//   npx repomind-skills            в текущую папку
//   npx repomind-skills ../proj    в указанную
//   npx repomind-skills --force    перезаписать всё, включая твои правки
//
// Обновляет только те скиллы, которых ты не касался. Изменённые тобой
// не трогает — сообщает, что вышла новая версия.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = path.join(__dirname, '..', 'skills');
const PKG = require(path.join(__dirname, '..', 'package.json'));
const MANIFEST = '.repomind.json';

const args = process.argv.slice(2).filter((a) => a !== 'init');
const force = args.includes('--force');
const target = path.resolve(args.find((a) => !a.startsWith('-')) || process.cwd());

if (args.includes('-h') || args.includes('--help')) {
  console.log(fs.readFileSync(__filename, 'utf8')
    .split('\n').slice(2, 11).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
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

/** sha256 каждого файла скилла, ключ — путь относительно папки скилла */
function hashSkill(dir) {
  const out = {};
  const walk = (d, prefix = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full, rel);
      else out[rel] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    }
  };
  walk(dir);
  return out;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Манифест: что мы положили в прошлый раз. По нему отличаем
// «пользователь правил» от «просто старая версия».
const manifestPath = path.join(agentsDir, MANIFEST);
let manifest = { version: null, skills: {} };
if (fs.existsSync(manifestPath)) {
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { /* битый — считаем, что его нет */ }
}

const next = { version: PKG.version, updated: new Date().toISOString(), skills: {} };
const stats = { added: 0, updated: 0, kept: 0, skipped: 0 };
const edited = [];
const unknown = [];

for (const name of fs.readdirSync(SRC).sort()) {
  const from = path.join(SRC, name);
  if (!fs.statSync(from).isDirectory()) continue;

  const dest = path.join(agentsDir, name);
  const fresh = hashSkill(from);

  let action;
  if (!fs.existsSync(dest)) action = 'add';
  else if (force) action = 'force';
  else {
    const current = hashSkill(dest);
    const installed = manifest.skills[name];
    // Пустая папка или папка без SKILL.md — это поломка, а не «уже стоит».
    // Чиним молча: терять там нечего.
    if (!current['SKILL.md']) action = 'repair';
    else if (same(current, fresh)) action = 'same';
    else if (!installed) action = 'unknown';      // ставили до появления манифеста
    else if (same(current, installed)) action = 'update';  // не трогали — можно обновить
    else action = 'edited';                        // правил руками — не лезем
  }

  if (['add', 'update', 'force', 'repair'].includes(action)) {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(from, dest, { recursive: true });
  }

  next.skills[name] = action === 'edited' || action === 'unknown'
    ? manifest.skills[name] || hashSkill(dest)
    : fresh;

  const line = {
    add:     () => (stats.added++,   console.log(`+  ${name}`)),
    update:  () => (stats.updated++, console.log(`⟳  ${name} — обновлён`)),
    force:   () => (stats.updated++, console.log(`⟳  ${name} — перезаписан`)),
    repair:  () => (stats.added++,   console.log(`⚡ ${name} — папка была пустая, восстановил`)),
    same:    () => (stats.kept++,    console.log(`=  ${name}`)),
    edited:  () => (stats.skipped++, edited.push(name), console.log(`⚠  ${name} — ты его правил, не трогаю`)),
    unknown: () => (stats.skipped++, unknown.push(name), console.log(`?  ${name} — не знаю, правил ты его или он просто старый`)),
  };
  line[action]();

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
    }
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2) + '\n');

const parts = [];
if (stats.added) parts.push(`добавлено ${stats.added}`);
if (stats.updated) parts.push(`обновлено ${stats.updated}`);
if (stats.kept) parts.push(`без изменений ${stats.kept}`);
if (stats.skipped) parts.push(`пропущено ${stats.skipped}`);

console.log(`\nrepomind-skills ${PKG.version}: ${parts.join(', ')}.`);

if (edited.length) {
  console.log(`
В пакете вышла новая версия этих скиллов, но у тебя они изменены:
    ${edited.join(', ')}

Посмотреть разницу:      git diff .agents/skills/
Взять версию из пакета:  npx repomind-skills --force`);
}

if (unknown.length) {
  console.log(`
Эти скиллы ставил установщик старее 0.2.1 — он не запоминал, что именно
положил, поэтому отличить твои правки от устаревшей версии нельзя:
    ${unknown.join(', ')}

Ничего в них не правил — обнови один раз, дальше будет само:
    npx repomind-skills --force`);
}

console.log(`
Дальше — в Claude Code или Codex из папки проекта:

    /docs-init`);
