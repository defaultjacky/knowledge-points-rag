/**
 * API接口模块
 * 提供知识点查询和题目推荐的RESTful API
 * 支持内存存储和Neo4j图数据库存储
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const RecommendationEngine = require('./recommendation-engine');

class KnowledgeAPI {
  constructor(port = 3000, options = {}) {
    this.port = port;
    this.app = express();
    
    // Neo4j配置
    this.useNeo4j = options.useNeo4j || false;
    this.neo4jConfig = {
      uri: options.neo4jUri || 'neo4j://localhost:7687',
      username: options.neo4jUsername || 'neo4j',
      password: options.neo4jPassword || 'password',
      database: options.neo4jDatabase || 'neo4j'
    };
    
    // 初始化推荐引擎
    this.recommendationEngine = new RecommendationEngine({
      useNeo4j: this.useNeo4j,
      neo4jUri: this.neo4jConfig.uri,
      neo4jUsername: this.neo4jConfig.username,
      neo4jPassword: this.neo4jConfig.password,
      neo4jDatabase: this.neo4jConfig.database
    });
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  // 设置中间件
  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(express.urlencoded({ extended: true }));
  }

  // 设置API路由
  setupRoutes() {
    // 根路由 - API信息
    this.app.get('/', (req, res) => {
      res.json({
        name: '知识点与题目推荐API',
        version: '1.0.0',
        endpoints: [
          { path: '/api/knowledge/search', method: 'GET', description: '搜索知识点' },
          { path: '/api/knowledge/:id', method: 'GET', description: '获取知识点详情' },
          { path: '/api/recommend/questions/:knowledgeId', method: 'GET', description: '根据知识点推荐题目' },
          { path: '/api/recommend/questions', method: 'POST', description: '根据多个知识点推荐题目' }
        ]
      });
    });

    // 搜索知识点
    this.app.get('/api/knowledge/search', async (req, res) => {
      const { keyword, limit = 10 } = req.query;
      
      if (!keyword) {
        return res.status(400).json({ error: '请提供搜索关键词' });
      }
      
      try {
        const results = await this.recommendationEngine.searchKnowledgePoints(keyword, parseInt(limit));
        res.json({ results });
      } catch (error) {
        console.error(`搜索知识点失败: ${error.message}`);
        res.status(500).json({ error: '搜索知识点失败' });
      }
    });

    // 获取知识点详情
    this.app.get('/api/knowledge/:id', async (req, res) => {
      const knowledgeId = req.params.id;
      
      try {
        const knowledgePoint = await this.recommendationEngine.getKnowledgePointDetails(knowledgeId);
        
        if (!knowledgePoint) {
          return res.status(404).json({ error: '知识点不存在' });
        }
        
        res.json({ knowledgePoint });
      } catch (error) {
        console.error(`获取知识点详情失败: ${error.message}`);
        res.status(500).json({ error: '获取知识点详情失败' });
      }
    });

    // 根据知识点ID推荐题目
    this.app.get('/api/recommend/questions/:knowledgeId', async (req, res) => {
      const knowledgeId = req.params.knowledgeId;
      const { limit = 10 } = req.query;
      
      try {
        const recommendations = await this.recommendationEngine.recommendQuestionsByKnowledgePoint(
          knowledgeId, 
          parseInt(limit)
        );
        
        res.json({ recommendations });
      } catch (error) {
        console.error(`推荐题目失败: ${error.message}`);
        res.status(500).json({ error: '推荐题目失败' });
      }
    });

    // 根据多个知识点ID推荐题目
    this.app.post('/api/recommend/questions', async (req, res) => {
      const { knowledgeIds, limit = 10 } = req.body;
      
      if (!knowledgeIds || !Array.isArray(knowledgeIds) || knowledgeIds.length === 0) {
        return res.status(400).json({ error: '请提供有效的知识点ID数组' });
      }
      
      try {
        const recommendations = await this.recommendationEngine.recommendQuestionsByMultipleKnowledgePoints(
          knowledgeIds, 
          parseInt(limit)
        );
        
        res.json({ recommendations });
      } catch (error) {
        console.error(`推荐题目失败: ${error.message}`);
        res.status(500).json({ error: '推荐题目失败' });
      }
    });
  }

  // 初始化API服务
  async initialize(knowledgePointsPath, questionsPath) {
    try {
      // 初始化推荐引擎
      await this.recommendationEngine.initialize(knowledgePointsPath, questionsPath);
      return true;
    } catch (error) {
      console.error(`API初始化失败: ${error.message}`);
      return false;
    }
  }

  // 启动API服务
  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`知识点与题目推荐API服务已启动，监听端口: ${this.port}`);
        resolve(true);
      });
    });
  }

  // 停止API服务
  async stop() {
    // 关闭Neo4j连接
    if (this.useNeo4j) {
      await this.recommendationEngine.close();
    }
    
    // 关闭HTTP服务器
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('API服务已停止');
          resolve(true);
        });
      });
    }
    return Promise.resolve(true);
  }
}

module.exports = KnowledgeAPI;