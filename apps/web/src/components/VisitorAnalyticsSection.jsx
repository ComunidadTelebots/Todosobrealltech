import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Globe, Monitor, Smartphone, Tablet, Chrome, Compass, LayoutTemplate } from 'lucide-react';

const VisitorAnalyticsSection = () => {
  // Mock data for demonstration
  const deviceData = [
    { name: 'Desktop', value: 65, color: 'hsl(var(--chart-1))', icon: Monitor },
    { name: 'Mobile', value: 30, color: 'hsl(var(--chart-2))', icon: Smartphone },
    { name: 'Tablet', value: 5, color: 'hsl(var(--chart-3))', icon: Tablet },
  ];

  const browserData = [
    { name: 'Chrome', value: 55, color: 'hsl(var(--chart-1))' },
    { name: 'Safari', value: 25, color: 'hsl(var(--chart-2))' },
    { name: 'Firefox', value: 10, color: 'hsl(var(--chart-3))' },
    { name: 'Edge', value: 7, color: 'hsl(var(--chart-4))' },
    { name: 'Other', value: 3, color: 'hsl(var(--chart-5))' },
  ];

  const osData = [
    { name: 'Windows', value: 45, color: 'hsl(var(--chart-1))' },
    { name: 'macOS', value: 25, color: 'hsl(var(--chart-2))' },
    { name: 'iOS', value: 15, color: 'hsl(var(--chart-3))' },
    { name: 'Android', value: 10, color: 'hsl(var(--chart-4))' },
    { name: 'Linux', value: 5, color: 'hsl(var(--chart-5))' },
  ];

  const countryData = [
    { country: 'United States', visitors: 12450, percentage: 35 },
    { country: 'United Kingdom', visitors: 4200, percentage: 12 },
    { country: 'Germany', visitors: 3100, percentage: 9 },
    { country: 'Canada', visitors: 2800, percentage: 8 },
    { country: 'France', visitors: 2100, percentage: 6 },
  ];

  const referrerData = [
    { source: 'Direct', visitors: 8500, percentage: 40 },
    { source: 'Google', visitors: 6200, percentage: 30 },
    { source: 'Twitter', visitors: 2100, percentage: 10 },
    { source: 'GitHub', visitors: 1500, percentage: 7 },
    { source: 'Reddit', visitors: 800, percentage: 4 },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-2 rounded-lg shadow-lg text-sm">
          <span className="font-medium">{payload[0].name}: </span>
          <span className="text-muted-foreground">{payload[0].value}%</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Monitor className="w-5 h-5 text-muted-foreground" />
              Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {deviceData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Browsers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Chrome className="w-5 h-5 text-muted-foreground" />
              Browsers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={browserData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {browserData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {browserData.slice(0, 3).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Operating Systems */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-muted-foreground" />
              Operating Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={osData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {osData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {osData.slice(0, 3).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Globe className="w-5 h-5 text-muted-foreground" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Visitors</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countryData.map((row) => (
                  <TableRow key={row.country}>
                    <TableCell className="font-medium">{row.country}</TableCell>
                    <TableCell className="text-right">{row.visitors.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{row.percentage}%</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${row.percentage}%` }} />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Compass className="w-5 h-5 text-muted-foreground" />
              Top Referrers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Visitors</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrerData.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell className="font-medium">{row.source}</TableCell>
                    <TableCell className="text-right">{row.visitors.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{row.percentage}%</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${row.percentage}%` }} />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisitorAnalyticsSection;