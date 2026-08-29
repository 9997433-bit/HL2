# R24 派工 · overlay `vh`/`dvh` 双写

基线：`main` @ `35442e5`（已合 R23 #25）

## 目标
为浮城人生 overlay / 面板 `max-height` 统一：先 `vh` 回退，再 `dvh` 覆盖（移动端动态工具栏）。  
不动装饰性 `effects.css` / `main.css` 的氛围用 vh。

## 执行说明
Cloud Agent 配额仍不可用；本轮由 Orchestrator 直接落地。
