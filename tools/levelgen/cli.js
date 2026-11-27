#!/usr/bin/env node
/*
 * NEON LOOPS 关卡生成器命令行（Node 16+，不需要装任何依赖）
 *
 *   node tools/levelgen/cli.js check [--from N] [--to N] [--file 关卡.json] [--json]
 *       按 docs/level-rules.md 验收关卡（默认 src/levels.js 全部关卡）。全部通过时退出码 0，否则 1。
 *   node tools/levelgen/cli.js gen --level N [--seeds 60] [--seed0 1] [--out 文件.json] [--minutes 10]
 *       按 tools/levelgen/curve.js 第 N 关的目标生成一关，打印指标；--out 保存关卡 JSON。
 *   node tools/levelgen/cli.js measure --file 关卡.json --level N
 *       量一关的指标并验收（不跨关卡检查）。
 *   node tools/levelgen/cli.js apply --level N --file 关卡.json [--name 中文名 --en ENGLISH --tip 提示]
 *       把关卡写进 src/levels.js 的第 N 关（N 比现有关卡数大 1 时追加）。写完自动跑一遍 check（--nocheck 跳过）。
 *   node tools/levelgen/cli.js curve
 *       打印 1-40 关的难度曲线。
 */
'use strict';
const fs = require('fs'), path = require('path');
const GEN = require('./levelgen.js');
const ROOT = path.join(__dirname, '..', '..');
const LEVELS_FILE = path.join(ROOT, 'src', 'levels.js');

function args() {
  const a = process.argv.slice(2), o = { _: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const k = a[i].slice(2), v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
      o[k] = v;
    } else o._.push(a[i]);
  }
  return o;
}
function loadLevels() {
  delete require.cache[require.resolve(LEVELS_FILE)];
  delete globalThis.RRLevels;
  require(LEVELS_FILE);
  return globalThis.RRLevels;
}
function readLevel(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return j.level || j;
}
const pad = (s, n) => String(s).padEnd(n);

function printRows(rows) {
  console.log(pad('关', 4) + pad('零件', 6) + pad('步数', 7) + pad('陷阱', 6) + pad('死局', 6) + pad('回头', 6) + pad('最小环', 8) + pad('管子', 6) + pad('指数', 6) + pad('耗时', 8) + '结果');
  for (const r of rows) {
    const m = r.m;
    console.log(pad((GEN.isHard(r.n) ? 'H' : '') + r.n, 4) + pad(m.pieces, 6) + pad(m.par == null ? '-' : m.par + (m.exact ? '' : '~'), 7) +
      pad(m.trap == null ? '-' : m.trap, 6) + pad(m.dead == null ? '-' : m.dead, 6) + pad(m.revisit == null ? '-' : m.revisit, 6) +
      pad(m.minRingPx + 'px', 8) + pad(m.tubePx + 'px', 7) + pad(m.D == null ? '-' : m.D, 6) + pad((m.ms / 1000).toFixed(1) + 's', 8) + (r.fails.length ? 'FAIL' : 'PASS'));
    for (const f of r.fails) console.log('      ✗ ' + f);
  }
}

function check(o) {
  const levels = o.file ? JSON.parse(fs.readFileSync(o.file, 'utf8')) : loadLevels();
  const rows = GEN.checkAll(levels, { from: +o.from || 0, to: +o.to || 0 });
  if (o.json) console.log(JSON.stringify(rows.map((r) => ({ n: r.n, fails: r.fails, metrics: r.m })), null, 1));
  else printRows(rows);
  const bad = rows.filter((r) => r.fails.length).length;
  console.log(bad ? `\n${bad} 关没通过验收` : `\n${rows.length} 关全部通过验收`);
  return bad ? 1 : 0;
}

