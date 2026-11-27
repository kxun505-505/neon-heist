# 关卡生成器

规格、准则和验收标准见 `docs/level-rules.md`，原作分析见 `docs/original-analysis.md`。

- `levelgen.js`：生成和验收的代码，Node 和浏览器共用。验收的数字在文件开头的 `RULES` 里。
- `curve.js`：1-40 关每关的目标（零件数、最少步数、第一步陷阱、模板或程序生成的参数）。
- `cli.js`：命令行，`node tools/levelgen/cli.js help` 可以看用法。只需要 Node 16 以上，不用装依赖。

```sh
node tools/levelgen/cli.js check
node tools/levelgen/cli.js gen --level 11 --seeds 150 --out /tmp/L11.json
node tools/levelgen/cli.js apply --level 11 --file /tmp/L11.json --name 名字 --en NAME --tip 提示
```
