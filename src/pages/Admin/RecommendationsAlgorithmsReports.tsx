import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ThumbsUp, TrendingUp, Brain, Target, Settings } from 'lucide-react';

interface RecommendationsData {
  totalRecommendations: number;
  likeRate: number;
  recommendationsPerUser: { user_count: number; recommendation_count: number }[];
  avgConfidencePerAlgorithm: { algorithm_id: string; avg_confidence: number; avg_market_score: number }[];
  topPrograms: { program_name: string; recommendation_count: number }[];
  algorithmComparison: { algorithm_id: string; avg_confidence: number; like_rate: number; avg_market_score: number }[];
  categoryConfidence: { category: string; avg_confidence: number }[];
  confidenceTrend: { date: string; avg_confidence: number }[];
}

const RecommendationsAlgorithmsReports = () => {
  const [data, setData] = useState<RecommendationsData>({
    totalRecommendations: 0,
    likeRate: 0,
    recommendationsPerUser: [],
    avgConfidencePerAlgorithm: [],
    topPrograms: [],
    algorithmComparison: [],
    categoryConfidence: [],
    confidenceTrend: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      // Fetch all recommendations
      const { data: recommendations } = await (supabase as any)
        .from('recommendations')
        .select('user_id, liked, confidence_score, market_score, algorithm_source, program_id, created_at');

      const totalRecs = recommendations?.length || 0;
      const likedRecs = recommendations?.filter(r => r.liked).length || 0;
      const likeRate = totalRecs > 0 ? (likedRecs / totalRecs) * 100 : 0;

      // Recommendations per user (histogram)
      const userRecMap = new Map<string, number>();
      recommendations?.forEach(r => {
        userRecMap.set(r.user_id, (userRecMap.get(r.user_id) || 0) + 1);
      });

      const recCountMap = new Map<number, number>();
      userRecMap.forEach(count => {
        recCountMap.set(count, (recCountMap.get(count) || 0) + 1);
      });

      const recommendationsPerUser = Array.from(recCountMap.entries())
        .map(([recommendation_count, user_count]) => ({ recommendation_count, user_count }))
        .sort((a, b) => a.recommendation_count - b.recommendation_count);

      // Average confidence and market score per algorithm
      const algoStatsMap = new Map<string, { totalConfidence: number; totalMarket: number; count: number }>();
      recommendations?.forEach(r => {
        const key = r.algorithm_source || 'default';
        const stats = algoStatsMap.get(key) || { totalConfidence: 0, totalMarket: 0, count: 0 };
        stats.totalConfidence += r.confidence_score || 0;
        stats.totalMarket += r.market_score || 0;
        stats.count += 1;
        algoStatsMap.set(key, stats);
      });

      const avgConfidencePerAlgorithm = Array.from(algoStatsMap.entries()).map(([algorithm_id, stats]) => ({
        algorithm_id: algorithm_id.substring(0, 8),
        avg_confidence: stats.count > 0 ? stats.totalConfidence / stats.count : 0,
        avg_market_score: stats.count > 0 ? stats.totalMarket / stats.count : 0,
      }));

      // Top programs by recommendation count
      const programCountMap = new Map<string, number>();
      recommendations?.forEach(r => {
        if (r.program_id) {
          programCountMap.set(r.program_id, (programCountMap.get(r.program_id) || 0) + 1);
        }
      });

      const topProgramIds = Array.from(programCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const topPrograms = await Promise.all(
        topProgramIds.map(async ([program_id, recommendation_count]) => {
          const { data: program } = await supabase
            .from('degree_programs')
            .select('program_name')
            .eq('program_id', program_id)
            .maybeSingle();

          return {
            program_name: program?.program_name || 'Unknown',
            recommendation_count,
          };
        })
      );

      // Algorithm comparison (confidence, like %, market score)
      const algoComparisonMap = new Map<string, { totalConfidence: number; totalMarket: number; liked: number; count: number }>();
      recommendations?.forEach(r => {
        const key = r.algorithm_source || 'default';
        const stats = algoComparisonMap.get(key) || { totalConfidence: 0, totalMarket: 0, liked: 0, count: 0 };
        stats.totalConfidence += r.confidence_score || 0;
        stats.totalMarket += r.market_score || 0;
        if (r.liked) stats.liked += 1;
        stats.count += 1;
        algoComparisonMap.set(key, stats);
      });

      const algorithmComparison = Array.from(algoComparisonMap.entries()).map(([algorithm_id, stats]) => ({
        algorithm_id: algorithm_id.substring(0, 8),
        avg_confidence: stats.count > 0 ? stats.totalConfidence / stats.count : 0,
        like_rate: stats.count > 0 ? (stats.liked / stats.count) * 100 : 0,
        avg_market_score: stats.count > 0 ? stats.totalMarket / stats.count : 0,
      }));

      // Category confidence distribution
      const { data: categoryConfidenceData } = await (supabase as any)
        .from('category_confidence')
        .select('predicted_category, prediction_confidence');

      const categoryMap = new Map<string, { total: number; count: number }>();
      categoryConfidenceData?.forEach(c => {
        const stats = categoryMap.get(c.predicted_category) || { total: 0, count: 0 };
        stats.total += c.prediction_confidence || 0;
        stats.count += 1;
        categoryMap.set(c.predicted_category, stats);
      });

      const categoryConfidence = Array.from(categoryMap.entries()).map(([category, stats]) => ({
        category,
        avg_confidence: stats.count > 0 ? (stats.total / stats.count) * 100 : 0,
      }));

      // Confidence trend over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentRecs } = await (supabase as any)
        .from('recommendations')
        .select('created_at, confidence_score')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at');

      const dailyConfidenceMap = new Map<string, { total: number; count: number }>();
      recentRecs?.forEach(r => {
        const date = new Date(r.created_at).toISOString().split('T')[0];
        const stats = dailyConfidenceMap.get(date) || { total: 0, count: 0 };
        stats.total += r.confidence_score || 0;
        stats.count += 1;
        dailyConfidenceMap.set(date, stats);
      });

      const confidenceTrend = Array.from(dailyConfidenceMap.entries())
        .map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avg_confidence: stats.count > 0 ? (stats.total / stats.count) * 100 : 0,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setData({
        totalRecommendations: totalRecs,
        likeRate,
        recommendationsPerUser,
        avgConfidencePerAlgorithm,
        topPrograms,
        algorithmComparison,
        categoryConfidence,
        confidenceTrend,
      });
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    user_count: {
      label: 'Users',
      color: 'hsl(var(--primary))',
    },
    avg_confidence: {
      label: 'Avg Confidence',
      color: 'hsl(var(--accent))',
    },
    avg_market_score: {
      label: 'Avg Market Score',
      color: 'hsl(var(--success))',
    },
    like_rate: {
      label: 'Like Rate %',
      color: 'hsl(var(--warning))',
    },
  };

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-8 animate-fade-in">
          {/* Header with Manage Link */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold">
                Recommendations & <span className="gradient-text">Algorithms Reports</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Performance metrics and insights for recommendation algorithms
              </p>
            </div>
            <Link to="/admin/algorithms">
              <Button className="btn-glow">
                <Settings className="mr-2 h-4 w-4" />
                Manage Algorithms (Weights)
              </Button>
            </Link>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardDescription className="text-xs mb-1">Total Recommendations</CardDescription>
                    <CardTitle className="text-3xl font-bold">
                      {isLoading ? (
                        <div className="h-8 w-24 bg-muted rounded animate-shimmer"></div>
                      ) : (
                        data.totalRecommendations.toLocaleString()
                      )}
                    </CardTitle>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Generated across all users</p>
              </CardContent>
            </Card>

            <Card className="glass card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardDescription className="text-xs mb-1">Like Rate</CardDescription>
                    <CardTitle className="text-3xl font-bold">
                      {isLoading ? (
                        <div className="h-8 w-24 bg-muted rounded animate-shimmer"></div>
                      ) : (
                        `${data.likeRate.toFixed(1)}%`
                      )}
                    </CardTitle>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <ThumbsUp className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">User satisfaction rate</p>
              </CardContent>
            </Card>

            <Card className="glass card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardDescription className="text-xs mb-1">Active Algorithms</CardDescription>
                    <CardTitle className="text-3xl font-bold">
                      {isLoading ? (
                        <div className="h-8 w-24 bg-muted rounded animate-shimmer"></div>
                      ) : (
                        data.algorithmComparison.length
                      )}
                    </CardTitle>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Different algorithm versions</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total recommendations per user (histogram) */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Recommendations Per User</CardTitle>
                <CardDescription>Distribution of recommendation counts across users</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.recommendationsPerUser}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="recommendation_count" 
                          label={{ value: 'Recommendations', position: 'insideBottom', offset: -5 }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis 
                          label={{ value: 'Users', angle: -90, position: 'insideLeft' }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="user_count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Average confidence and market score per algorithm */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Algorithm Performance</CardTitle>
                <CardDescription>Confidence and market scores by algorithm</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.avgConfidencePerAlgorithm}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="algorithm_id" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="avg_confidence" fill="hsl(var(--accent))" name="Avg Confidence" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="avg_market_score" fill="hsl(var(--success))" name="Avg Market Score" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Category confidence distribution */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Category Confidence Distribution</CardTitle>
                <CardDescription>Average prediction confidence by category</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.categoryConfidence} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="category" width={100} stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="avg_confidence" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Confidence trend over time */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Confidence Trend (30 Days)</CardTitle>
                <CardDescription>Average confidence score over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.confidenceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="avg_confidence" 
                          stroke="hsl(var(--accent))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--accent))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Algorithm Comparison Table */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Algorithm Comparison</CardTitle>
              <CardDescription>Detailed comparison of confidence, like rate, and market score</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 bg-muted rounded animate-shimmer"></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Algorithm ID</TableHead>
                      <TableHead className="text-right">Avg Confidence</TableHead>
                      <TableHead className="text-right">Like Rate %</TableHead>
                      <TableHead className="text-right">Avg Market Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.algorithmComparison.map((algo) => (
                      <TableRow key={algo.algorithm_id}>
                        <TableCell className="font-medium">{algo.algorithm_id}</TableCell>
                        <TableCell className="text-right">{algo.avg_confidence.toFixed(3)}</TableCell>
                        <TableCell className="text-right">{algo.like_rate.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{algo.avg_market_score.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Most Recommended Degree Programs Table */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Most Recommended Degree Programs</CardTitle>
              <CardDescription>Top 10 programs by recommendation count</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-64 bg-muted rounded animate-shimmer"></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Program Name</TableHead>
                      <TableHead className="text-right">Recommendations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topPrograms.map((program, index) => (
                      <TableRow key={program.program_name}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell>{program.program_name}</TableCell>
                        <TableCell className="text-right">{program.recommendation_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default RecommendationsAlgorithmsReports;
