import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableBody, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Layout } from "../../components/Layout";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { Settings } from "lucide-react";
import { BarChart, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, ScatterChart, Scatter, Bar, Line } from "recharts";
import { ChartContainer, ChartTooltipContent } from "../../components/ui/chart";
// ChartTooltipContent imported above
import { supabase } from "../../integrations/supabase/client";

interface MarketInsightsData {
  avgIndicatorByIndustry: Array<{ industry: string|null; indicator_type: string; avg_value: number }>;
  avgIndicatorByCountry: Array<{ country: string|null; indicator_type: string; avg_value: number }>;
  topIndustriesByIndicator: Array<{ indicator_type: string; industry: string; avg_value: number }>;
  topCountriesByIndicator: Array<{ indicator_type: string; country: string; avg_value: number }>;
  indicatorTrendsCountry: Array<{ country: string; indicator_type: string; date: string; avg_value: number }>;
  indicatorTrendsIndustry: Array<{ industry: string; indicator_type: string; date: string; avg_value: number }>;
  missingOrOutdated: Array<{ indicator_type: string; country?: string; industry?: string; last_updated?: string }>;
  correlationIndustryDegree: Array<{ industry: string; avg_indicator_value: number; avg_recommendations: number }>;
}

const MarketInsightsReports = () => {
  const [data, setData] = useState<MarketInsightsData>({
    avgIndicatorByIndustry: [],
    avgIndicatorByCountry: [],
    topIndustriesByIndicator: [],
    topCountriesByIndicator: [],
    indicatorTrendsCountry: [],
    indicatorTrendsIndustry: [],
    missingOrOutdated: [],
    correlationIndustryDegree: [],
  });
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    const fetchReportsData = async () => {
      setIsLoading(true);
      try {
        // Call the database function to get all report data
        // Use 'any' type for rpc result to avoid type error
        const { data: rpcData, error } = await (supabase.rpc as any)('get_market_insights_reports');
        if (error) {
          throw error;
        }
        // Defensive: ensure all keys exist, fallback to empty object if null
        const safeData = rpcData ?? {};
        setData({
          avgIndicatorByIndustry: safeData.avgIndicatorByIndustry ?? [],
          avgIndicatorByCountry: safeData.avgIndicatorByCountry ?? [],
          topIndustriesByIndicator: safeData.topIndustriesByIndicator ?? [],
          topCountriesByIndicator: safeData.topCountriesByIndicator ?? [],
          indicatorTrendsCountry: safeData.indicatorTrendsCountry ?? [],
          indicatorTrendsIndustry: safeData.indicatorTrendsIndustry ?? [],
          missingOrOutdated: safeData.missingOrOutdated ?? [],
          correlationIndustryDegree: safeData.correlationIndustryDegree ?? [],
        });
      } catch (error) {
        console.error('Error fetching market insights data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportsData();
  }, []);

  const chartConfig = {
    avg_value: {
      label: "Avg Value",
      color: "hsl(var(--primary))",
    },
    industry: {
      label: "Industry",
      color: "hsl(var(--accent))",
    },
    country: {
      label: "Country",
      color: "hsl(var(--success))",
    },
    indicator_type: {
      label: "Indicator Type",
      color: "hsl(var(--warning))",
    },
    avg_indicator_value: {
      label: "Avg Indicator Value",
      color: "hsl(var(--primary))",
    },
    avg_recommendations: {
      label: "Avg Recommendations",
      color: "hsl(var(--accent))",
    },
  };

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-8 animate-fade-in">
          {/* Header with Manage Link */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold">
                Market Insights <span className="gradient-text">Reports</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Data-driven insights on market indicators, industries, and countries
              </p>
            </div>
            <Link to="/admin/indicators">
              <Button className="btn-glow">
                <Settings className="mr-2 h-4 w-4" />
                Manage Indicators
              </Button>
            </Link>
          </div>

          {/* 2-column layout for industry/country data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left column: Industry data */}
            <div className="space-y-8">
              {/* Average indicator values by industry */}
              {(() => {
                if (isLoading) {
                  return (
                    <Card className="glass">
                      <CardHeader>
                        <CardTitle>Average Indicator Values by Industry</CardTitle>
                        <CardDescription>Average values for each industry and indicator type</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-muted rounded animate-shimmer"></div>
                      </CardContent>
                    </Card>
                  );
                }
                const indicatorTypes = Array.from(new Set(data.avgIndicatorByIndustry.map(d => d.indicator_type)));
                return indicatorTypes.map((indicatorType: string, idx) => {
                  const chartData = data.avgIndicatorByIndustry.filter(d => d.indicator_type === indicatorType && d.industry && d.industry !== null && d.industry !== "");
                  const totalEntries = data.avgIndicatorByIndustry.filter(d => d.indicator_type === indicatorType).length;
                  if (chartData.length === 0 || chartData.length < totalEntries * 0.5) return null;
                  return (
                    <Card className="glass" key={indicatorType}>
                      <CardHeader>
                        <CardTitle>{`Average Indicator Values by Industry: ${indicatorType}`}</CardTitle>
                        <CardDescription>{`Average values for each industry for indicator: ${indicatorType}`}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="industry" stroke="hsl(var(--muted-foreground))" />
                              <YAxis stroke="hsl(var(--muted-foreground))" />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="avg_value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  );
                });
              })()}

              {/* Top industries for each indicator type (table per indicator) */}
              {(() => {
                if (isLoading) {
                  return (
                    <Card className="glass">
                      <CardHeader>
                        <CardTitle>Top Industries by Indicator Type</CardTitle>
                        <CardDescription>Highest average values per indicator</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48 bg-muted rounded animate-shimmer"></div>
                      </CardContent>
                    </Card>
                  );
                }
                const indicatorTypes = Array.from(new Set(data.topIndustriesByIndicator.map(d => d.indicator_type)));
                return indicatorTypes.map((indicatorType: string, idx) => {
                  const tableData = data.topIndustriesByIndicator.filter(d => d.indicator_type === indicatorType && d.industry && d.industry !== null && d.industry !== "");
                  const totalEntries = data.topIndustriesByIndicator.filter(d => d.indicator_type === indicatorType).length;
                  if (tableData.length === 0 || tableData.length < totalEntries * 0.5) return null;
                  return (
                    <Card className="glass" key={indicatorType}>
                      <CardHeader>
                        <CardTitle>Top Industries: {indicatorType}</CardTitle>
                        <CardDescription>Highest average values for indicator: {indicatorType}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableCell>Industry</TableCell>
                              <TableCell>Avg Value</TableCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableData.map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{row.industry}</TableCell>
                                <TableCell>{row.avg_value.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                });
              })()}

              {/* Indicator trends over time per industry (one graph per indicator, lines by industry) */}
              {(() => {
                if (isLoading) {
                  return (
                    <Card className="glass">
                      <CardHeader>
                        <CardTitle>Indicator Trends Over Time (Industry)</CardTitle>
                        <CardDescription>Trends for each industry, split by indicator type</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-muted rounded animate-shimmer"></div>
                      </CardContent>
                    </Card>
                  );
                }
                const indicatorTypes = Array.from(new Set(data.indicatorTrendsIndustry.map(d => d.indicator_type)));
                return indicatorTypes.map((indicatorType, idx) => {
                  const filtered = data.indicatorTrendsIndustry.filter(d => d.indicator_type === indicatorType);
                  const industries = Array.from(new Set(filtered.map(d => d.industry)));
                  const grouped = new Map();
                  filtered.forEach(d => {
                    const key = d.date;
                    if (!grouped.has(key)) grouped.set(key, { date: key });
                    grouped.get(key)[d.industry] = d.avg_value;
                  });
                  const chartData = Array.from(grouped.values());
                  return (
                    <Card className="glass" key={indicatorType}>
                      <CardHeader>
                        <CardTitle>Indicator Trends Over Time (Industry): {indicatorType}</CardTitle>
                        <CardDescription>Trends for each industry for indicator: {indicatorType}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                              <YAxis stroke="hsl(var(--muted-foreground))" />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              {industries.map((industry, iidx) => (
                                <Line
                                  key={industry}
                                  type="monotone"
                                  dataKey={industry}
                                  name={industry}
                                  stroke={`hsl(var(--accent-${iidx % 8}))`}
                                  dot={false}
                                  isAnimationActive={false}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  );
                });
              })()}

              {/* Correlation between industry performance and degree recommendations (scatter plot) */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Industry Performance vs Degree Recommendations</CardTitle>
                  <CardDescription>Correlation between indicator values and recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-64 bg-muted rounded animate-shimmer"></div>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="avg_indicator_value" stroke="hsl(var(--muted-foreground))" />
                          <YAxis dataKey="avg_recommendations" stroke="hsl(var(--muted-foreground))" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Scatter data={data.correlationIndustryDegree} fill="hsl(var(--primary))" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column: Country data */}
            <div className="space-y-8">
              {/* Average indicator values by country */}
              {(() => {
                if (isLoading) {
                  return (
                    <Card className="glass">
                      <CardHeader>
                        <CardTitle>Average Indicator Values by Country</CardTitle>
                        <CardDescription>Average values for each country and indicator type</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-muted rounded animate-shimmer"></div>
                      </CardContent>
                    </Card>
                  );
                }
                const indicatorTypes = Array.from(new Set(data.avgIndicatorByCountry.map(d => d.indicator_type)));
                return indicatorTypes.map((indicatorType: string, idx) => {
                  const chartData = data.avgIndicatorByCountry.filter(d => d.indicator_type === indicatorType && d.country && d.country !== null && d.country !== "");
                  const totalEntries = data.avgIndicatorByCountry.filter(d => d.indicator_type === indicatorType).length;
                  if (chartData.length === 0 || chartData.length < totalEntries * 0.5) return null;
                  return (
                    <Card className="glass" key={indicatorType}>
                      <CardHeader>
                        <CardTitle>{`Average Indicator Values by Country: ${indicatorType}`}</CardTitle>
                        <CardDescription>{`Average values for each country for indicator: ${indicatorType}`}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="country" stroke="hsl(var(--muted-foreground))" />
                              <YAxis stroke="hsl(var(--muted-foreground))" />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="avg_value" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  );
                });
              })()}

              {/* Top countries for each indicator type (table per indicator) */}
              {(() => {
                if (isLoading) {
                  return (
                    <Card className="glass">
                      <CardHeader>
                        <CardTitle>Top Countries by Indicator Type</CardTitle>
                        <CardDescription>Highest average values per indicator</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48 bg-muted rounded animate-shimmer"></div>
                      </CardContent>
                    </Card>
                  );
                }
                const indicatorTypes = Array.from(new Set(data.topCountriesByIndicator.map(d => d.indicator_type)));
                return indicatorTypes.map((indicatorType: string, idx) => {
                  const tableData = data.topCountriesByIndicator.filter(d => d.indicator_type === indicatorType && d.country && d.country !== null && d.country !== "");
                  const totalEntries = data.topCountriesByIndicator.filter(d => d.indicator_type === indicatorType).length;
                  if (tableData.length === 0 || tableData.length < totalEntries * 0.5) return null;
                  return (
                    <Card className="glass" key={indicatorType}>
                      <CardHeader>
                        <CardTitle>Top Countries: {indicatorType}</CardTitle>
                        <CardDescription>Highest average values for indicator: {indicatorType}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableCell>Country</TableCell>
                              <TableCell>Avg Value</TableCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableData.map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{row.country}</TableCell>
                                <TableCell>{row.avg_value.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                });
              })()}

              {/* Indicator trends over time per country (one graph per indicator, lines by country) */}
              {(() => {
                if (isLoading) {
                  return (
                    <Card className="glass">
                      <CardHeader>
                        <CardTitle>Indicator Trends Over Time (Country)</CardTitle>
                        <CardDescription>Trends for each country, split by indicator type</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-muted rounded animate-shimmer"></div>
                      </CardContent>
                    </Card>
                  );
                }
                const indicatorTypes = Array.from(new Set(data.indicatorTrendsCountry.map(d => d.indicator_type)));
                return indicatorTypes.map((indicatorType, idx) => {
                  const filtered = data.indicatorTrendsCountry.filter(d => d.indicator_type === indicatorType);
                  const countries = Array.from(new Set(filtered.map(d => d.country)));
                  const grouped = new Map();
                  filtered.forEach(d => {
                    const key = d.date;
                    if (!grouped.has(key)) grouped.set(key, { date: key });
                    grouped.get(key)[d.country] = d.avg_value;
                  });
                  const chartData = Array.from(grouped.values());
                  return (
                    <Card className="glass" key={indicatorType}>
                      <CardHeader>
                        <CardTitle>Indicator Trends Over Time (Country): {indicatorType}</CardTitle>
                        <CardDescription>Trends for each country for indicator: {indicatorType}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                              <YAxis stroke="hsl(var(--muted-foreground))" />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              {countries.map((country, cidx) => (
                                <Line
                                  key={country}
                                  type="monotone"
                                  dataKey={country}
                                  name={country}
                                  stroke={`hsl(var(--accent-${cidx % 8}))`}
                                  dot={false}
                                  isAnimationActive={false}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          </div>

          {/* Missing or outdated data summary (table) - full width */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Missing or Outdated Data Summary</CardTitle>
              <CardDescription>Indicators with missing or outdated values</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 bg-muted rounded animate-shimmer"></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>Indicator Type</TableCell>
                      <TableCell>Country</TableCell>
                      <TableCell>Industry</TableCell>
                      <TableCell>Last Updated</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.missingOrOutdated.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.indicator_type}</TableCell>
                        <TableCell>{row.country}</TableCell>
                        <TableCell>{row.industry}</TableCell>
                        <TableCell>{row.last_updated || "Never"}</TableCell>
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

export default MarketInsightsReports;
