/**
 * 推荐引擎模块
 * 基于知识图谱提供题目推荐功能
 * 支持内存存储和Neo4j图数据库存储
 */

const KnowledgeGraph = require('./knowledge-graph');

class RecommendationEngine {
  constructor(options = {}) {
    // Neo4j配置
    this.useNeo4j = options.useNeo4j || false;
    this.neo4jConfig = {
      uri: options.neo4jUri || 'neo4j://localhost:7687',
      username: options.neo4jUsername || 'neo4j',
      password: options.neo4jPassword || 'password',
      database: options.neo4jDatabase || 'neo4j'
    };
    
    // 初始化知识图谱
    this.knowledgeGraph = new KnowledgeGraph({
      useNeo4j: this.useNeo4j,
      neo4jUri: this.neo4jConfig.uri,
      neo4jUsername: this.neo4jConfig.username,
      neo4jPassword: this.neo4jConfig.password,
      neo4jDatabase: this.neo4jConfig.database
    });
  }

  // 初始化推荐引擎
  async initialize(knowledgePointsPath, questionsPath) {
    // 如果使用Neo4j，先初始化Neo4j连接
    if (this.useNeo4j) {
      const connected = await this.knowledgeGraph.initNeo4j();
      if (!connected) {
        console.warn('Neo4j连接失败，将使用内存存储模式');
        this.useNeo4j = false;
      }
    }
    
    // 加载知识点数据
    const knowledgePointsLoaded = await this.knowledgeGraph.loadKnowledgePointsFromCSV(knowledgePointsPath);
    if (!knowledgePointsLoaded) {
      throw new Error('加载知识点数据失败');
    }

    // 加载题目数据
    const questionsLoaded = await this.knowledgeGraph.loadQuestionsFromJSON(questionsPath);
    if (!questionsLoaded) {
      throw new Error('加载题目数据失败');
    }

    console.log(`推荐引擎初始化完成，存储模式: ${this.useNeo4j ? 'Neo4j图数据库' : '内存'}`);
    return true;
  }

  // 根据知识点ID推荐相关题目
  async recommendQuestionsByKnowledgePoint(knowledgePointId, limit = 10) {
    // 获取与知识点直接相关的题目
    const directQuestions = await this.knowledgeGraph.getQuestionsByKnowledgePoint(knowledgePointId);
    
    // 如果直接相关题目数量已经足够，直接返回
    if (directQuestions.length >= limit) {
      return directQuestions.slice(0, limit);
    }
    
    // 如果直接相关题目不足，寻找相似知识点的题目进行补充
    const similarKnowledgePoints = await this.knowledgeGraph.getSimilarKnowledgePoints(knowledgePointId, 5);
    
    // 收集所有推荐题目
    const recommendedQuestions = [...directQuestions];
    const addedQuestionIds = new Set(directQuestions.map(q => q.id));
    
    // 从相似知识点中获取题目
    for (const similarKp of similarKnowledgePoints) {
      if (recommendedQuestions.length >= limit) break;
      
      const questions = await this.knowledgeGraph.getQuestionsByKnowledgePoint(similarKp.id);
      
      // 添加尚未添加的题目
      for (const question of questions) {
        if (!addedQuestionIds.has(question.id)) {
          recommendedQuestions.push(question);
          addedQuestionIds.add(question.id);
          
          if (recommendedQuestions.length >= limit) break;
        }
      }
    }
    
    return recommendedQuestions;
  }

  // 根据多个知识点ID推荐题目（适用于复合知识点场景）
  async recommendQuestionsByMultipleKnowledgePoints(knowledgePointIds, limit = 10) {
    if (!knowledgePointIds || knowledgePointIds.length === 0) {
      return [];
    }
    
    // 如果只有一个知识点，直接调用单知识点推荐方法
    if (knowledgePointIds.length === 1) {
      return await this.recommendQuestionsByKnowledgePoint(knowledgePointIds[0], limit);
    }
    
    // 如果使用Neo4j，直接使用图数据库的查询能力
    if (this.useNeo4j) {
      return await this.knowledgeGraph.getQuestionsByMultipleKnowledgePoints(knowledgePointIds, limit);
    }
    
    // 内存模式：获取每个知识点相关的题目
    const allQuestions = [];
    const questionScores = new Map(); // 用于记录每个题目的相关度分数
    
    for (const kpId of knowledgePointIds) {
      const questions = await this.knowledgeGraph.getQuestionsByKnowledgePoint(kpId);
      
      questions.forEach(question => {
        // 如果题目已经存在，增加其分数
        if (questionScores.has(question.id)) {
          questionScores.set(question.id, questionScores.get(question.id) + 1);
        } else {
          // 否则添加题目并设置初始分数
          allQuestions.push(question);
          questionScores.set(question.id, 1);
        }
      });
    }
    
    // 按照题目与知识点的相关度排序（相关知识点越多，分数越高）
    allQuestions.sort((a, b) => {
      const scoreA = questionScores.get(a.id);
      const scoreB = questionScores.get(b.id);
      return scoreB - scoreA; // 降序排序
    });
    
    return allQuestions.slice(0, limit);
  }

  // 获取知识点的详细信息
  async getKnowledgePointDetails(knowledgePointId) {
    if (this.useNeo4j) {
      try {
        const results = await this.knowledgeGraph.neo4jManager.runQuery(
          'MATCH (kp:KnowledgePoint {id: $id}) RETURN kp',
          { id: knowledgePointId }
        );
        
        if (results.length > 0) {
          return results[0].get('kp').properties;
        }
        return null;
      } catch (error) {
        console.error(`从Neo4j获取知识点详情失败，回退到内存存储: ${error.message}`);
      }
    }
    
    // 内存模式
    if (!this.knowledgeGraph.nodes.has(knowledgePointId)) {
      return null;
    }
    
    return this.knowledgeGraph.nodes.get(knowledgePointId);
  }

  // 搜索知识点（根据名称模糊匹配）
  async searchKnowledgePoints(keyword, limit = 10) {
    if (!keyword || keyword.trim() === '') {
      return [];
    }
    
    return await this.knowledgeGraph.searchKnowledgePoints(keyword, limit);
  }
  
  // 关闭资源
  async close() {
    if (this.useNeo4j) {
      await this.knowledgeGraph.closeNeo4j();
    }
  }
}

module.exports = RecommendationEngine;