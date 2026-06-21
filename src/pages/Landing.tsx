import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { GraduationCap, Sparkles, Target, TrendingUp, Users, Award, ChevronRight, Brain, BookOpen, Compass } from 'lucide-react';
import Layout from '@/components/Layout';

const Landing = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Matching",
      description: "Advanced algorithms analyze your academic profile to find the perfect degree programs tailored to your strengths."
    },
    {
      icon: Target,
      title: "Personalized Recommendations",
      description: "Get degree suggestions based on your interests, academic performance, and career aspirations."
    },
    {
      icon: TrendingUp,
      title: "Market Insights",
      description: "Access real-time data on job markets and industry trends to make informed educational decisions."
    },
    {
      icon: Users,
      title: "Comprehensive Profiles",
      description: "Build a detailed profile including academics, interests, and socioeconomic factors for accurate matching."
    }
  ];

  const stats = [
    { value: "10,000+", label: "Students Helped" },
    { value: "500+", label: "Degree Programs" },
    { value: "95%", label: "Satisfaction Rate" },
    { value: "50+", label: "Partner Universities" }
  ];

  return (
    <Layout>
      <div className="space-y-20">
        {/* Hero Section */}
        <section className="relative pt-10 pb-20">
          <div className="absolute inset-0 bg-gradient-ocean opacity-5 rounded-3xl"></div>
          <div className="relative max-w-5xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-light rounded-full text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Discover Your Perfect Degree Path
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Find Your <span className="gradient-text">Future</span> with
              <br />AI-Powered Guidance
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Get personalized university degree recommendations based on your academic profile, 
              interests, and career goals. Make informed decisions about your education with data-driven insights.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button size="xl" variant="gradient" className="btn-glow group">
                  Start Your Journey
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/explore">
                <Button size="xl" variant="glass">
                  <Compass className="h-5 w-5" />
                  Explore Degrees
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="glass text-center p-6 card-hover">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">Why Choose <span className="gradient-text">EduAdvisor</span>?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform combines cutting-edge technology with comprehensive data to help you make the best educational decisions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 card-hover glass animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground">
                1
              </div>
              <h3 className="text-xl font-semibold">Create Your Profile</h3>
              <p className="text-muted-foreground">Sign up and fill in your academic history, interests, and career goals</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground">
                2
              </div>
              <h3 className="text-xl font-semibold">Get Recommendations</h3>
              <p className="text-muted-foreground">Our AI analyzes your profile and matches you with suitable degree programs</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground">
                3
              </div>
              <h3 className="text-xl font-semibold">Compare & Decide</h3>
              <p className="text-muted-foreground">Compare programs side-by-side and make an informed decision about your future</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-8 pb-10">
          <Card className="p-12 bg-gradient-card">
            <h2 className="text-3xl font-bold mb-4">Ready to Find Your Perfect Degree?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of students who have discovered their ideal educational path with EduAdvisor
            </p>
            <Link to="/auth">
              <Button size="xl" variant="gradient" className="btn-glow">
                <GraduationCap className="h-5 w-5" />
                Get Started Free
              </Button>
            </Link>
          </Card>
        </section>
      </div>
    </Layout>
  );
};

export default Landing;