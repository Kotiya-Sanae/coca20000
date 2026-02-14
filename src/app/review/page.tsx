'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getWordsToReview, getWordProgress, rateWord } from '@/lib/storage';
import { loadPartWords, type Word } from '@/lib/vocabulary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  RotateCw,
  Volume2,
  Check,
  HelpCircle,
  X,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

// 复习模式页面
export default function ReviewPage() {
  const [wordsToReview, setWordsToReview] = useState<string[]>([]);
  const [loadedWords, setLoadedWords] = useState<Record<string, Word>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [stats, setStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  // 加载需要复习的单词
  useEffect(() => {
    async function loadReviewWords() {
      try {
        setLoading(true);

        // 获取需要复习的单词 ID
        const reviewIds = getWordsToReview();
        setWordsToReview(reviewIds);

        // 按 Part 分组加载单词
        const wordsByPart: Record<string, string[]> = {};
        reviewIds.forEach((wordId) => {
          const rank = parseInt(wordId, 10);
          const partNum = Math.ceil(rank / 200);
          const partId = partNum.toString().padStart(3, '0');

          if (!wordsByPart[partId]) {
            wordsByPart[partId] = [];
          }
          wordsByPart[partId].push(wordId);
        });

        // 加载每个 Part 的单词
        const wordMap: Record<string, Word> = {};
        for (const [partId, ids] of Object.entries(wordsByPart)) {
          try {
            const partWords = await loadPartWords(partId);
            partWords.forEach((word) => {
              if (ids.includes(word.id)) {
                wordMap[word.id] = word;
              }
            });
          } catch (err) {
            console.error(`Failed to load part ${partId}:`, err);
          }
        }

        setLoadedWords(wordMap);
      } catch (err) {
        console.error('Error loading review words:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReviewWords();
  }, []);

  // 当前单词
  const currentWordId = wordsToReview[currentIndex];
  const currentWord = loadedWords[currentWordId];

  // 发音
  const playAudio = useCallback(() => {
    if (!currentWord) return;

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentWord.text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, [currentWord]);

  // 翻转卡片
  const flipCard = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // 评分
  const handleRate = useCallback(
    (rating: 'again' | 'hard' | 'good' | 'easy') => {
      if (!currentWordId) return;

      // 记录评分
      rateWord(currentWordId, rating);

      // 更新统计
      setStats((prev) => ({
        ...prev,
        [rating]: prev[rating] + 1,
      }));

      // 下一个单词
      if (currentIndex < wordsToReview.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        // 复习完成
        setReviewComplete(true);
      }
    },
    [currentWordId, currentIndex, wordsToReview.length]
  );

  // 键盘快捷键
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (reviewComplete || loading) return;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          flipCard();
          break;
        case '1':
          if (isFlipped) handleRate('again');
          break;
        case '2':
          if (isFlipped) handleRate('hard');
          break;
        case '3':
          if (isFlipped) handleRate('good');
          break;
        case '4':
          if (isFlipped) handleRate('easy');
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipCard, handleRate, isFlipped, reviewComplete, loading]);

  // 计算进度
  const progress =
    wordsToReview.length > 0
      ? ((currentIndex + 1) / wordsToReview.length) * 100
      : 0;

  // 获取单词熟悉度
  const getFamiliarityBadge = (wordId: string) => {
    const progress = getWordProgress(wordId);
    if (!progress) return null;

    const familiarity = progress.familiarity;
    const labels = ['陌生', '初学', '了解', '熟悉', '掌握', '精通'];
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-emerald-600',
    ];

    return (
      <Badge className={`${colors[familiarity]} text-white text-xs`}>
        {labels[familiarity]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RotateCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载复习单词...</p>
        </div>
      </div>
    );
  }

  // 没有需要复习的单词
  if (wordsToReview.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">暂无需要复习的单词</h1>
            <p className="text-muted-foreground mb-8">
              你已经掌握了所有学过的单词，继续学习新单词吧！
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/parts">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  返回列表
                </Button>
              </Link>
              <Link href="/">
                <Button className="gap-2">
                  去首页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 复习完成页面
  if (reviewComplete) {
    const totalRated = stats.again + stats.hard + stats.good + stats.easy;
    const improvedCount = stats.good + stats.easy;

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">复习完成！</h1>
            <p className="text-muted-foreground">
              本次复习了 {wordsToReview.length} 个单词
            </p>
          </div>

          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">本次复习统计</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {stats.again}
                  </div>
                  <div className="text-sm text-red-600/80">不认识</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.hard}
                  </div>
                  <div className="text-sm text-orange-600/80">模糊</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.good}
                  </div>
                  <div className="text-sm text-blue-600/80">认识</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.easy}
                  </div>
                  <div className="text-sm text-green-600/80">简单</div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">总复习数</div>
                  <div className="text-2xl font-bold">{totalRated}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">掌握提升</div>
                  <div className="text-2xl font-bold text-green-600">
                    {improvedCount}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Link href="/parts">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                返回列表
              </Button>
            </Link>
            <Link href="/">
              <Button className="gap-2">
                去首页
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold">复习模式</h1>
                <p className="text-sm text-muted-foreground">
                  {currentIndex + 1} / {wordsToReview.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentWord && getFamiliarityBadge(currentWord.id)}
            </div>
          </div>

          <Progress value={progress} className="mt-4" />
        </div>
      </header>

      {/* 主要内容 */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 单词卡片 */}
        <div className="mb-8">
          <div
            onClick={flipCard}
            className="relative cursor-pointer perspective-1000"
            style={{ perspective: '1000px' }}
          >
            <div
              className="relative transition-transform duration-500 transform-gpu"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* 正面 */}
              <Card
                className="h-[400px] flex flex-col items-center justify-center p-8 backface-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-center">
                  <div className="text-5xl font-bold mb-4">
                    {currentWord?.text}
                  </div>
                  <div className="flex items-center justify-center gap-4 text-muted-foreground mb-4">
                    <span>英 [{currentWord?.phoneticUK}]</span>
                    <span>美 [{currentWord?.phoneticUS}]</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio();
                    }}
                    className="gap-2"
                  >
                    <Volume2 className="w-4 h-4" />
                    发音
                  </Button>
                </div>

                <div className="absolute bottom-4 text-sm text-muted-foreground">
                  点击或按空格键查看释义
                </div>
              </Card>

              {/* 背面 */}
              <Card
                className="absolute inset-0 h-[400px] flex flex-col p-6 backface-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div className="text-2xl font-bold">
                    {currentWord?.text}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio();
                    }}
                    className="gap-2"
                  >
                    <Volume2 className="w-4 h-4" />
                    发音
                  </Button>
                </div>

                <Separator className="mb-3 shrink-0" />

                <ScrollArea className="flex-1 pr-4 min-h-0">
                  <div className="space-y-3">
                    {currentWord?.meanings.map((meaning, idx) => (
                      <div key={idx}>
                        <Badge variant="secondary" className="mb-1">
                          {meaning.pos}
                        </Badge>
                        <ul className="space-y-0.5">
                          {meaning.definitions.map((def, defIdx) => (
                            <li key={defIdx} className="text-sm text-muted-foreground">
                              {defIdx + 1}. {def}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-3" />

                  <div className="flex gap-4 pb-2">
                    <a
                      href={currentWord?.links.rrdict}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      人人词典
                    </a>
                    <a
                      href={currentWord?.links.collins}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      柯林斯
                    </a>
                    <a
                      href={currentWord?.links.longman}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      朗文
                    </a>
                  </div>
                </ScrollArea>

                <div className="text-center text-sm text-muted-foreground mt-3 pt-3 border-t shrink-0">
                  按 1-4 选择熟悉程度
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* 评分按钮 */}
        <div className="grid grid-cols-4 gap-3">
          <Button
            variant="outline"
            onClick={() => handleRate('again')}
            disabled={!isFlipped}
            className="flex flex-col items-center py-4 h-auto border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <X className="w-5 h-5 mb-1 text-red-500" />
            <span className="text-sm font-medium">不认识</span>
            <span className="text-xs text-muted-foreground">1</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleRate('hard')}
            disabled={!isFlipped}
            className="flex flex-col items-center py-4 h-auto border-orange-200 hover:bg-orange-50 hover:border-orange-300"
          >
            <HelpCircle className="w-5 h-5 mb-1 text-orange-500" />
            <span className="text-sm font-medium">模糊</span>
            <span className="text-xs text-muted-foreground">2</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleRate('good')}
            disabled={!isFlipped}
            className="flex flex-col items-center py-4 h-auto border-blue-200 hover:bg-blue-50 hover:border-blue-300"
          >
            <Check className="w-5 h-5 mb-1 text-blue-500" />
            <span className="text-sm font-medium">认识</span>
            <span className="text-xs text-muted-foreground">3</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleRate('easy')}
            disabled={!isFlipped}
            className="flex flex-col items-center py-4 h-auto border-green-200 hover:bg-green-50 hover:border-green-300"
          >
            <Check className="w-5 h-5 mb-1 text-green-500" />
            <span className="text-sm font-medium">简单</span>
            <span className="text-xs text-muted-foreground">4</span>
          </Button>
        </div>

        {/* 提示 */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {!isFlipped ? (
            <p>空格键 / 点击卡片 翻转</p>
          ) : (
            <p>1: 不认识 | 2: 模糊 | 3: 认识 | 4: 简单</p>
          )}
        </div>
      </main>
    </div>
  );
}
