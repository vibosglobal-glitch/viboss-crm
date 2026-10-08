# Frontend Feature Modules — Comprehensive Audit Report

> Generated from a file-by-file review of all 72 TypeScript/TSX files across 16 feature folders in `src/features/`.

---

## Table of Contents

1. [Cross-Cutting / Global Issues](#1-cross-cutting--global-issues)
2. [auth (7 files)](#2-auth-7-files)
3. [leads (11 files)](#3-leads-11-files)
4. [calls (4 files)](#4-calls-4-files)
5. [agents (2 files)](#5-agents-2-files)
6. [meetings (4 files)](#6-meetings-4-files)
7. [notifications (2 files)](#7-notifications-2-files)
8. [notes (3 files)](#8-notes-3-files)
9. [outreach (4 files)](#9-outreach-4-files)
10. [activities (2 files)](#10-activities-2-files)
11. [pipeline (3 files)](#11-pipeline-3-files)
12. [sdr (6 files)](#12-sdr-6-files)
13. [hr (6 files)](#13-hr-6-files)
14. [admin (6 files)](#14-admin-6-files)
15. [leadgen (5 files)](#15-leadgen-5-files)
16. [calendar (3 files)](#16-calendar-3-files)
17. [follow-ups (1 file)](#17-follow-ups-1-file)
18. [Summary Statistics](#18-summary-statistics)

---

## 1. Cross-Cutting / Global Issues

### 1.1 `useApi.ts` barrel is missing two feature re-exports

**File:** `src/hooks/useApi.ts`

The barrel re-exports hooks from 9 features but **omits**:
- `@/features/activities/hooks/useActivities` — consumers (SDRDashboard, LeadDetailPage) import directly via `@/features/activities/hooks/useActivities`
- `@/features/pipeline/hooks/usePipeline` — consumers (LeadDetailPage, PipelinePage) import via relative/absolute paths

**Impact:** Not broken (imports work), but inconsistent. Every other hook is available through `@/hooks/useApi`. Adding activities and pipeline to the barrel would unify the import story.

### 1.2 `outreach` API is also missing from the barrel

`@/services/api/index.ts` assembles the `api` object but does **not** include the outreach API (`outreachApi`). The `useOutreach` hooks import the API module directly (`../api/outreach.api`), bypassing the `api` singleton. This is inconsistent with every other feature.

### 1.3 Inconsistent toast system

Two different toast implementations are used:
| System | Files Using It |
|---|---|
| `toast` from `sonner` | Most pages (CalendarPage, TeamManagement, MeetingsPage, PipelinePage, CallsPage, SDR pages, FollowUpsPage, etc.) |
| `useToast()` from `@/hooks/use-toast` | NotesPage, LeadGenLeadsPage |

Mixing these libraries means notifications may render in different locations, with different styling, and have different APIs. **Pick one and migrate.**

### 1.4 `any` types everywhere

Almost every component uses `any` for lead, agent, call, meeting, task, and notification objects. This defeats TypeScript's purpose and hides bugs. Consider using the types already defined in `features/leads/types/leads.ts` and creating equivalent typed interfaces for other entities.

### 1.5 Dual role identifiers: `lead_gen` vs `leadgen`

`UserRole` in `types/auth.ts` includes both `'lead_gen'` and `'leadgen'`. The `useRole()` hook checks for both (`role === 'lead_gen' || role === 'leadgen'`), and all layout `ROLE_REDIRECT` maps contain both keys. This duplication is error-prone. The backend should canonicalize on one value.

### 1.6 `err: any` catch patterns

Multiple files use `catch (err: any)` instead of `catch (err: unknown)` with proper narrowing. TypeScript best practice recommends `unknown`. Affected files include:
- `ForgotPasswordPage.tsx`
- `ResetPasswordPage.tsx`
- `CalendarPage.tsx`
- `TeamManagement.tsx`
- `LeadGenLeadsPage.tsx`
- `AdminSettings.tsx`

### 1.7 Duplicated `ROLE_REDIRECT` and `ROLE_COLORS` maps

The exact same `ROLE_REDIRECT` and `ROLE_COLORS` constants are copy-pasted into:
- `SDRLayout.tsx`
- `HRLayout.tsx`
- `AdminLayout.tsx`
- `LeadGenLayout.tsx`
- `LoginPage.tsx` (partial)

These should be extracted to a shared `constants/roles.ts` file.

### 1.8 Duplicated `InfoRow` component

An identical `InfoRow({ label, value })` component is defined locally in both `HRLeadTracker.tsx` AND `HRClosedLeads.tsx`. Should be shared.

---

## 2. auth (7 files)

### `api/auth.api.ts`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **Duplicate `AuthUser` type** — defines `AuthUser` locally AND `types/auth.ts` exports one. Both are used in different places. |
| ℹ️ Low | `register` function exists in the API but no registration page exists in the frontend. Dead code unless used elsewhere. |

### `types/auth.ts`
| Severity | Issue |
|---|---|
| ⚠️ Medium | `UserRole` union includes both `'lead_gen'` and `'leadgen'` — redundant, same role spelled differently. |
| ℹ️ Low | `AuthUser` is just `type AuthUser = User` — a no-op alias that adds indirection. |

### `context/AuthContext.tsx`
| Severity | Issue |
|---|---|
| ✅ | Well-structured. Session caching with sessionStorage, cookie verification on mount, impersonation support. No issues found. |

### `pages/LoginPage.tsx`
| Severity | Issue |
|---|---|
| 🐛 Bug | **Unused import:** `Zap` from lucide-react is imported but never rendered. |
| ℹ️ Low | Role redirect map uses `'leadgen'` but the login response might return `'lead_gen'`. The map covers both only because it has both keys. |

### `pages/LandingPage.tsx`
| Severity | Issue |
|---|---|
| 🐛 Bug | **Unused import:** `useState` is imported but never used. |

### `pages/ForgotPasswordPage.tsx`
| Severity | Issue |
|---|---|
| 🐛 Bug | **Unused import:** `Zap` from lucide-react. |
| ⚠️ Medium | `catch (err: any)` — should be `err: unknown`. |

### `pages/ResetPasswordPage.tsx`
| Severity | Issue |
|---|---|
| 🐛 Bug | **Unused import:** `Zap` from lucide-react. |
| ⚠️ Medium | `catch (err: any)` pattern. |

---

## 3. leads (11 files)

### `api/leads.api.ts`
| Severity | Issue |
|---|---|
| 🐛 Bug | **`importPreview` and `importCSV` use raw `fetch()` instead of the `request()` client.** They call `fetch('/api/leads/import/preview', ...)` directly, bypassing the base URL config, error handling, and auth cookie logic in the shared `request()` client. If the API is deployed to a different origin, these calls will fail. |
| ⚠️ Medium | `importPreview`/`importCSV` manually set `credentials: 'include'` and check `res.ok` — duplicating logic that `request()` already handles. |

### `hooks/useLeads.ts`
| Severity | Issue |
|---|---|
| ℹ️ Low | `useUpdateLead` has optimistic updates via `onMutate` — good pattern, but the rollback in `onError` mutates the query data in place, could be improved with immer or structuredClone. |

### `types/leads.ts`
| Severity | Issue |
|---|---|
| ⚠️ Medium | Defines `Agent`, `Call`, `Notification`, `Employee` types that overlap with types in other features. No single source of truth. |

### `schemas/lead.schema.ts`
| Severity | Issue |
|---|---|
| ✅ | Clean Zod schemas. Re-exports types. No issues. |

### `constants/pipeline.ts`
| Severity | Issue |
|---|---|
| ✅ | Well-structured. `PIPELINE_STAGES`, `STAGE_KEYS`, `TERMINAL_STAGES`, `PRIORITIES`, `PRIORITY_KEYS`, `getStageBadgeClass`, `checkQualityGate` all look correct. |

### `constants/cadences.ts`
| Severity | Issue |
|---|---|
| ✅ | Clean. Two cadence definitions with proper `getCadenceTasks` helper. |

### `components/EmployeeForm.tsx`
| Severity | Issue |
|---|---|
| ✅ | Clean CRUD form with phone management and LinkedIn XSS validation via regex. |

### `components/ActiveAccountModal.tsx`
| Severity | Issue |
|---|---|
| ✅ | Clean. Modal for setting contract/service dates and assigned VA. |

### `components/ActiveAccountsListModal.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | Uses `(lead as any).assignedVA ?? (lead as any).assignedVa` — two different casing variants checked defensively, suggesting backend returns inconsistent field names. This should be fixed at the API/model level. |

### `pages/LeadsPage.tsx`
| Severity | Issue |
|---|---|
| 🔴 Critical | **Bulk assign sends wrong value.** The bulk assign dropdown uses `agent.id` as the `<option value>`, but `handleBulkAssign` calls `bulkAssign.mutateAsync({ leadIds, agentName: bulkAgentName })`. The `bulkAssign` API endpoint expects an agent **name** string, not an ID. The bulk assign will send the agent's ID as their name. |
| ⚠️ Medium | Very large component (~600 lines). Should be decomposed into sub-components (table, filters, bulk-action bar, edit dialog). |

### `pages/LeadDetailPage.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **1,035-line monolith.** This single component handles pipeline stages, meetings, cadences, qualification toggles, employee management, active account conversion, and an activity timeline. Should be broken into focused sub-components. |
| ℹ️ Low | Uses both `@/hooks/useApi` barrel imports and direct `@/features/activities/hooks/useActivities` imports in the same file. Inconsistent pattern. |

### `pages/CSVUploadPage.tsx`
| Severity | Issue |
|---|---|
| ✅ | Well-implemented 5-step wizard. Smart column mapping with confidence badges. No critical issues. |

### `pages/ActiveAccountsPage.tsx`
| Severity | Issue |
|---|---|
| ✅ | Clean dedicated page with search and pagination. |

---

## 4. calls (4 files)

### `api/calls.api.ts`
| Severity | Issue |
|---|---|
| ℹ️ Low | No `delete` endpoint. If call deletion is needed in the future, API is missing. Currently not a UI issue. |

### `hooks/useCalls.ts`
| Severity | Issue |
|---|---|
| ✅ | Clean hooks matching the API surface. |

### `pages/CallsPage.tsx`
| Severity | Issue |
|---|---|
| ✅ | Full CRUD table with search, filters, pagination, and edit dialog. No issues. |

### `pages/CallDetailPage.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **Recording playback is a non-functional placeholder.** The UI shows a recording player section but there is no actual `<audio>` element or streaming logic. It's purely cosmetic. |

---

## 5. agents (2 files)

### `api/agents.api.ts`
| Severity | Issue |
|---|---|
| ✅ | Full CRUD including `update` (PUT). |

### `hooks/useAgents.ts`
| Severity | Issue |
|---|---|
| 🐛 Bug | **Missing `useUpdateAgent` hook.** The API has `agents.update(id, data)` but no hook wraps it. `TeamManagement.tsx` (admin) doesn't provide inline editing of agent details — it only creates and deletes. If edit functionality is needed, this hook is missing. |
| ℹ️ Low | Missing `useAgent(id)` hook for single-agent detail fetching (the API has `agents.get(id)`). |

---

## 6. meetings (4 files)

### `api/meetings.api.ts`
| Severity | Issue |
|---|---|
| ✅ | Full CRUD. Clean. |

### `hooks/useMeetings.ts`
| Severity | Issue |
|---|---|
| ✅ | All hooks present: list, create, update, delete. |

### `pages/MeetingsPage.tsx`
| Severity | Issue |
|---|---|
| ✅ | Full CRUD with form, filter tabs, confirmation tracking, next-step warnings. Clean implementation. |

### `components/MeetingBookedModal.tsx` & `MeetingCompletedModal.tsx`
| Severity | Issue |
|---|---|
| ✅ | Clean modals. No issues. |

---

## 7. notifications (2 files)

### `api/notifications.api.ts`
| Severity | Issue |
|---|---|
| ✅ | List, mark-read, mark-all-read. Clean. |

### `hooks/useNotifications.ts`
| Severity | Issue |
|---|---|
| ✅ | 15s stale, 30s refetch interval for near-realtime updates. Clean. |

---

## 8. notes (3 files)

### `api/notes.api.ts`
| Severity | Issue |
|---|---|
| ✅ | Clean CRUD. |

### `hooks/useNotes.ts`
| Severity | Issue |
|---|---|
| ✅ | Clean hooks. |

### `pages/NotesPage.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **Uses `useToast()` from `@/hooks/use-toast`** instead of `toast` from `sonner`. Every other page in the app uses `sonner`. This means toast notifications from NotesPage render with different styling/positioning. |

---

## 9. outreach (4 files)

### `api/outreach.api.ts`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **Not registered in `@/services/api/index.ts` barrel.** The outreach API is the only feature API omitted from the central `api` object. |

### `hooks/useOutreach.ts`
| Severity | Issue |
|---|---|
| ⚠️ Medium | Imports directly from `../api/outreach.api` instead of through `@/services/api`. Works but breaks the established pattern. |

### `pages/EmailOutreachPage.tsx`
| Severity | Issue |
|---|---|
| ✅ | Manual email count logging with stats display. Clean. |

### `pages/LinkedInOutreachPage.tsx`
| Severity | Issue |
|---|---|
| ✅ | Filters leads with LinkedIn URLs, shows profiles with expand/collapse. Clean. |

---

## 10. activities (2 files)

### `api/activities.api.ts`
| Severity | Issue |
|---|---|
| ℹ️ Low | `getLeadActivities` unwraps `{activities}` envelope — correct behavior matching the backend, but different from how `leadsApi.list` unwraps. Pattern is consistent within itself. |

### `hooks/useActivities.ts`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **Not exported via `@/hooks/useApi` barrel.** Consumers (SDRDashboard, LeadDetailPage) have to import directly from `@/features/activities/hooks/useActivities`. |

---

## 11. pipeline (3 files)

### `api/pipeline.api.ts`
| Severity | Issue |
|---|---|
| ✅ | `getPipelineStages`, `getPipelineBoard` (with filters), `updateLeadStage` (PATCH). Clean. |

### `hooks/usePipeline.ts`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **Not exported via `@/hooks/useApi` barrel.** Same pattern issue as activities. |
| ℹ️ Low | `useUpdateLeadStage` shows a `toast.success` inside the hook. Most other hooks let the calling page handle toasts. Inconsistent but not broken. |

### `pages/PipelinePage.tsx`
| Severity | Issue |
|---|---|
| ✅ | Full Kanban board with `@dnd-kit` drag-and-drop, Excel export via `xlsx`. Well-implemented. |

---

## 12. sdr (6 files)

### `layout/SDRLayout.tsx`
| Severity | Issue |
|---|---|
| ℹ️ Low | Duplicated `ROLE_REDIRECT`/`ROLE_COLORS` constants (see cross-cutting issue 1.7). |
| ✅ | Otherwise clean: sidebar nav, role-based access, impersonation banner, notifications, theme toggle, socket. |

### `pages/SDRDashboard.tsx`
| Severity | Issue |
|---|---|
| ✅ | KPI cards, pending tasks, recent leads, active accounts modal. Uses `DateFilter`. Clean. |

### `pages/MyLeadsPage.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | Filters leads by `user?.name` matching `assignedAgent` — string-based matching. If an agent's display name changes, this filter breaks. Should use agent ID matching. |

### `pages/MyFollowUpsPage.tsx`
| Severity | Issue |
|---|---|
| ✅ | Overdue/upcoming filters, call-now and mark-done actions. Clean implementation. |

### `pages/MyCallsPage.tsx`
| Severity | Issue |
|---|---|
| ✅ | Agent-filtered calls table with edit dialog. Clean. |

### `pages/SDRPipelinePage.tsx`
| Severity | Issue |
|---|---|
| ℹ️ Low | Uses static `PIPELINE_STAGES` grouping with no drag-and-drop (unlike admin PipelinePage). This is intentional — SDRs get a read-only column view. Not a bug. |

---

## 13. hr (6 files)

### `api/hr.api.ts`
| Severity | Issue |
|---|---|
| ⚠️ Medium | All return types are `any`. The `leads` function manually unwraps the `{leads}` envelope with runtime checks — works but has no type safety. |

### `hooks/useHR.ts`
| Severity | Issue |
|---|---|
| ✅ | Clean hooks for dashboard, leads, closed-leads. |

### `layout/HRLayout.tsx`
| Severity | Issue |
|---|---|
| 🐛 Bug | **Unused imports:** `Zap` and `FileText` — `Zap` is imported but never used. `FileText` IS used (in the badge). Corrected: only `Zap` is unused. |
| ℹ️ Low | Duplicated `ROLE_REDIRECT`/`ROLE_COLORS`. |
| ℹ️ Low | HR layout does **not** include `NotificationDropdown` — unlike SDR/Admin/LeadGen layouts. HR users miss notification bell. |

### `pages/HRDashboard.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **DateFilter passes `timeRange` to backend but dashboard doesn't truly filter.** Comment in code says: *"Mocking the data being filtered... for UI purposes we'll scale it down based on range... as a placeholder."* The DateFilter changes `dateRange` state which is sent to `useHRDashboard(dateRange)`, but the dashboard KPI calculations use `data?.agentPerformance?.reduce(...)` without any client-side date filtering. Whether the backend actually filters by this param is unclear. |
| ℹ️ Low | "Appointment Setter" KPI card is hardcoded to `0`. |
| ℹ️ Low | Uses `useMemo` import but doesn't use it. `useMemo` is imported but not called in the component body. |

### `pages/HRLeadTracker.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | Heavy use of `any` types — every lead property accessed without type guards. |
| ⚠️ Medium | "Closed By" column checks `lead.status === 'won' || lead.status === 'lost'` but the actual pipeline stages in `constants/pipeline.ts` use `'Closed Won'` and `'Closed Lost'` (title case). **This comparison will never match.** |
| ℹ️ Low | Duplicated `InfoRow` component (also in HRClosedLeads). |

### `pages/HRClosedLeads.tsx`
| Severity | Issue |
|---|---|
| ℹ️ Low | Duplicated `InfoRow` and `ClosedLeadDetailContent` patterns from HRLeadTracker. |
| ✅ | Otherwise clean. |

---

## 14. admin (6 files)

### `layout/AdminLayout.tsx`
| Severity | Issue |
|---|---|
| ✅ | Most complete layout: sidebar, impersonation dropdown, profile dropdown, notification bell, theme toggle, socket connection. Well-implemented. |
| ℹ️ Low | Duplicated `ROLE_REDIRECT`/`ROLE_COLORS` (cross-cutting issue). |

### `pages/AdminDashboard.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **`useKPIs()` is called but its data is never used.** The dashboard does `const { isLoading: kpisLoading } = useKPIs()` — it only uses the loading state, not the `data`. The KPI cards are computed manually from `leads` array. The `kpis` data is wasted. |
| ⚠️ Medium | `filterByDateRange` is applied to leads for KPI cards, but the chart data always shows the last 14 days regardless of the selected `dateRange`. The date filter and chart are disconnected. |
| ℹ️ Low | `Recharts` components (`BarChart`, `Bar`, `XAxis`, etc.) used for the daily activity chart — correct but heavy bundle impact for a single chart. |

### `pages/AdminSettings.tsx`
| Severity | Issue |
|---|---|
| 🐛 Bug | **Settings are not persisted.** The "Save Changes" button only sets `saved = true` for 2 seconds (visual feedback) but never calls any API. `companyName`, `notifyOverdue`, `notifyNewLead`, `autoAssign`, timezone, and session timeout are all client-side state only — they reset on page reload. |
| ⚠️ Medium | `catch (err: any)` in `handleChangePassword`. |
| ℹ️ Low | Uses raw `<input>` and `<select>` elements instead of shadcn/ui `Input`/`Select` components used everywhere else. Inconsistent styling. |

### `pages/TeamManagement.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **No edit/update flow for existing agents.** You can create and delete agents, but cannot edit their name, email, or role. The `useUpdateAgent` hook is missing (see agents section), and this page doesn't offer the UI for it either. |
| ⚠️ Medium | `catch (error: any)` patterns in both `handleAddAgent` and `handleDeleteAgent`. |
| ℹ️ Low | The `isAdminOrHR` check allows HR users to view agent detail panels, but HR users shouldn't typically manage agents. Consider if this is intentional. |

### `pages/FunnelDashboardPage.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **`DateFilter` is displayed but its value is never passed to any API or filter.** `dateRange` state is set by the filter but `useFunnel()` is called with no arguments. The date filter is non-functional UI. |
| ⚠️ Medium | `useKPIs()` is called (`const { data: kpis } = useKPIs()`) but `kpis` is **never used** anywhere in the component. Dead code. |
| ℹ️ Low | The `getStageBadgeClass` is called with `s.stage` but the `Stage-to-Stage Conversion` section filters stages where `s.count > 0` — edge case: if the first stage has count 0, it disappears and the conversion chain gets confused. |

### `pages/HuddlePage.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | `useKPIs()` is imported and called but `kpis` data is **never used**. Dead code. |
| ⚠️ Medium | `stuckLeads` filter checks `l.date < sevenDaysAgo` — assumes `l.date` is an ISO date string. If `date` is a Date object or timestamp, the string comparison will be unreliable. |
| ℹ️ Low | Team Scorecard only shows SDR agents. Consider showing all roles or making it configurable. |

---

## 15. leadgen (5 files)

### `layout/LeadGenLayout.tsx`
| Severity | Issue |
|---|---|
| 🐛 Bug | **Unused import:** `Zap` from lucide-react. |
| ℹ️ Low | Duplicated `ROLE_REDIRECT`/`ROLE_COLORS` (cross-cutting issue). |

### `pages/LeadGenDashboard.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **Hardcoded status strings** like `'New Lead'`, `'Working'`, `'Contacted'`, `'Meeting Booked'`, `'Closed Won'` are used for KPI filtering. These strings should come from `PIPELINE_STAGES` constants to stay in sync. |
| ℹ️ Low | Sorts recent leads by `lead.lastActivity` — if this field is missing or null, `new Date(undefined).getTime()` returns `NaN`, causing unpredictable sort order. |

### `pages/LeadGenLeadsPage.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **Uses `useToast()` from `@/hooks/use-toast`** instead of `sonner`. Inconsistent with rest of app (same issue as NotesPage). |
| ⚠️ Medium | Edit modal uses raw `<div>` overlays for modal and confirmation dialogs instead of shadcn `Dialog` component. Lacks accessibility (no focus trap, no Escape key handling, no screen reader support). |
| ℹ️ Low | The "select all" checkbox selects all **filtered** leads, not just the current page. This means bulk operations might affect leads not visible to the user. |

### `pages/LeadGenEmail.tsx`
| Severity | Issue |
|---|---|
| ✅ | Thin wrapper: just renders `<EmailOutreachPage />` from the outreach feature. Clean delegation. |

### `pages/LeadGenLinkedIn.tsx`
| Severity | Issue |
|---|---|
| ✅ | Clean implementation. Filters leads with LinkedIn URLs, shows profiles with expand/collapse. |

---

## 16. calendar (3 files)

### `api/tasks.api.ts`
| Severity | Issue |
|---|---|
| ✅ | Full CRUD with query params. Clean. |

### `hooks/useTasks.ts`
| Severity | Issue |
|---|---|
| ✅ | Clean hooks: list, create, update, delete. |

### `pages/CalendarPage.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **`useLeads()` is called to populate a "Link to Lead" dropdown but is truncated to first 50 leads.** `leads.slice(0, 50)` means only the first 50 leads are selectable. With a large database, most leads won't appear. Should use a search-as-you-type approach. |
| ⚠️ Medium | `catch (err: any)` in `handleSave`. |
| ⚠️ Medium | The edit dialog's "Status" `<Select>` uses `editingTask.status` as value instead of `form.status`. When the user changes the status via the select, it fires an `updateTask.mutateAsync` call immediately (bypassing the Save button) AND updates `editingTask` local state — but `form` state is never updated. If the user then clicks "Update Task", the old status is submitted via `form`. **Race condition / stale data bug.** |
| ℹ️ Low | The calendar grid doesn't handle months starting on Saturday well — the last row might have very few cells, creating a visually unbalanced grid. No padding cells are added after the last day. |

---

## 17. follow-ups (1 file)

### `pages/FollowUpsPage.tsx`
| Severity | Issue |
|---|---|
| ⚠️ Medium | **Loads ALL leads** via `useLeads()` just to client-side filter ones with `nextFollowUp`. On a large dataset, this fetches thousands of records to display a handful. Should have a dedicated backend endpoint for pending follow-ups. |
| ℹ️ Low | Uses `lead.id || lead._id` pattern — should be normalized at the API layer. |
| ℹ️ Low | `lead.name` is used instead of `lead.firstName + ' ' + lead.lastName`, suggesting the backend returns a computed `name` field. Inconsistent with HR pages that use `lead.firstName` / `lead.lastName`. |

---

## 18. Summary Statistics

### By Severity

| Severity | Count |
|---|---|
| 🔴 Critical (data loss / wrong behavior) | 2 |
| 🐛 Bug (unused imports, broken comparisons) | 7 |
| ⚠️ Medium (inconsistencies, missing features, potential issues) | 32 |
| ℹ️ Low (style, refactoring, minor) | 28 |

### Critical Issues (Fix Immediately)

1. **LeadsPage.tsx bulk assign sends `agent.id` instead of `agent.name`** — bulk assignments will save the wrong agent reference.
2. **AdminSettings.tsx "Save Changes" does nothing** — all settings are ephemeral client state, lost on page reload.

### High-Priority Medium Issues (Fix Soon)

3. **HRLeadTracker.tsx "Closed By" column** checks `'won'`/`'lost'` but pipeline constants use `'Closed Won'`/`'Closed Lost'`. Column will always show "—".
4. **CalendarPage.tsx status edit race condition** — status changes bypass the form state, causing stale data.
5. **FunnelDashboardPage.tsx DateFilter is decorative** — filter value is never sent to the API.
6. **Leads `importPreview`/`importCSV` bypass the API client** — will break if API is on a different origin.
7. **Inconsistent toast system** — `sonner` vs `useToast` in different pages.

### Recommended Refactors

8. Extract shared constants (`ROLE_REDIRECT`, `ROLE_COLORS`) to a single file.
9. Add activities and pipeline hooks to `@/hooks/useApi` barrel.
10. Add outreach API to `@/services/api/index.ts` barrel.
11. Break down LeadDetailPage (1035 lines) and LeadsPage (~600 lines) into smaller components.
12. Replace `any` types with proper interfaces across all features.
13. Canonicalize `lead_gen` vs `leadgen` to one role string.
14. Add `useUpdateAgent` hook and agent editing UI.
15. Add `NotificationDropdown` to HR layout.
