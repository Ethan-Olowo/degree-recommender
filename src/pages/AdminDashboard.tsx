import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, TrendingUp, Settings, BarChart3, Database, Shield, Activity, Home, FileText, ChevronDown, Sliders, Building2, BookOpen, ThumbsUp, Target, Brain } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Stats {
  totalUsers: number;
  newUsersThisMonth: number;
  totalRecommendations: number;
  recommendationsLiked: number;
  likePercentage: number;
  programsByCategory: { category: string; count: number }[];
  activeAlgorithm: string;
  averageLikeRate: number;
  topIndustries: { industry_name: string; value: number }[];
  avgCategoryConfidence: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    newUsersThisMonth: 0,
    totalRecommendations: 0,
    recommendationsLiked: 0,
    likePercentage: 0,
    programsByCategory: [],
    activeAlgorithm: 'Default',
    averageLikeRate: 0,
    topIndustries: [],
    avgCategoryConfidence: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total user count
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch new users this month - placeholder for now
      const newUsersCount = 0;

      // Fetch recommendation stats
      const { data: recommendations } = await supabase
        .from('recommendations')
        .select('liked');

      const totalRecs = recommendations?.length || 0;
      const likedRecs = recommendations?.filter(r => r.liked).length || 0;
      const likePercent = totalRecs > 0 ? (likedRecs / totalRecs) * 100 : 0;

      // Fetch programs by category
      const { data: programs } = await supabase
        .from('degree_programs')
        .select('category');

      const categoryMap = new Map<string, number>();
      programs?.forEach(p => {
        const category = p.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });

      const programsByCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
      }));

      // Fetch active algorithm - simplified type handling
      const algoResult = await (supabase as any)
        .from('recommendation_weights')
        .select('algorithm_id')
        .eq('current', true)
        .maybeSingle();

      const activeAlgoId = algoResult.data?.algorithm_id || 'Default';

      // Fetch top 3 industries by market indicator - simplified
      const industriesResult = await (supabase as any)
        .from('market_indicator_values')
        .select('industry_id, value')
        .order('value', { ascending: false })
        .limit(3);

      const topIndustriesData = industriesResult.data || [];
      const industriesFormatted: { industry_name: string; value: number }[] = [];

      for (const ind of topIndustriesData) {
        const industryResult = await (supabase as any)
          .from('industries')
          .select('industry_name')
          .eq('industry_id', ind.industry_id)
          .maybeSingle();

        industriesFormatted.push({
          industry_name: industryResult.data?.industry_name || 'Unknown',
          value: ind.value || 0,
        });
      }

      // Fetch average category confidence - simplified
      const confidenceResult = await (supabase as any)
        .from('category_confidence')
        .select('prediction_confidence');

      const confidenceData = confidenceResult.data || [];
      const avgConfidence = confidenceData.length
        ? confidenceData.reduce((sum: number, c: any) => sum + (c.prediction_confidence || 0), 0) / confidenceData.length
        : 0;

      setStats({
        totalUsers: userCount || 0,
        newUsersThisMonth: newUsersCount,
        totalRecommendations: totalRecs,
        recommendationsLiked: likedRecs,
        likePercentage: likePercent,
        programsByCategory,
        activeAlgorithm: activeAlgoId,
        averageLikeRate: likePercent,
        topIndustries: industriesFormatted,
        avgCategoryConfidence: avgConfidence,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const kpiCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      subValue: `+${stats.newUsersThisMonth} this month`,
      icon: Users,
      description: 'Registered users in the system',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/admin/reports/users',
    },
    {
      title: 'Recommendations',
      value: stats.totalRecommendations.toLocaleString(),
      subValue: `${stats.likePercentage.toFixed(1)}% liked`,
      icon: ThumbsUp,
      description: 'Total recommendations generated',
      color: 'text-success',
      bgColor: 'bg-success/10',
      link: '/admin/reports/recommendations',
    },
    {
      title: 'Degree Programs',
      value: stats.programsByCategory.length > 0 
        ? `${stats.programsByCategory.reduce((sum, c) => sum + c.count, 0)} total`
        : '0 total',
      subValue: `${stats.programsByCategory.length} categories`,
      icon: GraduationCap,
      description: 'Available degree programs',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      link: '/admin/reports/degrees',
    },
    {
      title: 'Active Algorithm',
      value: stats.averageLikeRate.toFixed(1) + '%',
      subValue: 'Average like rate',
      icon: Brain,
      description: 'Recommendation performance',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      link: '/admin/reports/recommendations',
    },
    {
      title: 'Top Industry',
      value: stats.topIndustries[0]?.industry_name || 'N/A',
      subValue: stats.topIndustries[0] ? `Value: ${stats.topIndustries[0].value.toFixed(2)}` : '',
      icon: Building2,
      description: 'Highest market indicator',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/admin/reports/market',
    },
    {
      title: 'Prediction Confidence',
      value: `${(stats.avgCategoryConfidence * 100).toFixed(1)}%`,
      subValue: 'Average confidence',
      icon: Target,
      description: 'Category prediction accuracy',
      color: 'text-success',
      bgColor: 'bg-success/10',
      link: '/admin/reports/recommendations',
    },
  ];


  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-8 animate-fade-in">
          {/* ...existing code... */}

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-4xl font-bold">
              Admin <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              System overview and key performance indicators
            </p>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpiCards.map((card, index) => (
              <Link key={card.title} to={card.link}>
                <Card
                  className="glass card-hover h-full animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardDescription className="text-xs mb-1">
                          {card.title}
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold">
                          {isLoading ? (
                            <div className="h-8 w-24 bg-muted rounded animate-shimmer"></div>
                          ) : (
                            card.value
                          )}
                        </CardTitle>
                      </div>
                      <div className={`h-12 w-12 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                        <card.icon className={`h-6 w-6 ${card.color}`} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-4 w-32 bg-muted rounded animate-shimmer mb-2"></div>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-2">
                        {card.subValue}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {card.description}
                    </p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-primary">
                      View full report →
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Quick Insights */}
          {!isLoading && stats.programsByCategory.length > 0 && (
            <Card className="glass">
              <CardHeader>
                <CardTitle>Programs by Category</CardTitle>
                <CardDescription>Distribution of degree programs across categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.programsByCategory.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <span className="text-sm font-medium">{cat.category}</span>
                      <span className="text-2xl font-bold text-primary">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default AdminDashboard;