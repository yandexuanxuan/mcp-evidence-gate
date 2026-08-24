# Phase 0：MCP 生态缺口决策矩阵

日期：2026-08-25  
用途：在决定仓库和 MVP 前，筛掉撞车方向，锁定最可能形成 upstream contribution、external adoption 和可验证维护证据的切口。  
状态：Phase 0 完成；`D:\Projects\codex\report-source.md` 未修改。

## 1. 结论先行

原先的“独立 MCP Registry Health Scanner”不应作为主项目。它不是没有价值，而是作为独立主线同时撞上了 Registry 已有的 endpoint census、provenance issue、`mcp.health` 提案、`mcp-trustcard`、CSA audit 和其他 scanner；因此 upstream 合并与 3 个真实 adopter 的概率都不够高。

建议按以下顺序验证：

| 排名 | 切口 | 总分 | 判断 |
|---|---|---:|---|
| A | **MCP Receipt Conformance / Release Evidence Action** | **84/100** | 主推：消费既有 receipt 设计，补 verifier、freshness、digest 和 CI gate，不重复做 scanner 或 schema。 |
| B | **Registry Validator Compatibility / Preflight Test Kit** | **80/100** | 备选：围绕 #1394/#1451 做 consumer、fixture、兼容性测试；容易在 1–2 周形成小而真实的 upstream follow-up。 |
| C | **Agent Reach Windows Reliability / Doctor Evidence Extension** | **76/100** | 备选：借助高采用率项目的真实 Windows/doctor issue，先做可复现测试和小 PR；需先获得 maintainer 接受，不能自称核心维护者。 |
| — | Health Scanner / Registry Auditor（独立主线） | **54/100** | 放弃作为申请主线；可作为 A/B 的数据适配器。 |

这不是 OpenAI 官方打分，而是本 Phase 0 的决策模型：生态/upstream 信号 20、差异化 15、两周 MVP 可行性 15、merged PR 概率 15、3 个 adopter 概率 15、Codex OSS fit 10、权限/安全 5、证据可测量性 5。

## 2. 事实核查：哪些方向已经有人占据

### Registry 侧

