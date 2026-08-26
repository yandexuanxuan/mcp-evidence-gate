# Codex for Open Source 申请方向深度调研

日期：2026-08-26
目标：为一名已有本地 AI 内容/证据工作流、但当前公开仓库尚未形成采用量的开发者，选择一个真实、可验证、能提高 Codex for Open Source 申请竞争力的开源项目方向。

## 结论先行

活动页面仍在收件，采用滚动审核，没有公开统一截止日期、星数门槛、成功率或名额。官方看重的是活跃维护、实际使用/广泛采用、生态重要性，以及 PR review、issue triage、release management 等持续维护负担。

当前本地仓库 `D:\Projects\dy_x1024\dy_1024` 的远程是 `https://github.com/yandexuanxuan/douyin-1024.git`；实时 GitHub 查询显示它是私有仓库、0 stars、无公开许可证。它不能作为今天就提交的高胜率申请项目。

Phase 0 之后，主线已收敛为 **MCP Receipt Conformance / Release Evidence Gate**，仓库为 `mcp-evidence-gate`。它消费 MCP Registry #1404 风格的 receipt，而不是重新实现 Registry 或另一个安全扫描器：

1. 用固定的 #1404 compatibility profile 校验 receipt 结构；
2. 将 `scanned_artifact_digest` 绑定到当前 artifact，并检查 freshness、scope、inconclusive reason 和 attestation；
3. 将 scanner 的 `verdict` 与独立的 release `decision` 分开，保证 mismatch/stale 只产生 `inconclusive`，不宣称服务器不安全；
4. 通过 CLI 和自包含 GitHub Action 为下游仓库提供可复现的 release gate。

这条路线服务于原报告的申请目标，但把生态价值落在“下游维护者如何安全、可复验地消费 #1404 receipt”上。它不是 MCP Registry 官方实现、不是 scanner，也不把自有 dogfood 仓库冒充 external adoption。

## 官方活动硬证据

