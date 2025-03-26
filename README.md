# 知识点树 RAG 转换工具

这个项目提供了一套工具，用于将结构化的知识点树数据转换为适合检索增强生成(RAG)系统使用的格式。

## 项目简介

本项目包含两个主要脚本：

1. `extract-knowledge-points.js` - 从原始JSON格式的知识点树中提取知识点，并转换为扁平化的JSON结构
2. `convert-to-rag-format.js` - 将扁平化的知识点JSON转换为CSV格式，适合RAG系统使用

## 文件结构

- `knowledge-point.json` - 原始知识点树数据（高中数学知识点树）
- `knowledge-points-cleaned.json` - 经过提取和清洗后的知识点树JSON
- `knowledge-points-rag.csv` - 最终生成的RAG格式CSV文件
- `extract-knowledge-points.js` - 知识点提取脚本
- `convert-to-rag-format.js` - RAG格式转换脚本

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

## 输出格式说明

生成的CSV文件包含以下列：

- `id`: 知识点唯一ID（整数，从1开始）
- `name`: 知识点名称
- `path`: 知识点完整路径，使用 > 分隔各级节点
- `level`: 知识点在树中的层级（整数，从1开始）
- `parent_id`: 父节点ID（0表示顶级节点）

## 应用场景

生成的CSV格式数据可用于：

- 构建知识图谱
- 作为RAG系统的检索源
- 知识点分类和标注

## 自定义使用

如需处理其他知识点树数据，请替换`knowledge-point.json`文件，并根据需要调整脚本中的数据处理逻辑。