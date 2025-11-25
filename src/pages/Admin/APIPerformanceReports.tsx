import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, Clock, Globe, ArrowLeft, TrendingUp, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CyclingLoader } from '@/components/CyclingLoader';

interface ActivityLog {
  log_id: string;
  endpoint: string;
  status_code: number;
  execution_time_ms: number;
  http_method_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
  log_errors?: { error_message: string | null }[];
}

interface SummaryStats {
  totalRequests: number;
  totalErrors: number;
  avgExecutionTime: number;
  uniqueEndpoints: number;
}

interface PerformanceOverTime {
  date: string;
  avgExecutionTime: number;
}

interface EndpointStats {
  endpoint: string;
  avgExecutionTime?: number;
  requestCount?: number;
  errorCount?: number;
}

interface StatusCodeDistribution {
  range: string;
  count: number;
}

interface HttpMethodDistribution {
  method: string;
  count: number;
}

interface ErrorDetail {
  timestamp: string;
  endpoint: string;
  status_code: number;
  error_message: string;
}

interface IpStats {
  ip_address: string;
  requestCount: number;
}

interface UserAgentStats {
  user_agent: string;
  requestCount: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

const APIPerformanceReports = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusCodeFilter, setStatusCodeFilter] = useState('all');
  const [endpointFilter, setEndpointFilter] = useState('all');
  const [httpMethodFilter, setHttpMethodFilter] = useState('all');

  // Available filter options
  const [uniqueEndpoints, setUniqueEndpoints] = useState<string[]>([]);
  const [uniqueMethods, setUniqueMethods] = useState<string[]>([]);

  useEffect(() => {
    fetchLogs();
  }, [dateFrom, dateTo, statusCodeFilter, endpointFilter, httpMethodFilter]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*, log_errors(error_message)')
        .order('created_at', { ascending: false });

      // Apply filters
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }
      if (statusCodeFilter !== 'all') {
        if (statusCodeFilter === '2xx') {
          query = query.gte('status_code', 200).lt('status_code', 300);
        } else if (statusCodeFilter === '3xx') {
          query = query.gte('status_code', 300).lt('status_code', 400);
        } else if (statusCodeFilter === '4xx') {
          query = query.gte('status_code', 400).lt('status_code', 500);
        } else if (statusCodeFilter === '5xx') {
          query = query.gte('status_code', 500).lt('status_code', 600);
        }
      }
      if (endpointFilter !== 'all') {
        query = query.eq('endpoint', endpointFilter);
      }
      if (httpMethodFilter !== 'all') {
        query = query.eq('http_method_id', httpMethodFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const logsData = data || [];
      setLogs(logsData);

      // Extract unique endpoints and methods for filters
      const endpoints = [...new Set(logsData.map(log => log.endpoint))].sort();
      const methods = [...new Set(logsData.map(log => log.http_method_id).filter(Boolean) as string[])].sort();
      setUniqueEndpoints(endpoints);
      setUniqueMethods(methods);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute summary stats
  const summaryStats: SummaryStats = {
    totalRequests: logs.length,
    totalErrors: logs.filter(log => log.status_code >= 400).length,
    avgExecutionTime: logs.length > 0 
      ? logs.reduce((sum, log) => sum + log.execution_time_ms, 0) / logs.length
      : 0,
    uniqueEndpoints: new Set(logs.map(log => log.endpoint)).size,
  };

  // Performance over time (grouped by day)
  const performanceOverTime: PerformanceOverTime[] = (() => {
    const grouped: { [date: string]: { total: number; count: number } } = {};
    logs.forEach(log => {
      if (log.created_at) {
        const date = log.created_at.split('T')[0];
        if (!grouped[date]) {
          grouped[date] = { total: 0, count: 0 };
        }
        grouped[date].total += log.execution_time_ms;
        grouped[date].count += 1;
      }
    });
    return Object.entries(grouped)
      .map(([date, { total, count }]) => ({
        date,
        avgExecutionTime: Math.round(total / count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  // Slowest endpoints (top 10)
  const slowestEndpoints: EndpointStats[] = (() => {
    const grouped: { [endpoint: string]: { total: number; count: number } } = {};
    logs.forEach(log => {
      if (!grouped[log.endpoint]) {
        grouped[log.endpoint] = { total: 0, count: 0 };
      }
      grouped[log.endpoint].total += log.execution_time_ms;
      grouped[log.endpoint].count += 1;
    });
    return Object.entries(grouped)
      .map(([endpoint, { total, count }]) => ({
        endpoint,
        avgExecutionTime: Math.round(total / count),
      }))
      .sort((a, b) => (b.avgExecutionTime || 0) - (a.avgExecutionTime || 0))
      .slice(0, 10);
  })();

  // Request volume per endpoint
  const requestVolumePerEndpoint: EndpointStats[] = (() => {
    const grouped: { [endpoint: string]: number } = {};
    logs.forEach(log => {
      grouped[log.endpoint] = (grouped[log.endpoint] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([endpoint, count]) => ({
        endpoint,
        requestCount: count,
      }))
      .sort((a, b) => (b.requestCount || 0) - (a.requestCount || 0))
      .slice(0, 10);
  })();

  // HTTP methods distribution
  const httpMethodDistribution: HttpMethodDistribution[] = (() => {
    const grouped: { [method: string]: number } = {};
    logs.forEach(log => {
      const method = log.http_method_id || 'UNKNOWN';
      grouped[method] = (grouped[method] || 0) + 1;
    });
    return Object.entries(grouped).map(([method, count]) => ({ method, count }));
  })();

  // Status code distribution
  const statusCodeDistribution: StatusCodeDistribution[] = (() => {
    const grouped: { [range: string]: number } = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    logs.forEach(log => {
      const code = log.status_code;
      if (code >= 200 && code < 300) grouped['2xx'] += 1;
      else if (code >= 300 && code < 400) grouped['3xx'] += 1;
      else if (code >= 400 && code < 500) grouped['4xx'] += 1;
      else if (code >= 500 && code < 600) grouped['5xx'] += 1;
    });
    return Object.entries(grouped).map(([range, count]) => ({ range, count }));
  })();

  // Most failing endpoints
  const mostFailingEndpoints: EndpointStats[] = (() => {
    const grouped: { [endpoint: string]: number } = {};
    logs.filter(log => log.status_code >= 400).forEach(log => {
      grouped[log.endpoint] = (grouped[log.endpoint] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([endpoint, count]) => ({ endpoint, errorCount: count }))
      .sort((a, b) => (b.errorCount || 0) - (a.errorCount || 0))
      .slice(0, 10);
  })();

  // Latest 50 errors
  const latestErrors: ErrorDetail[] = logs
    .filter(log => log.status_code >= 400)
    .slice(0, 50)
    .map(log => ({
      timestamp: log.created_at || 'N/A',
      endpoint: log.endpoint,
      status_code: log.status_code,
      error_message: log.log_errors?.[0]?.error_message || 'No error message',
    }));

  // Error rate over time
  const errorRateOverTime = (() => {
    const grouped: { [date: string]: { total: number; errors: number } } = {};
    logs.forEach(log => {
      if (log.created_at) {
        const date = log.created_at.split('T')[0];
        if (!grouped[date]) {
          grouped[date] = { total: 0, errors: 0 };
        }
        grouped[date].total += 1;
        if (log.status_code >= 400) {
          grouped[date].errors += 1;
        }
      }
    });
    return Object.entries(grouped)
      .map(([date, { total, errors }]) => ({
        date,
        errorRate: total > 0 ? ((errors / total) * 100).toFixed(2) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  // Top IP addresses
  const topIpAddresses: IpStats[] = (() => {
    const grouped: { [ip: string]: number } = {};
    logs.forEach(log => {
      const ip = log.ip_address || 'Unknown';
      grouped[ip] = (grouped[ip] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([ip_address, count]) => ({ ip_address, requestCount: count }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10);
  })();

  // Top User Agents
  const topUserAgents: UserAgentStats[] = (() => {
    const grouped: { [ua: string]: number } = {};
    logs.forEach(log => {
      const ua = log.user_agent || 'Unknown';
      grouped[ua] = (grouped[ua] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([user_agent, count]) => ({ user_agent, requestCount: count }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10);
  })();

  if (isLoading) {
    return (
      <ProtectedRoute requireAdmin>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <CyclingLoader
              phrases={[
                'Loading API logs...',
                'Analyzing performance metrics...',
                'Calculating error rates...',
                'Processing request data...',
              ]}
            />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">
                API Performance <span className="gradient-text">Reports</span>
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                Comprehensive analytics for API requests and errors
              </p>
            </div>
            <Link to="/admin">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Refine the data displayed in all charts and tables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">To Date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status Code</label>
                  <Select value={statusCodeFilter} onValueChange={setStatusCodeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="2xx">2xx (Success)</SelectItem>
                      <SelectItem value="3xx">3xx (Redirect)</SelectItem>
                      <SelectItem value="4xx">4xx (Client Error)</SelectItem>
                      <SelectItem value="5xx">5xx (Server Error)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Endpoint</label>
                  <Select value={endpointFilter} onValueChange={setEndpointFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Endpoints</SelectItem>
                      {uniqueEndpoints.map(endpoint => (
                        <SelectItem key={endpoint} value={endpoint}>
                          {endpoint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">HTTP Method</label>
                  <Select value={httpMethodFilter} onValueChange={setHttpMethodFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {uniqueMethods.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardDescription className="text-xs mb-1">Total Requests</CardDescription>
                    <CardTitle className="text-3xl font-bold">{summaryStats.totalRequests.toLocaleString()}</CardTitle>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="glass card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardDescription className="text-xs mb-1">Total Errors</CardDescription>
                    <CardTitle className="text-3xl font-bold">{summaryStats.totalErrors.toLocaleString()}</CardTitle>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="glass card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardDescription className="text-xs mb-1">Avg Execution Time</CardDescription>
                    <CardTitle className="text-3xl font-bold">{Math.round(summaryStats.avgExecutionTime)} ms</CardTitle>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="glass card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardDescription className="text-xs mb-1">Unique Endpoints</CardDescription>
                    <CardTitle className="text-3xl font-bold">{summaryStats.uniqueEndpoints}</CardTitle>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-secondary" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Performance Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-primary" />
              Performance Metrics
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Average Execution Time Over Time */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Execution Time Trend</CardTitle>
                  <CardDescription>Average execution time per day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="avgExecutionTime" stroke="hsl(var(--primary))" strokeWidth={2} name="Avg Time (ms)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Slowest Endpoints */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Slowest Endpoints</CardTitle>
                  <CardDescription>Top 10 endpoints by average execution time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={slowestEndpoints} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="endpoint" type="category" width={150} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="avgExecutionTime" fill="hsl(var(--warning))" name="Avg Time (ms)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Request Volume Per Endpoint */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Request Volume</CardTitle>
                  <CardDescription>Top 10 endpoints by request count</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={requestVolumePerEndpoint}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="endpoint" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={100} />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="requestCount" fill="hsl(var(--primary))" name="Request Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* HTTP Methods Distribution */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>HTTP Methods</CardTitle>
                  <CardDescription>Distribution of HTTP request methods</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={httpMethodDistribution}
                        dataKey="count"
                        nameKey="method"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {httpMethodDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Code Distribution */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Status Code Distribution</CardTitle>
                  <CardDescription>HTTP response status code ranges</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusCodeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--accent))" name="Request Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reliability & Error Insights */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-destructive" />
              Reliability & Error Insights
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Error Rate Over Time */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Error Rate Trend</CardTitle>
                  <CardDescription>Percentage of errors per day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={errorRateOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="errorRate" stroke="hsl(var(--destructive))" strokeWidth={2} name="Error Rate (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Most Failing Endpoints */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Most Failing Endpoints</CardTitle>
                  <CardDescription>Endpoints with the highest error counts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Endpoint</TableHead>
                          <TableHead className="text-right">Error Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mostFailingEndpoints.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{item.endpoint}</TableCell>
                            <TableCell className="text-right font-bold text-destructive">{item.errorCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Latest Errors */}
              <Card className="glass lg:col-span-2">
                <CardHeader>
                  <CardTitle>Latest Errors (50 most recent)</CardTitle>
                  <CardDescription>Recent errors with timestamps and messages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Status Code</TableHead>
                          <TableHead>Error Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {latestErrors.map((error, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{new Date(error.timestamp).toLocaleString()}</TableCell>
                            <TableCell className="font-mono text-sm">{error.endpoint}</TableCell>
                            <TableCell className="font-bold text-destructive">{error.status_code}</TableCell>
                            <TableCell className="text-sm">{error.error_message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Request Metadata Analysis */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <BarChart3 className="h-6 w-6 mr-2 text-accent" />
              Request Metadata Analysis
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top IP Addresses */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Top IP Addresses</CardTitle>
                  <CardDescription>Most active IPs by request count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Address</TableHead>
                          <TableHead className="text-right">Request Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topIpAddresses.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{item.ip_address}</TableCell>
                            <TableCell className="text-right font-bold">{item.requestCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Top User Agents */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Top User Agents</CardTitle>
                  <CardDescription>Most common user agents by request count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User Agent</TableHead>
                          <TableHead className="text-right">Request Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topUserAgents.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm max-w-md truncate">{item.user_agent}</TableCell>
                            <TableCell className="text-right font-bold">{item.requestCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default APIPerformanceReports;