| 证据 | 已确认事实 | 决策影响 |
|---|---|---|
| [#1487](https://github.com/modelcontextprotocol/registry/issues/1487) | 已抽样 1,200/10,542 个 remote endpoint，并区分 `alive-open`、`alive-gated`、`wrong-transport`、`not-mcp`、`unknown`；401/402/403 被视为 gated/健康，不是故障。 | 不能把 endpoint census/基础分类包装成新发现。 |
| [#1488](https://github.com/modelcontextprotocol/registry/issues/1488) | 单一域名下 75 个条目中 62 个返回 HTML。 | domain/endpoint 数据质量确有问题，但要做成持续证据而非一次性扫描。 |
| [#1485](https://github.com/modelcontextprotocol/registry/issues/1485) | 80 个 remote host 不再解析，另有 136 个条目集中于一个 namespace；作者明确这是下限而非完整 health 结论。 | 可作为 A 的测试数据；不能直接宣称“全 Registry 不健康”。 |
| [#1484](https://github.com/modelcontextprotocol/registry/issues/1484) | 398 个高评分 server 中 38 个 repository URL 指向改名/转移后的仓库，并提出 `repository_verified_at` 类思路。 | provenance drift 是真实缺口，但已有公开问题，独立 auditor 需有明显增量。 |
| [#1445](https://github.com/modelcontextprotocol/registry/issues/1445) | `mcp.health` 顶层字段提案已 **Closed as not planned**。 | 不再做同名顶层 health schema。 |
| [#1394](https://github.com/modelcontextprotocol/registry/issues/1394) | 用户明确要求把 Registry validator 作为可复用 library，避免完整 Registry 之外重复实现。 | 这是明确的维护者/用户需求，可做 consumer/follow-up。 |
| [#1451](https://github.com/modelcontextprotocol/registry/pull/1451) | 已有人提交 `pkg/validators` facade，暴露 `ValidateServerJSON`、`ValidatePackage` 和 typed result/error；当前仍 Open、无 reviewer。 | 不重复做 facade；做 fixture、跨平台 consumer、兼容性测试。 |
| [#1404](https://github.com/modelcontextprotocol/registry/pull/1404) | 已提出 scanner-neutral security receipt：artifact digest、非空 scope、verdict、freshness、evidence digest、attestation、`inconclusive_reason`。当前仍 Open。 | 不重复设计 schema；做 verifier、renderer、CI action 和 downstream tests。 |
| [#1529](https://github.com/modelcontextprotocol/registry/pull/1529) | `mcp-server-audit` 已作为 Community Project 提交，覆盖安装前 handshake、descriptor、capability、tool schema 检查。 | 不复制 install-time CLI。 |
| [#1555](https://github.com/modelcontextprotocol/registry/pull/1555) | Draft 已直接处理空/不完整 `repository` 对象的 validator 和 publish regressions。 | 不重复该具体修复；可做边界 fixture/consumer 兼容测试。 |

### 安全、provenance 和 scanner 侧

| 项目 | 已有能力 | 不能再声称的“空白” |
|---|---|---|
| [`mcp-trustcard`](https://github.com/davidnichols-ops/trustcard) | fingerprint、签名 provenance、TOFU、policy、evidence store、hash-chained call receipts，以及 8 类 MCP 检查。 | 不能再做“trust card + scanner + signed receipt”的复制品。其 stars/采用信号仍不足以证明生态普及，但能力重叠很高。 |
| [Cisco MCP Scanner](https://github.com/cisco-ai-defense/mcp-scanner) | YARA、LLM-as-judge、Cisco AI Defense 等多引擎检测。 | 不做又一个 threat scanner。 |
| [Snyk Agent Scan](https://github.com/snyk/agent-scan) | agent/MCP/skills inventory，prompt injection、tool poisoning、secrets、destructive capability、CI 等。 | 不做 vendor-specific scanner 或依赖其私有 API 的 registry 集成。 |
| [CSA `mcpserver-audit`](https://github.com/ModelContextProtocol-Security/mcpserver-audit) | 源码安全审计、漏洞/威胁模型、AIVSS、audit/vulnerability DB。 | 不做另一个源码审计 CLI。 |
| [Agent Reach](https://github.com/Panniantong/Agent-Reach) | 高采用率开源项目，存在真实 Windows、doctor、source health、fallback 和多渠道问题。 | 不能把“我测试过”写成 maintainer 身份；必须以 issue/PR/maintainer 回复为证据。 |

## 3. Top 3 决策卡

### A：MCP Receipt Conformance / Release Evidence Action — 84/100

**做什么。** 一个开源 verifier + GitHub Action：读取 MCP Registry #1404 风格的 `_meta` receipt，检查 `scanned_artifact_digest` 是否匹配当前 artifact、`scan_scope` 是否非空、receipt 是否过期、`inconclusive` 是否有机器可读原因、attestation 是否在允许范围内；输出 JSON、SARIF、GitHub Check 和人类可读报告。

**与已有项目的边界。** 不扫描代码、不替代 Cisco/Snyk/CSA/trustcard、不重做 #1404 schema；它只负责让不同 scanner 的结果可复验、可过期、可进入 CI/Registry/客户端。安全结果必须绑定到明确 artifact、scope 和时间，不能宣传成“服务器绝对安全”。

**两周 MVP。**

1. 定义与 #1404 对齐的最小 receipt fixture。
2. 实现 digest mismatch、stale、empty scope、missing `inconclusive_reason` 四类失败。
3. 做一个 GitHub Action：`warn`/`fail` 两种模式，输出 SARIF 和 Markdown summary。
4. 准备 3 个自有或明确授权的示例 MCP server 仓库，跑出公开 Actions 记录。
5. 在 #1404 下提交兼容性测试/消费方反馈，而不是重复 schema。

**概率与证据。** 2 周 MVP：高；upstream follow-up merged PR：中高；3 个 adopter：中等，前提是先找到愿意公开跑 Action 的 MCP 项目；Codex OSS fit：高，因为能产生 review、CI、release 和 issue triage 证据。当前最关键的事实不确定性是 #1404 最终字段是否变化。

**Kill condition。** #1404 被关闭或改成不兼容模型；维护者明确不接受第三方 consumer；或者第 14 天仍没有一个 maintainer/design partner 愿意审阅 fixture/Action。满足任一条件，就保留通用 receipt verifier，但不再把 Registry 兼容性作为主卖点。

### B：Registry Validator Compatibility / Preflight Test Kit — 80/100

**做什么。** 围绕 #1394 的真实需求，消费 #1451 的 validator facade，提供跨平台 fixture、typed-error 兼容矩阵和 publisher preflight：对 `server.json`、package、remote 配置做可重复验证，并把失败映射成可读的 GitHub Check。

**与已有项目的边界。** 不复制 `pkg/validators` facade，不抢 #1555 的空 repository 修复；价值在于“真实 consumer 能否稳定使用 API”，包括 fixture、版本兼容、文档和 CI。

**两周 MVP。**

1. 固定 20–30 个最小 valid/invalid fixture。
2. 写一个独立 Go consumer，锁定 #1451 分支 API。
3. 生成 typed error compatibility report。
4. 接入 1 个自有 server repo 和 1 个授权 design partner。
5. 向 #1451 提交 fixture/consumer follow-up，记录 API 反馈。

**概率与证据。** 2 周 MVP：高；upstream merged PR：中高（已有 issue、范围小，但原 facade 已由他人占据）；3 个 adopter：中等；Codex OSS fit：高，维护负担小且容易形成 review/triage/release 记录。

**Kill condition。** #1451 14 天没有 reviewer；PR 被关闭或合并后 API 发生破坏性变化；或者维护者表示不会支持外部 consumer。此时停止争取同一上游 patch，转为独立 preflight 工具，并明确不再宣称 Registry upstream 贡献。

### C：Agent Reach Windows Reliability / Doctor Evidence Extension — 76/100

**做什么。** 针对 [#566](https://github.com/Panniantong/Agent-Reach/issues/566)、[#586](https://github.com/Panniantong/Agent-Reach/issues/586)、[#514](https://github.com/Panniantong/Agent-Reach/issues/514)、[#623](https://github.com/Panniantong/Agent-Reach/issues/623) 这类真实问题，做 Windows 可复现测试矩阵、doctor JSON evidence、source-health 分类和最小修复 PR。重点是把“doctor 说 OK”与“实际 MCP/source 可用”分开，并保留运行时间、环境、失败类别和重试证据。

**与已有项目的边界。** 不声称拥有 Agent Reach，不把本地 hotspot 结果冒充上游采用；先以 issue、测试、文档或小修复 PR 获得 maintainer 回复。

**两周 MVP。**

1. 选 2 个公开 issue（优先 Windows crash 与 doctor false-positive）。
2. 在干净 Windows 环境录制可复现命令、版本和 JSON receipt。
3. 提交一份最小测试/文档 PR，不把多个大功能塞进一次 PR。
4. 给 2 个外部使用者提供同一测试脚本，收集是否复现。

**概率与证据。** 2 周 MVP：高；upstream merged PR：中等；3 个 adopter：高于普通新仓库，因为项目本身已有广泛采用，但你能否获得 adopter 身份取决于 maintainer；Codex OSS fit：很高，能产生 issue triage、跨平台测试、release hygiene 和实际用户支持证据。

**Kill condition。** 21 天没有 maintainer 回复；两个针对性 PR 均被拒绝且没有可执行反馈；或问题只能通过未授权访问/绕过平台限制才能复现。此时不再把 Agent Reach 作为申请主线。

## 4. 为什么 Health Scanner 只能降级为组件

独立 health auditor 的分数压到 54/100，不是因为数据质量问题不存在，而是因为：

- #1487 已经有 endpoint census 和分类方法；
- #1484/#1485 已经有 provenance/DNS 发现；
- #1445 已明确拒绝顶层 `mcp.health`；
- trustcard、CSA、Cisco、Snyk 已覆盖 scanner/trust/audit 的相邻能力；
- 大规模主动探测需要限速、授权和误报控制，3 个真实 adopter 不是自动产生的；
- “发现 80 个失效 host”不是维护者贡献，除非能修成低误报、可复验、可消费的 evidence artifact。

因此 health/provenance 逻辑应作为 A 的 receipt producer 或 B 的 fixture/data source，而不是申请时的项目标题。

## 5. 14 天执行闸门

### Day 0–2：先确认上游信号

- 重新核对 #1404、#1451 的状态、最近评论和 API 变化。
- 只在明确允许的仓库和自有 fixture 上运行验证；不扫描无授权的第三方仓库、系统或 endpoint。
- 为每个候选建立一页 maintainer signal：issue/PR 链接、最后活动、是否有 reviewer、可提交的最小 follow-up。

### Day 3–7：只做一个最小可运行切口

- A：receipt verifier + 4 类失败 fixture；或
- B：validator consumer + 20–30 个 fixture；或
- C：Agent Reach 两个可复现 Windows/doctor issue。

不要同时做 scanner、registry service、dashboard、签名体系和大规模抓取。

### Day 8–14：拿外部证据，而不是继续写功能

- 至少一个 maintainer/design partner review；
- 至少一个外部仓库成功运行；
- 一份公开、可复现的 CI/issue/PR 证据；
- 明确记录 false positive、权限边界、失败与下一步。

14 天闸门未通过，按对应 Kill condition 换轨，不继续投入 1–3 个月。

## 6. 对 Codex for Open Source 的适配

OpenAI 的活动页要求申请人是活跃开源维护者，并强调实际使用、广泛采用或生态重要性，以及 PR review、issue triage、release management 等维护工作；活动采用 rolling review，并未公布固定 star 门槛：[Codex for Open Source](https://openai.com/form/codex-for-oss/)。条款允许 OpenAI 核验身份、仓库和角色，也不保证一定获得福利：[活动条款](https://learn.chatgpt.com/docs/codex-for-oss-terms)。

所以申请材料不能只写“我做了一个有前景的工具”。必须累计以下证据：

1. 上游 maintainer 的公开 review/回复或 merged PR；
2. 至少 3 个真实项目运行 Action、consumer 或测试脚本；
3. 有版本、release notes、issue triage、回归测试和失败记录；
4. 清楚说明项目不扫描无授权目标，receipt 只代表限定 artifact/scope/time 的证据；
5. 把个人项目、上游贡献和 adopter 关系分开陈述，不能把给别人提 PR 写成自己已经维护该项目。

## 7. 当前决策

**现在不要修改 `report-source.md`。** 先选择 A/B/C 中一个切口，并在 14 天闸门内取得第一条 maintainer/adopter 证据。若只选一个，我建议先做 **A：Receipt Conformance / Release Evidence Action**；若你更看重最快拿到上游小 PR，则选 **B**；若你已有 Agent Reach 真实使用场景和 Windows 复现能力，则把 **C** 作为最快获得外部采用证据的路线。

完成 14 天闸门后，再把这份 Gap Matrix、原始调研和反向审查合并回 `report-source.md`，而不是现在先改结论。

## 8. 参考来源

- [OpenAI Codex for Open Source application](https://openai.com/form/codex-for-oss/)
- [OpenAI Codex for Open Source terms](https://learn.chatgpt.com/docs/codex-for-oss-terms)
- [MCP Registry repository](https://github.com/modelcontextprotocol/registry)
- [MCP Registry issue #1394](https://github.com/modelcontextprotocol/registry/issues/1394)
- [MCP Registry issue #1445](https://github.com/modelcontextprotocol/registry/issues/1445)
- [MCP Registry issue #1484](https://github.com/modelcontextprotocol/registry/issues/1484)
- [MCP Registry issue #1485](https://github.com/modelcontextprotocol/registry/issues/1485)
- [MCP Registry issue #1487](https://github.com/modelcontextprotocol/registry/issues/1487)
- [MCP Registry issue #1488](https://github.com/modelcontextprotocol/registry/issues/1488)
- [MCP Registry PR #1404](https://github.com/modelcontextprotocol/registry/pull/1404)
- [MCP Registry PR #1451](https://github.com/modelcontextprotocol/registry/pull/1451)
- [MCP Registry PR #1529](https://github.com/modelcontextprotocol/registry/pull/1529)
- [MCP Registry PR #1555](https://github.com/modelcontextprotocol/registry/pull/1555)
- [`mcp-trustcard`](https://github.com/davidnichols-ops/trustcard)
- [Cisco MCP Scanner](https://github.com/cisco-ai-defense/mcp-scanner)
- [Snyk Agent Scan](https://github.com/snyk/agent-scan)
- [CSA `mcpserver-audit`](https://github.com/ModelContextProtocol-Security/mcpserver-audit)
- [Agent Reach](https://github.com/Panniantong/Agent-Reach)
