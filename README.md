# 知识点树与题目推荐系统

这个项目提供了一套完整的知识图谱与题目推荐系统，基于RAG（检索增强生成）技术构建，用于教育领域的知识点管理和题目推荐。

## 项目简介

本项目包含以下主要功能：

1. 知识点树数据处理与转换
2. 知识图谱构建
3. 基于知识图谱的题目推荐
4. RESTful API接口服务

## 安装与运行

### 环境要求

- Node.js (v12.0.0或更高版本)
- npm (v6.0.0或更高版本)

### 安装步骤

1. 克隆项目到本地

```bash
git clone <项目仓库地址>
cd knowledge-points-rag
```

2. 安装依赖

```bash
npm install
```

3. 启动服务

```bash
npm start
```

启动成功后，可通过以下地址访问：
- 接口文档: http://localhost:3000/
- 知识点搜索示例: http://localhost:3000/api/knowledge/search?keyword=集合
- 题目推荐示例: http://localhost:3000/api/recommend/questions/1

## 数据处理工具

本项目提供了一系列数据处理工具，用于处理知识点和题目数据：

1. 提取知识点：`npm run extract`
2. 转换为RAG格式：`npm run convert`
3. 处理题目数据：`npm run process-questions`

## 文件结构

- `knowledge-point.json` - 原始知识点树数据（学科知识点树）
- `knowledge-points-cleaned.json` - 经过提取和清洗后的知识点树JSON
- `knowledge-points-rag.csv` - 最终生成的RAG格式CSV文件
- `extract-knowledge-points.js` - 知识点提取脚本
- `convert-to-rag-format.js` - RAG格式转换脚本
- `question-example.json` - 原始题目数据示例
- `question-processed.json` - 处理后的题目数据
- `process-questions.js` - 题目数据处理脚本
- `knowledge-graph.js` - 知识图谱构建模块
- `recommendation-engine.js` - 推荐引擎模块
- `api.js` - API接口模块
- `index.js` - 主程序入口

## API接口说明

### 1. 获取API信息

- **URL**: `/`
- **方法**: `GET`
- **描述**: 获取API接口信息和可用端点列表
- **响应示例**:
```json
{
  "name": "知识点与题目推荐API",
  "version": "1.0.0",
  "endpoints": [
    { "path": "/api/knowledge/search", "method": "GET", "description": "搜索知识点" },
    { "path": "/api/knowledge/:id", "method": "GET", "description": "获取知识点详情" },
    { "path": "/api/recommend/questions/:knowledgeId", "method": "GET", "description": "根据知识点推荐题目" },
    { "path": "/api/recommend/questions", "method": "POST", "description": "根据多个知识点推荐题目" }
  ]
}
```

### 2. 搜索知识点

- **URL**: `/api/knowledge/search`
- **方法**: `GET`
- **参数**: 
  - `keyword` (必填): 搜索关键词
  - `limit` (可选): 返回结果数量限制，默认为10
- **响应示例**:
```json
{
  "results": [
    { "id": "1", "name": "集合", "path": "数学/高中数学/集合" },
    { "id": "2", "name": "集合的基本运算", "path": "数学/高中数学/集合/集合的基本运算" }
  ]
}
```

### 3. 获取知识点详情

- **URL**: `/api/knowledge/:id`
- **方法**: `GET`
- **参数**: 
  - `id` (路径参数): 知识点ID
- **响应示例**:
```json
{
  "knowledgePoint": {
    "id": "1",
    "name": "集合",
    "path": "数学/高中数学/集合",
    "level": 3,
    "parentId": "parent_id"
  }
}
```

### 4. 根据知识点推荐题目

- **URL**: `/api/recommend/questions/:knowledgeId`
- **方法**: `GET`
- **参数**: 
  - `knowledgeId` (路径参数): 知识点ID
  - `limit` (查询参数，可选): 返回结果数量限制，默认为10
- **响应示例**:
```json
{
  "recommendations": [
    {
      "id": "q001",
      "content": "题目内容...",
      "options": [{"choice": "A", "option": "选项A内容"}],
      "answers": ["A"]
    }
  ]
}
```

### 5. 根据多个知识点推荐题目

- **URL**: `/api/recommend/questions`
- **方法**: `POST`
- **请求体**: 
```json
{
  "knowledgeIds": ["1", "2", "3"],
  "limit": 10
}
```
- **响应示例**:
```json
{
  "recommendations": [
    {
      "id": "q001",
      "content": "题目内容...",
      "options": [{"choice": "A", "option": "选项A内容"}],
      "answers": ["A"]
    }
  ]
}
```

## 系统架构

本系统采用模块化设计，主要包含以下几个核心模块：

1. **知识图谱模块** (knowledge-graph.js)
   - 负责构建知识点和题目之间的关联关系
   - 提供知识点查询和相似知识点推荐功能

2. **推荐引擎模块** (recommendation-engine.js)
   - 基于知识图谱提供题目推荐功能
   - 支持单知识点和多知识点的题目推荐

3. **API接口模块** (api.js)
   - 提供RESTful API接口
   - 处理HTTP请求和响应

4. **数据处理工具**
   - 知识点提取和转换工具
   - 题目数据处理工具

## 许可证

ISC
