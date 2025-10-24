import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, X, Save } from 'lucide-react';

type DegreeProgram = Tables<'degree_programs'>;
type Industry = Tables<'industries'>;
type Subject = Tables<'subjects'>;


const CATEGORY_OPTIONS = [
  "AGRICULTURE & ENVIRONMENTAL SCIENCES",
  "ARTS & DESIGN",
  "BUSINESS & MANAGEMENT",
  "CORE ENGINEERING",
  "ELECTRICAL & ELECTRONICS ENGINEERING",
  "HEALTH & CLINICAL SCIENCES",
  "NATURAL & BASIC SCIENCES",
  "OTHER / SPECIALIZED PROGRAMS",
  "SOCIAL SCIENCES & HUMANITIES",
  "SPECIALIZED ENGINEERING",
];

const formSchema = z.object({
  program_name: z.string().min(1, 'Program name is required'),
  program_type: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  minimum_gpa: z.coerce
    .number()
    .min(0, 'GPA must be at least 0')
    .max(5, 'GPA must be at most 5')
    .optional()
    .nullable()
    .transform((val) => (val === 0 ? null : val)),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const EditDegree = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [degree, setDegree] = useState<DegreeProgram | null>(null);
  
  // Industries
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedIndustryToAdd, setSelectedIndustryToAdd] = useState<string>('');
  
  // Subject Requirements
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [subjectRequirements, setSubjectRequirements] = useState<{ subject_id: string; requirement_detail: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [requirementDetail, setRequirementDetail] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      program_name: '',
      program_type: '',
      category: '',
      minimum_gpa: null,
      description: '',
    },
  });

  useEffect(() => {
    fetchAllData();
    if (programId && programId !== 'new') {
      fetchDegreeData();
    }
  }, [programId]);

  const fetchAllData = async () => {
    try {
      const [industriesRes, subjectsRes] = await Promise.all([
        supabase.from('industries').select('*').order('industry_name'),
        supabase.from('subjects').select('*').order('subject_name'),
      ]);

      if (industriesRes.error) throw industriesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      setAllIndustries(industriesRes.data || []);
      setAllSubjects(subjectsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    }
  };

  const fetchDegreeData = async () => {
    if (!programId) return;

    try {
      setIsLoading(true);
      
      const [degreeRes, industriesRes, requirementsRes] = await Promise.all([
        supabase.from('degree_programs').select('*').eq('program_id', programId).single(),
        supabase.from('degree_industries').select('industry_id').eq('program_id', programId),
        supabase.from('subject_requirements').select('subject_id, requirement_detail').eq('program_id', programId),
      ]);

      if (degreeRes.error) throw degreeRes.error;

      setDegree(degreeRes.data);
      form.reset({
        program_name: degreeRes.data.program_name,
        program_type: degreeRes.data.program_type || '',
        category: degreeRes.data.category || '',
        minimum_gpa: degreeRes.data.minimum_gpa,
        description: degreeRes.data.description || '',
      });

      if (industriesRes.data) {
        setSelectedIndustries(industriesRes.data.map(i => i.industry_id));
      }

      if (requirementsRes.data) {
        setSubjectRequirements(requirementsRes.data);
      }
    } catch (error) {
      console.error('Error fetching degree:', error);
      toast({
        title: 'Error',
        description: 'Failed to load degree program',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);

      let currentProgramId = programId;

      if (programId === 'new') {
        // Create new degree
        const insertData: TablesInsert<'degree_programs'> = {
          program_name: data.program_name,
          program_type: data.program_type || null,
          category: data.category,
          minimum_gpa: data.minimum_gpa,
          description: data.description || null,
        };

        const { data: newDegree, error } = await supabase
          .from('degree_programs')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        currentProgramId = newDegree.program_id;

        toast({
          title: 'Success',
          description: 'Degree program created successfully',
        });
      } else {
        // Update existing degree
        const updateData: Partial<DegreeProgram> = {
          program_name: data.program_name,
          program_type: data.program_type || null,
          category: data.category,
          minimum_gpa: data.minimum_gpa,
          description: data.description || null,
        };

        const { error } = await supabase
          .from('degree_programs')
          .update(updateData)
          .eq('program_id', programId);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Degree program updated successfully',
        });
      }

      // Update industries
      if (currentProgramId) {
        await supabase.from('degree_industries').delete().eq('program_id', currentProgramId);
        
        if (selectedIndustries.length > 0) {
          const industriesToInsert = selectedIndustries.map(industryId => ({
            program_id: currentProgramId!,
            industry_id: industryId,
          }));
          
          await supabase.from('degree_industries').insert(industriesToInsert);
        }

        // Update subject requirements
        await supabase.from('subject_requirements').delete().eq('program_id', currentProgramId);
        
        if (subjectRequirements.length > 0) {
          const requirementsToInsert = subjectRequirements.map(req => ({
            program_id: currentProgramId!,
            subject_id: req.subject_id,
            requirement_detail: req.requirement_detail || null,
          }));
          
          await supabase.from('subject_requirements').insert(requirementsToInsert);
        }
      }

      navigate('/admin/degrees');
    } catch (error) {
      console.error('Error saving degree:', error);
      toast({
        title: 'Error',
        description: `Failed to ${programId === 'new' ? 'create' : 'update'} degree program`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIndustry = () => {
    if (selectedIndustryToAdd && !selectedIndustries.includes(selectedIndustryToAdd)) {
      setSelectedIndustries([...selectedIndustries, selectedIndustryToAdd]);
      setSelectedIndustryToAdd('');
    }
  };

  const handleRemoveIndustry = (industryId: string) => {
    setSelectedIndustries(selectedIndustries.filter(id => id !== industryId));
  };

  const handleAddRequirement = () => {
    if (selectedSubject && !subjectRequirements.some(r => r.subject_id === selectedSubject)) {
      setSubjectRequirements([
        ...subjectRequirements,
        { subject_id: selectedSubject, requirement_detail: requirementDetail },
      ]);
      setSelectedSubject('');
      setRequirementDetail('');
    }
  };

  const handleRemoveRequirement = (subjectId: string) => {
    setSubjectRequirements(subjectRequirements.filter(r => r.subject_id !== subjectId));
  };

  const getIndustryName = (industryId: string) => {
    return allIndustries.find(i => i.industry_id === industryId)?.industry_name || 'Unknown';
  };

  const getSubjectName = (subjectId: string) => {
    return allSubjects.find(s => s.subject_id === subjectId)?.subject_name || 'Unknown';
  };

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="space-y-6 animate-fade-in max-w-4xl w-full">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/degrees')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-4xl font-bold">
                  {programId === 'new' ? 'Create' : 'Edit'} <span className="gradient-text">Degree Program</span>
                </h1>
                <p className="text-lg text-muted-foreground">
                  {programId === 'new' ? 'Add a new degree program' : 'Update degree program details'}
                </p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information Card */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Enter the basic details of the degree program
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="program_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Bachelor of Computer Science" {...field} />
                        </FormControl>
                        <FormDescription>The official name of the degree program</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="program_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program Type</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Bachelor's, Master's, PhD"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>The level or type of degree</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          The main category for this degree program
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minimum_gpa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum GPA</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="5"
                            placeholder="e.g., 3.0"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum GPA requirement for admission (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter a detailed description of the degree program..."
                            className="min-h-[100px]"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          A brief overview of what this degree program offers
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Industries Card */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Related Industries</CardTitle>
                  <CardDescription>
                    Select industries that are relevant to this degree program
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={selectedIndustryToAdd} onValueChange={setSelectedIndustryToAdd}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select an industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {allIndustries
                          .filter(industry => !selectedIndustries.includes(industry.industry_id))
                          .map(industry => (
                            <SelectItem key={industry.industry_id} value={industry.industry_id}>
                              {industry.industry_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={handleAddIndustry} disabled={!selectedIndustryToAdd}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedIndustries.map(industryId => (
                      <Badge key={industryId} variant="secondary" className="gap-1">
                        {getIndustryName(industryId)}
                        <button
                          type="button"
                          onClick={() => handleRemoveIndustry(industryId)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {selectedIndustries.length === 0 && (
                      <p className="text-sm text-muted-foreground">No industries selected</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Subject Requirements Card */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Subject Requirements</CardTitle>
                  <CardDescription>
                    Define subject requirements for this degree program
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {allSubjects
                          .filter(subject => !subjectRequirements.some(r => r.subject_id === subject.subject_id))
                          .map(subject => (
                            <SelectItem key={subject.subject_id} value={subject.subject_id}>
                              {subject.subject_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Requirement details (optional)"
                      value={requirementDetail}
                      onChange={(e) => setRequirementDetail(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAddRequirement} disabled={!selectedSubject}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {subjectRequirements.map(req => (
                      <div key={req.subject_id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{getSubjectName(req.subject_id)}</p>
                          {req.requirement_detail && (
                            <p className="text-sm text-muted-foreground">{req.requirement_detail}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRequirement(req.subject_id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {subjectRequirements.length === 0 && (
                      <p className="text-sm text-muted-foreground">No subject requirements added</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/degrees')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isLoading ? 'Saving...' : 'Save Degree Program'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default EditDegree;
