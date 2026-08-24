# Codex for Open Source 申请方向深度调研

日期：2026-08-25  
目标：为一名已有本地 AI 内容/证据工作流、但当前公开仓库尚未形成采用量的开发者，选择一个真实、可验证、能提高 Codex for Open Source 申请竞争力的开源项目方向。

## 结论先行

活动页面仍在收件，采用滚动审核，没有公开统一截止日期、星数门槛、成功率或名额。官方看重的是活跃维护、实际使用/广泛采用、生态重要性，以及 PR review、issue triage、release management 等持续维护负担。

当前本地仓库 `D:\Projects\dy_x1024\dy_1024` 的远程是 `https://github.com/yandexuanxuan/douyin-1024.git`；实时 GitHub 查询显示它是私有仓库、0 stars、无公开许可证。它不能作为今天就提交的高胜率申请项目。

相对最优方向不是再做一个泛化的 AI code-review bot，而是做一个面向官方 MCP Registry 的 **MCP Registry Health & Provenance Auditor**，并把 Agent Skill/MCP 的证据门控作为其中的可复用层：

1. 读取 Registry 分页 API，做带时间戳的公开快照、仓库漂移和 endpoint 健康审计；
2. 对 `server.json`、MCP remote、仓库来源和包哈希生成可复查 provenance 记录；
3. 正确区分 `alive-open`、`alive-gated`、`wrong-transport`、`not-mcp`、`dead`、`unknown`，不把 401/402/403 误报成故障；
4. 以 GitHub Action、CLI、SARIF/JSON/Markdown 报告服务维护者，并把 PR review、issue triage、release gate 和安全复核变成可复查 receipts。

这是一个“Registry 生态健康 + 证据/治理互操作层”，不是声称重新发明扫描器。Cisco、Snyk、Sentry 等已有扫描器应作为可选输入；差异化放在统一 provenance、可复现报告、人工批准边界、远程 endpoint 漂移和跨 Agent Skills/MCP 格式。

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
判断：推荐，但必须做“互操作 + provenance + 人工 gate”，不要做又一个规则集合。

### 方向 D：MCP Registry Health & Provenance Auditor（推荐）

核心用户：MCP Registry 维护者、MCP server 发布者、Agent Skills/MCP registry、企业内部 Agent 平台、需要审阅第三方远程 server 的开源项目。  
核心产物：`mcp-registry-health` CLI、GitHub Action、SARIF/JSON/Markdown receipt、Registry 快照、仓库漂移报告、远程 MCP handshake 分类、许可证/来源/commit 哈希/人工批准记录。  
与现有本地资产的连接：复用并泛化 `D:\Projects\dy_x1024\hotspot\agent_reach_hotspot.py` 的 source health、fallback、快照和去重思想，以及现有 workflow 中的 provenance、rights、human-review、strict gate 设计；不复制私有业务或账号 Cookie。

