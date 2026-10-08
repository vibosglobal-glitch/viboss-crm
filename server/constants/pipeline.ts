/**
 * Backend pipeline constants — mirrors the required lead lifecycle pipeline.
 * Used in models + routes to keep stage values in sync.
 */

export const PIPELINE_STAGES = [
    'New Lead',
    'In Progress',
    'Contacted',
    'Appointment Set',
    'Active Account'
] as const;

export type PipelineStageKey = typeof PIPELINE_STAGES[number];

/** Stages that trigger auto-recording flag on calls */
export const RECORDING_FLAG_STAGES: PipelineStageKey[] = ['Active Account'];

/** Terminal stages (lead is done) */
export const TERMINAL_STAGES: PipelineStageKey[] = ['Active Account'];
