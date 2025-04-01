/**
 * Neo4j数据库管理模块
 * 用于管理与Neo4j图数据库的连接和基本操作
 */

const neo4j = require('neo4j-driver');

class Neo4jManager {
  constructor(uri, username, password, database) {
    this.uri = uri || 'neo4j://localhost:7687';
    this.username = username || 'neo4j';
    this.password = password || 'password';
    this.database = database || 'neo4j';
    this.driver = null;
  }

  // 初始化连接
  async connect() {
    try {
      this.driver = neo4j.driver(
        this.uri,
        neo4j.auth.basic(this.username, this.password)
      );
      
      // 验证连接
      await this.driver.verifyConnectivity();
      console.log('Neo4j数据库连接成功');
      return true;
    } catch (error) {
      console.error(`Neo4j数据库连接失败: ${error.message}`);
      return false;
    }
  }

  // 关闭连接
  async close() {
    if (this.driver) {
      await this.driver.close();
      console.log('Neo4j数据库连接已关闭');
    }
  }

  // 执行Cypher查询
  async runQuery(cypher, params = {}) {
    if (!this.driver) {
      throw new Error('Neo4j数据库未连接');
    }

    const session = this.driver.session({
      database: this.database
    });

    try {
      const result = await session.run(cypher, params);
      return result.records;
    } catch (error) {
      console.error(`执行查询失败: ${error.message}`);
      throw error;
    } finally {
      await session.close();
    }
  }

  // 创建知识点节点
  async createKnowledgePoint(knowledgePoint) {
    const cypher = `
      MERGE (kp:KnowledgePoint {id: $id})
      ON CREATE SET 
        kp.name = $name,
        kp.path = $path,
        kp.level = $level,
        kp.parentId = $parentId
      RETURN kp
    `;

    return this.runQuery(cypher, knowledgePoint);
  }

  // 创建题目节点
  async createQuestion(question) {
    const cypher = `
      MERGE (q:Question {id: $id})
      ON CREATE SET 
        q.content = $content
      RETURN q
    `;

    return this.runQuery(cypher, {
      id: question.id,
      content: question.content
    });
  }

  // 创建知识点和题目之间的关系
  async createRelationship(knowledgePointId, questionId) {
    const cypher = `
      MATCH (kp:KnowledgePoint {id: $knowledgePointId})
      MATCH (q:Question {id: $questionId})
      MERGE (kp)-[r:RELATES_TO]->(q)
      RETURN r
    `;

    return this.runQuery(cypher, {
      knowledgePointId,
      questionId
    });
  }

  // 创建知识点之间的父子关系
  async createParentChildRelationship(childId, parentId) {
    if (parentId === '0') return; // 跳过根节点

    const cypher = `
      MATCH (child:KnowledgePoint {id: $childId})
      MATCH (parent:KnowledgePoint {id: $parentId})
      MERGE (child)-[r:CHILD_OF]->(parent)
      RETURN r
    `;

    return this.runQuery(cypher, {
      childId,
      parentId
    });
  }

  // 获取与知识点相关的所有题目
  async getQuestionsByKnowledgePoint(knowledgePointId) {
    const cypher = `
      MATCH (kp:KnowledgePoint {id: $knowledgePointId})-[:RELATES_TO]->(q:Question)
      RETURN q
    `;

    const records = await this.runQuery(cypher, { knowledgePointId });
    return records.map(record => record.get('q').properties);
  }

  // 获取与知识点相似的其他知识点（基于共同题目）
  async getSimilarKnowledgePoints(knowledgePointId, limit = 5) {
    const cypher = `
      MATCH (kp1:KnowledgePoint {id: $knowledgePointId})-[:RELATES_TO]->(q:Question)<-[:RELATES_TO]-(kp2:KnowledgePoint)
      WHERE kp1 <> kp2
      WITH kp2, count(q) AS commonQuestions
      RETURN kp2.id AS id, kp2.name AS name, commonQuestions,
             commonQuestions * 1.0 / (
               (MATCH (kp1:KnowledgePoint {id: $knowledgePointId})-[:RELATES_TO]->(q1:Question) RETURN count(q1) AS count)[0].count +
               (MATCH (kp2:KnowledgePoint {id: kp2.id})-[:RELATES_TO]->(q2:Question) RETURN count(q2) AS count)[0].count -
               commonQuestions
             ) AS similarity
      ORDER BY similarity DESC
      LIMIT $limit
    `;

    const records = await this.runQuery(cypher, { knowledgePointId, limit });
    return records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      similarity: record.get('similarity')
    }));
  }

  // 根据多个知识点ID查找相关题目
  async getQuestionsByMultipleKnowledgePoints(knowledgePointIds, limit = 10) {
    const cypher = `
      MATCH (kp:KnowledgePoint)-[:RELATES_TO]->(q:Question)
      WHERE kp.id IN $knowledgePointIds
      WITH q, count(DISTINCT kp) AS relevanceScore
      RETURN q.id AS id, q.content AS content, relevanceScore
      ORDER BY relevanceScore DESC
      LIMIT $limit
    `;

    const records = await this.runQuery(cypher, { knowledgePointIds, limit });
    return records.map(record => ({
      id: record.get('id'),
      content: record.get('content'),
      relevanceScore: record.get('relevanceScore').toNumber()
    }));
  }

  // 搜索知识点（根据名称模糊匹配）
  async searchKnowledgePoints(keyword, limit = 10) {
    const cypher = `
      MATCH (kp:KnowledgePoint)
      WHERE kp.name CONTAINS $keyword
      RETURN kp
      LIMIT $limit
    `;

    const records = await this.runQuery(cypher, { keyword, limit });
    return records.map(record => record.get('kp').properties);
  }

  // 导入所有知识点数据
  async importKnowledgePoints(knowledgePoints) {
    console.log(`开始导入${knowledgePoints.size}个知识点到Neo4j...`);
    let count = 0;

    for (const [id, knowledgePoint] of knowledgePoints) {
      await this.createKnowledgePoint({
        id,
        name: knowledgePoint.name,
        path: knowledgePoint.path,
        level: knowledgePoint.level,
        parentId: knowledgePoint.parentId
      });

      // 创建父子关系
      if (knowledgePoint.parentId && knowledgePoint.parentId !== '0') {
        await this.createParentChildRelationship(id, knowledgePoint.parentId);
      }

      count++;
      if (count % 100 === 0) {
        console.log(`已导入 ${count} 个知识点`);
      }
    }

    console.log(`知识点导入完成，共导入 ${count} 个知识点`);
  }

  // 导入所有题目数据及其与知识点的关系
  async importQuestions(questions) {
    console.log(`开始导入${questions.size}个题目到Neo4j...`);
    let count = 0;

    for (const [id, question] of questions) {
      await this.createQuestion({
        id,
        content: question.content
      });

      // 创建与知识点的关系
      for (const knowledgePointId of question.knowledgePoints) {
        await this.createRelationship(knowledgePointId, id);
      }

      count++;
      if (count % 100 === 0) {
        console.log(`已导入 ${count} 个题目`);
      }
    }

    console.log(`题目导入完成，共导入 ${count} 个题目`);
  }
}

module.exports = Neo4jManager;