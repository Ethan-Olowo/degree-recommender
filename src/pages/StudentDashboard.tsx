import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ChevronRight, Target, TrendingUp, Award, User, BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Recommendation {
  recommendation_id: string;
  program_id: string;
  confidence_score: number;
  market_score: number;
  explanation: string;
  degree_programs: {
    program_name: string;
    program_type: string;
    description: string;
  };
}

interface StudentProfile {
  profile_id: string;
  academic_data_id: string | null;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchRecommendations();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('user_id')
        .eq('auth_id', user?.id)
        .single();

      if (userData) {
        const { data: profileData } = await supabase
          .from('student_profiles')
          .select('profile_id, academic_data_id')
          .eq('user_id', userData.user_id)
          .maybeSingle();

        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('user_id')
        .eq('auth_id', user?.id)
        .single();

      if (userData) {
        const { data: profileData } = await supabase
          .from('student_profiles')
          .select('profile_id')
          .eq('user_id', userData.user_id)
          .maybeSingle();

        if (profileData) {
          const { data } = await supabase
            .from('recommendations')
            .select(`
              recommendation_id,
              program_id,
              confidence_score,
              market_score,
              explanation,
              degree_programs (
                program_name,
                program_type,
                description
              )
            `)
            .eq('profile_id', profileData.profile_id)
            .order('confidence_score', { ascending: false })
            .limit(6);

          if (data) {
            setRecommendations(data as any);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8 animate-fade-in">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">
              Welcome back, <span className="gradient-text">{user?.user_metadata?.full_name || 'Student'}</span>!
            </h1>
            <p className="text-lg text-muted-foreground">
              Here's your personalized degree recommendations dashboard
            </p>
          </div>

          {/* Profile Status */}
          {!profile?.academic_data_id && (
            <Card className="glass border-warning/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertCircle className="h-5 w-5" />
                  Complete Your Profile
                </CardTitle>
                <CardDescription>
                  To get personalized degree recommendations, please complete your academic profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/profile/create">
                  <Button variant="gradient">
                    Complete Profile
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Recommendations</p>
                    <p className="text-2xl font-bold">{recommendations.length}</p>
                  </div>
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Top Match Score</p>
                    <p className="text-2xl font-bold">
                      {recommendations[0]?.confidence_score || 0}%
                    </p>
                  </div>
                  <Award className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Profile Status</p>
                    <p className="text-2xl font-bold">
                      {profile?.academic_data_id ? 'Complete' : 'Incomplete'}
                    </p>
                  </div>
                  <User className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Market Trend</p>
                    <p className="text-2xl font-bold">Rising</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Recommendations */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Top Recommendations</h2>
              <Link to="/explore">
                <Button variant="outline">
                  <BookOpen className="h-4 w-4" />
                  Explore All Degrees
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="glass">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="h-6 bg-muted rounded animate-shimmer"></div>
                        <div className="h-4 bg-muted rounded animate-shimmer"></div>
                        <div className="h-20 bg-muted rounded animate-shimmer"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((rec, index) => (
                  <Card key={rec.recommendation_id} className="glass card-hover" style={{ animationDelay: `${index * 0.1}s` }}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {rec.degree_programs?.program_name}
                          </CardTitle>
                          <CardDescription>
                            {rec.degree_programs?.program_type}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className={`text-sm font-bold ${getScoreColor(rec.confidence_score)}`}>
                            {rec.confidence_score}%
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {rec.degree_programs?.description}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Match Score</span>
                          <span>{rec.confidence_score}%</span>
                        </div>
                        <Progress value={rec.confidence_score} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Market Score</span>
                          <span>{rec.market_score}%</span>
                        </div>
                        <Progress value={rec.market_score} className="h-2" />
                      </div>
                      
                      <Link to={`/recommendation/${rec.recommendation_id}`}>
                        <Button className="w-full" variant="outline">
                          View Details
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass">
                <CardContent className="p-12 text-center">
                  <div className="space-y-4">
                    <div className="h-20 w-20 mx-auto rounded-full bg-primary-light flex items-center justify-center">
                      <Target className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">No Recommendations Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Complete your profile to get personalized degree recommendations based on your academic background and interests.
                    </p>
                    <Link to="/profile/create">
                      <Button variant="gradient">
                        Complete Your Profile
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/profile">
              <Card className="glass card-hover cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <User className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">Update Profile</p>
                    <p className="text-sm text-muted-foreground">Edit your information</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/explore">
              <Card className="glass card-hover cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">Explore Degrees</p>
                    <p className="text-sm text-muted-foreground">Browse all programs</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/compare">
              <Card className="glass card-hover cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">Compare Programs</p>
                    <p className="text-sm text-muted-foreground">Side-by-side comparison</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default StudentDashboard;