- 官方申请页：[Codex for Open Source](https://openai.com/form/codex-for-oss/)。页面明确写明：活跃开源项目维护者可申请；OpenAI 看项目使用量、广泛采用、生态重要性、活跃维护证据；维护者可能获得 6 个月 ChatGPT Pro（含 Codex）、API credits 和条件式 Codex Security；申请滚动审核。
- 官方条款：[Codex for Open Source Program Terms](https://learn.chatgpt.com/docs/codex-for-oss-terms)。条款要求有效 ChatGPT 账户和真实完整信息；OpenAI 可核验身份、仓库归属和维护权限；提交不保证选中；福利个人、不可转让；福利可能需在指定窗口内激活；OpenAI 可随时修改、暂停、限制或终止项目。
- 官方安全背景：[Codex Security: now in research preview](https://openai.com/index/codex-security-now-in-research-preview/)。OpenAI 说明其已将 Codex Security 用于开源项目，并称 vLLM 已在日常工作流中用它发现和修复问题；其定位是高置信发现、沙箱验证、可审阅修复，而不是堆积低质量告警。

## 公开获批案例与可迁移信号

| 案例 | 可核验信号 | 对申请的启示 |
|---|---|---|
| Discourse | OpenAI Developer Community 帖子称数名 Discourse 维护者被接受；仓库约 47.7k stars、9k forks、持续 PR/安全维护。[社区帖](https://community.openai.com/t/codex-for-open-source-2026/1376418) [仓库](https://github.com/discourse/discourse) | 成熟基础设施、广泛使用、真实维护负担是强信号 |
| Cherry Studio | 核心开发者公开称获批并写明约 200 次提交；项目是大型 AI 桌面应用。[社区帖](https://community.openai.com/t/codex-for-open-source-2026/1376418/4) [仓库](https://github.com/CherryHQ/cherry-studio) | AI 工具/Agent 生态与 Codex 使用场景匹配；要证明本人核心角色 |
| Go Micro | 项目官方博客称获批，明确把 Pro 用于 PR review、release、issue triage、文档与示例。[项目博客](https://go-micro.dev/blog/29) | 申请应写清“拿到后具体减少哪类维护瓶颈” |
| MineBench | 个人简历自述获批；GitHub 当前约 305 stars、21 forks、778 commits，同时有公开在线 benchmark、盲评投票和多模型使用。[简历](https://ammaaralam.com/assets/documents/resume.pdf) [仓库](https://github.com/Ammaar-Alam/minebench) | stars 不是唯一指标；真实参与量、在线服务和清晰技术价值可以补足星数 |
| Yue Zhao / Auditable AI | 维护者主页称其开源生态涵盖 agent audit、安全、评测与 PyOD，合计数千万下载/数万 stars，并被 Codex for OSS 接受。[主页](https://yzhao062.github.io/index.html) | agent 安全、auditability、可验证证据是高契合方向 |
| `super-productivity` | OpenAI Codex 仓库 issue 记录一名约 21k stars 项目的获批维护者收到 “You're in”，但已有订阅者点击激活时被标准促销流程拒绝。[Issue](https://github.com/openai/codex/issues/38587) | 申请成功与兑换成功是两个 gate；已有付费订阅者不要先取消计划或开第二账号 |

没有找到 OpenAI 官方公布的获批名单、最低 stars、成功率或固定处理时长。Reddit、LinkedIn、Telegram 等公开自述可作为发现信号，不能当成官方门槛。

## 方向比较

### 方向 A：继续做抖音/短视频生产工作流

优势：本地代码和证据资产最多，可快速 demo。  
问题：当前远程仓库私有、0 stars、无许可证；平台登录/版权/账号环境使外部复现和广泛采用困难；与 Codex for OSS 的“生态重要性”不够直接。  
判断：适合作为内部 dogfood，不适合作为第一申请项目。

### 方向 B：泛化 AI code-review bot

优势：直接对应 PR review。  
问题：赛道拥挤，已有 Sourcery、Vercel OpenReview、Kodus、Codeball 等项目；仅有“调用模型审查 diff”很难证明生态差异。  
判断：除非有独特的证据/治理层，否则不推荐。

### 方向 C：Agent Skill / MCP 安全扫描器

优势：与 Codex Security、agent auditability 和新兴 Agent Skills 供应链高度相关；当前公开项目和安全研究显示需求真实。Cisco Skill Scanner、Snyk Agent Scan、Sentry Skill Scanner、多个 GitHub 项目已验证痛点存在。[Cisco](https://github.com/cisco-ai-defense/skill-scanner) [Snyk](https://github.com/snyk/agent-scan) [Sentry](https://github.com/getsentry/skills/blob/main/skills/skill-scanner/scripts/scan_skill.py)  
问题：纯扫描器已经拥挤；误报、恶意样本安全处理和检测效果需要严谨基准。  
判断：可作为备选，但不作为当前主线；如果未来采用，必须做“互操作 + provenance + 人工 gate”，不能做又一个规则集合。

### 当前选择：MCP Receipt Conformance / Release Evidence Gate

核心用户：MCP server/registry 维护者、发布 MCP 包的开源项目，以及需要把第三方安全证据接入 release workflow 的下游客户端。
核心产物：`mcp-evidence-gate` 的 pinned receipt profile、结构一致性校验、artifact/digest/freshness/scope 验证、deterministic policy、CLI 和 Node 24 GitHub Action。
边界：不扫描代码、不运行第三方 MCP、不下载远程 evidence、不替代 Registry，不把 `clean` receipt 转化为服务器级安全结论。

当前证据已经包括 39 个本地测试、公共 CI、跨仓库 Action dogfood，以及 PASS/INCONCLUSIVE 两条公开运行记录。尚未形成的证据是：你对 #1404 的 downstream comment、维护者回复和非自有仓库的真实采用。

判断：这是当前唯一主线；核心代码进入 feature freeze，后续优先级是 upstream consumer feedback 和 external maintainer signal，而不是继续增加功能。

### 方向 D：MCP Registry Health & Provenance Auditor（降级，不作为主线）

核心用户：MCP Registry 维护者、MCP server 发布者、Agent Skills/MCP registry、企业内部 Agent 平台、需要审阅第三方远程 server 的开源项目。  
核心产物：`mcp-registry-health` CLI、GitHub Action、SARIF/JSON/Markdown receipt、Registry 快照、仓库漂移报告、远程 MCP handshake 分类、许可证/来源/commit 哈希/人工批准记录。  
与现有本地资产的连接：复用并泛化 `D:\Projects\dy_x1024\hotspot\agent_reach_hotspot.py` 的 source health、fallback、快照和去重思想，以及现有 workflow 中的 provenance、rights、human-review、strict gate 设计；不复制私有业务或账号 Cookie。

官方 MCP Registry 当前约 7.2k stars、960 forks、101 issues、39 个开放 PR，并自称为 MCP 客户端提供服务器列表。其公开 issue 已暴露可量化缺口：一次抽样走过 10,542 个远程 endpoint，其中 11.2% 的 URL 不会说 MCP；318 个是健康但需要认证的 `401/402/403`，不能粗暴当作失败；另一个 issue 记录单一域名下 75 个条目中 62 个返回 HTML。[Registry](https://github.com/modelcontextprotocol/registry) [健康抽样 issue](https://github.com/modelcontextprotocol/registry/issues/1487) [域名集中 issue](https://github.com/modelcontextprotocol/registry/issues/1488)

这组问题仍然是生态背景和未来适配器输入，但不再是当前仓库的直接交付目标。当前项目只消费 #1404 receipt，不主动扫描整个 Registry，也不把 endpoint 健康统计写成自己的采用证据。

项目关系必须明确：`mcp-evidence-gate` 是你自己的独立开源仓库；`modelcontextprotocol/registry` 是 receipt 规范的上游项目。申请时应以自己的仓库作为申请主体，并明确自己是下游 consumer，而不是 MCP Registry 的核心维护者。

## 当前项目路线与证据状态

申请主体是你自己的公开仓库 [`mcp-evidence-gate`](https://github.com/yandexuanxuan/mcp-evidence-gate)，不是 `modelcontextprotocol/registry`。仓库当前以 #1404 head SHA `20747d3253ba8638161dd95f1cec70df02993c22` 建立实验性 compatibility profile，并明确标注“非官方 Registry 实现”。

### 已完成的技术切片

- pinned JSON Schema 与 provenance profile；
- structural-first receipt conformance；
- artifact digest、freshness、scope、inconclusive reason 和 attestation 验证；
- 与 receipt 解耦的 deterministic release policy；
- CLI、Node 24 self-contained GitHub Action 和稳定 exit semantics；
- 39 个本地测试、公共 CI，以及第二仓库的跨仓库 dogfood。

### 已形成的公开证据

- 主仓库公共 CI：[run 32790164198](https://github.com/yandexuanxuan/mcp-evidence-gate/actions/runs/32790164198)；
- dogfood PASS：[run 32790257032](https://github.com/yandexuanxuan/mcp-evidence-gate-dogfood/actions/runs/32790257032)；
- dogfood INCONCLUSIVE：[run 32790323087](https://github.com/yandexuanxuan/mcp-evidence-gate-dogfood/actions/runs/32790323087)；
- dogfood 当前默认分支恢复为绿色：[run 32790402854](https://github.com/yandexuanxuan/mcp-evidence-gate-dogfood/actions/runs/32790402854)。

这些记录证明的是“下游仓库可以消费固定版本的 Action”，不是 external adoption。当前仍缺少你在 #1404 的 downstream comment、维护者回复、非自有仓库试用和外部 PR/issue。

### 当前阶段（feature freeze）

对外引用固定为 `yandexuanxuan/mcp-evidence-gate@13bd12875a2d9381b518c0b543549ca89cbc42b8`。只接受 bug fix、平台兼容修复和 #1404 profile 漂移适配；不新增 SARIF、scanner、dashboard、Registry API 或 policy DSL，除非外部维护者提出明确需求。

下一步顺序固定为：向 #1404 提交窄的 consumer feedback；等待 maintainer signal；联系 3–5 个活跃 MCP 项目作为 design partners；只有出现真实外部使用后，才补充申请材料。

## 申请前的硬门槛与当前缺口

在下列证据未达到前，不建议急着提交：

1. 仓库公开、许可证清晰、README 可运行；
2. 最近 8–12 周有持续提交、release 或 merged PR；
3. 至少 3 个外部使用/反馈信号，优先顺序：外部仓库启用、合并 PR、下载量、issue/讨论、依赖/引用；
4. 至少 1 个外部维护者接受过你的修复或采用你的 Action；
5. CI、测试、安全策略、贡献指南、发布流程和变更日志齐全；
6. 有一页公开指标快照，所有数字带抓取日期和来源；
7. 申请邮箱对应 ChatGPT 账户，GitHub 个人资料和仓库公开；
8. 如果当前已有 ChatGPT 付费订阅，先确认账户状态和激活路径，不要取消订阅或通过第二账户绕过检查。

当前状态：第 1、5、7 项已基本具备；第 2 项刚开始积累；第 3、4、6、8 项仍需按真实情况补齐。自有 dogfood 不计入 external adoption，也不能替代外部维护者的回复或采用。

## 申请表草稿（英文，需在提交前按真实数据替换）

### Why does this repository qualify?（≤500 characters）

> `mcp-evidence-gate` is an open-source downstream consumer for the experimental MCP Registry #1404 receipt proposal. It provides pinned structural conformance, artifact-digest/freshness/scope verification, deterministic release policy, a CLI, and a self-contained GitHub Action. Public CI and cross-repository dogfood prove reproducible PASS/INCONCLUSIVE behavior. I am the primary maintainer; upstream feedback and external adoption are being built.

### How will you use API credits for your project?（≤500 characters）

> API credits will support bounded maintainer workflows: receipt compatibility regression tests, issue triage, PR review, release documentation, and evidence-policy analysis. Codex will run in read-only or isolated CI contexts; all patches require human review. Test results, verification receipts, and release changes will be published with the repository.

### Anything else

> This is an independent downstream consumer, not an official MCP Registry implementation or a vulnerability scanner. I will publish compatibility changes and maintainer feedback, distinguish self-owned dogfood from external adoption, and avoid claiming that a clean receipt proves a server is globally safe.

## 停止条件与风险

- 不要为了申请刷 stars、伪造下载量、批量制造低质量仓库或把未授权项目写成自己的维护项目。
- 不要把现有私有 `douyin-1024` 仓库直接改公开；先做敏感信息、第三方许可证、生产资产、Cookie、账号和历史提交审计，再决定是否抽出干净子项目。
- 活动是选择制，不是达到某个数字就自动获批；本方案只能提高证据质量，不能保证成功。
- 公开资料显示有人获批后因已有订阅或账号审核无法激活/继续使用；这是单独的交付风险。
- 如果 90 天内没有外部采用或合并 PR，应把项目定位为早期实验，不要声称“生态重要”并提交夸大申请。

## 研究方法与停止理由

使用了 OpenAI 官方页面/条款/安全文章、OpenAI Developer Community、GitHub 仓库与 issue、维护者博客/主页、公开获批者自述、OpenSSF 官方资料，以及本地 `hotspot` 模块的实时 source-health/Agent Reach doctor。实际验证的模块路径是 `D:\Projects\dy_x1024\hotspot\agent_reach_hotspot.py`（用户给出的字面路径 `D:\Projects\dy\_x1024\hotspot` 不存在）；Agent Reach doctor 返回可用且网络验证通过，公开 YouTube、Bilibili、RSS 后端返回候选，GitHub 本次查询没有返回可用候选。已对官方条件、公开案例、竞争工具、生态安全需求和本地仓库状态做了交叉检查；未发现统一星数门槛或公开成功率，因此不继续堆叠弱证据。
