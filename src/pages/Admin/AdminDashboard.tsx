import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, TrendingUp, Settings, BarChart3, Database, Shield, Activity, Home, FileText, ChevronDown, Sliders, Building2, BookOpen, ThumbsUp, Target, Brain, Zap } from 'lucide-react';
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
    setIsLoading(true);
    try {
      // Call the Postgres function via Supabase RPC
      const { data, error } = await (supabase.rpc as any)('get_admin_dashboard_stats');
      if (error) throw error;
      const statsData = Array.isArray(data) ? data[0] : data;
      if (statsData) {
        setStats({
          totalUsers: statsData.totalUsers || 0,
          newUsersThisMonth: statsData.newUsersThisMonth || 0,
          totalRecommendations: statsData.totalRecommendations || 0,
          recommendationsLiked: statsData.recommendationsLiked || 0,
          likePercentage: statsData.likePercentage || 0,
          programsByCategory: Array.isArray(statsData.programsByCategory) ? statsData.programsByCategory : [],
          activeAlgorithm: statsData.activeAlgorithm || 'Default',
          averageLikeRate: statsData.averageLikeRate || 0,
          topIndustries: Array.isArray(statsData.topIndustries) ? statsData.topIndustries : [],
          avgCategoryConfidence: statsData.avgCategoryConfidence || 0,
        });
      }
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

  const managementLinks = [
    { title: 'Manage Degrees', href: '/admin/degrees', icon: GraduationCap, description: 'Add, edit, and organize degree programs' },
    { title: 'Manage Subjects', href: '/admin/subjects', icon: BookOpen, description: 'Manage subjects and requirements' },
    { title: 'Manage Industries', href: '/admin/industries', icon: Building2, description: 'Configure industry data' },
    { title: 'Manage Algorithms', href: '/admin/algorithms', icon: Brain, description: 'Configure recommendation algorithms' },
  ];

  const reportLinks = [
    { title: 'Recommendations & Algorithms', href: '/admin/reports/recommendations', icon: ThumbsUp, description: 'View recommendation performance' },
    { title: 'Market Insights', href: '/admin/reports/market', icon: TrendingUp, description: 'Analyze market trends' },
    { title: 'Degrees & Industries', href: '/admin/reports/degrees', icon: BarChart3, description: 'Program distribution insights' },
    { title: 'Users & Demographics', href: '/admin/reports/users', icon: Users, description: 'User statistics and demographics' },
    { title: 'API Performance', href: '/admin/reports/api-performance', icon: Zap, description: 'API logs, performance, and errors' },
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

          {/* Management Actions */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Management</CardTitle>
              <CardDescription>Configure system data and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {managementLinks.map((link) => (
                  <Link key={link.href} to={link.href}>
                    <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/10 transition-colors card-hover h-full">
                      <link.icon className="h-6 w-6 text-primary mb-2" />
                      <h3 className="font-semibold mb-1">{link.title}</h3>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reports Section */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>Detailed insights and analytics reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportLinks.map((link) => (
                  <Link key={link.href} to={link.href}>
                    <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/10 transition-colors card-hover h-full">
                      <link.icon className="h-6 w-6 text-accent mb-2" />
                      <h3 className="font-semibold mb-1">{link.title}</h3>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

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