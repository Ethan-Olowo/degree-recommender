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
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      // Average indicator values by industry and country
      const { data: indicatorRows } = await supabase
        .from("market_indicator_values")
        .select("industry_id, country_code, indicator_type_id, value, last_updated");
      const { data: industries } = await supabase
        .from("industries")
        .select("industry_id, industry_name");
      const { data: countries } = await supabase
        .from("countries")
        .select("country_code, country_name");
      const { data: indicatorTypes } = await supabase
        .from("indicator_types")
        .select("indicator_type_id, indicator_name");

  // Map ids to names
  const industryMap = new Map(industries?.map(i => [i.industry_id, i.industry_name]));
  const countryMap = new Map(countries?.map(c => [c.country_code, c.country_name]));
  const indicatorTypeMap = new Map(indicatorTypes?.map(t => [t.indicator_type_id, t.indicator_name]));

  // Helper functions to get mapped names or null
  const getIndustryName = (id: string) => industryMap.has(id) ? industryMap.get(id) : null;
  const getCountryName = (code: string) => countryMap.has(code) ? countryMap.get(code) : null;

      // Average indicator values by industry
      const avgIndicatorByIndustry: Array<{ industry: string|null; indicator_type: string; avg_value: number }> = [];
      const industryGroupMap = new Map<string, { total: number; count: number }>();
      indicatorRows?.forEach(row => {
        const key = `${row.industry_id}|${row.indicator_type_id}`;
        const stats = industryGroupMap.get(key) || { total: 0, count: 0 };
        stats.total += row.value;
        stats.count += 1;
        industryGroupMap.set(key, stats);
      });
      industryGroupMap.forEach((stats, key) => {
        const [industry_id, indicator_type_id] = key.split("|");
        avgIndicatorByIndustry.push({
          industry: getIndustryName(industry_id),
          indicator_type: indicatorTypeMap.get(indicator_type_id) || indicator_type_id,
          avg_value: stats.count > 0 ? stats.total / stats.count : 0,
        });
      });

      // Average indicator values by country
      const avgIndicatorByCountry: Array<{ country: string|null; indicator_type: string; avg_value: number }> = [];
      const countryGroupMap = new Map<string, { total: number; count: number }>();
      indicatorRows?.forEach(row => {
        const key = `${row.country_code}|${row.indicator_type_id}`;
        const stats = countryGroupMap.get(key) || { total: 0, count: 0 };
        stats.total += row.value;
        stats.count += 1;
        countryGroupMap.set(key, stats);
      });
      countryGroupMap.forEach((stats, key) => {
        const [country_code, indicator_type_id] = key.split("|");
        avgIndicatorByCountry.push({
          country: getCountryName(country_code),
          indicator_type: indicatorTypeMap.get(indicator_type_id) || indicator_type_id,
          avg_value: stats.count > 0 ? stats.total / stats.count : 0,
        });
      });


      // Top industries for each indicator type
      const topIndustriesByIndicator: MarketInsightsData["topIndustriesByIndicator"] = [];
      indicatorTypes?.forEach(type => {
        const filtered = avgIndicatorByIndustry.filter(d => d.indicator_type === type.indicator_name);
        const sorted = filtered.sort((a, b) => b.avg_value - a.avg_value).slice(0, 5);
        sorted.forEach(d => {
          topIndustriesByIndicator.push({
            indicator_type: type.indicator_name,
            industry: d.industry,
            avg_value: d.avg_value,
          });
        });
      });

      // Top countries for each indicator type
      const topCountriesByIndicator: MarketInsightsData["topCountriesByIndicator"] = [];
      indicatorTypes?.forEach(type => {
        const filtered = avgIndicatorByCountry.filter(d => d.indicator_type === type.indicator_name);
        const sorted = filtered.sort((a, b) => b.avg_value - a.avg_value).slice(0, 5);
        sorted.forEach(d => {
          topCountriesByIndicator.push({
            indicator_type: type.indicator_name,
            country: d.country,
            avg_value: d.avg_value,
          });
        });
      });

      // Indicator trends over time per country
      const indicatorTrendsCountry: MarketInsightsData["indicatorTrendsCountry"] = [];
      indicatorRows?.forEach(row => {
        if (row.country_code && row.indicator_type_id) {
          indicatorTrendsCountry.push({
            country: getCountryName(row.country_code),
            indicator_type: indicatorTypeMap.get(row.indicator_type_id) || row.indicator_type_id,
            date: row.last_updated ? new Date(row.last_updated).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Unknown",
            avg_value: row.value,
          });
        }
      });

      // Indicator trends over time per industry
      const indicatorTrendsIndustry: MarketInsightsData["indicatorTrendsIndustry"] = [];
      indicatorRows?.forEach(row => {
        if (row.industry_id && row.indicator_type_id) {
          indicatorTrendsIndustry.push({
            industry: getIndustryName(row.industry_id),
            indicator_type: indicatorTypeMap.get(row.indicator_type_id) || row.indicator_type_id,
            date: row.last_updated ? new Date(row.last_updated).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Unknown",
            avg_value: row.value,
          });
        }
      });

      // Missing or outdated data summary (exclude if newer record exists for same industry, country, indicator type)
      const missingOrOutdated: MarketInsightsData["missingOrOutdated"] = [];
      const now = new Date();
      indicatorRows?.forEach((row, idx, arr) => {
        const isMissingOrOutdated = !row.value || !row.last_updated || (new Date(row.last_updated).getTime() < now.getTime() - 1000 * 60 * 60 * 24 * 365);
        if (isMissingOrOutdated) {
          // Check if a newer record exists for same industry, country, indicator type
          const newerExists = arr.some(other => {
            if (other === row) return false;
            return (
              other.industry_id === row.industry_id &&
              other.country_code === row.country_code &&
              other.indicator_type_id === row.indicator_type_id &&
              other.last_updated &&
              row.last_updated &&
              new Date(other.last_updated).getTime() > new Date(row.last_updated).getTime()
            );
          });
          if (!newerExists) {
            missingOrOutdated.push({
              indicator_type: indicatorTypeMap.get(row.indicator_type_id) || row.indicator_type_id,
              country: getCountryName(row.country_code),
              industry: getIndustryName(row.industry_id),
              last_updated: row.last_updated,
            });
          }
        }
      });

      // Correlation between industry performance and degree recommendations
      const { data: recommendations } = await supabase
        .from("recommendations")
        .select("program_id, user_id");
      const { data: degreeIndustries } = await supabase
        .from("degree_industries")
        .select("program_id, industry_id");
      // Map program_id to industry
      const programIndustryMap = new Map(degreeIndustries?.map(d => [d.program_id, d.industry_id]));
      // Aggregate recommendations per industry
      const industryRecMap = new Map<string, { total: number; count: number }>();
      recommendations?.forEach(rec => {
        const industry_id = programIndustryMap.get(rec.program_id);
        if (industry_id) {
          const stats = industryRecMap.get(industry_id) || { total: 0, count: 0 };
          stats.total += 1;
          stats.count += 1;
          industryRecMap.set(industry_id, stats);
        }
      });
      // Correlate with avg indicator value
      const correlationIndustryDegree: MarketInsightsData["correlationIndustryDegree"] = [];
      industryRecMap.forEach((recStats, industry_id) => {
        const mappedIndustry = getIndustryName(industry_id);
        const avgIndicator = avgIndicatorByIndustry.filter(d => d.industry === mappedIndustry).reduce((acc, d) => acc + d.avg_value, 0);
        const avgRec = recStats.count > 0 ? recStats.total / recStats.count : 0;
        correlationIndustryDegree.push({
          industry: mappedIndustry,
          avg_indicator_value: avgIndicator,
          avg_recommendations: avgRec,
        });
      });

      setData({
  avgIndicatorByIndustry,
  avgIndicatorByCountry,
        topIndustriesByIndicator,
        topCountriesByIndicator,
        indicatorTrendsCountry,
        indicatorTrendsIndustry,
        missingOrOutdated,
        correlationIndustryDegree,
      });
    } catch (error) {
      console.error("Error fetching market insights data:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

          {/* Average indicator values by industry (bar chart per indicator type, only if industry is defined) */}
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
              // If most or all entries for this indicatorType have null/empty industry, skip rendering
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

          {/* Average indicator values by country (bar chart per indicator type, only if country is defined) */}
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
              // If most or all entries for this indicatorType have null/empty country, skip rendering
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
              // If most or all entries for this indicatorType have null/empty industry, skip rendering
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
              // If most or all entries for this indicatorType have null/empty country, skip rendering
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
              // For each indicator, group data by date, each country is a key
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
              // For each indicator, group data by date, each industry is a key
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

          {/* Missing or outdated data summary (table) */}
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
      </Layout>
    </ProtectedRoute>
  );
};

export default MarketInsightsReports;
