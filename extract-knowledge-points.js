const fs = require('fs');

// 读取JSON文件
const rawData = fs.readFileSync('./knowledge-point.json', 'utf8');
const data = JSON.parse(rawData);

// 递归函数，用于构建扁平化的知识点结构
function buildKnowledgeMap(node, result = {}, parentKey = null) {
  const currentKey = node.nodeName;
  
  // 如果是叶子节点，存储知识点内容
  if (!node.children || node.children.length === 0) {
    result[currentKey] = node.nodeName;
    return;
  }

  // 如果是非叶子节点，创建子对象
  result[currentKey] = {};
  
  // 递归处理子节点
  for (const child of node.children) {
    buildKnowledgeMap(child, result[currentKey]);
  }
}

// 处理根节点
function processKnowledgeTree(data) {
  // 检查数据结构是否符合预期
  if (!data || !data.data || !data.data.children) {
    console.error('Invalid data structure');
    return {};
  }
  
  // 创建根对象
  const knowledgeTree = {};
  
  // 处理每个顶级知识点
  for (const child of data.data.children) {
    buildKnowledgeMap(child, knowledgeTree);
  }
  
  return knowledgeTree;
}

// 处理数据并输出结果
const cleanedData = processKnowledgeTree(data);

// 将结果写入新文件
fs.writeFileSync('./knowledge-points-cleaned.json', JSON.stringify(cleanedData, null, 2));

console.log('处理完成，结果已保存到 knowledge-points-cleaned.json');