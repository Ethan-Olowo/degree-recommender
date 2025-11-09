import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DemographicsReportsData {
  usersByCountry: { country: string; count: number }[];
  genderDistribution: { gender: string; count: number }[];
  incomeLevelDistribution: { income_level: string; count: number }[];
  fundingSourceBreakdown: { funding_source: string; count: number }[];
  parentalEducationLevels: { education_level: string; count: number }[];
  monthlyRegistrationTrend: { month: string; count: number }[];
  usersWithAcademicData: number;
  usersWithoutAcademicData: number;
}
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb', '#ffbb28', '#00C49F', '#FFBB28', '#FF8042'
];

const UsersDemographicsReports = () => {
  const [data, setData] = useState<DemographicsReportsData>({
    usersByCountry: [],
    genderDistribution: [],
    incomeLevelDistribution: [],
    fundingSourceBreakdown: [],
    parentalEducationLevels: [],
    monthlyRegistrationTrend: [],
    usersWithAcademicData: 0,
    usersWithoutAcademicData: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      // 1. Fetch all users (try to get created_at if available)
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('user_id, created_at');
      if (usersErr) throw usersErr;

      // 2. Fetch all socioeconomic_indicators
      const { data: socio, error: socioErr } = await supabase
        .from('socioeconomic_indicators')
        .select('user_id, country_code, gender, income_level, school_type');
      if (socioErr) throw socioErr;

      // 3. Fetch all academic_data
      const { data: academic, error: academicErr } = await supabase
        .from('academic_data')
        .select('user_id');
      if (academicErr) throw academicErr;

      // 4. Fetch all countries
      const { data: countries } = await supabase
        .from('countries')
        .select('country_code, country_name');

      // User distribution by country
      const countryMap = new Map<string, number>();
      socio?.forEach(s => {
        const code = s.country_code || 'Unknown';
        countryMap.set(code, (countryMap.get(code) || 0) + 1);
      });
      const usersByCountry = Array.from(countryMap.entries()).map(([country_code, count]) => {
        const country = countries?.find(c => c.country_code === country_code)?.country_name || country_code;
        return { country, count };
      }).sort((a, b) => b.count - a.count);

      // Gender distribution
      const genderMap = new Map<string, number>();
      socio?.forEach(s => {
        const gender = s.gender || 'Unspecified';
        genderMap.set(gender, (genderMap.get(gender) || 0) + 1);
      });
      const genderDistribution = Array.from(genderMap.entries()).map(([gender, count]) => ({ gender, count }));

      // Income level distribution
      const incomeMap = new Map<string, number>();
      socio?.forEach(s => {
        const income = s.income_level || 'Unspecified';
        incomeMap.set(income, (incomeMap.get(income) || 0) + 1);
      });
      const incomeLevelDistribution = Array.from(incomeMap.entries()).map(([income_level, count]) => ({ income_level, count }));

      // Funding source breakdown (using school_type as proxy)
      const fundingMap = new Map<string, number>();
      socio?.forEach(s => {
        const funding = s.school_type || 'Unspecified';
        fundingMap.set(funding, (fundingMap.get(funding) || 0) + 1);
      });
      const fundingSourceBreakdown = Array.from(fundingMap.entries()).map(([funding_source, count]) => ({ funding_source, count }));

      // Parental education levels (using income_level as proxy)
      const parentEduMap = new Map<string, number>();
      socio?.forEach(s => {
        const edu = s.income_level || 'Unspecified';
        parentEduMap.set(edu, (parentEduMap.get(edu) || 0) + 1);
      });
      const parentalEducationLevels = Array.from(parentEduMap.entries()).map(([education_level, count]) => ({ education_level, count }));

      // Monthly user registration trend (not available, leave empty)
      let monthlyRegistrationTrend: { month: string; count: number }[] = [];

      // Users with/without academic data
      const userIdsWithAcademic = new Set(academic?.map(a => a.user_id));
      const usersWithAcademicData = userIdsWithAcademic.size;
      const usersWithoutAcademicData = (users?.length || 0) - usersWithAcademicData;

      setData({
        usersByCountry,
        genderDistribution,
        incomeLevelDistribution,
        fundingSourceBreakdown,
        parentalEducationLevels,
        monthlyRegistrationTrend,
        usersWithAcademicData,
        usersWithoutAcademicData,
      });
    } catch (error) {
      console.error('Error fetching demographics reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    count: {
      label: 'Count',
      color: 'hsl(var(--primary))',
    },
  };
// TODO: Refactor code fix chart display error
  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-8 animate-fade-in">
          {/* Header with Manage Links */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold">
                Users & <span className="gradient-text">Demographics Reports</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Insights on user base and demographic breakdowns
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User distribution by country */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>User Distribution by Country</CardTitle>
                <CardDescription>Number of users per country</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.usersByCountry} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="country" width={100} stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Gender distribution */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Proportion of users by gender</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.genderDistribution}
                          dataKey="count"
                          nameKey="gender"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {data.genderDistribution.map((entry, idx) => (
                            <Cell key={`cell-gender-${idx}`} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Income level distribution */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Income Level Distribution</CardTitle>
                <CardDescription>Distribution of users by income level</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.incomeLevelDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="income_level" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Funding source breakdown */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Funding Source Breakdown</CardTitle>
                <CardDescription>How users fund their education (by school type)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.fundingSourceBreakdown}
                          dataKey="count"
                          nameKey="funding_source"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {data.fundingSourceBreakdown.map((entry, idx) => (
                            <Cell key={`cell-funding-${idx}`} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Parental education levels */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Parental Education Levels</CardTitle>
                <CardDescription>Distribution of users by parental education (using income level as proxy)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted rounded animate-shimmer"></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.parentalEducationLevels}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="education_level" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly user registration trend (line chart) */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Monthly User Registration Trend</CardTitle>
              <CardDescription>Registrations per month (mocked or empty if unavailable)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 bg-muted rounded animate-shimmer"></div>
              ) : (
                <ChartContainer config={chartConfig} className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthlyRegistrationTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Users with/without academic data summary */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Academic Data Summary</CardTitle>
              <CardDescription>Number of users with and without academic data</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-24 bg-muted rounded animate-shimmer"></div>
              ) : (
                <div className="flex gap-8 items-center">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-primary">{data.usersWithAcademicData}</span>
                    <span className="text-muted-foreground">With Academic Data</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-accent">{data.usersWithoutAcademicData}</span>
                    <span className="text-muted-foreground">Without Academic Data</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default UsersDemographicsReports;
