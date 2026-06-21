import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Building2, CircleAlert as AlertCircle, Search, ArrowUpDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

// Industry type from supabase
type Industry = Tables<'industries'>;

const ManageIndustries = () => {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [industryToDelete, setIndustryToDelete] = useState<Industry | null>(null);
  const [newIndustryName, setNewIndustryName] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();

  useEffect(() => {
    fetchIndustries();
  }, []);

  const fetchIndustries = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('industries')
        .select('*')
        .order('industry_name');
      if (error) throw error;
      setIndustries(data || []);
    } catch (error) {
      console.error('Error fetching industries:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch industries',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIndustry = async () => {
    if (!newIndustryName.trim()) return;
    try {
      const { error } = await supabase
        .from('industries')
        .insert({ industry_name: newIndustryName.trim() });
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Industry added successfully',
      });
      setNewIndustryName('');
      fetchIndustries();
    } catch (error) {
      console.error('Error adding industry:', error);
      toast({
        title: 'Error',
        description: 'Failed to add industry',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (industry: Industry) => {
    setIndustryToDelete(industry);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!industryToDelete) return;
    try {
      const { error } = await supabase
        .from('industries')
        .delete()
        .eq('industry_id', industryToDelete.industry_id);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Industry deleted successfully',
      });
      fetchIndustries();
    } catch (error) {
      console.error('Error deleting industry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete industry',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setIndustryToDelete(null);
    }
  };

  const filteredIndustries = industries
    .filter(industry => 
      industry.industry_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const comparison = a.industry_name.localeCompare(b.industry_name);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold">
                Manage <span className="gradient-text">Industries</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Add and remove industries in the system
              </p>
            </div>
          </div>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Industries
              </CardTitle>
              <CardDescription>
                {filteredIndustries.length} of {industries.length} industr{industries.length !== 1 ? 'ies' : 'y'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="New industry name"
                  value={newIndustryName}
                  onChange={e => setNewIndustryName(e.target.value)}
                  className="max-w-xs"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddIndustry();
                  }}
                />
                <Button onClick={handleAddIndustry} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Industry
                </Button>
              </div>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search industries..."
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
              ) : industries.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No industries yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by adding your first industry
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
                            Industry Name
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIndustries.map((industry) => (
                        <TableRow key={industry.industry_id}>
                          <TableCell className="font-medium">
                            {industry.industry_name}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(industry)}
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
                Delete Industry
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{industryToDelete?.industry_name}"? This action
                cannot be undone and may affect related degree programs.
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

export default ManageIndustries;
