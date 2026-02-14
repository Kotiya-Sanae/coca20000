'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllParts } from '@/lib/vocabulary';
import {
  getStudyStats,
  getAllPartProgress,
  getWordsToReview,
  getLastStudiedPart,
  type StudyStats,
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  RotateCcw,
  TrendingUp,
  Target,
  Calendar,
  Award,
  ChevronRight,
  Brain,
  Clock,
  BarChart3,
} from 'lucide-react';

export default function HomePage() {
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [partProgress, setPartProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [reviewCount, setReviewCount] = useState(0);
  const [lastPart, setLastPart] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStats(getStudyStats());
    setReviewCount(getWordsToReview().length);
    setLastPart(getLastStudiedPart());

    // 计算 Part 进度
    const allParts = getAllParts();
    const progress = getAllPartProgress();
    const progressMap: Record<string, { completed: number; total: number }> = {};

    allParts.forEach((part) => {
      const p = progress[part.id];
      progressMap[part.id] = {
        completed: p?.completed ?? 0,
        total: part.wordCount,
      };
    });

    setPartProgress(progressMap);
  }, []);

  // 计算总体进度
  const totalProgress = (() => {
    if (!stats) return 0;
    return Math.round((stats.masteredWords / stats.totalWords) * 100);
  })();

  // 获取最近学习的 Part（按最后学习时间排序）
  const recentParts = (() => {
    const parts = Object.entries(partProgress)
      .filter(([, p]) => p.completed > 0)
      .sort((a, b) => b[1].completed - a[1].completed)
      .slice(0, 5);
    return parts;
  })();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-32 bg-muted rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">COCA 20000 单词</h1>
          <p className="text-muted-foreground">
            基于美国当代英语语料库的高频词汇学习
          </p>
        </div>

        {/* 快速操作 */}
        <div className="flex flex-wrap gap-4 mb-8">
          {reviewCount > 0 && (
            <Link href="/review">
              <Button size="lg" className="gap-2">
                <Brain className="w-5 h-5" />
                复习单词
                <Badge variant="secondary" className="ml-1">
                  {reviewCount}
                </Badge>
              </Button>
            </Link>
          )}

          {lastPart && (
            <Link href={`/learn/${lastPart}`}>
              <Button size="lg" variant="outline" className="gap-2">
                <RotateCcw className="w-5 h-5" />
                继续 Part {lastPart}
              </Button>
            </Link>
          )}

          <Link href="/parts">
            <Button size="lg" variant="outline" className="gap-2">
              <BookOpen className="w-5 h-5" />
              浏览全部
            </Button>
          </Link>
        </div>

        {/* 总体进度 */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">总体进度</h2>
                <p className="text-sm text-muted-foreground">
                  已掌握 {stats.masteredWords} / {stats.totalWords} 个单词
                </p>
              </div>
              <div className="text-3xl font-bold">{totalProgress}%</div>
            </div>
            <Progress value={totalProgress} className="h-3" />
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                已掌握
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.masteredWords}
              </div>
              <p className="text-xs text-muted-foreground">单词</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                学习中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.learningWords}
              </div>
              <p className="text-xs text-muted-foreground">单词</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                连续学习
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {stats.streak}
              </div>
              <p className="text-xs text-muted-foreground">天</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                今日学习
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats.todayLearned + stats.todayReviewed}
              </div>
              <p className="text-xs text-muted-foreground">单词</p>
            </CardContent>
          </Card>
        </div>

        {/* 今日活动 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              今日活动
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.todayLearned}
                </div>
                <div className="text-sm text-blue-600/80">新学单词</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {stats.todayReviewed}
                </div>
                <div className="text-sm text-green-600/80">复习单词</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 熟悉度分布 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              熟悉度分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { level: 5, label: '精通', color: 'bg-emerald-600', count: 0 },
                { level: 4, label: '掌握', color: 'bg-green-500', count: 0 },
                { level: 3, label: '熟悉', color: 'bg-blue-500', count: 0 },
                { level: 2, label: '了解', color: 'bg-yellow-500', count: 0 },
                { level: 1, label: '初学', color: 'bg-orange-500', count: 0 },
                { level: 0, label: '陌生', color: 'bg-red-500', count: stats.newWords },
              ].map((item) => (
                <div key={item.level} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium">{item.label}</div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} transition-all`}
                        style={{
                          width: `${(item.count / stats.totalWords) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-sm text-muted-foreground text-right">
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 最近学习 */}
        {recentParts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                最近学习
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentParts.map(([partId, progress]) => {
                  const percentage = Math.round(
                    (progress.completed / progress.total) * 100
                  );
                  return (
                    <Link key={partId} href={`/learn/${partId}`}>
                      <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">Part {partId}</span>
                            <span className="text-sm text-muted-foreground">
                              {progress.completed}/{progress.total}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
