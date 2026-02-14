import type {
  UserWordProgress,
  PartProgress,
  UserSettings,
  StudyStats,
  WordStatus,
  RatingResult,
} from '@/types';
import { STORAGE_KEYS } from '@/types';

// 重新导出类型
export type { UserWordProgress, PartProgress, UserSettings, StudyStats, RatingResult };

// ============ 基础存储操作 ============

function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

// ============ 单词进度管理 ============

// 获取所有单词进度
export function getAllWordProgress(): Record<string, UserWordProgress> {
  return getItem<Record<string, UserWordProgress>>(STORAGE_KEYS.PROGRESS, {});
}

// 获取单个单词进度
export function getWordProgress(wordId: string): UserWordProgress | undefined {
  const all = getAllWordProgress();
  return all[wordId];
}

// 更新单词进度
export function updateWordProgress(
  wordId: string,
  updates: Partial<UserWordProgress>
): UserWordProgress {
  const all = getAllWordProgress();
  const existing = all[wordId];

  const updated: UserWordProgress = Object.assign(
    {
      wordId,
      status: 'new' as const,
      familiarity: 0,
      lastReviewed: new Date().toISOString(),
      reviewCount: 0,
    },
    existing,
    updates,
    { wordId } // 确保 wordId 不被覆盖
  );

  all[wordId] = updated;
  setItem(STORAGE_KEYS.PROGRESS, all);

  return updated;
}

// 评分处理
export function rateWord(
  wordId: string,
  rating: 'again' | 'hard' | 'good' | 'easy'
): RatingResult {
  const progress = getWordProgress(wordId);
  const currentFamiliarity = progress?.familiarity ?? 0;
  const currentStatus = progress?.status ?? 'new';

  let familiarityChange = 0;
  let newStatus: WordStatus = currentStatus;

  switch (rating) {
    case 'again':
      // 不认识 → 熟悉度降为 0
      familiarityChange = -currentFamiliarity;
      newStatus = 'learning';
      break;
    case 'hard':
      // 模糊 → 熟悉度设为 2
      familiarityChange = 2 - currentFamiliarity;
      newStatus = 'learning';
      break;
    case 'good':
      // 认识 → 熟悉度 +1
      familiarityChange = 1;
      newStatus = currentFamiliarity + 1 >= 3 ? 'review' : 'learning';
      break;
    case 'easy':
      // 简单 → 熟悉度 +2（最高5）
      familiarityChange = Math.min(2, 5 - currentFamiliarity);
      newStatus = currentFamiliarity + familiarityChange >= 5 ? 'mastered' : 'review';
      break;
  }

  const newFamiliarity = Math.max(0, Math.min(5, currentFamiliarity + familiarityChange));

  // 更新状态
  if (newFamiliarity >= 5) {
    newStatus = 'mastered';
  } else if (newFamiliarity >= 3 && newStatus !== 'mastered') {
    newStatus = 'review';
  }

  // 保存进度
  const reviewCount = (progress?.reviewCount ?? 0) + 1;
  updateWordProgress(wordId, {
    status: newStatus,
    familiarity: newFamiliarity,
    lastReviewed: new Date().toISOString(),
    reviewCount,
  });

  return {
    familiarityChange,
    newFamiliarity,
    newStatus,
  };
}

// 获取需要复习的单词 ID 列表
// 按熟悉度从低到高排序，返回熟悉度 < 3 的单词
export function getWordsToReview(): string[] {
  const all = getAllWordProgress();
  const wordsToReview: { wordId: string; familiarity: number }[] = [];

  Object.values(all).forEach((progress) => {
    if (progress.familiarity < 3) {
      wordsToReview.push({
        wordId: progress.wordId,
        familiarity: progress.familiarity,
      });
    }
  });

  // 按熟悉度从低到高排序
  wordsToReview.sort((a, b) => a.familiarity - b.familiarity);

  return wordsToReview.map((w) => w.wordId);
}

// ============ Part 进度管理 ============

// 获取所有 Part 进度
export function getAllPartProgress(): Record<string, PartProgress> {
  return getItem<Record<string, PartProgress>>(STORAGE_KEYS.PARTS, {});
}

// 获取单个 Part 进度
export function getPartProgress(partId: string): PartProgress {
  const all = getAllPartProgress();
  return (
    all[partId] ?? {
      partId,
      completed: 0,
      total: 200,
      lastStudied: '',
    }
  );
}

