# 脚本层试点样例（2026-11-14）

用脚本提示词 v0.2 生成的试点输入与成品，只用于验证「知识包 → 脚本 → 动画」链路，不是契约样例，也不代表当前最佳写法。

| 目录 | 方向 | 校验结果 |
| --- | --- | --- |
| `case1-dice` | 骰子概率 | 通过 |
| `case2-pn-v1` | PN 结，按时长写满 | 结构通过；4 处知识依赖顺序失败（hook 抢跑前置概念） |
| `case2-pn-v2` | PN 结，少字重跑 | 通过 |
| `case3-rhetoric` | 比喻、拟人、通感 | 通过 |

每组包含 `project-state.json`、`knowledge-package.json`、`production-script.json`。文件保持生成时的原样；试点之后回写的规则见提示词 v0.3。

校验分两层：`contracts/validate_contracts.py` 检查结构；知识依赖顺序与字幕占屏比例由一次性的本地校验脚本检查，未入库。
