/**
 * 知识图谱与题目推荐系统 - 主程序
 * 用于初始化和启动知识图谱和推荐系统
 * 支持内存存储和Neo4j图数据库存储
 */

const path = require('path');
const fs = require('fs');
const KnowledgeAPI = require('./api');

// 配置文件路径
const KNOWLEDGE_POINTS_PATH = path.join(__dirname, 'knowledge-points-rag.csv');
const QUESTIONS_PATH = path.join(__dirname, 'question-processed.json');
const CONFIG_PATH = path.join(__dirname, 'config.json');

// Neo4j配置
let neo4jConfig = {
  useNeo4j: process.env.USE_NEO4J === 'true',
  neo4jUri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
  neo4jUsername: process.env.NEO4J_USERNAME || 'neo4j',
  neo4jPassword: process.env.NEO4J_PASSWORD || 'password',
  neo4jDatabase: process.env.NEO4J_DATABASE || 'neo4j'
};

// 尝试从配置文件加载配置
try {
  if (fs.existsSync(CONFIG_PATH)) {
    const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    neo4jConfig = { ...neo4jConfig, ...configData };
    console.log('已从配置文件加载Neo4j配置');
  }
} catch (error) {
  console.warn(`加载配置文件失败: ${error.message}，将使用默认配置`);
}

// 创建API实例
const api = new KnowledgeAPI(3000, neo4jConfig);

// 主函数
async function main() {
  console.log('正在初始化知识图谱与题目推荐系统...');
  
  try {
    // 初始化API服务
    const initialized = await api.initialize(KNOWLEDGE_POINTS_PATH, QUESTIONS_PATH);
    
    if (!initialized) {
      console.error('系统初始化失败，请检查数据文件是否存在');
      process.exit(1);
    }
    
    // 启动API服务
    await api.start();
    
    console.log('系统初始化完成！');
    console.log('API服务已启动，可通过以下地址访问：');
    console.log('- 接口文档: http://localhost:3000/');
    console.log('- 知识点搜索: http://localhost:3000/api/knowledge/search?keyword=集合');
    console.log('- 题目推荐: http://localhost:3000/api/recommend/questions/1');
    
  } catch (error) {
    console.error(`系统启动失败: ${error.message}`);
    process.exit(1);
  }
}

// 处理进程退出
process.on('SIGINT', async () => {
  console.log('正在关闭服务...');
  await api.stop();
  console.log('服务已安全关闭');
  process.exit(0);
});

// 启动主程序
main();