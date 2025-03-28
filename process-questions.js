/**
 * 处理题目JSON文件，将富文本格式转换为纯文本格式
 * 主要处理：
 * 1. 去除HTML标签（如<br/>）
 * 2. 提取题干、选项、答案和解析等关键信息
 * 3. 保存为适合AI语言模型处理的格式
 */

const fs = require('fs');
const path = require('path');

// 读取JSON文件
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取文件失败: ${error.message}`);
    return null;
  }
}

// 写入JSON文件
function writeJsonFile(filePath, data) {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');
    console.log(`文件已保存至: ${filePath}`);
  } catch (error) {
    console.error(`写入文件失败: ${error.message}`);
  }
}

// 去除HTML标签
function removeHtmlTags(text) {
  if (!text) return '';
  return text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
}

// 处理题目数据
function processQuestion(questionData) {
  // 创建处理后的题目对象
  const processedQuestion = {
    questionId: questionData.questionId,
    questionContent: removeHtmlTags(questionData.questionContent),
    options: [],
    answers: questionData.answersList || [],
    parse: removeHtmlTags(questionData.parse),
    explain: removeHtmlTags(questionData.explain),
    knowledgePoints: []
  };

  // 处理选项
  if (questionData.optionsObjectList && Array.isArray(questionData.optionsObjectList)) {
    processedQuestion.options = questionData.optionsObjectList.map(option => ({
      choice: option.choice,
      option: removeHtmlTags(option.option)
    }));
  }

  // 处理知识点
  if (questionData.jyeooKnowledgeList && Array.isArray(questionData.jyeooKnowledgeList)) {
    processedQuestion.knowledgePoints = questionData.jyeooKnowledgeList.map(knowledge => ({
      id: knowledge.id,
      name: knowledge.name
    }));
  }

  return processedQuestion;
}

// 处理多个题目
function processQuestions(inputFilePath, outputFilePath) {
  // 读取输入文件
  const questionData = readJsonFile(inputFilePath);
  if (!questionData) return;

  // 判断是单个题目还是题目数组
  let questions = [];
  if (Array.isArray(questionData)) {
    // 如果是数组，处理每个题目
    questions = questionData.map(q => processQuestion(q));
  } else {
    // 如果是单个题目对象
    questions = [processQuestion(questionData)];
  }

  // 写入处理后的数据
  writeJsonFile(outputFilePath, questions);
}

// 主函数
function main() {
  const inputFilePath = path.join(__dirname, 'question-example.json');
  const outputFilePath = path.join(__dirname, 'question-processed.json');
  
  console.log('开始处理题目数据...');
  processQuestions(inputFilePath, outputFilePath);
  console.log('处理完成!');
}

// 执行主函数
main();