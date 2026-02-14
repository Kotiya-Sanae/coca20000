import type { Word, Meaning, WordLinks, PartInfo } from '@/types';

// 重新导出类型
export type { Word, Meaning, WordLinks, PartInfo };

// Part 文件列表（从文件名生成）
const TOTAL_PARTS = 101;
const WORDS_PER_PART = 200;

// 生成 Part 元数据列表
export function getAllParts(): PartInfo[] {
  const parts: PartInfo[] = [];

  for (let i = 1; i <= TOTAL_PARTS; i++) {
    const partId = i.toString().padStart(3, '0');
    const startRank = (i - 1) * WORDS_PER_PART + 1;
    const endRank = i * WORDS_PER_PART;

    parts.push({
      id: partId,
      startRank,
      endRank,
      wordCount: WORDS_PER_PART,
      fileName: `part${partId}_${startRank}-${endRank}.md`,
    });
  }

  return parts;
}

// 获取单个 Part 信息
export function getPartInfo(partId: string): PartInfo | undefined {
  const numId = parseInt(partId, 10);
  if (isNaN(numId) || numId < 1 || numId > TOTAL_PARTS) {
    return undefined;
  }

  const paddedId = numId.toString().padStart(3, '0');
  const startRank = (numId - 1) * WORDS_PER_PART + 1;
  const endRank = numId * WORDS_PER_PART;

  return {
    id: paddedId,
    startRank,
    endRank,
    wordCount: WORDS_PER_PART,
    fileName: `part${paddedId}_${startRank}-${endRank}.md`,
  };
}

// 解析单行文本（辅助函数）
function parseLine(line: string): string {
  return line.trim();
}

// 解析音标行
// 格式: - [ðə]  [ðə]
function parsePhonetic(line: string): { uk: string; us: string } {
  const trimmed = line.trim();
  // 匹配 [音标] 模式
  const matches = trimmed.match(/\[([^\]]+)\]/g);

  if (matches && matches.length >= 2) {
    return {
      uk: matches[0].slice(1, -1), // 去掉方括号
      us: matches[1].slice(1, -1),
    };
  }

  // 如果只有一个音标，当作两者相同
  if (matches && matches.length === 1) {
    const phonetic = matches[0].slice(1, -1);
    return { uk: phonetic, us: phonetic };
  }

  return { uk: '', us: '' };
}

// 解析释义行
// 格式: - art.["释义1","释义2"]  aux.["释义3"]
function parseMeanings(line: string): Meaning[] {
  const meanings: Meaning[] = [];
  const trimmed = line.trim();

  // 移除开头的 "- "
  const content = trimmed.startsWith('- ') ? trimmed.slice(2) : trimmed;

  // 按词性分割，匹配 "词性.[" 的模式
  // 使用正则匹配：词性.["内容"]
  const posPattern = /(\w+\.)(\[[^\]]*\])/g;
  let match;

  while ((match = posPattern.exec(content)) !== null) {
    const pos = match[1]; // 词性，如 "art.", "v."
    const definitionsStr = match[2]; // ["释义1","释义2"]

    // 解析释义数组
    const definitions: string[] = [];
    // 提取引号中的内容
    const defMatches = definitionsStr.match(/"([^"]*)"/g);
    if (defMatches) {
      defMatches.forEach((def) => {
        definitions.push(def.slice(1, -1)); // 去掉引号
      });
    }

    if (definitions.length > 0) {
      meanings.push({
        pos: pos.slice(0, -1), // 去掉末尾的点
        definitions,
      });
    }
  }

  return meanings;
}

// 解析链接行
// 格式: - [人人词典](url) [柯林斯](url) [朗文](url)
function parseLinks(line: string): WordLinks {
  const links: WordLinks = {
    rrdict: '',
    collins: '',
    longman: '',
  };

  const trimmed = line.trim();

  // 匹配 [文本](链接) 模式
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(trimmed)) !== null) {
    const text = match[1];
    const url = match[2];

    if (text.includes('人人')) {
      links.rrdict = url;
    } else if (text.includes('柯林斯')) {
      links.collins = url;
    } else if (text.includes('朗文')) {
      links.longman = url;
    }
  }

  return links;
}

// 解析单个单词（4行）
function parseWord(lines: string[], startIndex: number): Word | null {
  if (startIndex + 3 >= lines.length) {
    return null;
  }

  // 第1行: 序号 单词
  const firstLine = lines[startIndex].trim();
  const firstSpaceIndex = firstLine.indexOf(' ');

  if (firstSpaceIndex === -1) {
    return null;
  }

  const rankStr = firstLine.slice(0, firstSpaceIndex);
  const text = firstLine.slice(firstSpaceIndex + 1).trim();
  const rank = parseInt(rankStr, 10);

  if (isNaN(rank)) {
    return null;
  }

  // 第2行: 音标
  const phoneticLine = lines[startIndex + 1];
  const { uk, us } = parsePhonetic(phoneticLine);

  // 第3行: 释义
  const meaningLine = lines[startIndex + 2];
  const meanings = parseMeanings(meaningLine);

  // 第4行: 链接
  const linkLine = lines[startIndex + 3];
  const links = parseLinks(linkLine);

  return {
    id: rank.toString(),
    rank,
    text,
    phoneticUK: uk,
    phoneticUS: us,
    meanings,
    links,
  };
}

// 解析完整的 Markdown 内容
export function parseVocabularyMarkdown(content: string): Word[] {
  const words: Word[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    // 跳过空行
    if (lines[i].trim() === '') {
      i++;
      continue;
    }

    // 尝试解析一个单词（4行）
    const word = parseWord(lines, i);
    if (word) {
      words.push(word);
      i += 4; // 跳过已解析的4行

      // 跳过可能的空行
      while (i < lines.length && lines[i].trim() === '') {
        i++;
      }
    } else {
      i++;
    }
  }

  return words;
}

// 加载指定 Part 的词汇
export async function loadPartWords(partId: string): Promise<Word[]> {
  const partInfo = getPartInfo(partId);
  if (!partInfo) {
    throw new Error(`Invalid part ID: ${partId}`);
  }

  try {
    const response = await fetch(`/vocabulary/${partInfo.fileName}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${partInfo.fileName}`);
    }

    const content = await response.text();
    return parseVocabularyMarkdown(content);
  } catch (error) {
    console.error('Error loading vocabulary:', error);
    throw error;
  }
}

// 加载所有词汇（谨慎使用，数据量大）
export async function loadAllWords(): Promise<Word[]> {
  const allWords: Word[] = [];

  for (let i = 1; i <= TOTAL_PARTS; i++) {
    const partId = i.toString().padStart(3, '0');
    try {
      const words = await loadPartWords(partId);
      allWords.push(...words);
    } catch (error) {
      console.error(`Error loading part ${partId}:`, error);
    }
  }

  return allWords;
}

// 根据单词 ID 获取 Part ID
export function getPartIdByWordId(wordId: string): string {
  const rank = parseInt(wordId, 10);
  if (isNaN(rank) || rank < 1) {
    return '001';
  }

  const partNum = Math.ceil(rank / WORDS_PER_PART);
  if (partNum > TOTAL_PARTS) {
    return TOTAL_PARTS.toString().padStart(3, '0');
  }

  return partNum.toString().padStart(3, '0');
}
