#!/usr/bin/env node
/*
 * NEON HEIST 关卡生成器命令行（Node 16+，不需要装任何依赖）
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
 *       打印 1-100 关的难度曲线。
 *
 *   批量生成（给长时间无人值守跑用，结果放在 levels-pool/，每关一个 Lnnn.json）：
 *   node tools/levelgen/cli.js batch --from 11 --to 100 [--jobs 8] [--minutes 20] [--seeds 300] [--rounds 6]
 *       并行生成 levels-pool/ 里还没有的关卡；某关这一轮没找到合格的，下一轮换一批种子再试。
 *       中断后重跑同一条命令会从断点继续。每一轮结束做一次整体验收，不合格的文件移到 levels-pool/rejected/ 再重做。
 *       进度写在 levels-pool/progress.log，最终报告写在 levels-pool/report.txt。
 *   node tools/levelgen/cli.js poolcheck [--to 100] [--fix] [--jobs 8]
 *       整体验收：src/levels.js 已有的关卡 + levels-pool/ 里后面的关卡，按顺序跨关卡检查。
 *       --fix 把不合格的文件移到 levels-pool/rejected/。全部合格且没有缺关时退出码 0。
 *       指标缓存在每个关卡文件里（codeHash + levelHash）；规则代码改过的话会自动并行重算。
 */
'use strict';
const fs = require('fs'), path = require('path');
const GEN = require('./levelgen.js');
const ROOT = path.join(__dirname, '..', '..');
const LEVELS_FILE = path.join(ROOT, 'src', 'levels.js');
const POOL = path.join(ROOT, 'levels-pool');
// 验收指标只取决于这几个文件：内容没变时，存在关卡文件里的指标可以直接用
const CODE_HASH = require('crypto').createHash('sha1').update(['src/core.js', 'src/layout.js', 'src/chapters.js', 'tools/levelgen/levelgen.js']
  .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\0')).digest('hex').slice(0, 12);
const levelHash = (lv) => require('crypto').createHash('sha1').update(JSON.stringify({ rings: lv.rings, links: lv.links, hard: !!lv.hard })).digest('hex').slice(0, 12);
const cachedMetrics = (j) => (j && j.metrics && j.codeHash === CODE_HASH && j.levelHash === levelHash(j.level) ? j.metrics : null);
const poolFile = (n) => path.join(POOL, 'L' + String(n).padStart(3, '0') + '.json');

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

// 第 1..N 关：src/levels.js 有的用它，后面的用 levels-pool/ 里的；都没有的是 null
function readPool(n) {
  const f = poolFile(n);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; }
}
function chainUpTo(N) {
  const src = loadLevels(), out = [];
  for (let n = 1; n <= N; n++) {
    if (n <= src.length) out.push({ n, level: src[n - 1], from: 'src' });
    else { const p = readPool(n); out.push(p ? { n, level: p.level, from: 'pool', file: poolFile(n), metrics: cachedMetrics(p) } : { n, level: null }); }
  }
  return out;
}

