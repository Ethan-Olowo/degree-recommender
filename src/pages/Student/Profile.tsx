import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Layout from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, User, BookOpen, Target, Plus, X, CheckCircle, Globe, Wallet, Edit2, Check } from 'lucide-react';
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

interface SocioeconomicIndicators {
  user_id: string;
  country_code: string | null;
  income_level: string | null;
  gender: string | null;
  school_type: string | null;
  father_education: string | null;
  mother_education: string | null;
  funding_method: 'self' | 'parents' | 'credit' | null;
}

interface Country {
  country_code: string;
  country_name: string;
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
  const [socioeconomicData, setSocioeconomicData] = useState<SocioeconomicIndicators | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  
  // Form states
  const [newInterest, setNewInterest] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editingGradeValue, setEditingGradeValue] = useState('');

  // Calculate profile completion
  // Count filled socioeconomic fields
  const socioeconomicFilledCount = socioeconomicData ? [
    socioeconomicData.country_code,
    socioeconomicData.income_level,
    socioeconomicData.gender,
    socioeconomicData.school_type,
    socioeconomicData.father_education,
    socioeconomicData.mother_education,
    socioeconomicData.funding_method
  ].filter(field => field !== null && field !== '').length : 0;

  const totalItems = interests.length + subjectGrades.length + socioeconomicFilledCount;
  const isProfileComplete = totalItems >= 15;
  const completionPercentage = Math.min((totalItems / 15) * 100, 100);


  // Move fetchAllProfileData to top-level scope
  const fetchAllProfileData = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase.rpc('get_student_profile' as any, { p_user_id: user.id });
      if (error) throw error;
      if (!data) return;

      // If data is an array, get the first item
      const profile = Array.isArray(data) ? data[0] : data;

      setFullName(profile.user?.full_name || '');
      setAcademicData(profile.academic_data || null);
      setInterests(profile.personal_interests || []);
      setSubjectGrades(profile.subject_grades || []);
      setSocioeconomicData(profile.socioeconomic_indicators || {
        user_id: user.id,
        country_code: null,
        income_level: null,
        gender: null,
        school_type: null,
        father_education: 'Does not know',
        mother_education: 'Does not know',
        funding_method: 'self',
      });
      setCountries(profile.countries || []);
      setAvailableSubjects(profile.available_subjects || []);
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

  useEffect(() => {
    fetchAllProfileData();
  }, [user]);

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
    if (!newInterest.trim()) return;

    // Split by comma, trim, and filter out empty strings
    const interestsArray = newInterest
      .split(',')
      .map(i => i.trim())
      .filter(i => i.length > 0);

    if (interestsArray.length === 0) return;

    try {
      const interestRecords = interestsArray.map(interest => ({
        user_id: user?.id,
        interest,
      }));

      const { error } = await supabase
        .from('personal_interests')
        .insert(interestRecords);

      if (error) throw error;

      await fetchAllProfileData();
      setNewInterest('');
      toast({
        title: 'Success',
        description: interestsArray.length > 1 ? 'Interests added successfully' : 'Interest added successfully',
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

      await fetchAllProfileData();
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
    if (!selectedSubject || !newGrade.trim() || !academicData) return;

    try {
      const { error } = await supabase
        .from('subject_grades')
        .insert({
          academic_data_id: academicData.academic_data_id,
          subject_id: selectedSubject,
          grade: newGrade.trim(),
        });

      if (error) throw error;

      await fetchAllProfileData();
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

      await fetchAllProfileData();
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

  const handleUpdateSubjectGrade = async (subjectId: string) => {
    if (!academicData || !editingGradeValue.trim()) return;

    try {
      const { error } = await supabase
        .from('subject_grades')
        .update({ grade: editingGradeValue.trim() })
        .eq('academic_data_id', academicData.academic_data_id)
        .eq('subject_id', subjectId);

      if (error) throw error;

      await fetchAllProfileData();
      setEditingGradeId(null);
      setEditingGradeValue('');
      toast({
        title: 'Success',
        description: 'Grade updated successfully',
      });
    } catch (error) {
      console.error('Error updating grade:', error);
      toast({
        title: 'Error',
        description: 'Failed to update grade',
        variant: 'destructive',
      });
    }
  };

  const startEditingGrade = (subjectId: string, currentGrade: string) => {
    setEditingGradeId(subjectId);
    setEditingGradeValue(currentGrade);
  };

  const cancelEditingGrade = () => {
    setEditingGradeId(null);
    setEditingGradeValue('');
  };

  const handleSaveSocioeconomic = async () => {
    setIsSaving(true);
    try {
      if (!socioeconomicData) return;

      // Check if record exists
      const { data: existingData } = await supabase
        .from('socioeconomic_indicators')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('socioeconomic_indicators')
          .update({
            country_code: socioeconomicData.country_code,
            income_level: socioeconomicData.income_level,
            gender: socioeconomicData.gender,
            school_type: socioeconomicData.school_type,
            father_education: socioeconomicData.father_education,
            mother_education: socioeconomicData.mother_education,
            funding_method: socioeconomicData.funding_method as 'self' | 'parents' | 'credit' | null,
          })
          .eq('user_id', user?.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('socioeconomic_indicators')
          .insert({
            user_id: user!.id,
            country_code: socioeconomicData.country_code,
            income_level: socioeconomicData.income_level,
            gender: socioeconomicData.gender,
            school_type: socioeconomicData.school_type,
            father_education: socioeconomicData.father_education,
            mother_education: socioeconomicData.mother_education,
            funding_method: socioeconomicData.funding_method as 'self' | 'parents' | 'credit' | null,
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Socioeconomic data updated successfully',
      });
    } catch (error) {
      console.error('Error saving socioeconomic data:', error);
      toast({
        title: 'Error',
        description: 'Failed to save socioeconomic data',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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
          {completionPercentage < 100 && (
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
                  Add {15 - totalItems} more {totalItems === 14 ? 'item' : 'items'} (interests, grades, or socioeconomic data) to complete your profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{totalItems}/15 items</span>
                  </div>
                  <Progress value={completionPercentage} className="h-3" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span>{interests.length} Interests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span>{subjectGrades.length} Grades</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span>{socioeconomicFilledCount} Socioeconomic</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Tabs */}
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList
              className="flex flex-wrap w-full gap-2 justify-center items-center"
              style={{ minWidth: 0,  minHeight: 'fit-content' }}
            >
              <TabsTrigger value="basic" className="flex-1 min-w-[120px] max-w-full">Basic Info</TabsTrigger>
              <TabsTrigger value="socioeconomic" className="flex-1 min-w-[120px] max-w-full">Socioeconomic</TabsTrigger>
              <TabsTrigger value="interests" className="flex-1 min-w-[120px] max-w-full">Interests</TabsTrigger>
              <TabsTrigger value="grades" className="flex-1 min-w-[120px] max-w-full">Grades</TabsTrigger>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Socioeconomic Tab */}
            <TabsContent value="socioeconomic">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Socioeconomic Information</CardTitle>
                  <CardDescription>
                    Add your socioeconomic data to improve recommendation accuracy
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={socioeconomicData?.country_code || ''}
                        onValueChange={(value) => setSocioeconomicData(prev => ({
                          ...prev!,
                          country_code: value,
                        }))}
                      >
                        <SelectTrigger id="country">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.country_code} value={country.country_code}>
                              {country.country_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="income">Income Level</Label>
                      <Select
                        value={socioeconomicData?.income_level || ''}
                        onValueChange={(value) => setSocioeconomicData(prev => ({
                          ...prev!,
                          income_level: value,
                        }))}
                      >
                        <SelectTrigger id="income">
                          <SelectValue placeholder="Select income level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Income</SelectItem>
                          <SelectItem value="lower-middle">Lower Middle Income</SelectItem>
                          <SelectItem value="middle">Middle Income</SelectItem>
                          <SelectItem value="upper-middle">Upper Middle Income</SelectItem>
                          <SelectItem value="high">High Income</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={socioeconomicData?.gender || ''}
                        onValueChange={(value) => setSocioeconomicData(prev => ({
                          ...prev!,
                          gender: value,
                        }))}
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="socioSchoolType">School Type</Label>
                      <Select
                        value={socioeconomicData?.school_type || ''}
                        onValueChange={(value) => setSocioeconomicData(prev => ({
                          ...prev!,
                          school_type: value,
                        }))}
                      >
                        <SelectTrigger id="socioSchoolType">
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

                    <div className="space-y-2">
                      <Label htmlFor="fatherEducation">Father's Education</Label>
                      <Select
                        value={socioeconomicData?.father_education || ''}
                        onValueChange={(value) => setSocioeconomicData(prev => ({
                          ...prev!,
                          father_education: value,
                        }))}
                      >
                        <SelectTrigger id="fatherEducation">
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Does not know">Does not know</SelectItem>
                          <SelectItem value="does not apply">Does not apply</SelectItem>
                          <SelectItem value="incomplete primary school">Incomplete primary school</SelectItem>
                          <SelectItem value="primary school complete">Primary school complete</SelectItem>
                          <SelectItem value="incomplete secondary school">Incomplete secondary school</SelectItem>
                          <SelectItem value="complete secondary school">Complete secondary school</SelectItem>
                          <SelectItem value="Incomplete professional education">Incomplete professional education</SelectItem>
                          <SelectItem value="complete professional education">Complete professional education</SelectItem>
                          <SelectItem value="incomplete technical degree">Incomplete technical degree</SelectItem>
                          <SelectItem value="complete Technical degree">Complete technical degree</SelectItem>
                          <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="motherEducation">Mother's Education</Label>
                      <Select
                        value={socioeconomicData?.mother_education || ''}
                        onValueChange={(value) => setSocioeconomicData(prev => ({
                          ...prev!,
                          mother_education: value,
                        }))}
                      >
                        <SelectTrigger id="motherEducation">
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Does not know">Does not know</SelectItem>
                          <SelectItem value="does not apply">Does not apply</SelectItem>
                          <SelectItem value="incomplete primary school">Incomplete primary school</SelectItem>
                          <SelectItem value="primary school complete">Primary school complete</SelectItem>
                          <SelectItem value="incomplete secondary school">Incomplete secondary school</SelectItem>
                          <SelectItem value="complete secondary school">Complete secondary school</SelectItem>
                          <SelectItem value="Incomplete professional education">Incomplete professional education</SelectItem>
                          <SelectItem value="complete professional education">Complete professional education</SelectItem>
                          <SelectItem value="incomplete technical degree">Incomplete technical degree</SelectItem>
                          <SelectItem value="complete Technical degree">Complete technical degree</SelectItem>
                          <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fundingMethod">Funding Method</Label>
                      <Select
                        value={socioeconomicData?.funding_method || ''}
                        onValueChange={(value) => setSocioeconomicData(prev => ({
                          ...prev!,
                          funding_method: value as 'self' | 'parents' | 'credit',
                        }))}
                      >
                        <SelectTrigger id="fundingMethod">
                          <SelectValue placeholder="Select funding method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self">Self</SelectItem>
                          <SelectItem value="parents">Parents</SelectItem>
                          <SelectItem value="credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveSocioeconomic}
                    disabled={isSaving}
                    className="w-full"
                    variant="gradient"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Socioeconomic Information
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
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter an interest (e.g., Technology, Arts, Science)"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                  />
                  <Button
                    onClick={handleAddInterest}
                    disabled={!newInterest.trim()}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

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

                  {academicData && (
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
                        disabled={!selectedSubject || !newGrade.trim()}
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
                          {editingGradeId === grade.subject_id ? (
                            <>
                              <Input
                                value={editingGradeValue}
                                onChange={(e) => setEditingGradeValue(e.target.value)}
                                className="w-24 h-8"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateSubjectGrade(grade.subject_id);
                                  } else if (e.key === 'Escape') {
                                    cancelEditingGrade();
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateSubjectGrade(grade.subject_id)}
                                className="text-success hover:text-success/80"
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEditingGrade}
                                className="text-muted-foreground hover:text-foreground"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Badge variant="secondary">{grade.grade}</Badge>
                              <button
                                onClick={() => startEditingGrade(grade.subject_id, grade.grade || '')}
                                className="text-muted-foreground hover:text-primary"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveSubjectGrade(grade.subject_id)}
                                className="text-muted-foreground hover:text-destructive"
                                title="Delete"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
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