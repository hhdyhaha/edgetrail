# EdgeTrail Analytics

[English](./README.md) | 中文

EdgeTrail Analytics 是一个隐私优先、可自托管的网站分析 MVP，专门围绕
Cloudflare 服务构建。

它适合独立工具、内容站、小型 SaaS 产品使用：你可以看到基本流量数据，但不需要
cookie 跟踪，不存储原始 IP，也不必把访客数据交给第三方分析平台。

## 它能做什么

EdgeTrail 提供一套运行在 Cloudflare 上的小型分析系统：

- 一个 Web 控制台：支持 Google 登录、创建站点、管理允许域名、复制跟踪脚本、
  查看分析报表。
- 一个很小的浏览器跟踪脚本，由你自己的 collector worker 提供。
- 一个 collector worker：校验事件、清理敏感数据、写入分析数据，并把清理后的事件
  发送到队列，同时通过 Durable Objects 维护实时在线状态。
- 一个 queue worker：更新 D1 每日汇总，并把事件批次以 NDJSON 形式归档到 R2。
- 登录用户可看的私有仪表盘，以及可选的只读公开分享链接。

当前仪表盘可以查看：当前在线、浏览量、近似访客数、近似访问次数、每次访问浏览量、流量趋势、
热门页面、来源、国家/地区、设备、浏览器、操作系统和 UTM 来源。

## 为什么基于 Cloudflare

项目围绕 Cloudflare 原生服务设计：

- **Workers** 运行 Web 应用、collector 和 queue consumer。
- **D1** 存储用户、组织、站点、分享链接、每日汇总、归档元数据和已处理事件 ID。
- **Workers Analytics Engine** 存储可查询的事件流，用于仪表盘报表。
- **Durable Objects** 维护可 hibernation 的 WebSocket 连接，用于实时在线人数。
- **Queues** 把事件接收和汇总/归档任务解耦。
- **R2** 存储清理后的事件归档。

这样做的好处是：运行位置靠近边缘节点，不需要单独维护分析服务器，也更容易在一个
Cloudflare 账号里自托管。

## 隐私模型

EdgeTrail 的默认设计是隐私优先：

- 不使用 cookie 做访客跟踪。
- 不存储原始 IP。
- 不存储完整原始 User-Agent。
- 不生成跨站访客 ID。
- 访客 ID 和会话 ID 使用 HMAC 哈希，并且限定在单个站点和较短时间窗口内。
- 页面标题进入事件管道前会先哈希。
- 跟踪脚本会移除 URL hash，只保留 UTM 查询参数用于分析。
- Collector 只接受来自该站点允许域名的事件。

由于采用隐私优先事件模型，并且报表查询来自 Workers Analytics Engine，访客数和访问
次数是近似值。

## 仓库结构

```txt
apps/
  web/                运行在 Cloudflare Workers 上的 TanStack Start 控制台
  collector-worker/   Hono collector，提供 /script.js、/collect、/presence 和 /health
  queue-worker/       Cloudflare Queue consumer，负责 D1 汇总和 R2 归档

packages/
  analytics/          Workers Analytics Engine 映射、SQL 和查询客户端
  db/                 Drizzle D1 schema、迁移和 repository helpers
  shared/             Zod schema、常量、时间工具和日志脱敏
  tracker/            零运行时依赖的浏览器跟踪脚本
  ui/                 共享 React UI 组件
  config/             共享 TypeScript 配置
```

## 数据如何流动

```txt
访客浏览器
  -> 从 collector-worker 加载 /script.js
  -> 把 pageview 或 custom_event 发送到 /collect
  -> 通过 /presence 打开可 hibernation 的 WebSocket
  -> collector 校验站点、来源、域名和 payload
  -> collector 清理数据并哈希敏感值
  -> collector 写入 Workers Analytics Engine datapoint
  -> collector 把清理后的事件发送到队列
  -> collector 把 presence 连接路由到按站点划分的 Durable Object
  -> queue-worker 对事件去重
  -> queue-worker 更新 D1 每日汇总
  -> queue-worker 把 NDJSON 归档写入 R2
  -> web 控制台在服务端查询 Workers Analytics Engine
  -> 私有仪表盘通过 WebSocket 观察实时在线状态
```

## 运行要求

- Node.js 和 pnpm
- Cloudflare 账号
- Wrangler
- Cloudflare D1
- Cloudflare Workers Analytics Engine
- Cloudflare Queues
- Cloudflare R2
- 用于控制台登录的 Google OAuth 凭证

仓库中提交的 `wrangler.jsonc` 使用的是公开占位资源名。真实资源名、资源 ID、API
token、OAuth secret 和本地状态文件都必须留在 git 之外。