// 更新 Part 进度
export function updatePartProgress(
  partId: string,
  updates: Partial<PartProgress>
): PartProgress {
  const all = getAllPartProgress();
  const existing = all[partId];

  const updated: PartProgress = Object.assign(
    {
      partId,
      completed: 0,
      total: 200,
      lastStudied: '',
    },
    existing,
    updates,
    { partId } // 确保 partId 不被覆盖
  );

  all[partId] = updated;
  setItem(STORAGE_KEYS.PARTS, all);

  return updated;
}

// 标记 Part 学习完成（更新完成数）
export function markPartStudied(partId: string, completedCount: number): void {
  updatePartProgress(partId, {
    completed: completedCount,
    lastStudied: new Date().toISOString(),
  });
}

// 计算 Part 的完成进度（百分比）
export function getPartCompletionRate(partId: string): number {
  const progress = getPartProgress(partId);
  return Math.round((progress.completed / progress.total) * 100);
}

// ============ 设置管理 ============

// 获取用户设置
export function getUserSettings(): UserSettings {
  return getItem<UserSettings>(STORAGE_KEYS.SETTINGS, {
    autoPlayAudio: false,
    defaultPartSize: 20,
    theme: 'system',
  });
}

// 更新用户设置
export function updateUserSettings(updates: Partial<UserSettings>): UserSettings {
  const current = getUserSettings();
  const updated = { ...current, ...updates };
  setItem(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

// ============ 上次学习记录 ============

// 获取上次学习的 Part
export function getLastStudiedPart(): string | null {
  return getItem<string | null>(STORAGE_KEYS.LAST_PART, null);
}

// 设置上次学习的 Part
export function setLastStudiedPart(partId: string): void {
  setItem(STORAGE_KEYS.LAST_PART, partId);
}

// ============ 统计信息 ============

// 获取学习统计
export function getStudyStats(): StudyStats {
  const allProgress = getAllWordProgress();
  const progressValues = Object.values(allProgress);

  const totalWords = 20200; // COCA 总词数
  const masteredWords = progressValues.filter((p) => p.status === 'mastered').length;
  const learningWords = progressValues.filter((p) => p.status === 'learning').length;
  const reviewWords = progressValues.filter((p) => p.status === 'review').length;

  // 计算今日学习数（简单实现：检查 lastReviewed 是否是今天）
  const today = new Date().toDateString();
  const todayLearned = progressValues.filter((p) => {
    const reviewedDate = new Date(p.lastReviewed).toDateString();
    return reviewedDate === today && p.reviewCount === 1;
  }).length;

  const todayReviewed = progressValues.filter((p) => {
    const reviewedDate = new Date(p.lastReviewed).toDateString();
    return reviewedDate === today && p.reviewCount > 1;
  }).length;

  // 计算连续学习天数（简化版）
  const streak = calculateStreak(progressValues);

  return {
    totalWords,
    masteredWords,
    learningWords: learningWords + reviewWords,
    newWords: totalWords - progressValues.length,
    todayLearned,
    todayReviewed,
    streak,
  };
}

// 计算连续学习天数
function calculateStreak(progressValues: UserWordProgress[]): number {
  if (progressValues.length === 0) return 0;

  const studyDates = new Set<string>();
  progressValues.forEach((p) => {
    studyDates.add(new Date(p.lastReviewed).toDateString());
  });

  const sortedDates = Array.from(studyDates).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < sortedDates.length; i++) {
    const date = new Date(sortedDates[i]);
    const diffDays = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === i || (i === 0 && diffDays <= 1)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ============ 数据导出/导入 ============

// 导出所有数据
export function exportData(): string {
  const data = {
    progress: getAllWordProgress(),
    parts: getAllPartProgress(),
    settings: getUserSettings(),
    lastPart: getLastStudiedPart(),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

// 导入数据
export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);

    if (data.progress) {
      setItem(STORAGE_KEYS.PROGRESS, data.progress);
    }
    if (data.parts) {
      setItem(STORAGE_KEYS.PARTS, data.parts);
    }
    if (data.settings) {
      setItem(STORAGE_KEYS.SETTINGS, data.settings);
    }
    if (data.lastPart) {
      setItem(STORAGE_KEYS.LAST_PART, data.lastPart);
    }

    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

// 清除所有数据
export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.PROGRESS);
  localStorage.removeItem(STORAGE_KEYS.PARTS);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.LAST_PART);
}
