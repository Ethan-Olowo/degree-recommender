import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Target,
  TrendingUp,
  Award,
  User,
  BookOpen,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FloatingChat } from "@/components/FloatingChat";

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

interface ProfileData {
  user_id: string;
  academic_data?: {
    academic_data_id: string;
  };
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [studentName, setStudentName] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchProfileAndRecommendations();
    }
  }, [user]);

  const fetchProfileAndRecommendations = async () => {
    try {
      // Fetch user name from users table
      const { data: userData } = await supabase
        .from("users")
        .select("full_name")
        .eq("user_id", user?.id)
        .single();
      setStudentName(userData?.full_name || "Student");

      // Fetch user profile and academic data
      const { data: academicData } = await supabase
        .from("academic_data")
        .select("academic_data_id, gpa, grade_system, school_type")
        .eq("user_id", user?.id)
        .maybeSingle();

      // Fetch personal interests
      const { data: interests } = await supabase
        .from("personal_interests")
        .select("interest")
        .eq("user_id", user?.id);

      // Fetch subject grades
      let subjectGrades = [];
      if (academicData?.academic_data_id) {
        const { data: grades } = await supabase
          .from("subject_grades")
          .select("grade, subject_id")
          .eq("academic_data_id", academicData.academic_data_id);
        subjectGrades = grades || [];
      }

      // Fetch socioeconomic data
      const { data: socioData } = await supabase
        .from("socioeconomic_indicators")
        .select("country_code, income_level, gender, school_type")
        .eq("user_id", user?.id)
        .maybeSingle();

      // Calculate profile completion
      let totalItems = 0;
      totalItems += interests?.length || 0;
      totalItems += subjectGrades.length;

      // Count filled socioeconomic fields
      if (socioData) {
        if (socioData.country_code) totalItems++;
        if (socioData.income_level) totalItems++;
        if (socioData.gender) totalItems++;
        if (socioData.school_type) totalItems++;
      }

      // Count filled academic fields
      if (academicData) {
        if (academicData.gpa) totalItems++;
        if (academicData.grade_system) totalItems++;
        if (academicData.school_type) totalItems++;
      }

      const completionPercentage = Math.round((totalItems / 15) * 100);
      setProfileCompletion(completionPercentage);

      if (academicData) {
        setProfileData({
          user_id: user?.id || "",
          academic_data: academicData,
        });
      } else {
        setProfileData({
          user_id: user?.id || "",
        });
      }

      // Fetch the 5 most recently generated recommendations
      const { data: recData } = await supabase
        .from("recommendations")
        .select(
          `
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
        `
        )
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recData) {
        // Sort by confidence_score descending before displaying
        const sorted = (recData as any[]).sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
        setRecommendations(sorted);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    const percent = score * 100;
    if (percent >= 80) return "text-success";
    if (percent >= 60) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8 animate-fade-in">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">
              Welcome back,{' '}
              <span className="gradient-text">
                {studentName}
              </span>
              !
            </h1>
            <p className="text-lg text-muted-foreground">
              Here's your personalized degree recommendations dashboard
            </p>
          </div>

          {/* Profile Status */}
          {!profileData?.academic_data && (
            <Card className="glass border-warning/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertCircle className="h-5 w-5" />
                  Complete Your Profile
                </CardTitle>
                <CardDescription>
                  To get personalized degree recommendations, please complete
                  your academic profile.
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
          {profileCompletion < 100 && (
            <div
              className={`grid grid-cols-1 ${
                recommendations.length > 0 ? "md:grid-cols-3" : "md:grid-cols-1"
              } gap-4`}
            >
              <Link to="/profile">
                <Card className="glass card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Profile Completion
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <Progress
                            value={profileCompletion}
                            className="flex-1"
                          />
                          <span className="text-2xl font-bold">
                            {profileCompletion}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {Math.round((profileCompletion * 15) / 100)}/15
                            items
                          </span>
                        </div>
                      </div>
                      <User className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {recommendations.length > 0 && (
                <>
                  <Card className="glass card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Top Match Score
                          </p>
                          <p className="text-2xl font-bold">
                            {Math.round((recommendations[0]?.confidence_score || 0) * 100)}%
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
                          <p className="text-sm text-muted-foreground">
                            Market Trend
                          </p>
                          <p className="text-2xl font-bold">Rising</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-success" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

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
              <>
                {/* Top Recommendation Full Width */}
                <div className="mb-6">
                  {(() => {
                    const rec = recommendations[0];
                    if (!rec) return null;
                    const confidencePercent = Math.round((rec.confidence_score || 0) * 100);
                    const marketPercent = Math.round((rec.market_score || 0) * 100);
                    return (
                      <Card
                        key={rec.recommendation_id}
                        className="glass card-hover"
                        style={{ animationDelay: `0s` }}
                      >
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
                              <span
                                className={`text-sm font-bold ${getScoreColor(rec.confidence_score)}`}
                              >
                                {confidencePercent}%
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
                              <span>{confidencePercent}%</span>
                            </div>
                            <Progress
                              value={confidencePercent}
                              className="h-2"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Market Score</span>
                              <span>{marketPercent}%</span>
                            </div>
                            <Progress value={marketPercent} className="h-2" />
                          </div>

                          <Link to={`/recommendation/${rec.recommendation_id}`}>
                            <Button className="w-full" variant="outline">
                              View Details
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
                {/* Next 4 Recommendations in 2x2 Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recommendations.slice(1, 5).map((rec, index) => {
                    const confidencePercent = Math.round((rec.confidence_score || 0) * 100);
                    const marketPercent = Math.round((rec.market_score || 0) * 100);
                    return (
                      <Card
                        key={rec.recommendation_id}
                        className="glass card-hover"
                        style={{ animationDelay: `${(index + 1) * 0.1}s` }}
                      >
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
                              <span
                                className={`text-sm font-bold ${getScoreColor(rec.confidence_score)}`}
                              >
                                {confidencePercent}%
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
                              <span>{confidencePercent}%</span>
                            </div>
                            <Progress
                              value={confidencePercent}
                              className="h-2"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Market Score</span>
                              <span>{marketPercent}%</span>
                            </div>
                            <Progress value={marketPercent} className="h-2" />
                          </div>

                          <Link to={`/recommendation/${rec.recommendation_id}`}>
                            <Button className="w-full" variant="outline">
                              View Details
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            ) : (
              <Card className="glass">
                <CardContent className="p-12 text-center">
                  <div className="space-y-4">
                    <div className="h-20 w-20 mx-auto rounded-full bg-primary-light flex items-center justify-center">
                      <Target className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">
                      No Recommendations Yet
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Complete your profile to get personalized degree
                      recommendations based on your academic background and
                      interests.
                    </p>
                    <Link
                      to={
                        profileData?.academic_data
                          ? "/profile"
                          : "/profile/create"
                      }
                    >
                      <Button variant="gradient">Complete Your Profile</Button>
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
                    <p className="text-sm text-muted-foreground">
                      Edit your information
                    </p>
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
                    <p className="text-sm text-muted-foreground">
                      Browse all programs
                    </p>
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
                    <p className="text-sm text-muted-foreground">
                      Side-by-side comparison
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
        <FloatingChat recommendations={recommendations} />
      </Layout>
    </ProtectedRoute>
  );
};

export default StudentDashboard;