## 配置边界

本地/测试和生产配置必须分层保存：

| 层级 | 文件或存储位置 | 用途 |
| --- | --- | --- |
| 已提交模板 | `wrangler.jsonc`、`.dev.vars.example` | 公开 binding 结构、必需 secret 名称、localhost 默认值和生产 binding 占位符。 |
| 本地运行 | `wrangler.local.jsonc`、`.dev.vars` | 被 git 忽略的本地/测试资源、localhost URL 和本地/测试 secret。 |
| 生产运行 | Cloudflare Worker secrets 和 `env.production` bindings | 真实生产 OAuth 凭证、API token、资源 ID 和生产 origin。 |

Google OAuth 要使用两个 client：本地/测试 client 授权：

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

生产 client 只授权已部署控制台的生产 origin 和 callback。不要把生产 OAuth client secret
复制到本地 `.dev.vars`。

## 本地启动

安装依赖：

```sh
pnpm install
```

生成 Cloudflare binding 类型：

```sh
pnpm cf-typegen
```

从公开占位配置复制本地 Wrangler 配置：

```sh
cp apps/web/wrangler.jsonc apps/web/wrangler.local.jsonc
cp apps/collector-worker/wrangler.jsonc apps/collector-worker/wrangler.local.jsonc
cp apps/queue-worker/wrangler.jsonc apps/queue-worker/wrangler.local.jsonc
```

然后把这些被 git 忽略的本地文件里的占位资源名和 ID 替换成你自己的开发或测试资源。
本地资源名应保持明显的 local 命名，例如 `edgetrail-local`、`edgetrail-events-local`
和 `edgetrail-archive-local`。对于本地实时在线状态，collector 的 `DASHBOARD_ORIGIN`
应指向 Web 开发地址，通常是 `http://localhost:3000`。

复制本地 secret 示例：

```sh
cp apps/web/.dev.vars.example apps/web/.dev.vars
cp apps/collector-worker/.dev.vars.example apps/collector-worker/.dev.vars
```

Web 应用需要填写：

- `BETTER_AUTH_SECRET`
- 来自本地/测试 OAuth client 的 `GOOGLE_CLIENT_ID`
- 来自本地/测试 OAuth client 的 `GOOGLE_CLIENT_SECRET`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- 本地或测试 Workers Analytics Engine dataset 的 `WAE_DATASET`

Collector 需要填写：

- `HASH_SECRET`

创建站点前，先把 D1 migration 应用到你的开发数据库：

```sh
pnpm --filter web exec wrangler d1 migrations apply <your-dev-d1-name> --local --config wrangler.local.jsonc
```

在不同终端分别启动本地服务：

```sh
pnpm dev:web:local
pnpm dev:collector:local
pnpm dev:queue:local
```

默认情况下，Web 应用运行在 `http://localhost:3000`，collector 使用 Wrangler 输出的本地
端口。

## 使用这个 MVP

1. 使用 Google 登录控制台。
2. 创建一个站点，并填写主域名。
3. 在站点设置页复制生成的跟踪脚本。
4. 把脚本加入目标网站。
5. 确认目标网站 origin 匹配该站点允许域名。
6. 打开目标网站，确认 collector 的 `/collect` 返回 `204`。
7. 在私有仪表盘查看分析数据。
8. 如有需要，生成只读公开分享链接。

生成的脚本会绑定到站点的 public site ID，并自动发送 pageview。它也会暴露
`window.edgeTrail.track(label, metadata)` 用于发送自定义事件。

## 质量检查

在仓库根目录运行主要检查：

```sh
pnpm check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check` 会运行 Biome 格式和 lint 检查。`pnpm test` 会运行工作区测试，包括共享
校验、tracker 行为、analytics SQL、D1 repository helpers、collector 行为、queue 处理、
i18n、API 权限和仪表盘 view-model 测试。

## 部署边界

生产部署不会自动进行。

如果要部署你自己的版本，需要先创建真实 Cloudflare 资源，在私有部署配置中替换生产
binding 占位符，设置 Wrangler secrets，应用生产 D1 migrations，并在你自己的账号里验证
从 collector 到 dashboard 的完整链路。

生产 secret 必须设置到 production Worker 环境，不能写进本地文件。例如生产环境的
secret 命令需要带 `--env production`。

不要提交：

- `.dev.vars`
- `.env`
- `wrangler.local.jsonc`
- Cloudflare API token
- Google OAuth secret
- Better Auth secret
- 真实生产数据库 ID、queue 名称、bucket 名称、Workers Analytics Engine dataset 名称或私有运营笔记

## License

MIT
