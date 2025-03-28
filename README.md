# 知识点树 RAG 转换工具

这个项目提供了一套工具，用于将结构化的知识点树数据转换为适合检索增强生成(RAG)系统使用的格式。

## 项目简介

本项目包含两个主要脚本：

1. `extract-knowledge-points.js` - 从原始JSON格式的知识点树中提取知识点，并转换为扁平化的JSON结构
2. `convert-to-rag-format.js` - 将扁平化的知识点JSON转换为CSV格式，适合RAG系统使用

## 文件结构

- `knowledge-point.json` - 原始知识点树数据（学科知识点树）
- `knowledge-points-cleaned.json` - 经过提取和清洗后的知识点树JSON
- `knowledge-points-rag.csv` - 最终生成的RAG格式CSV文件
- `extract-knowledge-points.js` - 知识点提取脚本
- `convert-to-rag-format.js` - RAG格式转换脚本
- `question-example.json` - 原始题目数据示例（包含HTML标签的富文本格式）
- `question-processed.json` - 处理后的题目数据（纯文本格式，适合AI处理）
- `process-questions.js` - 题目数据处理脚本

## 转换逻辑

### 1. 知识点提取过程

`extract-knowledge-points.js` 脚本执行以下操作：

- 读取原始知识点树JSON文件（`knowledge-point.json`）
- 递归遍历知识点树结构
- 提取每个节点的名称和层级关系
- 构建扁平化的知识点树结构
- 将结果保存为新的JSON文件（`knowledge-points-cleaned.json`）

### 2. RAG格式转换过程

`convert-to-rag-format.js` 脚本执行以下操作：

- 读取扁平化的知识点JSON文件（`knowledge-points-cleaned.json`）
- 递归处理知识点树，为每个节点分配唯一ID
- 构建包含以下字段的数据结构：
  - `id`: 知识点唯一标识符
  - `name`: 知识点名称
  - `path`: 知识点完整路径（从根节点到当前节点）
  - `level`: 知识点在树中的层级
  - `parent_id`: 父节点ID
- 将结果转换为CSV格式并保存（`knowledge-points-rag.csv`）

### 3. 题目数据处理过程

`process-questions.js` 脚本执行以下操作：

- 读取原始题目JSON文件（`question-example.json`）
- 处理富文本格式，去除HTML标签（如`<br/>`）
- 提取题干、选项、答案和解析等关键信息
- 保留题目与知识点的关联关系
- 将结果保存为适合AI语言模型处理的JSON格式（`question-processed.json`）

## 使用方法

### 提取知识点

```bash
node extract-knowledge-points.js
```

这将从`knowledge-point.json`中提取知识点，并生成`knowledge-points-cleaned.json`文件。

### 转换为RAG格式

```bash
node convert-to-rag-format.js
```

这将从`knowledge-points-cleaned.json`中读取知识点树，并生成`knowledge-points-rag.csv`文件。

### 处理题目数据

```bash
node process-questions.js
```

这将从`question-example.json`中读取原始题目数据，处理后生成`question-processed.json`文件。

## 输出格式说明

### 知识点RAG格式

生成的CSV文件包含以下列：

- `id`: 知识点唯一ID（整数，从1开始）
- `name`: 知识点名称
- `path`: 知识点完整路径，使用 > 分隔各级节点
- `level`: 知识点在树中的层级（整数，从1开始）
- `parent_id`: 父节点ID（0表示顶级节点）

### 题目处理格式

处理后的题目JSON文件包含以下字段：

- `questionId`: 题目唯一标识符
- `questionContent`: 题目内容（纯文本格式，已去除HTML标签）
- `options`: 选项数组，每个选项包含：
  - `choice`: 选项标识（如A、B、C、D）
  - `option`: 选项内容（纯文本格式）
- `answers`: 正确答案数组
- `parse`: 题目解析（纯文本格式）
- `explain`: 题目详细解释（纯文本格式，已将HTML换行标签转换为\n）
- `knowledgePoints`: 关联知识点数组，每个知识点包含：
  - `id`: 知识点ID
  - `name`: 知识点名称

## 应用场景

### 知识点数据应用

生成的CSV格式知识点数据可用于：

- 构建知识图谱
- 作为RAG系统的检索源
- 知识点分类和标注

### 题目数据应用

处理后的题目JSON数据可用于：

- 智能题目推荐
- 知识点与题目的关联分析

## 自定义使用

### 自定义知识点处理

如需处理其他知识点树数据，请替换`knowledge-point.json`文件，并根据需要调整脚本中的数据处理逻辑。

### 自定义题目处理

如需处理其他格式的题目数据，请替换`question-example.json`文件，并根据需要调整`process-questions.js`脚本中的数据处理逻辑。特别是以下几点：

1. 调整HTML标签处理函数`removeHtmlTags`以适应不同的HTML格式
2. 修改`processQuestion`函数以适应不同的题目数据结构
3. 根据需要添加或删除输出字段
