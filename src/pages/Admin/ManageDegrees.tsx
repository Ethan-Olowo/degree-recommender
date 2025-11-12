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
import { Plus, Pencil, Trash2, GraduationCap, CircleAlert as AlertCircle } from 'lucide-react';
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
      (categoryFilter ? degree.category === categoryFilter : true) &&
      (industryFilter ? degree.industries.includes(industryFilter) : true) &&
      (subjectFilter ? degree.subjects.includes(subjectFilter) : true)
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
          <div className="flex flex-wrap gap-4 mb-4">
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded px-3 py-2 min-w-[180px]"
            />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={industryFilter}
              onChange={e => setIndustryFilter(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">All Industries</option>
              {industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">All Subjects</option>
              {subjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

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
                          Program Name {sortBy === 'program_name' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('category')}
                        >
                          Category {sortBy === 'category' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </TableHead>
                        <TableHead>Industries</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('minimum_gpa')}
                        >
                          Min GPA {sortBy === 'minimum_gpa' && (sortOrder === 'asc' ? '▲' : '▼')}
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
