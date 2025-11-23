import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap,
  ArrowLeft,
  Sparkles,
  BookOpen,
  TrendingUp,
  CheckCircle,
  GitCompare,
  Briefcase,
  Target,
  Info,
  Award,
  Heart,
  HeartOff,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { CyclingLoader } from "@/components/CyclingLoader";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Recommendation {
  recommendation_id: string;
  user_id: string;
  program_id: string | null;
  confidence_score: number | null;
  explanation: string | null;
  market_score: number | null;
  semantic_score: number | null;
  subject_score: number | null;
  peer_score: number | null;
  created_at: string;
  liked: boolean;
  degree_programs?: {
    program_name: string;
    program_type: string;
    description: string;
    minimum_gpa: number | null;
    program_id: string;
  };
}

interface Industry {
  industry_name: string;
}

interface SubjectRequirement {
  subjects: {
    subject_name: string;
  };
  requirement_detail: string | null;
}

const RecommendationDetails = () => {
  const { recommendationId } = useParams<{ recommendationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [requirements, setRequirements] = useState<SubjectRequirement[]>([]);

  const handleToggleLike = async () => {
    if (!recommendation) return;
    setLikeLoading(true);
    try {
      const { error } = await supabase
        .from("recommendations")
        .update({ liked: !recommendation.liked })
        .eq("recommendation_id", recommendation.recommendation_id);
      if (!error) {
        setRecommendation({ ...recommendation, liked: !recommendation.liked });
      }
    } catch (e) {
      console.error("Error updating like:", e);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleGenerateExplanation = async () => {
    if (!user?.id || !recommendationId) return;

    setIsGeneratingExplanation(true);
    try {
      const response = await fetch(
        `http://localhost:8000/${user.id}/recommendations/${recommendationId}/explanation`
      );

      const data = await response.json();

      if (recommendation) {
        setRecommendation({
          ...recommendation,
          explanation: data.explanation,
        });
      }

      toast({
        title: "Success!",
        description: "Explanation has been generated.",
      });
    } catch (error) {
      console.error("Error generating explanation:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  useEffect(() => {
    if (recommendationId) {
      fetchRecommendationDetails();
    }
    // eslint-disable-next-line
  }, [recommendationId]);

  const fetchRecommendationDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("recommendations")
        .select(
          `
          recommendation_id,
          user_id,
          program_id,
          confidence_score,
          explanation,
          market_score,
          semantic_score,
          subject_score,
          peer_score,
          created_at,
          liked,
          degree_programs (
            program_id,
            program_name,
            program_type,
            description,
            minimum_gpa
          )
        `
        )
        .eq("recommendation_id", recommendationId)
        .maybeSingle();
      if (error) throw error;
      setRecommendation(data as any);

      // Fetch industries and requirements for the degree program
      const programId = data?.degree_programs?.program_id || data?.program_id;
      if (programId) {
        const { data: industriesData } = await supabase
          .from("degree_industries")
          .select(`industries (industry_name)`)
          .eq("program_id", programId);
        if (industriesData) {
          setIndustries(
            industriesData
              .map((item: any) => item.industries)
              .filter(Boolean) as Industry[]
          );
        }

        const { data: requirementsData } = await supabase
          .from("subject_requirements")
          .select(`subjects (subject_name), requirement_detail`)
          .eq("program_id", programId);
        if (requirementsData) {
          setRequirements(requirementsData as any);
        }
      }
    } catch (error) {
      console.error("Error fetching recommendation details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-32" />
          </div>
          <Card className="glass">
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!recommendation) {
    return (
      <Layout>
        <div className="text-center space-y-6 animate-fade-in py-12">
          <div className="h-20 w-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Award className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Recommendation Not Found</h2>
            <p className="text-muted-foreground">
              The recommendation you're looking for doesn't exist or has been
              removed.
            </p>
          </div>
          <Link to="/student-dashboard">
            <Button variant="gradient">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const confidencePercent = Math.round(
    (recommendation.confidence_score || 0) * 100
  );
  const marketPercent = Math.round((recommendation.market_score || 0) * 100);

  // Prepare radar chart data
  const radarData = [
    {
      metric: "Peer Similarity",
      value: (recommendation.peer_score || 0) * 100,
      fullMark: 100,
    },
    {
      metric: "Market Score",
      value: (recommendation.market_score || 0) * 100,
      fullMark: 100,
    },
    {
      metric: "Interest Fit",
      value: (recommendation.semantic_score || 0) * 100,
      fullMark: 100,
    },
    {
      metric: "Subject Fit",
      value: (recommendation.subject_score || 0) * 100,
      fullMark: 100,
    },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {recommendation.program_id && (
            <Link to={`/compare?programs=${recommendation.program_id}`}>
              <Button variant="outline" size="sm">
                <GitCompare className="h-4 w-4" />
                Compare Program
              </Button>
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary-light flex items-center justify-center">
                        <Award className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl">
                          {recommendation.degree_programs?.program_name}
                        </CardTitle>
                        <CardDescription className="text-base mt-1">
                          {recommendation.degree_programs?.program_type}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {recommendation.degree_programs?.minimum_gpa && (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          Min GPA: {recommendation.degree_programs.minimum_gpa}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-muted-foreground">
                        Recommended on:{" "}
                        {new Date(recommendation.created_at).toLocaleString()}
                      </span>
                      <Button
                        variant={recommendation.liked ? "secondary" : "outline"}
                        size="icon"
                        className="ml-2"
                        onClick={handleToggleLike}
                        disabled={likeLoading}
                        aria-label={recommendation.liked ? "Unlike" : "Like"}
                      >
                        {recommendation.liked ? (
                          <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                        ) : (
                          <HeartOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      {recommendation.liked && (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Liked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Program Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {recommendation.degree_programs?.description ||
                    "No detailed description available for this program."}
                </p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Recommendation Details
                </CardTitle>
                <CardDescription>
                  Why this program was recommended for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">Confidence Score:</span>
                  <span>{confidencePercent}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium">Market Score:</span>
                  <span>{marketPercent}%</span>
                </div>
                {isGeneratingExplanation ? (
                  <div className="mt-4 p-6 bg-muted/50 rounded-lg">
                    <CyclingLoader
                      phrases={[
                        "Examining your interests and strengths…",
                        "Comparing program requirements with your profile…",
                        "Considering job market trends…",
                        "Generating a personalized explanation for you…",
                      ]}
                      intervalMs={1600}
                    />
                  </div>
                ) : recommendation.explanation ? (
                  <div className="mt-2">
                    <span className="font-medium">Explanation:</span>
                    <div className="prose prose-sm text-muted-foreground mt-1">
                      <ReactMarkdown>{recommendation.explanation}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateExplanation}
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Explanation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Career Paths
                </CardTitle>
                <CardDescription>
                  Industries where graduates typically work
                </CardDescription>
              </CardHeader>
              <CardContent>
                {industries.length > 0 ? (
                  <div className="space-y-2">
                    {industries.map((industry, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          {industry.industry_name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Industry information not available
                  </p>
                )}
              </CardContent>
            </Card>

            {requirements.length > 0 && (
              <>
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Entry Requirements
                    </CardTitle>
                    <CardDescription>
                      Subject requirements for admission to this program
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {requirements.map((req, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {req.subjects?.subject_name}
                            </span>
                          </div>
                          {req.requirement_detail && (
                            <span className="text-sm text-muted-foreground">
                              {req.requirement_detail}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Score Breakdown
                    </CardTitle>
                    <CardDescription>
                      Visual representation of recommendation metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis 
                          dataKey="metric" 
                          tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                        />
                        <PolarRadiusAxis 
                          angle={90} 
                          domain={[0, 100]}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        />
                        <Radar
                          name="Score"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium text-sm">
                                    {payload[0].payload.metric}
                                  </p>
                                  <p className="text-primary font-bold">
                                    {Math.round(payload[0].value as number)}%
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RecommendationDetails;
