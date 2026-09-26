# PhD Scout — 欧洲 CS 岗位制博士发现工作台

静态站点，帮助你用**可共享的源目录 + 检索配方（skill）**手动扫欧洲计算机方向岗位制博士机会，并把感兴趣的岗位保存在**本机浏览器**。

暂时适合部署到 [GitHub Pages](https://pages.github.com/)。

## 隐私边界

| 内容 | 存放位置 | 是否可进公开仓库 |
|------|----------|------------------|
| 源目录、检索配方、判断清单模板 | 仓库 `src/data/` | 可以（欢迎 PR） |
| 自定义源、机会收件箱、扫描记录、备注、优先级、AI 分析结果 | 浏览器 `localStorage` | **不可以** |
| API Key、CV 原文、背景摘要 | 浏览器 `localStorage`（设置页） | **不可以** |
| 导出的 JSON 备份 | 你自己保存的文件 | **不要 commit**（导出会去掉 API Key） |

`.gitignore` 已忽略 `inbox-export*.json`、`*-private.json`。换设备时用站内「导出 / 导入 JSON」迁移数据。

## 本地开发

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
npm run preview
```

## GitHub Pages 部署

1. 仓库 Settings → Pages → Source 选 **GitHub Actions**。
2. 推送到 `main`（或 `master`）后，工作流 `.github/workflows/deploy.yml` 会构建并发布。
3. 站点路径默认为 `/phd_application_management/`（与本仓库名一致）。若仓库改名，请同步修改 `vite.config.ts` 中的 `base`。

## 用法（发现优先）

1. 打开 **检索工作台**，选择配方（如「CS PhD · Europe broad」）。
2. 按列表逐个「打开搜索」，或「打开全部源」；勾选「已扫过」跟踪进度。
3. 在「管理检索源」中 **新增自定义源**（仅本机），并可挂到当前配方。
4. 在外部网站找到感兴趣岗位后，点「存入收件箱」填写标题与链接（数据只存本机）。
5. 在收件箱设置优先级（十分想申 / 可以尝试 / 备选），用状态、优先级、国家筛选。
6. 在 **设置** 中配置 DeepSeek API；**上传 CV**（PDF/TXT/MD）并点「生成背景摘要」（只总结一次并缓存）。换 CV 后重新生成即可覆盖。收件箱 **AI 分析** 只会带上这份摘要，不会每次重传完整 CV。
7. 定期 **导出 JSON** 备份（导出会自动去掉 API Key）。

## 如何贡献 / 自定义 skill

### 新增检索源

编辑 [`src/data/sources.ts`](src/data/sources.ts)，按现有字段添加：

- `id`, `name`, `url`, `countries`, `type`
- `howToSearch`, `csNotes`
- 可选 `searchUrlTemplate`（用 `{query}` 占位编码后的关键词）

### 新增检索配方

编辑 [`src/data/skills.ts`](src/data/skills.ts)：

- `keywords` / `exclude`：工作台用于生成查询预览与搜索 URL
- `sources`：引用 `sources.ts` 里的 `id` 列表
- `tips`：给使用者的扫描提示

无需改业务代码；他人 fork 后改 JSON/TS 数据即可适配子方向。

### 判断清单

编辑 [`src/data/checklists.ts`](src/data/checklists.ts)。勾选进度存在本地机会条目上，不会写回仓库。

## 明确不做（v1）

- 自动爬取 / RSS 聚合、账号登录、云端同步
- 完整申请材料与推荐信管理（后续版本可扩展）

## 技术栈

Vite + React + TypeScript，无后端。
