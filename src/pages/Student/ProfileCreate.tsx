import { useState } from 'react';
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
    countryCode: '',
    
    // Interests
    interests: [] as string[],
    interestInput: ''
  });

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
    if (formData.interestInput.trim() && formData.interests.length < 10) {
      setFormData({
        ...formData,
        interests: [...formData.interests, formData.interestInput.trim()],
        interestInput: ''
      });
    }
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


        // Create socioeconomic indicators
        if (formData.gender || formData.incomeLevel || formData.countryCode) {
          await supabase
            .from('socioeconomic_indicators')
            .insert({
              user_id: userData.user_id,
              gender: formData.gender || null,
              income_level: formData.incomeLevel || null,
              country_code: formData.countryCode || null,
              school_type: formData.schoolType || null
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
                    <Input
                      id="country"
                      placeholder="Enter country code (e.g., US, UK)"
                      value={formData.countryCode}
                      onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                      maxLength={2}
                    />
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

              {/* Step 4: Review */}
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
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">Personal Information</h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      {formData.gender && <p>Gender: {formData.gender}</p>}
                      {formData.incomeLevel && <p>Income Level: {formData.incomeLevel}</p>}
                      {formData.countryCode && <p>Country: {formData.countryCode}</p>}
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