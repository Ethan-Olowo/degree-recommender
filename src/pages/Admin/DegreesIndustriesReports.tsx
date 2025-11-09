import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DegreeReportsData {
  degreesPerCategory: { category: string; count: number }[];
  industriesCount: { industry: string; count: number }[];
  topRecommendedDegrees: { program_name: string; recommendation_count: number }[];
  avgMinGpaPerCategory: { category: string; avg_min_gpa: number }[];
  topIndustriesByMarket: { industry: string; avg_market: number }[];
}

const DegreesIndustriesReports = () => {
  const [data, setData] = useState<DegreeReportsData>({
    degreesPerCategory: [],
    industriesCount: [],
    topRecommendedDegrees: [],
    avgMinGpaPerCategory: [],
    topIndustriesByMarket: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      // Fetch all degree programs with joined industry name if available
      // 1. Fetch all degree programs
      const { data: degrees, error: degErr } = await supabase
        .from('degree_programs')
        .select('program_id, program_name, category, minimum_gpa');
      if (degErr) throw degErr;

      // 2. Fetch all industries
      let industriesList: { industry_id: string; industry_name: string }[] = [];
      const { data: industriesData } = await supabase
        .from('industries')
        .select('industry_id, industry_name');
      if (industriesData) industriesList = industriesData;

      // 3. Fetch all degree_industries (many-to-many degree <-> industry)
      const { data: degreeIndustries, error: diErr } = await supabase
        .from('degree_industries')
        .select('program_id, industry_id');
      if (diErr) throw diErr;

      // 4. Fetch all recommendations
      const { data: recommendations, error: recErr } = await supabase
        .from('recommendations')
        .select('program_id');
      if (recErr) throw recErr;

      // 5. Fetch all market indicator values (for industry)
      const { data: marketIndicators, error: miErr } = await supabase
        .from('market_indicator_values')
        .select('industry_id, value');
      if (miErr) throw miErr;

      // Degrees per category
      const categoryMap = new Map<string, number>();
      degrees?.forEach(d => {
        const cat = d.category || 'Uncategorized';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });
      const degreesPerCategory = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Most common industries linked to degrees (via degree_industries)
      const industryMap = new Map<string, number>();
      degreeIndustries?.forEach(di => {
        if (di.industry_id) {
          industryMap.set(di.industry_id, (industryMap.get(di.industry_id) || 0) + 1);
        }
      });
      let industriesCount = Array.from(industryMap.entries())
        .map(([industry_id, count]) => {
          const found = industriesList.find(i => i.industry_id === industry_id);
          return { industry: found ? found.industry_name : industry_id, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Degree programs with most recommendations (resolve program name)
      const recCountMap = new Map<string, number>();
      recommendations?.forEach(r => {
        if (r.program_id) {
          recCountMap.set(r.program_id, (recCountMap.get(r.program_id) || 0) + 1);
        }
      });
      const topDegreeIds = Array.from(recCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      const topRecommendedDegrees = topDegreeIds.map(([program_id, recommendation_count]) => {
        const degree = degrees?.find(d => d.program_id === program_id);
        return {
          program_name: degree?.program_name || program_id || 'Unknown',
          recommendation_count,
        };
      });

      // Average minimum GPA per degree category
      const gpaMap = new Map<string, { total: number; count: number }>();
      degrees?.forEach(d => {
        const cat = d.category || 'Uncategorized';
        if (d.minimum_gpa !== null && d.minimum_gpa !== undefined) {
          const stats = gpaMap.get(cat) || { total: 0, count: 0 };
          stats.total += d.minimum_gpa;
          stats.count += 1;
          gpaMap.set(cat, stats);
        }
      });
      const avgMinGpaPerCategory = Array.from(gpaMap.entries()).map(([category, stats]) => ({
        category,
        avg_min_gpa: stats.count > 0 ? stats.total / stats.count : 0,
      })).sort((a, b) => b.avg_min_gpa - a.avg_min_gpa);

      // Top 5 industries by average market indicator value (resolve industry name)
      const marketMap = new Map<string, { total: number; count: number }>();
      marketIndicators?.forEach(mv => {
        if (mv.industry_id && mv.value !== null && mv.value !== undefined) {
          const stats = marketMap.get(mv.industry_id) || { total: 0, count: 0 };
          stats.total += mv.value;
          stats.count += 1;
          marketMap.set(mv.industry_id, stats);
        }
      });
      let topIndustriesByMarket = Array.from(marketMap.entries())
        .map(([industry_id, stats]) => {
          const found = industriesList.find(i => i.industry_id === industry_id);
          return {
            industry: found ? found.industry_name : industry_id,
            avg_market: stats.count > 0 ? stats.total / stats.count : 0,
          };
        })
        .sort((a, b) => b.avg_market - a.avg_market)
        .slice(0, 5);

      setData({
        degreesPerCategory,
        industriesCount,
        topRecommendedDegrees,
        avgMinGpaPerCategory,
        topIndustriesByMarket,
      });
    } catch (error) {
      console.error('Error fetching degree/industry reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    count: {
      label: 'Count',
      color: 'hsl(var(--primary))',
    },
    avg_min_gpa: {
      label: 'Avg Min GPA',
      color: 'hsl(var(--accent))',
    },
  };

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-8 animate-fade-in">
          {/* Header with Manage Links */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold">
                Degrees & <span className="gradient-text">Industries Reports</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Insights on degree programs and their industry connections
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/admin/degrees">
                <Button className="btn-glow">Manage Degrees</Button>
              </Link>
              <Link to="/admin/industries">
                <Button className="btn-glow">Manage Industries</Button>
              </Link>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Number of degree programs per category */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Degree Programs Per Category</CardTitle>
                <CardDescription>Number of programs in each category</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.degreesPerCategory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Most common industries linked to degrees */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Most Common Industries</CardTitle>
                <CardDescription>Industries most frequently linked to degrees</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.industriesCount} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="industry" width={100} stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Average minimum GPA per degree category */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Average Minimum GPA by Category</CardTitle>
                <CardDescription>Average minimum GPA required for each category</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.avgMinGpaPerCategory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="avg_min_gpa" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Degree programs with most recommendations */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Degree Programs with Most Recommendations</CardTitle>
              <CardDescription>Top 10 programs by recommendation count</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 bg-muted rounded animate-shimmer"></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Program Name</TableHead>
                      <TableHead className="text-right">Recommendations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topRecommendedDegrees.map((program, index) => (
                      <TableRow key={program.program_name}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell>{program.program_name}</TableCell>
                        <TableCell className="text-right">{program.recommendation_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Top 5 industries by average market indicator value */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Top Industries by Market Indicator</CardTitle>
              <CardDescription>Top 5 industries by average market value</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 bg-muted rounded animate-shimmer"></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead className="text-right">Avg Market Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topIndustriesByMarket.map((industry, index) => (
                      <TableRow key={industry.industry}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell>{industry.industry}</TableCell>
                        <TableCell className="text-right">{industry.avg_market.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default DegreesIndustriesReports;
