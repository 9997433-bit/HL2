# R17-O4 · 合约门禁 O1 载荷审计（story.json）

- 角色：R17-O4（opus-fast）
- 可写路径：`games/fucheng-life/data/story.json`（仅在必要时极小改动）+ 本文件
- 分支：`cursor/fucheng-r17-pending-contract-fa72`
- 结论：**未改动 story.json**。5 条带 `contract` 的门禁 O1 全部已具备 `id` / `choices`，
  且 `presentation` 缺省即解析为 `modal`，补弹链路完整，**无需补 `presentation: "modal"`**。

## 1. 审计范围

`data/story.json` 共 105 条事件，其中带 `contract` 字段的 **5 条**：

| id | contract | requires | choices | 作者写的 presentation | 运行时解析 | 可挂 pendingModal |
|----|----------|----------|---------|----------------------|-----------|------------------|
| EV93 积分窗口 | `hukou` | — | 3 | 未写 | `modal` | ✅ |
| EV94 在职学位的报名页 | `hukou` | `{progressMin:40}` | 3 | 未写 | `modal` | ✅ |
| EV95 三年定期 | `home` | — | 3 | 未写 | `modal` | ✅ |
| EV96 家里凑的那一笔 | `home` | `{monthsLeftMax:18}` | 3 | 未写 | `modal` | ✅ |
| EV97 晋升答辩 | `promote` | `{progressMin:45}` | 3 | 未写 | `modal` | ✅ |

5 条均为 `once: true`、`weight: 12`，每条 3 个选项，选项都带 `id` / `label` / `result`，
选项 id 在事件内不重复。

## 2. 为什么不补 `presentation: "modal"`

`fc-events.js` 的 `presentationOf` 用白名单兜底，缺省与非法值都落回 `modal`：

```146:149:games/fucheng-life/js/fc-events.js
  function presentationOf(raw) {
    var p = raw && raw.presentation;
    return PRESENTATIONS.indexOf(p) >= 0 ? p : "modal";
  }
```

`toPayload` 在装载期就把这个结果写进 payload 的 `presentation` 字段，
`FC.events.show` 再按它分流。所以这 5 条**不写 `presentation` 与显式写 `"modal"` 行为完全等价**，
补字段属于纯冗余改动，且 `tests/presentation.test.js` 明确依赖「存在缺省 presentation 的事件、
且 `toPayload` 要把它默认成 modal」这条不变量，动它只会增加噪音。故按最小改动原则**不动 JSON**。

## 3. 补弹链路逐段核对（已实测，非纯读代码）

R17-O1 的 `tracksPending` 收窄已落地：排除条件从「带 `ev.contract`」改为「`contract_` 前缀 + `合约` 分类」的**结算卡**：

```1265:1274:games/fucheng-life/js/dashboard-app.js
  function isContractResolutionEvent(ev) {
    return !!(ev && typeof ev.id === "string" &&
      ev.id.indexOf("contract_") === 0 && ev.category === "合约");
  }

  function tracksPending(ev, opts) {
    if (opts && typeof opts.pending === "boolean") return opts.pending;
    if (!ev || !ev.id) return false;
    return !isContractResolutionEvent(ev);
  }
```

对 5 条事件实跑了一遍 pick → payload → 存档序列化 → 补弹，全部通过：

1. **入池门禁**：`meetsContract` 只在对应合约 `status === "active"` 且进度/剩余月满足 `requires` 时放行；
   合约已结算（`won`）或未签约（`null`）时正确拒绝。5 条均符合。
2. **payload 归一**：`toPayload` 保留了 `id` / `contract` / `requires` / `choices`，
   `presentation` 解析为 `modal`。
3. **挂账**：`tracksPending(payload)` 对 5 条**全部返回 `true`** —— 即刷新前会被写进 `run.pendingModal`。
4. **存档往返**：`{kind, event: payload}` 做 `JSON.parse(JSON.stringify(...))` 全部无损，
   选项上的 `contractProgress`（EV93/EV94）与 `kpi`（EV97）跨刷新不丢 ——
   这两个字段不在 `d` 的白名单里，靠 `applyContractChoice` 单独入账，丢了等于奖励蒸发。
