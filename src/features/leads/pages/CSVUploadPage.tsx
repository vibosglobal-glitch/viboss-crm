'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight, Loader2, Download, Check, AlertTriangle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useImportCSV, useImportPreview, useUndoImport } from '@/features/leads/hooks/useLeads';
import type { LeadImportResult } from '@/features/leads/api/leads.api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from 'sonner';

// Valid model fields allowed for mapping
const VALID_CRM_FIELDS = [
  { id: 'firstName', label: 'First Name' },
  { id: 'lastName', label: 'Last Name' },
  { id: 'name', label: 'Full Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'title', label: 'Job Title' },
  { id: 'companyName', label: 'Company Name' },
  { id: 'workDirectPhone', label: 'Work Direct Phone' },
  { id: 'homePhone', label: 'Home Phone' },
  { id: 'mobilePhone', label: 'Mobile Phone' },
  { id: 'corporatePhone', label: 'Corporate Phone' },
  { id: 'otherPhone', label: 'Other Phone' },
  { id: 'companyPhone', label: 'Company Phone' },
  { id: 'employeeCount', label: 'Employee Count' },
  { id: 'personLinkedinUrl', label: 'Personal LinkedIn' },
  { id: 'website', label: 'Website' },
  { id: 'companyLinkedinUrl', label: 'Company LinkedIn' },
  { id: 'address', label: 'Address' },
  { id: 'city', label: 'City' },
  { id: 'state', label: 'State' },
  { id: 'status', label: 'Lead Status' },
  { id: 'assignedAgent', label: 'Assigned Agent' },
  { id: 'notes', label: 'Notes' },
  { id: 'nextFollowUp', label: 'Next Follow-up' },
  { id: 'priority', label: 'Priority (A/B/C)' },
  { id: 'segment', label: 'Segment / Industry' },
  { id: 'sourceChannel', label: 'Source Channel' },
  { id: 'revenue', label: 'Revenue / Deal Value' },
  { id: 'bookedDate', label: 'Booked Date (creates appointment)' },
  { id: 'bookedCallTime', label: 'Booked Call Time' },
];

const ACCEPTED_EXTENSIONS = '.csv,.tsv,.txt,.xlsx,.xls';
const CANONICAL_LEAD_STATUSES = ['New Lead', 'In Progress', 'Contacted', 'Appointment Set', 'Active Account'] as const;

type PreviewLead = {
  companyName: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  city: string;
  state: string;
};

function buildPreviewLead(row: Record<string, string>, mappings: Record<string, string | null>): PreviewLead {
  const mappedValues: Record<string, string> = {};

  for (const [header, field] of Object.entries(mappings)) {
    if (!field) continue;
    const value = row[header]?.trim();
    if (!value) continue;
    mappedValues[field] = value;
  }

  const firstName = mappedValues.firstName || '';
  const lastName = mappedValues.lastName || '';
  const fullName = mappedValues.name || [firstName, lastName].filter(Boolean).join(' ').trim();
  const phone = mappedValues.workDirectPhone || mappedValues.mobilePhone || mappedValues.homePhone || mappedValues.corporatePhone || mappedValues.companyPhone || mappedValues.otherPhone || mappedValues.phone || '';

  return {
    companyName: mappedValues.companyName || '',
    name: fullName,
    title: mappedValues.title || '',
    email: mappedValues.email || '',
    phone,
    city: mappedValues.city || '',
    state: mappedValues.state || '',
  };
}

export default function CSVUploadPage() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Mapping state
  const [mappingData, setMappingData] = useState<any>(null);
  const [customMappings, setCustomMappings] = useState<Record<string, string | null>>({});
  const [statusValueMappings, setStatusValueMappings] = useState<Record<string, string>>({});

  const [result, setResult] = useState<LeadImportResult | null>(null);
  const [undoDeletedCount, setUndoDeletedCount] = useState<number | null>(null);

  const previewMutation = useImportPreview();
  const importMutation = useImportCSV();
  const undoImportMutation = useUndoImport();

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    try {
      const res = await previewMutation.mutateAsync(f) as any;
      setMappingData(res);

      // Initialize custom mappings from auto-detected ones
      const initialMap: Record<string, string | null> = {};
      res.mappings.forEach((m: any) => {
        initialMap[m.csvHeader] = m.crmField;
      });
      setCustomMappings(initialMap);

      const initialStatusMap: Record<string, string> = {};
      if (res.statusSuggestionsByValue && typeof res.statusSuggestionsByValue === 'object') {
        Object.entries(res.statusSuggestionsByValue).forEach(([rawValue, mappedStatus]) => {
          if (typeof mappedStatus === 'string' && mappedStatus) {
            initialStatusMap[rawValue] = mappedStatus;
          }
        });
      }
      setStatusValueMappings(initialStatusMap);

      setStep('mapping');
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse file');
      setFile(null);
    }
  }, [previewMutation]);

  const handleMappingConfirm = () => {
    setStep('preview');
  };

  const handleImport = async () => {
    if (!file) return;
    setStep('importing');
    try {
      const statusHeaders = Object.entries(customMappings)
        .filter(([, field]) => field === 'status')
        .map(([header]) => header);

      const distinctStatusValues = Array.from(new Set(
        statusHeaders.flatMap((header) => (mappingData?.columnDistinctValues?.[header] || []) as string[])
      ));

      const effectiveStatusMappings: Record<string, string> = {};
      distinctStatusValues.forEach((rawValue) => {
        const mapped = statusValueMappings[rawValue] || mappingData?.statusSuggestionsByValue?.[rawValue];
        if (mapped && mapped !== 'unmapped') {
          effectiveStatusMappings[rawValue] = mapped;
        }
      });

      const res = await importMutation.mutateAsync({
        file,
        customMappings,
        statusValueMappings: effectiveStatusMappings,
      });
      setUndoDeletedCount(null);
      setResult(res);
      setStep('done');
    } catch (err: any) {
      setUndoDeletedCount(null);
      setResult({ imported: 0, errors: 1, skipped: 0, errorDetails: [{ row: 0, error: err.message }], createdLeadIds: [], canUndoImport: false });
      setStep('done');
    }
  };

  const handleUndoImport = async () => {
    if (!result || result.createdLeadIds.length === 0 || undoImportMutation.isPending) {
      return;
    }

    const confirmed = window.confirm(`Undo this import and delete ${result.createdLeadIds.length} imported lead(s)?`);
    if (!confirmed) {
      return;
    }

    try {
      const undoResult = await undoImportMutation.mutateAsync({ leadIds: result.createdLeadIds });
      setUndoDeletedCount(undoResult.deleted);
      setResult((previous) => previous ? { ...previous, createdLeadIds: [], canUndoImport: false } : previous);
      toast.success(`Undo complete. ${undoResult.deleted} imported lead(s) removed.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to undo import');
    }
  };

  const isAcceptedFile = (f: File) => {
    const ext = f.name.toLowerCase();
    return ext.endsWith('.csv') || ext.endsWith('.tsv') || ext.endsWith('.txt') || ext.endsWith('.xlsx') || ext.endsWith('.xls');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && isAcceptedFile(f)) handleFile(f);
  }, [handleFile]);

  const downloadTemplate = () => {
    const csv = VALID_CRM_FIELDS.map(f => f.label).join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateMapping = (csvHeader: string, crmField: string | null) => {
    setCustomMappings(prev => {
      const next = { ...prev };
      const targetField = crmField === 'unmapped' ? null : crmField;

      if (targetField) {
        for (const [header, mappedField] of Object.entries(next)) {
          if (header !== csvHeader && mappedField === targetField) {
            next[header] = null;
          }
        }
      }

      next[csvHeader] = targetField;
      return next;
    });
  };

  const updateStatusMapping = (rawValue: string, mappedStatus: string) => {
    setStatusValueMappings((prev) => {
      const next = { ...prev };
      if (!mappedStatus || mappedStatus === 'unmapped') {
        delete next[rawValue];
      } else {
        next[rawValue] = mappedStatus;
      }
      return next;
    });
  };

  const statusHeaders = Object.entries(customMappings)
    .filter(([, field]) => field === 'status')
    .map(([header]) => header);
  const distinctStatusValues = Array.from(new Set(
    statusHeaders.flatMap((header) => (mappingData?.columnDistinctValues?.[header] || []) as string[])
  ));

  const transformedPreviewRows = (mappingData?.sampleRows || []).map((row: Record<string, string>) =>
    buildPreviewLead(row, customMappings)
  );

  const getConfidenceBadge = (csvHeader: string) => {
    // Find the original mapping to see confidence
    const original = mappingData?.mappings.find((m: any) => m.csvHeader === csvHeader);
    const current = customMappings[csvHeader];

    if (!current) return <Badge variant="outline" className="text-[10px] font-normal opacity-50">Unmapped</Badge>;

    // If user changed it, it's "manual"
    if (original && original.crmField !== current) {
      return <Badge variant="secondary" className="text-[10px] font-normal bg-blue-500/10 text-blue-500 border-blue-500/20">Manual</Badge>;
    }

    if (original?.confidence === 'exact') {
      return <Badge variant="secondary" className="text-[10px] font-normal bg-success/10 text-success border-success/20">Exact Match</Badge>;
    }
    if (original?.confidence === 'partial') {
      return <Badge variant="secondary" className="text-[10px] font-normal bg-amber-500/10 text-amber-500 border-amber-500/20">Partial Match</Badge>;
    }
    if (original?.confidence === 'fuzzy') {
      return <Badge variant="secondary" className="text-[10px] font-normal bg-orange-500/10 text-orange-500 border-orange-500/20">Fuzzy Match</Badge>;
    }

    return null;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">Import leads with robust column mapping and synonym detection</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['Upload', 'Map Columns', 'Preview', 'Importing', 'Done'].map((s, i) => {
          const stepIndex = ['upload', 'mapping', 'preview', 'importing', 'done'].indexOf(step);
          return (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${i <= stepIndex ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {i < stepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i <= stepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
              {i < 4 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-16 text-center transition-colors ${dragOver ? 'border-primary bg-accent' : 'border-border bg-card shadow-sm'}`}
          >
            {previewMutation.isPending ? (
              <div className="py-2">
                <Loader2 className="h-10 w-10 mx-auto mb-4 text-primary animate-spin" />
                <p className="text-lg font-medium text-foreground">Analyzing spreadsheet...</p>
                <p className="text-sm text-muted-foreground">Identifying columns and data types</p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground mb-2">Drop your spreadsheet here</p>
                <p className="text-sm text-muted-foreground mb-6">Supports CSV, TSV, Excel (.xlsx, .xls)</p>
                <input type="file" accept={ACCEPTED_EXTENSIONS} className="hidden" id="csv-input" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }} />
                <Button size="lg" onClick={() => document.getElementById('csv-input')?.click()} className="gradient-primary border-0 px-8">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-4 w-4 text-success" />
                <h3 className="text-sm font-semibold text-foreground">Robust Mapping</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our AI-powered mapper recognizes 100+ synonyms. It handles "Agency Name" as "Company Name", "Direct Dial" as "Phone", and automatically merges "First Name" + "Last Name".
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Safe Handling</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Unrecognized columns are never lost— we automatically append them to the "Notes" field of each lead so you can keep all your data.
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 'mapping' && mappingData && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-secondary/20 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Confirm Column Mapping</h3>
                <p className="text-xs text-muted-foreground">We've auto-matched these columns. Each CRM field can only be mapped once, so picking it on another column will move that mapping.</p>
              </div>
              <Badge variant="outline" className="bg-card">{mappingData.headers.length} columns detected</Badge>
            </div>

            <div className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-medium">Spreadsheet Column</th>
                    <th className="px-5 py-3 text-left font-medium">Maps to CRM Field</th>
                    <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Status Mapping</th>
                    <th className="px-5 py-3 text-left font-medium hidden sm:table-cell">Sample Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mappingData.headers.map((h: string, index: number) => {
                    const sampleVal = mappingData.sampleRows?.[0]?.[h] || '';
                    const headerLabel = h?.trim() ? h : `Unnamed Column ${index + 1}`;
                    const rowKey = `header-${index}-${h || 'blank'}`;
                    return (
                      <tr key={rowKey} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-foreground">{headerLabel}</div>
                          {getConfidenceBadge(h)}
                        </td>
                        <td className="px-5 py-3.5">
                          <Select
                            value={customMappings[h] || 'unmapped'}
                            onValueChange={(val) => updateMapping(h, val)}
                          >
                            <SelectTrigger className="w-full sm:w-[240px] h-9 text-xs">
                              <SelectValue placeholder="Map to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unmapped" className="text-xs italic text-muted-foreground">
                                Skip (save in Notes)
                              </SelectItem>
                              {VALID_CRM_FIELDS.map(f => (
                                <SelectItem key={f.id} value={f.id} className="text-xs">
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          {customMappings[h] === 'status' ? (
                            <Badge variant="secondary" className="text-[10px] font-normal bg-primary/10 text-primary border-primary/20">
                              {((mappingData?.columnDistinctValues?.[h] || []) as string[]).length} value(s) mapped below
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground opacity-50">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                            {sampleVal || <span className="opacity-30 italic">empty</span>}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {statusHeaders.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-secondary/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Status Value Mapping</h3>
                  <p className="text-xs text-muted-foreground">
                    Map old status labels from your file to current CRM stages.
                  </p>
                </div>
                <Badge variant="outline" className="bg-card">{distinctStatusValues.length} status value(s)</Badge>
              </div>

              {distinctStatusValues.length === 0 ? (
                <div className="px-5 py-4 text-xs text-muted-foreground">
                  No status values detected in the selected status column yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wider">
                        <th className="px-5 py-3 text-left font-medium">Old Status Value</th>
                        <th className="px-5 py-3 text-left font-medium">Map to CRM Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {distinctStatusValues.map((rawStatus, index) => (
                        <tr key={`status-map-${index}-${rawStatus}`} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5 text-foreground text-xs font-medium">{rawStatus}</td>
                          <td className="px-5 py-3.5">
                            <Select
                              value={statusValueMappings[rawStatus] || mappingData?.statusSuggestionsByValue?.[rawStatus] || 'unmapped'}
                              onValueChange={(value) => updateStatusMapping(rawStatus, value)}
                            >
                              <SelectTrigger className="w-full sm:w-[240px] h-9 text-xs">
                                <SelectValue placeholder="Map status..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unmapped" className="text-xs italic text-muted-foreground">
                                  Keep default: New Lead
                                </SelectItem>
                                {CANONICAL_LEAD_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status} className="text-xs">
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {mappingData.mergeRules.length > 0 && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-4">
              <div className="p-2 rounded-full bg-blue-500/10">
                <HelpCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-700">Auto-Merge Detected</h4>
                <p className="text-xs text-blue-600/80 mt-1">
                  We found separate <strong>{mappingData.mergeRules[0].sourceHeaders.join(' & ')}</strong> columns. They will be combined into a single <strong>Name</strong> field automatically.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }}>Back</Button>
            <Button onClick={handleMappingConfirm} className="gradient-primary border-0 px-8 shadow-md">
              Review Leads
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && mappingData && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="text-sm font-semibold text-foreground">CRM Preview</h3>
                <p className="text-xs text-muted-foreground">Showing exactly how the first few leads will land in the CRM</p>
              </div>
              <Badge variant="outline" className="bg-card text-primary font-bold border-primary/20">
                {mappingData.totalRows} leads to process
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Agency Name</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contact Name</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Job Title</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {transformedPreviewRows.map((row: PreviewLead, i: number) => (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap max-w-[220px] truncate text-xs">
                        {row.companyName || '—'}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap max-w-[220px] truncate text-xs">
                        {row.name || '—'}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap max-w-[220px] truncate text-xs">
                        {row.title || '—'}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap max-w-[220px] truncate text-xs">
                        {row.email || '—'}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap max-w-[220px] truncate text-xs">
                        {row.phone || '—'}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap max-w-[220px] truncate text-xs hidden md:table-cell">
                        {row.city || row.state ? `${row.city || ''}${row.city && row.state ? ', ' : ''}${row.state || ''}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs text-amber-700">
              Verify that Contact Name, Job Title, and Agency Name are in the right columns here before importing. If one looks wrong, change that mapping above and this preview will update immediately.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('mapping')}>Back to Mapping</Button>
            <Button onClick={handleImport} className="gradient-primary border-0 px-8 shadow-md">
              Finish and Import {mappingData.totalRows} Leads
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="rounded-xl border border-border bg-card p-20 text-center shadow-card border-t-4 border-t-primary">
          <div className="relative inline-block mb-6">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-primary/40" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Importing Leads...</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            We're processing {mappingData?.totalRows || ''} rows, matching records, and setting up workflows. This usually takes just a few seconds.
          </p>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-6">
          <div className={`rounded-xl border-t-4 p-10 text-center transition-all shadow-md bg-card ${result.imported > 0 ? 'border-success/60' : 'border-destructive/60'}`}>
            <div className="mb-6 inline-flex p-4 rounded-full bg-muted/30">
              {result.imported > 0 ? (
                <CheckCircle className="h-12 w-12 text-success" />
              ) : (
                <AlertCircle className="h-12 w-12 text-destructive" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              {result.imported > 0 ? 'Import Successful!' : 'Import Failed'}
            </h2>

            <div className="flex justify-center gap-8 mt-6 mb-8 text-sm">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-success">{result.imported}</span>
                <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-semibold">Imported</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-amber-500">{result.skipped}</span>
                  <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-semibold">Duplicates</span>
                </div>
              )}
              {result.errors > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-destructive">{result.errors}</span>
                  <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-semibold">Errors</span>
                </div>
              )}
            </div>

            {undoDeletedCount !== null && (
              <p className="mb-6 text-sm text-muted-foreground">
                Undo complete. {undoDeletedCount} imported lead(s) were removed from the database.
              </p>
            )}

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => { setStep('upload'); setFile(null); setMappingData(null); setCustomMappings({}); setStatusValueMappings({}); setResult(null); setUndoDeletedCount(null); }} className="px-10">
                Import Another File
              </Button>
              {result.canUndoImport && result.createdLeadIds.length > 0 && undoDeletedCount === null && (
                <Button size="lg" variant="destructive" onClick={handleUndoImport} disabled={undoImportMutation.isPending} className="px-10">
                  {undoImportMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Undoing Import...
                    </>
                  ) : (
                    'Undo Import'
                  )}
                </Button>
              )}
            </div>

            {result.canUndoImport && undoDeletedCount === null && result.createdLeadIds.length > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Undo removes only the exact leads created by this import.
              </p>
            )}
          </div>

          {result.errorDetails && result.errorDetails.length > 0 && (
            <div className="rounded-xl border border-destructive/20 bg-card overflow-hidden shadow-sm">
              <div className="px-5 py-3 bg-destructive/5 border-b border-destructive/10 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-destructive">Error Details</h3>
              </div>
              <div className="p-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {result.errorDetails.map((e, i) => (
                  <div key={i} className="text-xs p-2.5 rounded bg-muted/30 border border-border/50 flex gap-3">
                    <span className="text-destructive font-bold shrink-0">Row {e.row}:</span>
                    <span className="text-muted-foreground leading-relaxed">{e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
