'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAllParts, type PartInfo } from '@/lib/vocabulary';
import {
  getAllPartProgress,
  getLastStudiedPart,
  type PartProgress,
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Play,
  RotateCcw,
  Search,
  ChevronRight,
  Trophy,
  ArrowLeft,
  Home,
} from 'lucide-react';

type FilterType = 'all' | 'learning' | 'completed';

export default function PartsPage() {
  const [parts, setParts] = useState<PartInfo[]>([]);
  const [partProgress, setPartProgress] = useState<
    Record<string, PartProgress>
  >({});
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastPart, setLastPart] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 加载所有 Part 信息
    const allParts = getAllParts();
    setParts(allParts);

    // 加载进度数据
    const progress = getAllPartProgress();
    setPartProgress(progress);

    // 加载上次学习的 Part
    setLastPart(getLastStudiedPart());
  }, []);

  // 过滤 Part
  const filteredParts = useMemo(() => {
    let result = parts;

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (part) =>
          part.id.includes(query) ||
          `${part.startRank}-${part.endRank}`.includes(query)
      );
    }

    // 状态过滤
    if (filter !== 'all') {
      result = result.filter((part) => {
        const progress = partProgress[part.id];
        if (!progress) return filter === 'learning' ? false : true;

        const completionRate = progress.completed / progress.total;

        if (filter === 'completed') {
          return completionRate >= 1;
        } else if (filter === 'learning') {
          return completionRate > 0 && completionRate < 1;
        }
        return true;
      });
    }

    return result;
  }, [parts, partProgress, filter, searchQuery]);

  // 统计
  const stats = useMemo(() => {
    const total = parts.length;
    const completed = Object.values(partProgress).filter(
      (p) => p.completed >= p.total
    ).length;
    const learning = Object.values(partProgress).filter(
      (p) => p.completed > 0 && p.completed < p.total
    ).length;

    return { total, completed, learning };
  }, [parts, partProgress]);

  // 获取 Part 的完成进度
  const getPartProgressInfo = (partId: string) => {
    const progress = partProgress[partId];
    if (!progress) return { completed: 0, percentage: 0 };

    return {
      completed: progress.completed,
      percentage: Math.round((progress.completed / progress.total) * 100),
    };
  };

  // 获取 Part 状态标签
  const getPartStatusBadge = (partId: string) => {
    const progress = partProgress[partId];
    if (!progress || progress.completed === 0) {
      return (
        <Badge variant="secondary" className="text-xs">
          未开始
        </Badge>
      );
    }

    const completionRate = progress.completed / progress.total;
    if (completionRate >= 1) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-xs">
          <Trophy className="w-3 h-3 mr-1" />
          已完成
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="text-xs">
        学习中
      </Badge>
    );
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">单词学习</h1>
          </div>
          <p className="text-muted-foreground ml-14">
            COCA 20000 词汇表，共分为 {stats.total} 个 Part，每个 Part 200 个单词
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总 Part 数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                已完成
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.completed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                学习中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.learning}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 继续学习按钮 */}
        {lastPart && (
          <div className="mb-8">
            <Link href={`/learn/${lastPart}`}>
              <Button size="lg" className="gap-2">
                <RotateCcw className="w-5 h-5" />
                继续学习 Part {lastPart}
              </Button>
            </Link>
          </div>
        )}

        {/* 筛选和搜索 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              全部
            </Button>
            <Button
              variant={filter === 'learning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('learning')}
            >
              学习中
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              已完成
            </Button>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索 Part 编号或范围..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Part 列表 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredParts.map((part) => {
            const progress = getPartProgressInfo(part.id);

            return (
              <Link key={part.id} href={`/learn/${part.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">Part {part.id}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          排名 {part.startRank}-{part.endRank}
                        </div>
                      </div>
                      {getPartStatusBadge(part.id)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          进度
                        </span>
                        <span className="font-medium">
                          {progress.completed}/{part.wordCount}
                        </span>
                      </div>
                      <Progress value={progress.percentage} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <span className="text-sm text-muted-foreground">
                        {progress.percentage}% 完成
                      </span>
                      <div className="flex items-center text-sm text-primary group-hover:translate-x-1 transition-transform">
                        {progress.completed === 0 ? '开始学习' : progress.percentage >= 100 ? '复习' : '继续'}
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* 空状态 */}
        {filteredParts.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">没有找到 Part</h3>
            <p className="text-muted-foreground">
              尝试调整搜索条件或筛选器
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
