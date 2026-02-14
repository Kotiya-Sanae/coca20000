// 单词释义
export interface Meaning {
  pos: string;          // 词性: art., v., n., adj., etc.
  definitions: string[]; // 中文释义列表
}

// 外部词典链接
export interface WordLinks {
  rrdict: string;       // 人人词典
  collins: string;      // 柯林斯词典
  longman: string;      // 朗文词典
}

// 单词结构
export interface Word {
  id: string;           // 唯一标识 (如 "1", "2")
  rank: number;         // COCA 排名
  text: string;         // 单词文本
  phoneticUK: string;   // 英式音标
  phoneticUS: string;   // 美式音标
  meanings: Meaning[];  // 释义列表
  links: WordLinks;     // 外部词典链接
}

// 单词学习状态
export type WordStatus = 'new' | 'learning' | 'review' | 'mastered';

// 用户单词学习进度
export interface UserWordProgress {
  wordId: string;
  status: WordStatus;
  familiarity: number;  // 0-5 熟悉度
  lastReviewed: string; // ISO 日期字符串
  reviewCount: number;
}

// Part 进度
export interface PartProgress {
  partId: string;       // "001", "002", etc.
  completed: number;    // 已完成单词数
  total: number;        // 总单词数 (200)
  lastStudied: string;  // ISO 日期字符串
}

// Part 元数据
export interface PartInfo {
  id: string;           // "001"
  startRank: number;    // 起始排名 (如 1)
  endRank: number;      // 结束排名 (如 200)
  wordCount: number;    // 单词数量
  fileName: string;     // 文件名 part001_1-200.md
}

// 本地存储键名
export const STORAGE_KEYS = {
  PROGRESS: 'coca_progress',      // 单词学习进度
  PARTS: 'coca_parts',            // Part 完成状态
  SETTINGS: 'coca_settings',      // 用户设置
  LAST_PART: 'coca_last_part',    // 上次学习的 Part
} as const;

// 用户设置
export interface UserSettings {
  autoPlayAudio: boolean;         // 是否自动播放发音
  defaultPartSize: number;        // 每次学习单词数
  theme: 'light' | 'dark' | 'system';
}

// 学习统计
export interface StudyStats {
  totalWords: number;
  masteredWords: number;
  learningWords: number;
  newWords: number;
  todayLearned: number;
  todayReviewed: number;
  streak: number;                 // 连续学习天数
}

// 评分操作
export type RatingAction = 'again' | 'hard' | 'good' | 'easy';

// 评分结果
export interface RatingResult {
  familiarityChange: number;
  newFamiliarity: number;
  newStatus: WordStatus;
}
