import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, GraduationCap, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DegreeProgram {
  program_id: string;
  program_name: string;
  program_type: string;
  description: string;
  minimum_gpa: number | null;
}

const ExploreDegrees = () => {
  const [programs, setPrograms] = useState<DegreeProgram[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<DegreeProgram[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [programType, setProgramType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    filterPrograms();
  }, [searchTerm, programType, programs]);

  const fetchPrograms = async () => {
    try {
      const { data } = await supabase
        .from('degree_programs')
        .select('*')
        .order('program_name');

      if (data) {
        setPrograms(data);
        setFilteredPrograms(data);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPrograms = () => {
    let filtered = programs;

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.program_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (programType !== 'all') {
      filtered = filtered.filter((p) => p.program_type === programType);
    }

    setFilteredPrograms(filtered);
  };

  const programTypes = Array.from(new Set(programs.map((p) => p.program_type).filter(Boolean)));

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">
            Explore <span className="gradient-text">Degree Programs</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse through our comprehensive catalog of university degree programs
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search programs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={programType} onValueChange={setProgramType}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Program Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {programTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Showing {filteredPrograms.length} of {programs.length} programs
          </p>
        </div>

        {/* Programs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        ) : filteredPrograms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program, index) => (
              <Card
                key={program.program_id}
                className="glass card-hover animate-scale-in"
                style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <GraduationCap className="h-8 w-8 text-primary" />
                    {program.program_type && (
                      <span className="text-xs bg-primary-light text-primary px-2 py-1 rounded-full">
                        {program.program_type}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-4">{program.program_name}</CardTitle>
                  {program.minimum_gpa && (
                    <CardDescription className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Min GPA: {program.minimum_gpa}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {program.description || 'No description available'}
                  </p>
                  <Link to={`/degree/${program.program_id}`}>
                    <Button className="w-full" variant="outline">
                      View Details
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass">
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-semibold">No Programs Found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or filters
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ExploreDegrees;