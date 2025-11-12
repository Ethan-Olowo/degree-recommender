import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GraduationCap, CircleAlert as AlertCircle, Search, Filter, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EditDegreeDialog } from '@/components/EditDegreeDialog';

type DegreeProgram = Tables<'degree_programs'> & {
  industries: string[];
  subjects: string[];
};
type Industry = Tables<'industries'>;
type Subject = Tables<'subjects'>;

const ManageDegrees = () => {
  const [degrees, setDegrees] = useState<DegreeProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [degreeToDelete, setDegreeToDelete] = useState<DegreeProgram | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [sortBy, setSortBy] = useState<'program_name'|'category'|'minimum_gpa'>('program_name');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc');
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const degreesRes = await supabase
        .from('degree_programs')
        .select(`
          *,
          degree_industries:degree_industries(industry_id, industries:industries(industry_name)),
          subject_requirements:subject_requirements(subject_id, subjects:subjects(subject_name))
        `)
        .order('program_name');

      if (degreesRes.error) throw degreesRes.error;

      const formattedDegrees = degreesRes.data.map((degree) => ({
        ...degree,
        industries: degree.degree_industries.map((di) => di.industries.industry_name),
        subjects: degree.subject_requirements.map((sr) => sr.subjects.subject_name),
      }));

      setDegrees(formattedDegrees || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch degree programs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedProgramId('new');
    setEditDialogOpen(true);
  };

  const handleEdit = (programId: string) => {
    setSelectedProgramId(programId);
    setEditDialogOpen(true);
  };

  const handleDelete = (degree: DegreeProgram) => {
    setDegreeToDelete(degree);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!degreeToDelete) return;

    try {
      const { error } = await supabase
        .from('degree_programs')
        .delete()
        .eq('program_id', degreeToDelete.program_id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Degree program deleted successfully',
      });

  fetchAllData();
    } catch (error) {
      console.error('Error deleting degree:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete degree program',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDegreeToDelete(null);
    }
  };

  // Filtering and sorting logic
  const filteredDegrees = degrees
    .filter((degree) =>
      degree.program_name.toLowerCase().includes(search.toLowerCase()) &&
      (!categoryFilter || categoryFilter === 'all' ? true : degree.category === categoryFilter) &&
      (!industryFilter || industryFilter === 'all' ? true : degree.industries.includes(industryFilter)) &&
      (!subjectFilter || subjectFilter === 'all' ? true : degree.subjects.includes(subjectFilter))
    )
    .sort((a, b) => {
      let valA, valB;
      if (sortBy === 'minimum_gpa') {
        valA = a.minimum_gpa ?? 0;
        valB = b.minimum_gpa ?? 0;
      } else {
        valA = a[sortBy]?.toString().toLowerCase();
        valB = b[sortBy]?.toString().toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Get unique categories, industries, subjects for filter dropdowns
  const categories = Array.from(new Set(degrees.map(d => d.category).filter(Boolean)));
  const industries = Array.from(new Set(degrees.flatMap(d => d.industries)));
  const subjects = Array.from(new Set(degrees.flatMap(d => d.subjects)));

  // Sorting handler
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold">
                Manage <span className="gradient-text">Degrees</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Add, edit, and manage degree programs in the system
              </p>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Degree
            </Button>
          </div>

          {/* Filter Controls */}
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search degree programs..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={industryFilter} onValueChange={setIndustryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="All Industries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      {industries.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(search || categoryFilter || industryFilter || subjectFilter) && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearch('');
                        setCategoryFilter('');
                        setIndustryFilter('');
                        setSubjectFilter('');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Degree Programs
              </CardTitle>
              <CardDescription>
                {filteredDegrees.length} degree program{filteredDegrees.length !== 1 ? 's' : ''} in total
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-shimmer" />
                  ))}
                </div>
              ) : filteredDegrees.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No degree programs found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or add a new degree program
                  </p>
                  <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Degree Program
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('program_name')}
                        >
                          <div className="flex items-center gap-2">
                            Program Name
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center gap-2">
                            Category
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>Industries</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead 
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('minimum_gpa')}
                        >
                          <div className="flex items-center gap-2">
                            Min GPA
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDegrees.map((degree) => (
                        <TableRow
                          key={degree.program_id}
                          onClick={() => handleEdit(degree.program_id)}
                          className="cursor-pointer hover:bg-muted/50 group"
                          style={{ transition: 'background 0.2s' }}
                        >
                          <TableCell className="font-medium">
                            {degree.program_name}
                          </TableCell>
                          <TableCell>
                            {degree.category}
                          </TableCell>
                          <TableCell>
                            {degree.industries.join(', ') || '—'}
                          </TableCell>
                          <TableCell>
                            {degree.subjects.join(', ') || '—'}
                          </TableCell>
                          <TableCell>
                            {degree.minimum_gpa !== null ? (
                              <Badge variant="secondary">{degree.minimum_gpa}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-md truncate">
                            {degree.description || (
                              <span className="text-muted-foreground">No description</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(degree.program_id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(degree)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Delete Degree Program
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{degreeToDelete?.program_name}"? This action
                cannot be undone and will also remove all related recommendations and
                requirements.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <EditDegreeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          programId={selectedProgramId}
          onSuccess={fetchAllData}
        />
      </Layout>
    </ProtectedRoute>
  );
};

export default ManageDegrees;
