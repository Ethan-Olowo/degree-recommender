import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import EditDegree from './EditDegree';

type DegreeProgram = Tables<'degree_programs'> & {
  industries: string[];
  subjects: string[];
};
type Industry = Tables<'industries'>;
type Subject = Tables<'subjects'>;

const ManageDegrees = () => {
  const navigate = useNavigate();
  const [degrees, setDegrees] = useState<DegreeProgram[]>([]);
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [degreeToDelete, setDegreeToDelete] = useState<DegreeProgram | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDegreeId, setSelectedDegreeId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [degreesRes, industriesRes, subjectsRes] = await Promise.all([
        supabase
          .from('degree_programs')
          .select(`
            *,
            degree_industries:degree_industries(industry_id, industries:industries(industry_name)),
            subject_requirements:subject_requirements(subject_id, subjects:subjects(subject_name))
          `)
          .order('program_name'),
        supabase.from('industries').select('*').order('industry_name'),
        supabase.from('subjects').select('*').order('subject_name'),
      ]);

      if (degreesRes.error) throw degreesRes.error;
      if (industriesRes.error) throw industriesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      const formattedDegrees = degreesRes.data.map((degree) => ({
        ...degree,
        industries: degree.degree_industries.map((di) => di.industries.industry_name),
        subjects: degree.subject_requirements.map((sr) => sr.subjects.subject_name),
      }));

      setDegrees(formattedDegrees || []);
      setAllIndustries(industriesRes.data || []);
      setAllSubjects(subjectsRes.data || []);
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
    navigate('/admin/degrees/edit/new');
  };

  const handleEdit = (programId: string) => {
    setSelectedDegreeId(programId);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedDegreeId(null);
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

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Degree Programs
              </CardTitle>
              <CardDescription>
                {degrees.length} degree program{degrees.length !== 1 ? 's' : ''} in total
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-shimmer" />
                  ))}
                </div>
              ) : degrees.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No degree programs yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by adding your first degree program
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
                        <TableHead>Program Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Industries</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>Min GPA</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {degrees.map((degree) => (
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

        <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
          <DialogContent
            style={{
              width: '80vw',
              height: '80vh',
              maxWidth: '80vw',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
            className="p-0"
          >
            {selectedDegreeId && (
              <EditDegree
                programId={selectedDegreeId}
                onClose={closeEditModal}
                allIndustries={allIndustries}
                allSubjects={allSubjects}
              />
            )}
          </DialogContent>
        </Dialog>
      </Layout>
    </ProtectedRoute>
  );
};

export default ManageDegrees;
