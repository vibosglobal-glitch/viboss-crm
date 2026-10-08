'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight, BarChart3, Bell, Clock,
  FileSpreadsheet, Shield, CalendarCheck, Users, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: FileSpreadsheet, title: 'Bulk CSV Upload', desc: 'Import thousands of leads instantly with smart column mapping and duplicate detection.' },
  { icon: Bell, title: 'Smart Follow-up Reminders', desc: 'Never miss a follow-up. Get real-time alerts for due and overdue tasks.' },
  { icon: BarChart3, title: 'Agent KPI Tracking', desc: 'Monitor individual performance with calls, meetings, and revenue metrics.' },
  { icon: CalendarCheck, title: 'Sales Pipeline View', desc: 'Kanban-style pipeline to visualize your entire sales funnel at a glance.' },
  { icon: Users, title: 'Team Management', desc: 'Assign leads, compare agents, and optimize your team\'s performance.' },
  { icon: Shield, title: 'Role-Based Access', desc: 'Admin and agent roles with tailored dashboards and permissions.' },
];


const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 items-center justify-center rounded-xl bg-foreground/5 px-2 py-1 backdrop-blur-md border border-border shadow-sm">
              <img src="/vibos-logo.png" alt="V!BOS" width={120} height={24} className="h-6 w-auto" />
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="gradient-primary border-0">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(187_65%_42%/0.08),transparent_60%)]" />
        <div className="container mx-auto px-6 relative">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-sm text-accent-foreground mb-6">
              <Zap className="h-3.5 w-3.5" />
              Insurance Lead Management Platform
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight mb-6">
              Never Miss a<br />
              <span className="text-primary">Follow-Up</span> Again
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Lead tracking + smart reminders + agent KPI monitoring. The all-in-one platform
              to supercharge your insurance sales pipeline.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="gradient-primary border-0 px-8 h-12 text-base">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="px-8 h-12 text-base">
                  See Features
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            className="mt-16 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="rounded-xl border border-border bg-card shadow-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-warning/60" />
                <div className="h-3 w-3 rounded-full bg-success/60" />
                <span className="ml-2 text-xs text-muted-foreground">V!BOS Dashboard</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Leads', value: '1,247', icon: Users },
                  { label: 'Calls Made', value: '3,891', icon: BarChart3 },
                  { label: 'Follow-ups Due', value: '23', icon: Clock },
                  { label: 'Meetings', value: '118', icon: CalendarCheck },
                ].map((kpi, i) => (
                  <div key={i} className="rounded-lg bg-secondary/50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <kpi.icon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    </div>
                    <span className="text-xl font-bold text-foreground">{kpi.value}</span>
                  </div>
                ))}
              </div>
              <div className="h-32 rounded-lg bg-secondary/30 flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Lead Overview Table</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to close more deals
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built specifically for insurance teams who need powerful lead management without the complexity.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="rounded-xl border border-border bg-background p-6 shadow-card hover:shadow-card-hover transition-shadow"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-foreground/5 px-2 py-1 backdrop-blur-sm border border-border">
              <img src="/vibos-logo.png" alt="V!BOS" width={100} height={20} className="h-5 w-auto opacity-90" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Vibos Global. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