5. **补弹**：`replayPendingModal` 直接用存档里的 payload 走 `openEvent`，不再过 `pick`，
   因此不受 `once` / 权重 / 门禁二次影响。

### `once` 与刷新的交叉验证

`drawModalEvent` 在抽中时就把 `run.done[ev.id] = true` 烧掉（第 1054 行），早于玩家作答。
初看像是「刷新后 once 已消耗、卡却没答」的丢卡风险，但 `monthModal` 在 `openEvent` 之前显式
`setPendingModal(ev)`（第 1531 行），而 `setPendingModal` 内部会 `FC.write({run: run})`，
**`done` 与 `pendingModal` 是同一次落盘**。补弹又不经过 `pick`，所以 once 不会挡住补弹。
两者一致，无丢卡。

## 4. 发现的问题（均不在 O4 可写范围，转交）

### 4.1 【中】`tests/r17-pending-contract.test.js` 当前是红的 —— 测试夹具 bug，非产品 bug

`./scripts/run-fucheng-life-tests.sh` 结果：**27 passed, 1 failed**，失败的就是 R17-G1 这条：

```
ReferenceError: isContractResolutionEvent is not defined
    at tracksPending (tracksPending.fixture.js:4:5)
```

原因：该测试用 `functionSection` 只截出 `tracksPending` 一个函数体，丢进裸 `vm` 上下文里跑，
但收窄后的 `tracksPending` 依赖同文件的 `isContractResolutionEvent` 辅助函数，夹具没带上它。
**产品代码是对的**（本报告第 3 节已用独立脚本实测 5 条事件全部 `tracksPending === true`），
红的只是夹具。建议 G1 把 `isContractResolutionEvent` 一起截进夹具，或改用
`functionSection(dashSrc, "isContractResolutionEvent") + tracksPendingSrc` 拼接。
路径属 G1（`tests/`），O4 未代改。

### 4.2 【低】`pendingKindOf` 把带 `requires` 的合约 O1 误标成 `npc`

```1230:1235:games/fucheng-life/js/dashboard-app.js
  function pendingKindOf(ev) {
    if (!ev) return "modal";
    if (ev.category === "本月危机") return "crisis";
    if (ev.requires) return "npc";
    return "o1";
  }
```

EV94 / EV96 / EV97 的 `requires` 是**合约进度规则**（`progressMin` / `monthsLeftMax`），
不是人情规则，却因为「有 requires」被记成 `kind: "npc"`（实测如此）。
影响面很小：`pendingModal.kind` 只在 `setPendingModal` 里存一下，补弹时原样传回，
**从不参与渲染** —— 日志标签走 `eventToLog` 的 `ev.contract ? "contract"` 另一条路，是对的。
所以这只是存档里一个读起来会误导的簿记字段，不改也不影响玩家。
若 O1 顺手收口，建议在 `ev.requires` 之前加一行 `if (ev.contract) return "contract";`。
路径属 O1（`js/dashboard-app.js`），O4 未代改。

## 5. 给 G1 的断言建议（基于本轮实测）

- 5 条合约事件 `toPayload(...).presentation === "modal"`（覆盖「缺省即 modal」这条兜底）。
- 5 条合约事件 `tracksPending(payload, {}) === true`；结算卡 `{pending:false}` 为 `false`。
- EV93/EV94 的 `contractProgress`、EV97 的 `kpi` 在 `pendingModal` JSON 往返后不丢。
- `meetsContract` 在合约 `won` / 未签约时拒绝这 5 条，`active` 且满足 requires 时放行。

## 6. 结论

**未改动 `data/story.json`。** 合约门禁 O1 的数据侧已满足 R17 补弹要求：
`id`、`choices`（含 id/label/result）齐备，`presentation` 缺省即 modal，
`contractProgress` / `kpi` 跨刷新无损，补弹链路实测通过。
唯一需要跟进的是 G1 那条红测（夹具缺辅助函数）与 O1 的 `pendingKindOf` 误标，均已在上面转交。
