# DA Platform Backend

一个用于 DA 平台的基础后端服务，基于 Node.js + Express。

## 功能概览
- 健康检查：`GET /health`
- 用户接口（示例）：
  - `GET /api/users` 获取示例用户列表
  - `POST /api/users` 新增示例用户（body: `{ username, email, roles? }`）
  - `PATCH /api/users/:id/status` 更新用户状态（`active`/`disabled`）
- 帧数接口（示例）：`GET /api/frames` 返回总帧数 `60`
- 本地数据集（开发阶段）：
  - 静态资源根：`/dataset`（映射到 `DATASET_DIR`）
  - 数据集信息：`GET /api/dataset/info`
  - 帧/资源列表：`GET /api/dataset/frames`

## 本地运行

```bash
cd backend
npm install
npm run dev
# 访问 http://localhost:8080/health
```

## 环境变量
复制 `.env.example` 为 `.env` 并按需修改：

```
PORT=8080
DATASET_DIR=/Users/<你的用户名>/Downloads/scene_01
```

说明：`DATASET_DIR` 指向本地数据目录，后端会将其暴露为静态资源根 `/dataset`，并通过 `/api/dataset/*` 提供文件列表与摘要信息。若不设置，默认尝试使用 `~/Downloads/scene_01`。

## Docker 构建与运行

```bash
cd backend
docker build -t da-platform-backend:latest .
docker run -p 8080:8080 da-platform-backend:latest
```

## GitHub Actions 自动构建与发布

工作流文件：`.github/workflows/backend.yml`

触发条件：
- 推送到 `main` 分支且更改包含 `backend/**` 或工作流文件本身
- 或手动触发 `workflow_dispatch`

流程：
1. 安装依赖并执行测试（示例测试）
2. 登录 GitHub Container Registry（GHCR）
3. 构建并推送镜像到 `ghcr.io/<owner>/da-platform-backend`

镜像标签由 `docker/metadata-action` 自动生成（包含 `latest` 与提交 SHA 等）。

### 部署到云平台（可选）

当前工作流完成自动构建与发布镜像。若需自动部署到云平台，可在同一工作流添加部署 job，例如 Render/Railway/Fly.io 等（需要在仓库 Secrets 配置 API Key/服务标识）。示例伪代码：

```yaml
deploy:
  needs: build-and-publish
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to Render
      run: |
        curl -X POST \
          -H "Authorization: Bearer ${{ secrets.RENDER_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d '{"serviceId":"${{ secrets.RENDER_SERVICE_ID }}"}' \
          https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys
```

> 请根据所选平台的官方文档配置实际部署步骤与 Secrets。