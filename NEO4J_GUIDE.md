# Neo4j 图数据库集成指南

本指南将帮助您在知识点与题目推荐系统中配置和使用Neo4j图数据库功能。

## 简介

本项目已集成Neo4j图数据库支持，可以将知识点和题目数据存储在图数据库中，利用图数据库的强大查询能力提高推荐效率和准确性。系统支持两种模式：

1. 内存存储模式（默认）：所有数据存储在内存中，适合小型数据集和快速测试
2. Neo4j图数据库模式：数据存储在Neo4j图数据库中，适合大型数据集和复杂查询场景

## 安装Neo4j

### 方法1：使用Docker安装

```bash
# 拉取Neo4j镜像
docker pull neo4j:latest

# 启动Neo4j容器
docker run \
    --name neo4j \
    -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/password \
    -v $HOME/neo4j/data:/data \
    -v $HOME/neo4j/logs:/logs \
    -v $HOME/neo4j/import:/var/lib/neo4j/import \
    -v $HOME/neo4j/plugins:/plugins \
    --restart always \
    -d neo4j:latest
```

### 方法2：直接安装

1. 从[Neo4j官网](https://neo4j.com/download/)下载并安装Neo4j Desktop或Neo4j Server
2. 创建一个新的数据库实例，设置用户名和密码
3. 启动数据库服务

## 配置系统使用Neo4j

### 方法1：使用配置文件

1. 复制示例配置文件并进行修改：

```bash
cp config.json.example config.json
```

2. 编辑`config.json`文件，设置Neo4j连接参数：

```json
{
  "useNeo4j": true,
  "neo4jUri": "neo4j://localhost:7687",
  "neo4jUsername": "neo4j",
  "neo4jPassword": "your_password",
  "neo4jDatabase": "neo4j"
}
```

### 方法2：使用环境变量

```bash
export USE_NEO4J=true
export NEO4J_URI=neo4j://localhost:7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=your_password
export NEO4J_DATABASE=neo4j
```

## 数据模型

系统在Neo4j中创建以下节点和关系：

### 节点类型

1. **KnowledgePoint**：知识点节点
   - 属性：id, name, path, level, parentId

2. **Question**：题目节点
   - 属性：id, content

### 关系类型

1. **RELATES_TO**：知识点与题目之间的关联关系
   - 方向：KnowledgePoint -> Question

2. **CHILD_OF**：知识点之间的父子关系
   - 方向：子知识点 -> 父知识点

## 启动系统

配置完成后，启动系统：

```bash
npm start
```

系统将自动连接到Neo4j数据库，并将知识点和题目数据导入到图数据库中。

## 验证Neo4j集成

1. 访问Neo4j浏览器：http://localhost:7474
2. 使用配置的用户名和密码登录
3. 执行以下Cypher查询验证数据是否正确导入：

```cypher
// 查看所有知识点
MATCH (kp:KnowledgePoint) RETURN kp LIMIT 25;

// 查看所有题目
MATCH (q:Question) RETURN q LIMIT 25;

// 查看知识点和题目之间的关系
MATCH (kp:KnowledgePoint)-[r:RELATES_TO]->(q:Question) RETURN kp, r, q LIMIT 25;

// 查看知识点之间的父子关系
MATCH (child:KnowledgePoint)-[r:CHILD_OF]->(parent:KnowledgePoint) RETURN child, r, parent LIMIT 25;
```

## 使用Neo4j的优势

1. **高效的关系查询**：图数据库擅长处理复杂的关系查询，可以快速找到相关知识点和题目
2. **更好的推荐效果**：基于图算法的推荐可以发现更多隐含的关联关系
3. **可视化支持**：Neo4j提供了强大的可视化工具，可以直观地展示知识点和题目之间的关系
4. **扩展性**：随着数据量增长，图数据库的性能优势会更加明显

## 故障排除

1. **连接失败**：
   - 检查Neo4j服务是否正在运行
   - 验证连接参数（URI、用户名、密码）是否正确
   - 确保防火墙未阻止连接

2. **导入数据失败**：
   - 检查Neo4j用户是否有足够的权限
   - 确保数据格式正确
   - 查看系统日志获取详细错误信息

3. **查询性能问题**：
   - 为频繁查询的属性创建索引：
     ```cypher
     CREATE INDEX ON :KnowledgePoint(id);
     CREATE INDEX ON :Question(id);
     ```
   - 优化Cypher查询
   - 增加Neo4j的内存配置