import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, User, BookOpen, Target, Plus, X, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AcademicData {
  academic_data_id: string;
  gpa: number | null;
  grade_system: string | null;
  school_type: string | null;
}

interface PersonalInterest {
  interest: string;
  user_id: string;
}

interface SubjectGrade {
  academic_data_id: string;
  subject_id: string;
  grade: string | null;
  subjects?: {
    subject_name: string;
  };
}

interface Subject {
  subject_id: string;
  subject_name: string;
}

const Profile = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile data
  const [fullName, setFullName] = useState('');
  const [academicData, setAcademicData] = useState<AcademicData | null>(null);
  const [interests, setInterests] = useState<PersonalInterest[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  
  // Form states
  const [newInterest, setNewInterest] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');

  // Calculate profile completion
  const totalItems = interests.length + subjectGrades.length;
  const isProfileComplete = totalItems === 10;
  const completionPercentage = Math.min((totalItems / 10) * 100, 100);

  useEffect(() => {
    fetchProfileData();
    fetchAvailableSubjects();
  }, [user]);

  const fetchProfileData = async () => {
    try {
      if (!user) return;

      // Fetch user data
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (userData) {
        setFullName(userData.full_name || '');
      }

      // Fetch academic data
      const { data: academicData } = await supabase
        .from('academic_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setAcademicData(academicData);

      // Fetch interests
      const { data: interestsData } = await supabase
        .from('personal_interests')
        .select('*')
        .eq('user_id', user.id);

      setInterests(interestsData || []);

      // Fetch subject grades if academic data exists
      if (academicData) {
        const { data: gradesData } = await supabase
          .from('subject_grades')
          .select(`
            *,
            subjects (
              subject_name
            )
          `)
          .eq('academic_data_id', academicData.academic_data_id);

        setSubjectGrades(gradesData || []);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSubjects = async () => {
    try {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .order('subject_name');

      setAvailableSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleSaveBasicInfo = async () => {
    setIsSaving(true);
    try {
      // Update user name
      const { error: userError } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('user_id', user?.id);

      if (userError) throw userError;

      // Update or create academic data
      if (academicData) {
        const { error } = await supabase
          .from('academic_data')
          .update({
            gpa: academicData.gpa,
            grade_system: academicData.grade_system,
            school_type: academicData.school_type,
          })
          .eq('academic_data_id', academicData.academic_data_id);

        if (error) throw error;
      } else if (academicData?.gpa || academicData?.grade_system || academicData?.school_type) {
        const { data, error } = await supabase
          .from('academic_data')
          .insert({
            user_id: user?.id,
            gpa: academicData?.gpa,
            grade_system: academicData?.grade_system,
            school_type: academicData?.school_type,
          })
          .select()
          .single();

        if (error) throw error;
        setAcademicData(data);
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddInterest = async () => {
    if (!newInterest.trim() || totalItems >= 10) return;

    try {
      const { error } = await supabase
        .from('personal_interests')
        .insert({
          user_id: user?.id,
          interest: newInterest.trim(),
        });

      if (error) throw error;

      await fetchProfileData();
      setNewInterest('');
      toast({
        title: 'Success',
        description: 'Interest added successfully',
      });
    } catch (error) {
      console.error('Error adding interest:', error);
      toast({
        title: 'Error',
        description: 'Failed to add interest',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveInterest = async (interest: string) => {
    try {
      const { error } = await supabase
        .from('personal_interests')
        .delete()
        .eq('user_id', user?.id)
        .eq('interest', interest);

      if (error) throw error;

      await fetchProfileData();
      toast({
        title: 'Success',
        description: 'Interest removed successfully',
      });
    } catch (error) {
      console.error('Error removing interest:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove interest',
        variant: 'destructive',
      });
    }
  };

  const handleAddSubjectGrade = async () => {
    if (!selectedSubject || !newGrade.trim() || totalItems >= 10 || !academicData) return;

    try {
      const { error } = await supabase
        .from('subject_grades')
        .insert({
          academic_data_id: academicData.academic_data_id,
          subject_id: selectedSubject,
          grade: newGrade.trim(),
        });

      if (error) throw error;

      await fetchProfileData();
      setSelectedSubject('');
      setNewGrade('');
      toast({
        title: 'Success',
        description: 'Grade added successfully',
      });
    } catch (error) {
      console.error('Error adding grade:', error);
      toast({
        title: 'Error',
        description: 'Failed to add grade',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveSubjectGrade = async (subjectId: string) => {
    if (!academicData) return;

    try {
      const { error } = await supabase
        .from('subject_grades')
        .delete()
        .eq('academic_data_id', academicData.academic_data_id)
        .eq('subject_id', subjectId);

      if (error) throw error;

      await fetchProfileData();
      toast({
        title: 'Success',
        description: 'Grade removed successfully',
      });
    } catch (error) {
      console.error('Error removing grade:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove grade',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">
              Your <span className="gradient-text">Profile</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your profile information and track your completion progress
            </p>
          </div>

          {/* Profile Completion Status */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Profile Completion</span>
                {isProfileComplete && (
                  <Badge className="bg-success text-success-foreground">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Complete
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Add {10 - totalItems} more {totalItems === 9 ? 'item' : 'items'} (interests or grades) to complete your profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{totalItems}/10 items</span>
                </div>
                <Progress value={completionPercentage} className="h-3" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span>{interests.length} Interests</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>{subjectGrades.length} Subject Grades</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Tabs */}
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="interests">Interests</TabsTrigger>
              <TabsTrigger value="grades">Grades</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Update your personal and academic information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gpa">GPA</Label>
                      <Input
                        id="gpa"
                        type="number"
                        step="0.01"
                        min="0"
                        max="4"
                        value={academicData?.gpa || ''}
                        onChange={(e) => setAcademicData(prev => ({
                          ...prev!,
                          academic_data_id: prev?.academic_data_id || '',
                          gpa: parseFloat(e.target.value) || null,
                        }))}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gradeSystem">Grade System</Label>
                      <Select
                        value={academicData?.grade_system || ''}
                        onValueChange={(value) => setAcademicData(prev => ({
                          ...prev!,
                          academic_data_id: prev?.academic_data_id || '',
                          grade_system: value,
                        }))}
                      >
                        <SelectTrigger id="gradeSystem">
                          <SelectValue placeholder="Select grade system" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4.0">4.0 Scale</SelectItem>
                          <SelectItem value="5.0">5.0 Scale</SelectItem>
                          <SelectItem value="10.0">10.0 Scale</SelectItem>
                          <SelectItem value="100">Percentage</SelectItem>
                          <SelectItem value="letter">Letter Grades</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolType">School Type</Label>
                      <Select
                        value={academicData?.school_type || ''}
                        onValueChange={(value) => setAcademicData(prev => ({
                          ...prev!,
                          academic_data_id: prev?.academic_data_id || '',
                          school_type: value,
                        }))}
                      >
                        <SelectTrigger id="schoolType">
                          <SelectValue placeholder="Select school type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public School</SelectItem>
                          <SelectItem value="private">Private School</SelectItem>
                          <SelectItem value="international">International School</SelectItem>
                          <SelectItem value="homeschool">Homeschool</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveBasicInfo}
                    disabled={isSaving}
                    className="w-full"
                    variant="gradient"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Basic Information
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Interests Tab */}
            <TabsContent value="interests">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Personal Interests</CardTitle>
                  <CardDescription>
                    Add your interests to help us recommend suitable degrees
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {totalItems < 10 && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter an interest (e.g., Technology, Arts, Science)"
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                      />
                      <Button
                        onClick={handleAddInterest}
                        disabled={!newInterest.trim() || totalItems >= 10}
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest) => (
                      <Badge
                        key={interest.interest}
                        variant="secondary"
                        className="px-3 py-1.5 text-sm"
                      >
                        {interest.interest}
                        <button
                          onClick={() => handleRemoveInterest(interest.interest)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {interests.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No interests added yet. Add your interests to get better recommendations.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Grades Tab */}
            <TabsContent value="grades">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Subject Grades</CardTitle>
                  <CardDescription>
                    Add your subject grades to improve recommendation accuracy
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!academicData && (
                    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                      <p className="text-sm text-warning">
                        Please save your basic information first to add subject grades.
                      </p>
                    </div>
                  )}

                  {academicData && totalItems < 10 && (
                    <div className="flex gap-2">
                      <Select
                        value={selectedSubject}
                        onValueChange={setSelectedSubject}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubjects
                            .filter(s => !subjectGrades.find(g => g.subject_id === s.subject_id))
                            .map((subject) => (
                              <SelectItem key={subject.subject_id} value={subject.subject_id}>
                                {subject.subject_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Grade"
                        value={newGrade}
                        onChange={(e) => setNewGrade(e.target.value)}
                        className="w-32"
                      />
                      <Button
                        onClick={handleAddSubjectGrade}
                        disabled={!selectedSubject || !newGrade.trim() || totalItems >= 10}
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {subjectGrades.map((grade) => (
                      <div
                        key={grade.subject_id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span className="font-medium">{grade.subjects?.subject_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{grade.grade}</Badge>
                          <button
                            onClick={() => handleRemoveSubjectGrade(grade.subject_id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {subjectGrades.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No grades added yet. Add your subject grades for more accurate recommendations.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default Profile;