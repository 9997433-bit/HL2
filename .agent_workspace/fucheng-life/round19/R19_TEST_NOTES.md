# R19 测试入口与预期

覆盖本轮三件事：手动选轨的 cancel 路径、boot 自动流按 Escape 仍落推荐轨、
ACCEPTANCE §40 的 dismiss 措辞与代码是否一致。

## 自动化入口

从仓库根目录执行：

```bash
node games/fucheng-life/tests/r19-career-dismiss.test.js
./scripts/run-fucheng-life-tests.sh
```

预期：R19 专项断言通过；全量测试汇总为 `0 failed`，两条命令退出码均为 `0`。

**落字时的实际结果：专项用例红灯，全量为 `29 passed, 1 failed`。**
断言停在 `functionSection(dashSrc, "init")` 的 `init source section must be bounded`：
该辅助函数用 `indexOf("\n  function ", start + 1)` 找区段下界，而 `init` 是
`dashboard-app.js` 里最后一个两格缩进的顶层函数，后面再没有 `\n  function `，
于是 `end === -1`，断言先于真正要验的内容就炸了。这是 harness 取区段的边界问题，
不是产品回归——手动入口的实际接线（`careerPickBtn` 的 click 里调
`maybeOfferCareerTrack({ manual: true })`）与断言想要的形状是一致的。
修法是让 `functionSection` 在找不到下一个函数时退回到文件尾（`end < 0` 时取
`src.length`）。这条归 G1，本笔记只记录状态；合入前必须重跑到专项与全量都 `0 failed`。

## 手工入口

从仓库根目录启动静态服务：

```bash
python3 -m http.server 8000
```

使用最新版桌面 Chrome 打开
<http://127.0.0.1:8000/games/fucheng-life/>，清除站点数据并打开 DevTools Console。
移动端回归使用设备模式，视口宽度设为 `390px`。

三条 cancel 场景都需要一份 `needsPick` 为真、且开局补弹已把自动选轨推迟掉的存档
（写入一条 `pendingModal` 待办再进仪表盘即可），这样工具区才会显示
「选择职业轨道」按钮，且当次 boot 不会自动弹选轨卡。

## 场景与预期

1. **手动入口按 Escape 取消**
   - 点工具区「选择职业轨道」打开面板，不点任何轨道卡，按 Escape。
   - 预期：面板关闭；职场信息不变，未应用推荐轨；系统日志不新增「你选择了「…」轨道
     作为起点。」，尤其不能出现轨道名为 `null` 的那条；`needsPick` 仍为真，
     「选择职业轨道」按钮保持可见；刷新后仍停在未选轨状态。

2. **手动入口点遮罩取消**
   - 同上打开面板，点面板外的暗色遮罩区域。
   - 预期：与场景 1 完全一致（关闭、不入账、不写日志、入口保留）。
   - 面板本体内的空白处点击不应关闭面板。

3. **取消后仍可正常选定**
   - 走完场景 1 或 2 后再点一次「选择职业轨道」，这次选中某条轨道。
   - 预期：面板关闭，轨道生效（职级名称与 KPI 按所选轨道刷新），系统日志新增一条
     职场记录，「选择职业轨道」按钮随 `needsPick` 变为假而收起。
   - 边界：关闭有约 180ms 的收尾动画，动画期间连点按钮不应弹出第二张卡，也不应
     产生第二条日志或第二次入账。

4. **boot 自动流按 Escape 仍落推荐轨**
   - 用一份 `needsPick` 为真、且**没有**任何待补弹事件的存档进仪表盘，让选轨卡自动
     弹出，然后按 Escape。
   - 预期：Escape 仍视为接受，直接应用带「推荐」角标的那条轨道；职场信息按推荐轨
     更新，系统日志写入对应轨道名（不是 `null`），「选择职业轨道」按钮不出现。
   - 同一存档改为点遮罩关闭，预期同样落到推荐轨——boot 流的语义本轮不变。
   - 面板上标「推荐」的轨道必须与 Escape 实际落下的轨道一致。

5. **§40 dismiss 措辞核对**（读文档 + 对代码，不需要启服务）
   - `games/fucheng-life/ACCEPTANCE.md` 第 40 条现措辞为「开局若发生过合约结算或
     `pendingModal` 补弹（含被关闭/dismiss）……」，已不再写「已完成补弹」。
   - 对代码核对：`replayPendingModal()` 只要真的开了卡就 `return true`，玩家关掉卡
     同样计入，boot 因此推迟自动选轨、签约与聚光灯教学；只有过期合约被销账那条
     早退分支返回 `false`（§41 语义，本轮不动）。措辞与实现一致。
   - 核对 SOP：本轮只改 §40 措辞，不 bump 教学 KEY，仍为 `fucheng.guide.v7`。

6. **桌面与移动端回归**
   - 桌面与 `390px` 各走一次「开局补弹 → 手动打开选轨并取消 → 再打开并选定 →
     推进月份」。
   - 预期：面板与遮罩在窄屏不溢出、可点到遮罩区取消；按钮收起后布局不跳；弹窗、
     合约、教学与推进流程无回归；Console 无 error、无未处理 Promise rejection、无 404。
