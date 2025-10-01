import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, ArrowLeft, Sparkles, BookOpen, TrendingUp, CircleCheck as CheckCircle2, GitCompare, Briefcase, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DegreeProgram {
  program_id: string;
  program_name: string;
  program_type: string;
  description: string;
  minimum_gpa: number | null;
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

const DegreeDetails = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<DegreeProgram | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [requirements, setRequirements] = useState<SubjectRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (programId) {
      fetchProgramDetails();
    }
  }, [programId]);

  const fetchProgramDetails = async () => {
    try {
      const { data: programData } = await supabase
        .from('degree_programs')
        .select('*')
        .eq('program_id', programId)
        .maybeSingle();

      if (programData) {
        setProgram(programData);

        const { data: industriesData } = await supabase
          .from('degree_industries')
          .select(`
            industries (
              industry_name
            )
          `)
          .eq('program_id', programId);

        if (industriesData) {
          setIndustries(industriesData.map(item => item.industries).filter(Boolean) as Industry[]);
        }

        const { data: requirementsData } = await supabase
          .from('subject_requirements')
          .select(`
            subjects (
              subject_name
            ),
            requirement_detail
          `)
          .eq('program_id', programId);

        if (requirementsData) {
          setRequirements(requirementsData as any);
        }
      }
    } catch (error) {
      console.error('Error fetching program details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = () => {
    navigate(`/compare?programs=${programId}`);
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

  if (!program) {
    return (
      <Layout>
        <div className="text-center space-y-6 animate-fade-in py-12">
          <div className="h-20 w-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Program Not Found</h2>
            <p className="text-muted-foreground">
              The degree program you're looking for doesn't exist or has been removed.
            </p>
          </div>
          <Link to="/explore">
            <Button variant="gradient">
              <ArrowLeft className="h-4 w-4" />
              Back to Programs
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <Link to="/explore">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back to Programs
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleCompare}>
            <GitCompare className="h-4 w-4" />
            Compare Programs
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary-light flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl">{program.program_name}</CardTitle>
                        <CardDescription className="text-base mt-1">
                          {program.program_type}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {program.minimum_gpa && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Min GPA: {program.minimum_gpa}
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
                  {program.description || 'No detailed description available for this program.'}
                </p>
              </CardContent>
            </Card>

            {requirements.length > 0 && (
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
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="font-medium">{req.subjects?.subject_name}</span>
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
            )}
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
                      <div key={index} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-sm">{industry.industry_name}</span>
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

            <Card className="glass border-primary/20 bg-primary-light/20">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="gradient" className="w-full" onClick={handleCompare}>
                  <GitCompare className="h-4 w-4" />
                  Compare with Other Programs
                </Button>
                <Separator />
                <Link to="/explore" className="block">
                  <Button variant="outline" className="w-full">
                    <BookOpen className="h-4 w-4" />
                    Browse All Programs
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DegreeDetails;
