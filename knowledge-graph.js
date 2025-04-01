/**
 * 知识图谱构建模块
 * 用于构建知识点和题目之间的关联关系
 * 支持内存存储和Neo4j图数据库存储
 */

const fs = require('fs');
const path = require('path');
const Neo4jManager = require('./neo4j-manager');

class KnowledgeGraph {
  constructor(options = {}) {
    this.nodes = new Map(); // 存储知识点节点
    this.questions = new Map(); // 存储题目节点
    this.relationships = new Map(); // 存储关系
    
    // Neo4j配置
    this.useNeo4j = options.useNeo4j || false;
    this.neo4jManager = null;
    
    if (this.useNeo4j) {
      this.neo4jManager = new Neo4jManager(
        options.neo4jUri,
        options.neo4jUsername,
        options.neo4jPassword,
        options.neo4jDatabase
      );
    }
  }

  // 初始化Neo4j连接
  async initNeo4j() {
    if (this.useNeo4j && this.neo4jManager) {
      return await this.neo4jManager.connect();
    }
    return false;
  }
  
  // 关闭Neo4j连接
  async closeNeo4j() {
    if (this.useNeo4j && this.neo4jManager) {
      await this.neo4jManager.close();
    }
  }

  // 从CSV文件加载知识点数据
  async loadKnowledgePointsFromCSV(csvFilePath) {
    try {
      const data = fs.readFileSync(csvFilePath, 'utf8');
      const lines = data.split('\n');
      
      // 跳过标题行
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [id, name, path, level, parentId] = line.split(',');
        
        this.nodes.set(id, {
          id,
          name,
          path,
          level: parseInt(level),
          parentId,
          relatedQuestions: []
        });
      }
      
      console.log(`成功加载 ${this.nodes.size} 个知识点到内存`);
      
      // 如果启用了Neo4j，将数据导入到Neo4j
      if (this.useNeo4j && this.neo4jManager) {
        await this.neo4jManager.importKnowledgePoints(this.nodes);
      }
      
      return true;
    } catch (error) {
      console.error(`加载知识点数据失败: ${error.message}`);
      return false;
    }
  }

  // 从JSON文件加载题目数据
  async loadQuestionsFromJSON(jsonFilePath) {
    try {
      const data = fs.readFileSync(jsonFilePath, 'utf8');
      const questions = JSON.parse(data);
      
      questions.forEach(question => {
        this.questions.set(question.questionId, {
          id: question.questionId,
          content: question.questionContent,
          knowledgePoints: question.knowledgePoints.map(kp => kp.id)
        });
        
        // 建立知识点和题目的关联
        question.knowledgePoints.forEach(kp => {
          const knowledgePointId = kp.id;
          
          // 将题目ID添加到知识点的相关题目列表中
          if (this.nodes.has(knowledgePointId)) {
            const node = this.nodes.get(knowledgePointId);
            if (!node.relatedQuestions.includes(question.questionId)) {
              node.relatedQuestions.push(question.questionId);
            }
          }
          
          // 记录知识点和题目之间的关系
          const relationKey = `${knowledgePointId}-${question.questionId}`;
          this.relationships.set(relationKey, {
            from: knowledgePointId,
            to: question.questionId,
            type: 'RELATES_TO'
          });
        });
      });
      
      console.log(`成功加载 ${this.questions.size} 个题目到内存`);
      
      // 如果启用了Neo4j，将数据导入到Neo4j
      if (this.useNeo4j && this.neo4jManager) {
        await this.neo4jManager.importQuestions(this.questions);
      }
      
      return true;
    } catch (error) {
      console.error(`加载题目数据失败: ${error.message}`);
      return false;
    }
  }

  // 获取与知识点相关的所有题目
  async getQuestionsByKnowledgePoint(knowledgePointId) {
    // 如果使用Neo4j，优先从Neo4j获取数据
    if (this.useNeo4j && this.neo4jManager) {
      try {
        return await this.neo4jManager.getQuestionsByKnowledgePoint(knowledgePointId);
      } catch (error) {
        console.error(`从Neo4j获取题目失败，回退到内存存储: ${error.message}`);
        // 如果Neo4j查询失败，回退到内存存储
      }
    }
    
    // 从内存获取数据
    if (!this.nodes.has(knowledgePointId)) {
      return [];
    }
    
    const node = this.nodes.get(knowledgePointId);
    return node.relatedQuestions.map(questionId => this.questions.get(questionId));
  }

  // 获取与知识点相似的其他知识点（基于共同题目）
  async getSimilarKnowledgePoints(knowledgePointId, limit = 5) {
    // 如果使用Neo4j，优先从Neo4j获取数据
    if (this.useNeo4j && this.neo4jManager) {
      try {
        return await this.neo4jManager.getSimilarKnowledgePoints(knowledgePointId, limit);
      } catch (error) {
        console.error(`从Neo4j获取相似知识点失败，回退到内存存储: ${error.message}`);
        // 如果Neo4j查询失败，回退到内存存储
      }
    }
    
    // 从内存获取数据
    if (!this.nodes.has(knowledgePointId)) {
      return [];
    }
    
    const targetNode = this.nodes.get(knowledgePointId);
    const targetQuestions = new Set(targetNode.relatedQuestions);
    
    // 如果没有相关题目，返回空数组
    if (targetQuestions.size === 0) {
      return [];
    }
    
    // 计算其他知识点与目标知识点的相似度（基于共同题目数量）
    const similarities = [];
    
    this.nodes.forEach((node, nodeId) => {
      if (nodeId === knowledgePointId) return; // 跳过自身
      
      const nodeQuestions = new Set(node.relatedQuestions);
      if (nodeQuestions.size === 0) return; // 跳过没有题目的知识点
      
      // 计算交集大小（共同题目数量）
      let commonCount = 0;
      for (const qId of targetQuestions) {
        if (nodeQuestions.has(qId)) {
          commonCount++;
        }
      }
      
      // 使用Jaccard相似度: |A ∩ B| / |A ∪ B|
      const unionSize = targetQuestions.size + nodeQuestions.size - commonCount;
      const similarity = unionSize > 0 ? commonCount / unionSize : 0;
      
      similarities.push({
        id: nodeId,
        name: node.name,
        similarity
      });
    });
    
    // 按相似度降序排序并返回前N个
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // 导出知识图谱数据
  exportGraph(outputFilePath) {
    const graph = {
      nodes: Array.from(this.nodes.values()),
      questions: Array.from(this.questions.values()),
      relationships: Array.from(this.relationships.values())
    };
    
    try {
      fs.writeFileSync(outputFilePath, JSON.stringify(graph, null, 2), 'utf8');
      console.log(`知识图谱已导出至: ${outputFilePath}`);
      return true;
    } catch (error) {
      console.error(`导出知识图谱失败: ${error.message}`);
      return false;
    }
  }
  
  // 搜索知识点（根据名称模糊匹配）
  async searchKnowledgePoints(keyword, limit = 10) {
    // 如果使用Neo4j，优先从Neo4j获取数据
    if (this.useNeo4j && this.neo4jManager) {
      try {
        return await this.neo4jManager.searchKnowledgePoints(keyword, limit);
      } catch (error) {
        console.error(`从Neo4j搜索知识点失败，回退到内存存储: ${error.message}`);
        // 如果Neo4j查询失败，回退到内存存储
      }
    }
    
    // 从内存搜索数据
    const results = [];
    
    this.nodes.forEach((node) => {
      if (node.name.includes(keyword)) {
        results.push(node);
      }
    });
    
    return results.slice(0, limit);
  }
  
  // 根据多个知识点ID获取相关题目
  async getQuestionsByMultipleKnowledgePoints(knowledgePointIds, limit = 10) {
    // 如果使用Neo4j，优先从Neo4j获取数据
    if (this.useNeo4j && this.neo4jManager) {
      try {
        return await this.neo4jManager.getQuestionsByMultipleKnowledgePoints(knowledgePointIds, limit);
      } catch (error) {
        console.error(`从Neo4j获取多知识点题目失败，回退到内存存储: ${error.message}`);
        // 如果Neo4j查询失败，回退到内存存储
      }
    }
    
    // 从内存获取数据
    if (!knowledgePointIds || knowledgePointIds.length === 0) {
      return [];
    }
    
    // 获取每个知识点相关的题目
    const allQuestions = [];
    const questionScores = new Map(); // 用于记录每个题目的相关度分数
    
    knowledgePointIds.forEach(kpId => {
      if (!this.nodes.has(kpId)) return;
      
      const node = this.nodes.get(kpId);
      node.relatedQuestions.forEach(questionId => {
        const question = this.questions.get(questionId);
        if (!question) return;
        
        // 如果题目已经存在，增加其分数
        if (questionScores.has(questionId)) {
          questionScores.set(questionId, questionScores.get(questionId) + 1);
        } else {
          // 否则添加题目并设置初始分数
          allQuestions.push(question);
          questionScores.set(questionId, 1);
        }
      });
    });
    
    // 按照题目与知识点的相关度排序（相关知识点越多，分数越高）
    allQuestions.sort((a, b) => {
      const scoreA = questionScores.get(a.id);
      const scoreB = questionScores.get(b.id);
      return scoreB - scoreA; // 降序排序
    });
    
    return allQuestions.slice(0, limit);
  }
}

module.exports = KnowledgeGraph;