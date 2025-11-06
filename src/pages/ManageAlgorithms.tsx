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
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const [isSaving, setIsSaving] = useState(false);

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

  const handleWeightChange = (algorithmId: string, field: keyof Algorithm, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setAlgorithms(prev =>
      prev.map(algo =>
        algo.algorithm_id === algorithmId
          ? { ...algo, [field]: numValue }
          : algo
      )
    );
  };

  const handleSetCurrent = (algorithmId: string) => {
    setAlgorithms(prev =>
      prev.map(algo => ({
        ...algo,
        current: algo.algorithm_id === algorithmId,
      }))
    );
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);

      // Update all algorithms
      const updates = algorithms.map(algo =>
        (supabase as any)
          .from('recommendation_weights')
          .update({
            subject_similarity_weight: algo.subject_similarity_weight,
            semantic_similarity_weight: algo.semantic_similarity_weight,
            confidence_score_weight: algo.confidence_score_weight,
            market_score_weight: algo.market_score_weight,
            category_rank_weight: algo.category_rank_weight,
            current: algo.current,
          })
          .eq('algorithm_id', algo.algorithm_id)
      );

      await Promise.all(updates);

      toast({
        title: 'Success',
        description: 'Algorithm weights updated successfully',
      });

      fetchAlgorithms();
    } catch (error) {
      console.error('Error saving algorithms:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="container mx-auto py-8 space-y-6">
          <div className="flex items-center justify-between">
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
                Configure recommendation algorithm weights
              </p>
            </div>
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Algorithm Weights</CardTitle>
              <CardDescription>
                Adjust the weights for each algorithm and mark one as current
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                        <TableHead>Created At</TableHead>
                        <TableHead>Subject Similarity</TableHead>
                        <TableHead>Semantic Similarity</TableHead>
                        <TableHead>Confidence Score</TableHead>
                        <TableHead>Market Score</TableHead>
                        <TableHead>Category Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {algorithms.map(algo => (
                        <TableRow key={algo.algorithm_id}>
                          <TableCell>
                            <Button
                              variant={algo.current ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleSetCurrent(algo.algorithm_id)}
                            >
                              {algo.current ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                'Set Current'
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(algo.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={algo.subject_similarity_weight}
                              onChange={(e) =>
                                handleWeightChange(
                                  algo.algorithm_id,
                                  'subject_similarity_weight',
                                  e.target.value
                                )
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={algo.semantic_similarity_weight}
                              onChange={(e) =>
                                handleWeightChange(
                                  algo.algorithm_id,
                                  'semantic_similarity_weight',
                                  e.target.value
                                )
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={algo.confidence_score_weight}
                              onChange={(e) =>
                                handleWeightChange(
                                  algo.algorithm_id,
                                  'confidence_score_weight',
                                  e.target.value
                                )
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={algo.market_score_weight}
                              onChange={(e) =>
                                handleWeightChange(
                                  algo.algorithm_id,
                                  'market_score_weight',
                                  e.target.value
                                )
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={algo.category_rank_weight}
                              onChange={(e) =>
                                handleWeightChange(
                                  algo.algorithm_id,
                                  'category_rank_weight',
                                  e.target.value
                                )
                              }
                              className="w-24"
                            />
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