官方 MCP Registry 当前约 7.2k stars、960 forks、101 issues、39 个开放 PR，并自称为 MCP 客户端提供服务器列表。其公开 issue 已暴露可量化缺口：一次抽样走过 10,542 个远程 endpoint，其中 11.2% 的 URL 不会说 MCP；318 个是健康但需要认证的 `401/402/403`，不能粗暴当作失败；另一个 issue 记录单一域名下 75 个条目中 62 个返回 HTML。[Registry](https://github.com/modelcontextprotocol/registry) [健康抽样 issue](https://github.com/modelcontextprotocol/registry/issues/1487) [域名集中 issue](https://github.com/modelcontextprotocol/registry/issues/1488)

这给项目一个真实、可引用、可在 90 天内复测的生态问题，而不是凭空构造需求。项目应定位为 Registry 的外部审计/可复现观测层，先以只读报告和 opt-in Action 建立信任，再向 Registry 提交经过证据支持的 issue/PR。

项目关系必须明确：`mcp-registry-health` 是你自己的独立开源仓库；`modelcontextprotocol/registry` 是被审计、被服务、也可以向其贡献 issue/PR 的上游项目。申请时应以你自己的仓库作为申请主体，不把自己描述成 MCP Registry 的核心维护者。

## 推荐项目的最小可行产品

建议仓库暂名：`mcp-registry-health`（最终名称先做命名冲突检查）。

### v0.1（第 1–2 周）

- 读取 MCP Registry 分页 API，保存带时间戳的离线快照；
- 校验 `server.json`、包类型、repository URL、版本和 SHA-256；
- 检查 GitHub 仓库删除/改名/转移/归档、注册名称与来源是否一致；
- 所有异常带精确条目、URL、抓取时间和证据；默认只读，不执行第三方代码。

### v0.2（第 3–5 周）

- 对 `remotes[]` 做低频、只读 MCP `initialize` 探测；
- 固定分类：`alive-open`、`alive-gated`、`wrong-transport`、`not-mcp`、`dead`、`unknown`；
- 特别把 401/402/403 识别为“服务存活但要求认证”；
- 输出 JSON/CSV/Markdown 和可选 SARIF；
- 加入 30–50 个离线 endpoint fixture，做回归测试和误报统计。

### v0.3（第 6–9 周）

- 为 5–10 个公开 MCP server 仓库提供 opt-in release/PR 检查；
- 每周公开 Registry 健康与漂移报告：条目数、endpoint 数、各类状态、重复域名、仓库漂移；
- 针对 Registry 公开 issue 提交 2–3 个高质量、可复现的 issue/PR；
- 发布带签名的 release、CHANGELOG、SECURITY.md、CONTRIBUTING.md、CODE_OF_CONDUCT.md；
- 使用 OpenSSF Scorecard Action 和最小权限工作流；参考 [Scorecard Action](https://github.com/ossf/scorecard-action) 的 SARIF、OIDC、固定 action SHA 和只读默认权限实践。

### v0.4（第 10–12 周）

- 形成至少一个公开采用证据：外部仓库启用 Action、release 下载量、PyPI/npm 下载量、引用/依赖仓库或合并 PR；
- 发布“维护者手册”：如何处理 endpoint 告警、如何复核认证服务、如何处理仓库漂移、如何安全运行第三方配置；
- 以公开 issue/PR/release history 证明本人是 primary maintainer，并把 Codex 未来工作绑定到真实 Registry/用户 backlog。

## 申请前的硬门槛

在下列证据未达到前，不建议急着提交：

1. 仓库公开、许可证清晰、README 可运行；
2. 最近 8–12 周有持续提交、release 或 merged PR；
3. 至少 3 个外部使用/反馈信号，优先顺序：外部仓库启用、合并 PR、下载量、issue/讨论、依赖/引用；
4. 至少 1 个外部维护者接受过你的修复或采用你的 Action；
5. CI、测试、安全策略、贡献指南、发布流程和变更日志齐全；
6. 有一页公开指标快照，所有数字带抓取日期和来源；
7. 申请邮箱对应 ChatGPT 账户，GitHub 个人资料和仓库公开；
8. 如果当前已有 ChatGPT 付费订阅，先确认账户状态和激活路径，不要取消订阅或通过第二账户绕过检查。

## 申请表草稿（英文，需在提交前按真实数据替换）

### Why does this repository qualify?（≤500 characters）

> `mcp-registry-health` is an open-source CLI and GitHub Action for health, provenance, and drift checks across the public MCP Registry. It produces reproducible JSON/SARIF receipts, distinguishes authenticated live servers from broken endpoints, and links findings to a registry entry, repository commit, and timestamp. It is actively maintained and used by [真实仓库数量] public repositories. I am the primary maintainer handling PR review, triage, releases, and security response.

### How will you use API credits for your project?（≤500 characters）

> API credits will support bounded maintainer workflows: regression-test generation for endpoint classifications, issue triage with structured labels, release-note and registry-drift documentation, and review of validation/security PRs. Codex will run in read-only or isolated CI contexts; all patches require human review. Usage receipts, test results, and release changes will be published with the repository.

### Anything else

> The project will publish weekly adoption and detection metrics, a false-positive/error analysis, and a responsible-disclosure process. I will not scan private or unauthorized repositories, execute untrusted MCP commands during collection, or auto-merge security fixes.

## 停止条件与风险

- 不要为了申请刷 stars、伪造下载量、批量制造低质量仓库或把未授权项目写成自己的维护项目。
- 不要把现有私有 `douyin-1024` 仓库直接改公开；先做敏感信息、第三方许可证、生产资产、Cookie、账号和历史提交审计，再决定是否抽出干净子项目。
- 活动是选择制，不是达到某个数字就自动获批；本方案只能提高证据质量，不能保证成功。
- 公开资料显示有人获批后因已有订阅或账号审核无法激活/继续使用；这是单独的交付风险。
- 如果 90 天内没有外部采用或合并 PR，应把项目定位为早期实验，不要声称“生态重要”并提交夸大申请。

## 研究方法与停止理由

使用了 OpenAI 官方页面/条款/安全文章、OpenAI Developer Community、GitHub 仓库与 issue、维护者博客/主页、公开获批者自述、OpenSSF 官方资料，以及本地 `hotspot` 模块的实时 source-health/Agent Reach doctor。实际验证的模块路径是 `D:\Projects\dy_x1024\hotspot\agent_reach_hotspot.py`（用户给出的字面路径 `D:\Projects\dy\_x1024\hotspot` 不存在）；Agent Reach doctor 返回可用且网络验证通过，公开 YouTube、Bilibili、RSS 后端返回候选，GitHub 本次查询没有返回可用候选。已对官方条件、公开案例、竞争工具、生态安全需求和本地仓库状态做了交叉检查；未发现统一星数门槛或公开成功率，因此不继续堆叠弱证据。
