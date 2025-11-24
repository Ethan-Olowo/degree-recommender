import { useState, useEffect } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, User, BookOpen, Target, Globe, Check } from 'lucide-react';
import { z } from 'zod';

const profileSchema = z.object({
  // Academic Data
  gpa: z.number().min(0).max(4).optional(),
  gradeSystem: z.string().optional(),
  schoolType: z.string().optional(),
  
  // Socioeconomic
  gender: z.string().optional(),
  incomeLevel: z.string().optional(),
  countryCode: z.string().optional(),
  fatherEducation: z.string().optional(),
  motherEducation: z.string().optional(),
  fundingMethod: z.string().optional(),
  
  // Interests
  interests: z.array(z.string()).optional(),
});

const ProfileCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  

  const [formData, setFormData] = useState({
    // Academic
    gpa: '',
    gradeSystem: 'gpa',
    schoolType: 'public',

    // Socioeconomic
    gender: '',
    incomeLevel: '',
    countryCode: '', // will store country code
    fatherEducation: 'Does not know',
    motherEducation: 'Does not know',
    fundingMethod: 'self',

    // Interests
    interests: [] as string[],
    interestInput: '',

    // Subject Grades
    subjectGrades: [] as { subject_id: string; subject_name: string; grade: string }[],
    selectedSubject: '',
    newGrade: ''
  });

  // Subjects state (simulate fetch, replace with DB fetch if needed)
  const [availableSubjects, setAvailableSubjects] = useState<{ subject_id: string; subject_name: string }[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Fetch subjects from DB on mount (simulate, replace with supabase if needed)
  useEffect(() => {
    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      // Example: const { data, error } = await supabase.from('subjects').select('subject_id, subject_name');
      // For now, use static subjects
      setAvailableSubjects([
        { subject_id: 'math', subject_name: 'Mathematics' },
        { subject_id: 'eng', subject_name: 'English' },
        { subject_id: 'sci', subject_name: 'Science' },
        { subject_id: 'hist', subject_name: 'History' },
        { subject_id: 'art', subject_name: 'Art' }
      ]);
      setSubjectsLoading(false);
    };
    fetchSubjects();
  }, []);

  // Countries state
  const [countries, setCountries] = useState<{ country_code: string; country_name: string }[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  // Fetch countries from DB on mount
  useEffect(() => {
    const fetchCountries = async () => {
      setCountriesLoading(true);
      const { data, error } = await supabase.from('countries').select('country_code, country_name');
      if (!error && Array.isArray(data)) {
        setCountries(
          (data as any[]).filter(
            (c) => typeof c.country_code === 'string' && typeof c.country_name === 'string'
          )
        );
      } else {
        setCountries([]);
      }
      setCountriesLoading(false);
    };
    fetchCountries();
  }, []);

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddInterest = () => {
    if (!formData.interestInput.trim() || formData.interests.length >= 10) return;

    // Split by comma, trim, and filter out empty strings
    const newInterests = formData.interestInput
      .split(',')
      .map(i => i.trim())
      .filter(i => i.length > 0);

    // Only add up to 10 interests total
    const availableSlots = 10 - formData.interests.length;
    const interestsToAdd = newInterests.slice(0, availableSlots);

    setFormData({
      ...formData,
      interests: [...formData.interests, ...interestsToAdd],
      interestInput: ''
    });
  };

  const handleRemoveInterest = (index: number) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      // Get user_id
      const userData = { user_id: user?.id };
      if (!userData) {
        throw new Error('User not found');
      }

      // Create academic data
      const { data: academicData } = await supabase
        .from('academic_data')
        .insert({
          user_id: userData.user_id,
          gpa: formData.gpa ? parseFloat(formData.gpa) : null,
          grade_system: formData.gradeSystem || null,
          school_type: formData.schoolType || null
        })
        .select()
        .single();

      // Create subject grades
      if (formData.subjectGrades.length > 0 && academicData?.academic_data_id) {
        const subjectGradeRecords = formData.subjectGrades.map(sg => ({
          academic_data_id: academicData.academic_data_id,
          subject_id: sg.subject_id,
          grade: sg.grade
        }));
        await supabase
          .from('subject_grades')
          .insert(subjectGradeRecords);
      }

      // Create socioeconomic indicators
      if (formData.gender || formData.incomeLevel || formData.countryCode || formData.fatherEducation || formData.motherEducation || formData.fundingMethod) {
        await supabase
          .from('socioeconomic_indicators')
          .insert({
            user_id: userData.user_id,
            gender: formData.gender || null,
            income_level: formData.incomeLevel || null,
            country_code: formData.countryCode || null,
            school_type: formData.schoolType || null,
            father_education: formData.fatherEducation || 'Does not know',
            mother_education: formData.motherEducation || 'Does not know',
            funding_method: (formData.fundingMethod || 'self') as 'self' | 'parents' | 'credit'
          });
      }

      // Create personal interests
      if (formData.interests.length > 0) {
        const interestRecords = formData.interests.map(interest => ({
          user_id: userData.user_id,
          interest
        }));
        await supabase
          .from('personal_interests')
          .insert(interestRecords);
      }

      toast({
        title: "Profile Created!",
        description: "Your profile has been successfully created. Generating recommendations...",
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Academic', icon: BookOpen },
    { number: 2, title: 'Personal', icon: User },
    { number: 3, title: 'Interests', icon: Target },
    { number: 4, title: 'Review', icon: Check }
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">
              Create Your <span className="gradient-text">Student Profile</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Help us understand your academic background and interests
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-4">
            <div className="flex justify-between">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`flex flex-col items-center gap-2 ${
                    step.number <= currentStep ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                      step.number <= currentStep
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground'
                    }`}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Form Steps */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>{steps[currentStep - 1].title} Information</CardTitle>
              <CardDescription>
                {currentStep === 1 && "Tell us about your academic performance"}
                {currentStep === 2 && "Provide some personal information"}
                {currentStep === 3 && "What are your interests and career goals?"}
                {currentStep === 4 && "Review your information before submitting"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Academic */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gpa">GPA (Optional)</Label>
                    <Input
                      id="gpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      placeholder="3.5"
                      value={formData.gpa}
                      onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gradeSystem">Grade System</Label>
                    <Select
                      value={formData.gradeSystem}
                      onValueChange={(value) => setFormData({ ...formData, gradeSystem: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpa">GPA (4.0 scale)</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="letter">Letter Grade</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="schoolType">School Type</Label>
                    <Select
                      value={formData.schoolType}
                      onValueChange={(value) => setFormData({ ...formData, schoolType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
              )}

              {/* Step 2: Personal */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender (Optional)</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="incomeLevel">Household Income Level (Optional)</Label>
                    <Select
                      value={formData.incomeLevel}
                      onValueChange={(value) => setFormData({ ...formData, incomeLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select income level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Income</SelectItem>
                        <SelectItem value="middle">Middle Income</SelectItem>
                        <SelectItem value="high">High Income</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country (Optional)</Label>
                    <Select
                      value={formData.countryCode}
                      onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                      disabled={countriesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.country_code} value={country.country_code}>
                            {country.country_name} ({country.country_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fatherEducation">Father's Education (Optional)</Label>
                    <Select
                      value={formData.fatherEducation}
                      onValueChange={(value) => setFormData({ ...formData, fatherEducation: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label htmlFor="motherEducation">Mother's Education (Optional)</Label>
                    <Select
                      value={formData.motherEducation}
                      onValueChange={(value) => setFormData({ ...formData, motherEducation: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label htmlFor="fundingMethod">Funding Method (Optional)</Label>
                    <Select
                      value={formData.fundingMethod}
                      onValueChange={(value) => setFormData({ ...formData, fundingMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Self</SelectItem>
                        <SelectItem value="parents">Parents</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 3: Interests */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="interests">Personal Interests (Add up to 10)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="interests"
                        placeholder="Enter an interest (e.g., Technology, Arts)"
                        value={formData.interestInput}
                        onChange={(e) => setFormData({ ...formData, interestInput: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                      />
                      <Button
                        type="button"
                        onClick={handleAddInterest}
                        disabled={!formData.interestInput.trim() || formData.interests.length >= 10}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  {formData.interests.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.interests.map((interest, index) => (
                        <div
                          key={index}
                          className="px-3 py-1 bg-primary-light text-primary rounded-full text-sm flex items-center gap-2"
                        >
                          {interest}
                          <button
                            onClick={() => handleRemoveInterest(index)}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review & Subject Grades */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Academic Information</h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      {formData.gpa && <p>GPA: {formData.gpa}</p>}
                      <p>Grade System: {formData.gradeSystem}</p>
                      <p>School Type: {formData.schoolType}</p>
                    </div>
                  </div>

                  {/* Subject Grades Section */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">Subject Grades</h3>
                    <div className="flex gap-2 items-center">
                      <Select
                        value={formData.selectedSubject}
                        onValueChange={(value) => setFormData(f => ({ ...f, selectedSubject: value }))}
                        disabled={subjectsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={subjectsLoading ? "Loading subjects..." : "Select subject"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubjects.map(subject => (
                            <SelectItem key={subject.subject_id} value={subject.subject_id}>
                              {subject.subject_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Grade"
                        value={formData.newGrade}
                        onChange={e => setFormData(f => ({ ...f, newGrade: e.target.value }))}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (
                            formData.selectedSubject &&
                            formData.newGrade.trim() &&
                            !formData.subjectGrades.some(sg => sg.subject_id === formData.selectedSubject)
                          ) {
                            const subjectObj = availableSubjects.find(s => s.subject_id === formData.selectedSubject);
                            if (subjectObj) {
                              setFormData(f => ({
                                ...f,
                                subjectGrades: [
                                  ...f.subjectGrades,
                                  {
                                    subject_id: subjectObj.subject_id,
                                    subject_name: subjectObj.subject_name,
                                    grade: formData.newGrade.trim()
                                  }
                                ],
                                selectedSubject: '',
                                newGrade: ''
                              }));
                            }
                          }
                        }}
                        disabled={
                          !formData.selectedSubject ||
                          !formData.newGrade.trim() ||
                          formData.subjectGrades.some(sg => sg.subject_id === formData.selectedSubject)
                        }
                      >
                        Add
                      </Button>
                    </div>
                    {formData.subjectGrades.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {formData.subjectGrades.map((sg, idx) => (
                          <div key={sg.subject_id} className="flex items-center justify-between bg-muted rounded px-3 py-2">
                            <span className="font-medium">{sg.subject_name}</span>
                            <span className="text-sm">Grade: {sg.grade}</span>
                            <button
                              className="text-destructive ml-2"
                              onClick={() => setFormData(f => ({
                                ...f,
                                subjectGrades: f.subjectGrades.filter((_, i) => i !== idx)
                              }))}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm mt-2">No subject grades added yet.</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">Personal Information</h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      {formData.gender && <p>Gender: {formData.gender}</p>}
                      {formData.incomeLevel && <p>Income Level: {formData.incomeLevel}</p>}
                      {formData.countryCode && (
                        <p>
                          Country: {
                            countries.find(c => c.country_code === formData.countryCode)?.country_name || formData.countryCode
                          }
                          {' '}
                          ({formData.countryCode})
                        </p>
                      )}
                      {formData.fatherEducation && <p>Father's Education: {formData.fatherEducation}</p>}
                      {formData.motherEducation && <p>Mother's Education: {formData.motherEducation}</p>}
                      {formData.fundingMethod && <p>Funding Method: {formData.fundingMethod}</p>}
                    </div>
                  </div>

                  {formData.interests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {formData.interests.map((interest, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-primary-light text-primary rounded-full text-sm"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                
                {currentStep < totalSteps ? (
                  <Button onClick={handleNext}>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="gradient"
                    onClick={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Profile...' : 'Complete Profile'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default ProfileCreate;