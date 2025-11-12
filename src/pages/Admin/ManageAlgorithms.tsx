import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, Filter, ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';

type Algorithm = {
  algorithm_id: string;
  subject_similarity_weight: number;
  semantic_similarity_weight: number;
  confidence_score_weight: number;
  market_score_weight: number;
  category_rank_weight: number;
  created_at: string;
  current: boolean;
};

const ManageAlgorithms = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'subject' | 'semantic'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [newWeights, setNewWeights] = useState({
    subject_similarity_weight: 0.3,
    semantic_similarity_weight: 0.7,
    confidence_score_weight: 0.65,
    market_score_weight: 0.3,
    category_rank_weight: 0.05,
  });

  useEffect(() => {
    fetchAlgorithms();
  }, []);

  const fetchAlgorithms = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('recommendation_weights')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlgorithms(data || []);
    } catch (error) {
      console.error('Error fetching algorithms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load algorithms',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCurrent = async (algorithmId: string) => {
    try {
      // Set all to false first
      await (supabase as any)
        .from('recommendation_weights')
        .update({ current: false })
        .neq('algorithm_id', '00000000-0000-0000-0000-000000000000');

      // Set the selected one to true
      await (supabase as any)
        .from('recommendation_weights')
        .update({ current: true })
        .eq('algorithm_id', algorithmId);

      toast({
        title: 'Success',
        description: 'Active algorithm updated successfully',
      });

      fetchAlgorithms();
    } catch (error) {
      console.error('Error updating current algorithm:', error);
      toast({
        title: 'Error',
        description: 'Failed to update active algorithm',
        variant: 'destructive',
      });
    }
  };

  const handleCreateAlgorithm = async () => {
    try {
      setIsCreating(true);

      // Set all existing algorithms to not current
      await (supabase as any)
        .from('recommendation_weights')
        .update({ current: false })
        .neq('algorithm_id', '00000000-0000-0000-0000-000000000000');

      // Create new algorithm and set it as current
      const { error } = await (supabase as any)
        .from('recommendation_weights')
        .insert({
          ...newWeights,
          current: true,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'New algorithm created and set as active',
      });

      // Reset form
      setNewWeights({
        subject_similarity_weight: 0.3,
        semantic_similarity_weight: 0.7,
        confidence_score_weight: 0.65,
        market_score_weight: 0.3,
        category_rank_weight: 0.05,
      });

      fetchAlgorithms();
    } catch (error) {
      console.error('Error creating algorithm:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new algorithm',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredAlgorithms = algorithms
    .filter(algo => {
      const matchesSearch = new Date(algo.created_at).toLocaleDateString().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && algo.current) ||
        (statusFilter === 'inactive' && !algo.current);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'subject') {
        comparison = a.subject_similarity_weight - b.subject_similarity_weight;
      } else if (sortBy === 'semantic') {
        comparison = a.semantic_similarity_weight - b.semantic_similarity_weight;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="container mx-auto py-8 space-y-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/admin/reports/recommendations')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
            <h1 className="text-4xl font-bold">
              Manage <span className="gradient-text">Algorithms</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Create new algorithm configurations and set active version
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create New Algorithm</CardTitle>
              <CardDescription>
                Configure weights for a new recommendation algorithm version
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject_similarity">Subject Similarity Weight</Label>
                  <Input
                    id="subject_similarity"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={newWeights.subject_similarity_weight}
                    onChange={(e) =>
                      setNewWeights(prev => ({
                        ...prev,
                        subject_similarity_weight: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semantic_similarity">Semantic Similarity Weight</Label>
                  <Input
                    id="semantic_similarity"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={newWeights.semantic_similarity_weight}
                    onChange={(e) =>
                      setNewWeights(prev => ({
                        ...prev,
                        semantic_similarity_weight: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confidence_score">Confidence Score Weight</Label>
                  <Input
                    id="confidence_score"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={newWeights.confidence_score_weight}
                    onChange={(e) =>
                      setNewWeights(prev => ({
                        ...prev,
                        confidence_score_weight: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="market_score">Market Score Weight</Label>
                  <Input
                    id="market_score"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={newWeights.market_score_weight}
                    onChange={(e) =>
                      setNewWeights(prev => ({
                        ...prev,
                        market_score_weight: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category_rank">Category Rank Weight</Label>
                  <Input
                    id="category_rank"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={newWeights.category_rank_weight}
                    onChange={(e) =>
                      setNewWeights(prev => ({
                        ...prev,
                        category_rank_weight: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateAlgorithm}
                disabled={isCreating}
                size="lg"
                className="w-full md:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create and Set as Active
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Algorithm History</CardTitle>
              <CardDescription>
                {filteredAlgorithms.length} of {algorithms.length} algorithm{algorithms.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by date..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-3">
                  <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  {(search || statusFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading algorithms...
                </div>
              ) : algorithms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No algorithms found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Current</TableHead>
                        <TableHead 
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('created_at')}
                        >
                          <div className="flex items-center gap-2">
                            Created At
                            {sortBy === 'created_at' && <ArrowUpDown className="h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('subject')}
                        >
                          <div className="flex items-center gap-2">
                            Subject Similarity
                            {sortBy === 'subject' && <ArrowUpDown className="h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('semantic')}
                        >
                          <div className="flex items-center gap-2">
                            Semantic Similarity
                            {sortBy === 'semantic' && <ArrowUpDown className="h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead>Confidence Score</TableHead>
                        <TableHead>Market Score</TableHead>
                        <TableHead>Category Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlgorithms.map(algo => (
                        <TableRow key={algo.algorithm_id}>
                          <TableCell>
                            <Button
                              variant={algo.current ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleSetCurrent(algo.algorithm_id)}
                              disabled={algo.current}
                            >
                              {algo.current ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                'Set Active'
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(algo.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {algo.subject_similarity_weight.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {algo.semantic_similarity_weight.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {algo.confidence_score_weight.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {algo.market_score_weight.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {algo.category_rank_weight.toFixed(2)}
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
      </Layout>
    </ProtectedRoute>
  );
};

export default ManageAlgorithms;