function gen(o) {
  const n = +o.level;
  if (!n || !GEN.CURVE[n - 1]) { console.error('用法：gen --level N（1-' + GEN.CURVE.length + '）'); return 2; }
  // 跨关卡检查的上下文：第 N 关之前已有的关卡（src/levels.js + levels-pool/）。
  // 并行生成时前面可能还有空缺：零件上限按空缺关卡在曲线里的上限估；结构重复和困难关难度在 poolcheck 里再查一遍
  const prev = chainUpTo(n - 1);
  let maxPieces = 0; const feats = new Set(), sigs = new Set();
  for (const e of prev) {
    if (!e.level) { maxPieces = Math.max(maxPieces, GEN.CURVE[e.n - 1].pieces[1]); continue; }
    const m = GEN.measure(e.level, { solve: false });
    maxPieces = Math.max(maxPieces, m.pieces); GEN.features(m).forEach((x) => feats.add(x)); sigs.add(GEN.signature(e.level, m));
  }
  const g0 = Math.floor((n - 1) / 5) * 5;
  const groupD = prev.slice(g0).filter((e) => e.level).map((e) => GEN.diffIndex(e.metrics || GEN.measure(e.level, { n: e.n }))).filter((d) => d != null);
  // 提示文字在 apply 时才写进去，生成时先不查
  const ctx = { prevMaxPieces: maxPieces, prevFeatures: n > 1 ? feats : null, prevSigs: sigs, groupD, noTipCheck: true };
  const res = GEN.generate(n, { seeds: +o.seeds || 60, seed0: +o.seed0 || 1, ctx, timeLimit: o.minutes ? +o.minutes * 60000 : 0, first: !!o.first });
  console.log(`第 ${n} 关：试了 ${Object.values(res.stats).reduce((a, b) => a + b, 0)} 个种子，用时 ${(res.ms / 1000).toFixed(0)}s`);
  console.log('淘汰原因统计：' + JSON.stringify(res.stats));
  if (!res.best) { console.log('没有通过验收的候选。可以加 --seeds、换 --seed0，或者放宽 curve.js 里这一关的范围。'); return 1; }
  const m = res.best.metrics;
  console.log(`选中 seed=${res.best.seed}（${res.best.template}）：零件 ${m.pieces}，步数 ${m.par}${m.exact ? '' : '~'}，陷阱 ${m.trap}，死局 ${m.dead}，回头 ${m.revisit}，难度指数 ${m.D}，最小环 ${m.minRingPx}px`);
  console.log('最优解：' + m.solution);
  const out = { n, seed: res.best.seed, template: res.best.template, codeHash: CODE_HASH, levelHash: levelHash(res.best.level), metrics: m, level: res.best.level };
  if (o.out) { fs.writeFileSync(o.out, JSON.stringify(out, null, 1)); console.log('已保存 ' + o.out); }
  else console.log(JSON.stringify(res.best.level));
  return 0;
}

