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
import { Plus, Trash2, BookOpen, CircleAlert as AlertCircle, Search, ArrowUpDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

// Subject type from supabase
type Subject = Tables<'subjects'>;

const ManageSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('subject_name');
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subjects',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const { error } = await supabase
        .from('subjects')
        .insert({ subject_name: newSubjectName.trim() });
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Subject added successfully',
      });
      setNewSubjectName('');
      fetchSubjects();
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to add subject',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (subject: Subject) => {
    setSubjectToDelete(subject);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('subject_id', subjectToDelete.subject_id);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Subject deleted successfully',
      });
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subject',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSubjectToDelete(null);
    }
  };

  const filteredSubjects = subjects
    .filter(subject => 
      subject.subject_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const comparison = a.subject_name.localeCompare(b.subject_name);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold">
                Manage <span className="gradient-text">Subjects</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Add and remove subjects in the system
              </p>
            </div>
          </div>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Subjects
              </CardTitle>
              <CardDescription>
                {filteredSubjects.length} of {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="New subject name"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  className="max-w-xs"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddSubject();
                  }}
                />
                <Button onClick={handleAddSubject} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Subject
                </Button>
              </div>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subjects..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-shimmer" />
                  ))}
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No subjects yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by adding your first subject
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer select-none"
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        >
                          <div className="flex items-center gap-2">
                            Subject Name
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubjects.map((subject) => (
                        <TableRow key={subject.subject_id}>
                          <TableCell className="font-medium">
                            {subject.subject_name}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(subject)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
                Delete Subject
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{subjectToDelete?.subject_name}"? This action
                cannot be undone and may affect related requirements.
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

export default ManageSubjects;
