'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ChartDataPoint {
  date: string;
  leads: number;
  calls: number;
}

interface DailyActivityChartProps {
  data: ChartDataPoint[];
  agents: any[];
  selectedUser: string;
  onUserChange: (user: string) => void;
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-xl backdrop-blur-md animate-in fade-in zoom-in duration-200">
        <p className="mb-2 text-xs font-black text-foreground uppercase tracking-wider">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[11px] font-medium text-muted-foreground">Leads Created</span>
            </div>
            <span className="text-xs font-bold text-foreground">{payload[0]?.value || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-muted-foreground">Total Calls</span>
            </div>
            <span className="text-xs font-bold text-emerald-500">{payload[1]?.value || 0}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function DailyActivityChart({ 
  data, 
  agents, 
  selectedUser, 
  onUserChange 
}: DailyActivityChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-border/50 bg-gradient-to-r from-card to-secondary/20">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Daily Activity</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Leads created & calls made</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
          <select
            value={selectedUser}
            onChange={(e) => onUserChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground w-full sm:w-[180px] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option value="all">All Team Members</option>
            {agents.map((agent: any) => (
              <option key={agent.id || agent._id} value={agent.name}>{agent.name}</option>
            ))}
          </select>
          <div className="hidden sm:flex items-center gap-4 px-2">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]" />
              <span className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">Leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <span className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">Calls</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} barGap={4} barCategoryGap="25%">
            <defs>
              <linearGradient id="barLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="barCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground)/0.7)', fontWeight: 500 }}
              dy={10}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fill: 'hsl(var(--muted-foreground)/0.7)', fontWeight: 500 }}
              dx={-10}
            />
            <Tooltip 
              content={<CustomBarTooltip />} 
              cursor={{ fill: 'hsl(var(--muted-foreground))', fillOpacity: 0.04, radius: 8 }} 
            />
            <Bar
              dataKey="leads"
              fill="url(#barLeads)"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
              animationDuration={1000}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="calls"
              fill="url(#barCalls)"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
              animationDuration={1000}
              animationEasing="ease-out"
              animationBegin={150}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