function gen(o) {
  const n = +o.level;
  if (!n || !GEN.CURVE[n - 1]) { console.error('用法：gen --level N（1-' + GEN.CURVE.length + '）'); return 2; }
  // 跨关卡检查的上下文：用 src/levels.js 里第 N 关之前的关卡
  const levels = loadLevels().slice(0, n - 1);
  let maxPieces = 0; const feats = new Set(), sigs = new Set();
  const C = globalThis.RRCore;
  levels.forEach((lv) => { const m = GEN.measure(lv, { solve: false }); maxPieces = Math.max(maxPieces, m.pieces); GEN.features(m).forEach((x) => feats.add(x)); sigs.add(GEN.signature(lv, m)); });
  const g0 = Math.floor((n - 1) / 5) * 5;
  const groupD = levels.slice(g0, n - 1).map((lv, i) => GEN.diffIndex(GEN.measure(lv, { n: g0 + i + 1 }))).filter((d) => d != null);
  // 提示文字在 apply 时才写进去，生成时先不查
  const ctx = levels.length === n - 1 ? { prevMaxPieces: maxPieces, prevFeatures: n > 1 ? feats : null, prevSigs: sigs, groupD, noTipCheck: true } : null;
  const res = GEN.generate(n, { seeds: +o.seeds || 60, seed0: +o.seed0 || 1, ctx, timeLimit: o.minutes ? +o.minutes * 60000 : 0, first: !!o.first });
  console.log(`第 ${n} 关：试了 ${Object.values(res.stats).reduce((a, b) => a + b, 0)} 个种子，用时 ${(res.ms / 1000).toFixed(0)}s`);
  console.log('淘汰原因统计：' + JSON.stringify(res.stats));
  if (!res.best) { console.log('没有通过验收的候选。可以加 --seeds、换 --seed0，或者放宽 curve.js 里这一关的范围。'); return 1; }
  const m = res.best.metrics;
  console.log(`选中 seed=${res.best.seed}（${res.best.template}）：零件 ${m.pieces}，步数 ${m.par}${m.exact ? '' : '~'}，陷阱 ${m.trap}，死局 ${m.dead}，回头 ${m.revisit}，难度指数 ${m.D}，最小环 ${m.minRingPx}px`);
  console.log('最优解：' + m.solution);
  const out = { n, seed: res.best.seed, template: res.best.template, metrics: m, level: res.best.level };
  if (o.out) { fs.writeFileSync(o.out, JSON.stringify(out, null, 1)); console.log('已保存 ' + o.out); }
  else console.log(JSON.stringify(res.best.level));
  return 0;
}

function measure(o) {
  const n = +o.level || 1, lv = readLevel(o.file);
  const m = GEN.measure(lv, { n });
  const fails = GEN.accept(lv, m, n);
  printRows([{ n, m, fails }]);
  console.log(JSON.stringify(m, null, 1));
  return fails.length ? 1 : 0;
}

function apply(o) {
  const n = +o.level, levels = loadLevels();
  if (!n || n > levels.length + 1) { console.error('用法：apply --level N --file 关卡.json（N ≤ ' + (levels.length + 1) + '）'); return 2; }
  const lv = readLevel(o.file), old = levels[n - 1] || {};
  lv.name = o.name || lv.name || old.name || '';
  lv.en = o.en || lv.en || old.en || '';
  lv.tip = o.tip || lv.tip || old.tip || '';
  if (GEN.isHard(n)) lv.hard = true; else delete lv.hard;
  levels[n - 1] = lv;
  fs.writeFileSync(LEVELS_FILE, GEN.formatLevels(levels));
  console.log('已写入 src/levels.js 第 ' + n + ' 关');
  return o.nocheck ? 0 : check({});
}

function curve() {
  console.log(pad('关', 4) + pad('零件', 8) + pad('步数', 8) + pad('陷阱≥', 7) + pad('来源', 22) + '新机制');
  for (const s of GEN.CURVE) {
    const src = s.tpl ? '模板 ' + s.tpl : `生成 根${s.grow.hubs.join('-')} 杆${s.grow.bars.join('-')} 桥${s.grow.bridges.join('-')} 钉${s.grow.knobs}`;
    console.log(pad((s.hard ? 'H' : '') + s.n, 4) + pad(s.pieces.join('-'), 8) + pad(s.par.join('-'), 8) + pad(s.trap, 7) + pad(src, 22) + (s.new || ''));
  }
  return 0;
}

const o = args(), cmd = o._[0];
const table = { check, gen, measure, apply, curve };
if (!table[cmd]) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n\/\*/, '').replace(/^ \* ?/gm, ''));
  process.exit(cmd && cmd !== 'help' ? 2 : 0);
}
process.exit(table[cmd](o));
