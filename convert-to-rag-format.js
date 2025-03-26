const fs = require('fs');
const path = require('path');

// 读取知识点树JSON文件
const knowledgePointsFile = path.join(__dirname, 'knowledge-points-cleaned.json');
const outputFile = path.join(__dirname, 'knowledge-points-rag.csv');

// 读取JSON文件
const knowledgePoints = JSON.parse(fs.readFileSync(knowledgePointsFile, 'utf8'));

// 创建CSV头部
const csvHeader = 'id,name,path,level,parent_id\n';

// 初始化结果数组和ID计数器
let results = [];
let idCounter = 1;

// 递归处理知识点树
function processKnowledgePoints(node, parentPath = [], parentId = 0, level = 1) {
  // 遍历对象的所有键
  for (const key in node) {
    const currentId = idCounter++;
    const currentPath = [...parentPath, key];
    const pathString = currentPath.join(' > ');
    
    // 将当前节点添加到结果中
    results.push({
      id: currentId,
      name: key,
      path: pathString,
      level: level,
      parent_id: parentId
    });
    
    // 如果当前节点的值是对象，则递归处理
    if (typeof node[key] === 'object' && node[key] !== null) {
      processKnowledgePoints(node[key], currentPath, currentId, level + 1);
    } else if (typeof node[key] === 'string') {
      // 如果当前节点的值是字符串，则添加叶子节点
      // 只有当字符串值与键不同时才添加
      if (node[key] !== key) {
        const leafId = idCounter++;
        const leafPath = [...currentPath, node[key]];
        const leafPathString = leafPath.join(' > ');
        
        results.push({
          id: leafId,
          name: node[key],
          path: leafPathString,
          level: level + 1,
          parent_id: currentId
        });
      }
    }
  }
}

// 处理知识点树
processKnowledgePoints(knowledgePoints);

// 将结果转换为CSV格式
let csvContent = csvHeader;
results.forEach(item => {
  // 确保CSV字段中的逗号和引号被正确处理
  const escapedName = item.name.includes(',') ? `"${item.name.replace(/"/g, '""')}"` : item.name;
  const escapedPath = item.path.includes(',') ? `"${item.path.replace(/"/g, '""')}"` : item.path;
  
  csvContent += `${item.id},${escapedName},${escapedPath},${item.level},${item.parent_id}\n`;
});

// 写入CSV文件
fs.writeFileSync(outputFile, csvContent, 'utf8');

console.log(`转换完成，已生成文件: ${outputFile}`);
console.log(`共处理 ${results.length} 个知识点`);