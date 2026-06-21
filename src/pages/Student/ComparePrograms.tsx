import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Sparkles, BookOpen, Target, Briefcase, X, Plus, ArrowRight, CircleCheck as CheckCircle2, CircleMinus as MinusCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DegreeProgram {
  program_id: string;
  program_name: string;
  program_type: string;
  description: string;
  minimum_gpa: number | null;
}

interface ProgramWithDetails extends DegreeProgram {
  industries: string[];
  requirements: {
    subject_name: string;
    requirement_detail: string | null;
  }[];
}

const ComparePrograms = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [allPrograms, setAllPrograms] = useState<DegreeProgram[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<ProgramWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllPrograms();
  }, []);

  useEffect(() => {
    const programIds = searchParams.get('programs')?.split(',').filter(Boolean) || [];
    if (programIds.length > 0 && allPrograms.length > 0) {
      loadSelectedPrograms(programIds);
    }
  }, [searchParams, allPrograms]);

  const fetchAllPrograms = async () => {
    try {
      const { data } = await supabase
        .from('degree_programs')
        .select('*')
        .order('program_name');

      if (data) {
        setAllPrograms(data);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSelectedPrograms = async (programIds: string[]) => {
    const programs: ProgramWithDetails[] = [];

    for (const id of programIds.slice(0, 3)) {
      const program = allPrograms.find(p => p.program_id === id);
      if (!program) continue;

      const { data: industriesData } = await supabase
        .from('degree_industries')
        .select(`
          industries (
            industry_name
          )
        `)
        .eq('program_id', id);

      const { data: requirementsData } = await supabase
        .from('subject_requirements')
        .select(`
          subjects (
            subject_name
          ),
          requirement_detail
        `)
        .eq('program_id', id);

      programs.push({
        ...program,
        industries: industriesData?.map(item => item.industries?.industry_name).filter(Boolean) as string[] || [],
        requirements: requirementsData?.map(req => ({
          subject_name: req.subjects?.subject_name || '',
          requirement_detail: req.requirement_detail
        })) || []
      });
    }

    setSelectedPrograms(programs);
  };

  const addProgram = async (programId: string) => {
    if (selectedPrograms.length >= 3) return;
    if (selectedPrograms.some(p => p.program_id === programId)) return;

    const program = allPrograms.find(p => p.program_id === programId);
    if (!program) return;

    const { data: industriesData } = await supabase
      .from('degree_industries')
      .select(`
        industries (
          industry_name
        )
      `)
      .eq('program_id', programId);

    const { data: requirementsData } = await supabase
      .from('subject_requirements')
      .select(`
        subjects (
          subject_name
        ),
        requirement_detail
      `)
      .eq('program_id', programId);

    const newProgram: ProgramWithDetails = {
      ...program,
      industries: industriesData?.map(item => item.industries?.industry_name).filter(Boolean) as string[] || [],
      requirements: requirementsData?.map(req => ({
        subject_name: req.subjects?.subject_name || '',
        requirement_detail: req.requirement_detail
      })) || []
    };

    setSelectedPrograms([...selectedPrograms, newProgram]);
  };

  const removeProgram = (programId: string) => {
    setSelectedPrograms(selectedPrograms.filter(p => p.program_id !== programId));
  };

  const availablePrograms = allPrograms.filter(
    p => !selectedPrograms.some(sp => sp.program_id === p.program_id)
  );

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">
            Compare <span className="gradient-text">Degree Programs</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select up to 3 programs to compare side-by-side
          </p>
        </div>

        {selectedPrograms.length < 3 && (
          <Card className="glass">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1">
                  <Select onValueChange={addProgram}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a program to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrograms.map((program) => (
                        <SelectItem key={program.program_id} value={program.program_id}>
                          {program.program_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedPrograms.length}/3 programs selected
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedPrograms.length === 0 ? (
          <Card className="glass">
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="h-20 w-20 mx-auto rounded-full bg-primary-light flex items-center justify-center">
                  <GraduationCap className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">No Programs Selected</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Add degree programs using the selector above to start comparing them side-by-side.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {selectedPrograms.map((program, index) => (
              <Card key={program.program_id} className="glass animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{program.program_name}</CardTitle>
                      </div>
                      <CardDescription>{program.program_type}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeProgram(program.program_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap pt-2">
                    {program.minimum_gpa && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        GPA: {program.minimum_gpa}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Overview</h4>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {program.description || 'No description available'}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Career Paths</h4>
                    </div>
                    {program.industries.length > 0 ? (
                      <div className="space-y-2">
                        {program.industries.slice(0, 4).map((industry, idx) => (
                          <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                            {industry}
                          </div>
                        ))}
                        {program.industries.length > 4 && (
                          <p className="text-xs text-muted-foreground">
                            +{program.industries.length - 4} more
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not available</p>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Requirements</h4>
                    </div>
                    {program.requirements.length > 0 ? (
                      <div className="space-y-2">
                        {program.requirements.slice(0, 3).map((req, idx) => (
                          <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 className="h-3 w-3 text-primary mt-0.5" />
                            <div className="flex-1">
                              <span>{req.subject_name}</span>
                              {req.requirement_detail && (
                                <span className="text-xs ml-1">({req.requirement_detail})</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {program.requirements.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{program.requirements.length - 3} more
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not available</p>
                    )}
                  </div>

                  <Separator />

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/degree/${program.program_id}`)}
                  >
                    View Full Details
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {selectedPrograms.length < 3 && (
              <Card className="glass border-dashed flex items-center justify-center min-h-[500px]">
                <CardContent className="text-center space-y-4">
                  <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add another program to compare
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ComparePrograms;
