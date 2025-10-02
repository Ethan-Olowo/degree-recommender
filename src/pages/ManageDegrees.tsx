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

type DegreeProgram = Tables<'degree_programs'>;

const ManageDegrees = () => {
  const navigate = useNavigate();
  const [degrees, setDegrees] = useState<DegreeProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [degreeToDelete, setDegreeToDelete] = useState<DegreeProgram | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDegrees();
  }, []);

  const fetchDegrees = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('degree_programs')
        .select('*')
        .order('program_name');

      if (error) throw error;
      setDegrees(data || []);
    } catch (error) {
      console.error('Error fetching degrees:', error);
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
    navigate(`/admin/degrees/edit/${programId}`);
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

      fetchDegrees();
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
                        <TableHead>Type</TableHead>
                        <TableHead>Min GPA</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {degrees.map((degree) => (
                        <TableRow key={degree.program_id}>
                          <TableCell className="font-medium">
                            {degree.program_name}
                          </TableCell>
                          <TableCell>
                            {degree.program_type ? (
                              <Badge variant="outline">{degree.program_type}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
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
                            <div className="flex justify-end gap-2">
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
      </Layout>
    </ProtectedRoute>
  );
};

export default ManageDegrees;
