import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, TrendingUp, Settings, BarChart3, Database, Shield, Activity } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalPrograms: number;
  totalRecommendations: number;
  totalProfiles: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPrograms: 0,
    totalRecommendations: 0,
    totalProfiles: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch program count
      const { count: programCount } = await supabase
        .from('degree_programs')
        .select('*', { count: 'exact', head: true });

      // Fetch recommendation count
      const { count: recommendationCount } = await supabase
        .from('recommendations')
        .select('*', { count: 'exact', head: true });

      // Fetch profile count
      const { count: profileCount } = await supabase
        .from('student_profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: userCount || 0,
        totalPrograms: programCount || 0,
        totalRecommendations: recommendationCount || 0,
        totalProfiles: profileCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      description: 'Registered users in the system',
      color: 'text-primary'
    },
    {
      title: 'Degree Programs',
      value: stats.totalPrograms,
      icon: GraduationCap,
      description: 'Available degree programs',
      color: 'text-success'
    },
    {
      title: 'Recommendations',
      value: stats.totalRecommendations,
      icon: TrendingUp,
      description: 'Total recommendations generated',
      color: 'text-warning'
    },
    {
      title: 'Student Profiles',
      value: stats.totalProfiles,
      icon: Activity,
      description: 'Completed student profiles',
      color: 'text-accent'
    }
  ];

  const adminActions = [
    {
      title: 'Manage Degrees',
      description: 'Add, edit, or remove degree programs',
      icon: GraduationCap,
      link: '/admin/degrees',
      color: 'bg-gradient-primary'
    },
    {
      title: 'Manage Algorithms',
      description: 'Configure recommendation algorithms',
      icon: Settings,
      link: '/admin/algorithms',
      color: 'bg-gradient-ocean'
    },
    {
      title: 'System Reports',
      description: 'View detailed analytics and reports',
      icon: BarChart3,
      link: '/admin/reports',
      color: 'bg-gradient-primary'
    },
    {
      title: 'Database Management',
      description: 'Manage database and data integrity',
      icon: Database,
      link: '/admin/database',
      color: 'bg-gradient-ocean'
    }
  ];

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold">
                Admin <span className="gradient-text">Dashboard</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                System overview and management tools
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-lg">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Admin Access</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
              <Card
                key={stat.title}
                className="glass card-hover animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {isLoading ? (
                      <div className="h-8 w-20 bg-muted rounded animate-shimmer"></div>
                    ) : (
                      stat.value.toLocaleString()
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {adminActions.map((action, index) => (
                <Link key={action.title} to={action.link}>
                  <Card
                    className="glass card-hover h-full animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-lg ${action.color} flex items-center justify-center`}>
                          <action.icon className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{action.title}</CardTitle>
                          <CardDescription>{action.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
              <CardDescription>Latest events and changes in the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4" />
                <p>Activity logging will be available soon</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default AdminDashboard;