function measure(o) {
  const n = +o.level || 1, lv = readLevel(o.file);
  const m = GEN.measure(lv, { n });
  if (o.write) {
    // 把指标存回关卡文件（整体验收用作缓存）
    const j = JSON.parse(fs.readFileSync(o.file, 'utf8'));
    const out = j.level ? j : { n, level: j };
    Object.assign(out, { codeHash: CODE_HASH, levelHash: levelHash(out.level), metrics: m });
    fs.writeFileSync(o.file, JSON.stringify(out, null, 1));
    if (o.quiet) return 0;
  }
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

// 并行跑若干个子命令
function runParallel(argsList, jobs) {
  const { spawn } = require('child_process');
  let next = 0;
  const one = (a) => new Promise((resolve) => spawn(process.execPath, [__filename].concat(a), { stdio: 'ignore' }).on('close', resolve));
  const worker = async () => { while (next < argsList.length) await one(argsList[next++]); };
  return Promise.all(Array.from({ length: Math.min(jobs, argsList.length) }, worker));
}

async function poolcheck(o) {
  const N = +o.to || GEN.CURVE.length;
  const jobs = +o.jobs || Math.max(1, require('os').cpus().length - 1);
  // 指标过期（代码改过或文件里没有）的关卡，先并行重算并存回文件
  const stale = chainUpTo(N).filter((e) => e.from === 'pool' && !e.metrics);
  if (stale.length) {
    console.log(`重算 ${stale.length} 关的指标（${jobs} 个进程）…`);
    await runParallel(stale.map((e) => ['measure', '--file', e.file, '--level', String(e.n), '--write', '--quiet']), jobs);
  }
  const chain = chainUpTo(N), have = chain.filter((e) => e.level), missing = chain.filter((e) => !e.level).map((e) => e.n);
  // 有空缺时，只能检查空缺前面连续的那一段（跨关卡检查要按顺序）
  const upto = missing.length ? missing[0] - 1 : N;
  const levels = chain.slice(0, upto).map((e) => e.level);
  const rows = GEN.checkAll(levels, { cached: (i) => (chain[i].metrics ? Object.assign({}, chain[i].metrics) : null) });
  // 空缺后面已经生成好的关卡：只做单关验收（跨关卡检查等补齐后再做）
  for (const e of chain.slice(upto)) if (e.level) {
    const m = e.metrics ? Object.assign({}, e.metrics) : GEN.measure(e.level, { n: e.n });
    rows.push({ n: e.n, m, fails: GEN.accept(e.level, m, e.n), single: true });
  }
  const bad = rows.filter((r) => r.fails.length);
  const lines = [];
  lines.push(`整体验收 ${new Date().toISOString()}：1-${N} 关，已有 ${have.length} 关，缺 ${missing.length} 关` + (missing.length ? '（' + missing.join(',') + '）' : ''));
  lines.push(`按顺序做了跨关卡检查的：1-${upto} 关；只做了单关验收的：${rows.filter((r) => r.single).length} 关`);
  for (const r of rows) {
    const m = r.m;
    lines.push([(GEN.isHard(r.n) ? 'H' : '') + r.n, '零件' + m.pieces, '步数' + (m.par == null ? '-' : m.par + (m.exact ? '' : '~')), '陷阱' + m.trap, '指数' + (m.D != null ? m.D : GEN.diffIndex(m)), '最小环' + m.minRingPx + 'px', r.fails.length ? 'FAIL ' + r.fails.join('；') : 'PASS'].join('  '));
  }
  lines.push(bad.length ? `${bad.length} 关不合格` : missing.length ? '已有的关卡全部合格，还有空缺' : `PASS 1-${N} 关全部合格`);
  fs.mkdirSync(POOL, { recursive: true });
  fs.writeFileSync(path.join(POOL, 'report.txt'), lines.join('\n') + '\n');
  console.log(lines.slice(0, 2).concat(lines.slice(-1)).join('\n'));
  for (const r of bad) console.log('  ✗ 第 ' + r.n + ' 关：' + r.fails.join('；'));
  if (o.fix) {
    fs.mkdirSync(path.join(POOL, 'rejected'), { recursive: true });
    // 困难关不如同组普通关难：同组里难度指数最高的那个普通关也退回重做（只退 levels-pool 里的）
    for (const r of bad.slice()) {
      if (!r.fails.some((f) => f.startsWith('F 困难关难度指数'))) continue;
      const grp = rows.filter((x) => x.n < r.n && x.n > r.n - 5 && chain[x.n - 1].from === 'pool');
      grp.sort((a, b) => GEN.diffIndex(b.m) - GEN.diffIndex(a.m));
      if (grp[0] && !bad.includes(grp[0])) { console.log(`  第 ${grp[0].n} 关比困难关第 ${r.n} 关还难，一起退回重做`); bad.push(grp[0]); }
    }
    for (const r of bad) {
      const f = poolFile(r.n);
      if (fs.existsSync(f)) { fs.renameSync(f, path.join(POOL, 'rejected', path.basename(f, '.json') + '-' + Date.now() + '.json')); console.log('  已移走 ' + path.basename(f) + '，下一轮重做'); }
      else console.log('  第 ' + r.n + ' 关在 src/levels.js 里，需要手动处理');
    }
  }
  return bad.length || missing.length ? 1 : 0;
}

// 批量：并行跑多个 gen 子进程；每关失败后下一轮换种子；每轮结束 poolcheck --fix
async function batch(o) {
  const { spawn } = require('child_process');
  const from = +o.from || 11, to = Math.min(+o.to || GEN.CURVE.length, GEN.CURVE.length);
  const jobs = +o.jobs || Math.max(1, require('os').cpus().length - 1);
  const minutes = +o.minutes || 20, seeds = +o.seeds || 300, rounds = +o.rounds || 6;
  fs.mkdirSync(POOL, { recursive: true });
  const logf = path.join(POOL, 'progress.log');
  const log = (t) => { const line = new Date().toISOString() + ' ' + t; console.log(line); fs.appendFileSync(logf, line + '\n'); };
  // 每关已经试过几轮，存在 attempts.json 里，续跑时换没试过的种子
  const attF = path.join(POOL, 'attempts.json');
  const att = fs.existsSync(attF) ? JSON.parse(fs.readFileSync(attF, 'utf8')) : {};
  log(`开始：第 ${from}-${to} 关，${jobs} 个进程，每关每轮最多 ${minutes} 分钟 / ${seeds} 个种子，最多 ${rounds} 轮`);
  for (let round = 1; round <= rounds; round++) {
    // 普通关先做，困难关排在后面：困难关要和同组已经做好的普通关比难度
    const todo = [];
    for (let n = from; n <= to; n++) if (!readPool(n) && n > loadLevels().length) todo.push(n);
    todo.sort((a, b) => GEN.isHard(a) - GEN.isHard(b) || a - b);
    if (!todo.length) { log('没有缺的关卡'); }
    else log(`第 ${round} 轮：要做 ${todo.length} 关：${todo.join(',')}`);
    const one = (n) => new Promise((resolve) => {
      const k = att[n] || 0; att[n] = k + 1; fs.writeFileSync(attF, JSON.stringify(att));
      const seed0 = 1 + k * seeds;
      const t0 = Date.now();
      const tmp = poolFile(n) + '.tmp';
      const child = spawn(process.execPath, [__filename, 'gen', '--level', String(n), '--seeds', String(seeds), '--seed0', String(seed0), '--minutes', String(minutes), '--out', tmp], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
      child.on('close', (code) => {
        const sec = Math.round((Date.now() - t0) / 1000);
        if (code === 0 && fs.existsSync(tmp)) { fs.renameSync(tmp, poolFile(n)); log(`✓ 第 ${n} 关（种子 ${seed0}+，${sec}s）${(out.match(/选中[^\n]*/) || [''])[0]}`); }
        else { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); log(`✗ 第 ${n} 关（种子 ${seed0}+，${sec}s）${(out.match(/淘汰原因统计[^\n]*/) || [out.slice(-200)])[0]}`); }
        resolve();
      });
    });
    // 困难关要等同组的普通关都做完（或者这一轮没做成）才开始
    const pending = new Set(todo);
    const ready = (n) => !GEN.isHard(n) || [1, 2, 3, 4].every((d) => !pending.has(n - d));
    const worker = async () => {
      for (;;) {
        const k = todo.findIndex((n, i) => i >= 0 && n != null && ready(n));
        if (k < 0) { if (!todo.some((n) => n != null)) return; await new Promise((r) => setTimeout(r, 2000)); continue; }
        const n = todo[k]; todo[k] = null;
        await one(n);
        pending.delete(n);
      }
    };
    await Promise.all(Array.from({ length: Math.min(jobs, todo.length) }, worker));
    todo.length = 0;
    log(`第 ${round} 轮结束，整体验收`);
    const code = await poolcheck({ to, fix: true, jobs });
    if (code === 0) { log(`完成：第 1-${to} 关全部合格，报告见 levels-pool/report.txt`); return 0; }
  }
  log('轮数用完还有关卡没做完，见 levels-pool/report.txt。可以加 --rounds 再跑，或者调整 curve.js 里这几关的目标');
  return 1;
}

const o = args(), cmd = o._[0];
const table = { check, gen, measure, apply, curve, poolcheck, batch };
if (!table[cmd]) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n\/\*/, '').replace(/^ \* ?/gm, ''));
  process.exit(cmd && cmd !== 'help' ? 2 : 0);
}
Promise.resolve(table[cmd](o)).then((c) => process.exit(c));
