'use client';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useAgents, useLeads } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle2, Circle, Clock, Trash2, Edit2, ListTodo, CalendarDays, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DashboardHeaderSkeleton, DashboardKpiGridSkeleton, DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { LeadCombobox } from '@/components/common/LeadCombobox';

const EVERYONE_OPTION = '__everyone__';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

const STATUS_ICONS: Record<string, typeof Circle> = {
  'todo': Circle,
  'in-progress': Clock,
  'completed': CheckCircle2,
  'cancelled': X,
};

const CATEGORY_LABELS: Record<string, string> = {
  'follow-up': 'Follow-up',
  'call': 'Call',
  'meeting': 'Meeting',
  'email': 'Email',
  'research': 'Research',
  'admin': 'Admin',
  'other': 'Other',
};

type ViewMode = 'calendar' | 'list';

const emptyForm = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  assignedTo: '',
  assignedToIds: [] as string[],
  category: 'other',
  leadId: '',
  leadName: '',
};

export default function CalendarPage() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: agents = [] } = useAgents();
  const { data: leads = [] } = useLeads();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const today = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const { year, month } = viewDate;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Tasks grouped by day for calendar
  const tasksByDay = useMemo(() => {
    return tasks.reduce((acc: Record<number, any[]>, t: any) => {
      const d = new Date(t.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        acc[day] = acc[day] || [];
        acc[day].push(t);
      }
      return acc;
    }, {});
  }, [tasks, year, month]);

  const selectedDayTasks = selectedDay ? (tasksByDay[selectedDay] || []) : [];

  // Filtered tasks for list view
  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter]);

  const totalThisMonth = Object.values(tasksByDay).flat().length;
  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
  const overdueCount = tasks.filter((t: any) =>
    t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.dueDate).toISOString().split('T')[0] < todayStr
  ).length;
  const activeListFilters = (statusFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0);

  // Navigation
  const prevMonth = () => {
    setViewDate(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 });
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setViewDate(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 });
    setSelectedDay(null);
  };
  const goToToday = () => {
    setViewDate({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDay(today.getDate());
  };

  // Create / Edit
  const openCreateDialog = (day?: number) => {
    setEditingTask(null);
    const dueDate = day
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : todayStr;
    const defaultAssignee = user?.id || '';
    setForm({
      ...emptyForm,
      dueDate,
      assignedTo: defaultAssignee,
      assignedToIds: defaultAssignee ? [defaultAssignee] : [],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (task: any) => {
    const assignedToId = task.assignedToUser?.id || task.assignedToId || agents.find((a: any) => a.name === task.assignedTo)?.id || EVERYONE_OPTION;
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate?.split('T')[0] || '',
      priority: task.priority,
      assignedTo: assignedToId,
      assignedToIds: assignedToId && assignedToId !== EVERYONE_OPTION ? [assignedToId] : [],
      category: task.category,
      leadId: task.leadId || '',
      leadName: task.leadName || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.dueDate) {
      toast.error('Title and due date are required');
      return;
    }

    try {
      if (editingTask) {
        const assignedToIds = Array.from(new Set(form.assignedToIds.filter(Boolean)));
        const primaryAssigneeId = assignedToIds[0] || null;
        const payload = {
          ...form,
          assignedTo: primaryAssigneeId,
          assignedToIds: assignedToIds.length > 0 ? assignedToIds : undefined,
          leadId: form.leadId || null,
          leadName: form.leadName || null,
        };

        await updateTask.mutateAsync({ id: editingTask.id, data: payload });

        const additionalAssigneeIds = assignedToIds.slice(1);
        if (additionalAssigneeIds.length > 0) {
          await createTask.mutateAsync({
            ...form,
            assignedTo: null,
            assignedToIds: additionalAssigneeIds,
            status: editingTask.status,
            leadId: form.leadId || null,
            leadName: form.leadName || null,
          });
        }

        toast.success(additionalAssigneeIds.length > 0
          ? `Task updated and added for ${additionalAssigneeIds.length} more assignee${additionalAssigneeIds.length > 1 ? 's' : ''}`
          : 'Task updated');
      } else {
        const assignedToIds = Array.from(new Set(form.assignedToIds.filter(Boolean)));
        const payload = {
          ...form,
          assignedTo: null,
          assignedToIds: assignedToIds.length > 0 ? assignedToIds : undefined,
          leadId: form.leadId || null,
          leadName: form.leadName || null,
        };

        const created = await createTask.mutateAsync(payload);
        const batchCreated = Number((created as any)?.batchCreated || (assignedToIds.length > 0 ? assignedToIds.length : 1));
        toast.success(batchCreated > 1 ? `Task created for ${batchCreated} assignees` : 'Task created');
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingTask(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save task');
    }
  };

  // Quick toggle status
  const toggleComplete = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await updateTask.mutateAsync({ id: task.id, data: { status: newStatus } });
      toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task reopened');
    } catch {
      toast.error('Failed to update task');
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteTask.mutateAsync(deleteConfirm.id);
      toast.success('Task deleted');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete task');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5 md:space-y-6">
        <DashboardHeaderSkeleton />
        <DashboardKpiGridSkeleton count={4} gridClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3" />
        <DashboardTableSkeleton rows={7} cols={4} />
      </div>
    );
  }

  const renderTaskChip = (task: any, compact = false) => {
    const isOverdue = task.status !== 'completed' && task.status !== 'cancelled' && task.dueDate?.split('T')[0] < todayStr;
    const isDone = task.status === 'completed';
    const StatusIcon = STATUS_ICONS[task.status] || Circle;
    const createdByName = task.createdByName || 'Unknown';
    const assignedToName = task.assignedToUser?.name || task.assignedTo || 'Everyone';

    if (compact) {
      return (
        <div
          key={task.id}
          className={`rounded px-1.5 py-0.5 text-xs truncate cursor-pointer hover:opacity-80 transition-opacity
            ${isDone ? 'bg-success/10 text-success line-through opacity-60' : isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}
          `}
          onClick={(e) => { e.stopPropagation(); openEditDialog(task); }}
        >
          {task.title}
        </div>
      );
    }

    return (
      <div
        key={task.id}
        className={`rounded-lg border border-border p-3 transition-colors ${isDone ? 'opacity-60' : 'hover:bg-secondary/40'}`}
      >
        <div className="flex items-start gap-2">
          <button
            className="mt-0.5 shrink-0"
            onClick={() => toggleComplete(task)}
          >
            <StatusIcon className={`h-4 w-4 ${isDone ? 'text-success' : isOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium text-foreground truncate ${isDone ? 'line-through' : ''}`}>{task.title}</p>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
              <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[task.category] || task.category}</Badge>
              {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
              <span className="text-xs text-muted-foreground">By {createdByName}</span>
              <span className="text-xs text-muted-foreground">To {assignedToName}</span>
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(task)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteConfirm(task)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {completedCount} completed · {overdueCount > 0 ? `${overdueCount} overdue` : 'none overdue'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => setViewMode('list')}
            >
              <ListTodo className="h-4 w-4" />
              List
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday} className="px-3">
            Today
          </Button>
          <Button onClick={() => openCreateDialog()} className="gradient-primary border-0 gap-1.5" size="sm">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Month: {monthName} {year}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          View: {viewMode === 'calendar' ? 'Calendar' : 'List'}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Tasks: {viewMode === 'calendar' ? totalThisMonth : filteredTasks.length}
        </span>
        {viewMode === 'list' && activeListFilters > 0 && (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Filters: {activeListFilters}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 auto-rows-fr">
        {[
          { label: 'Total Tasks', value: tasks.length, color: 'text-foreground' },
          { label: 'To Do', value: tasks.filter((t: any) => t.status === 'todo').length, color: 'text-primary' },
          { label: 'In Progress', value: tasks.filter((t: any) => t.status === 'in-progress').length, color: 'text-warning' },
          { label: 'Completed', value: completedCount, color: 'text-success' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3 shadow-card text-center h-full flex flex-col justify-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {viewMode === 'calendar' ? (
        /* ── Calendar View ── */
        <div className="space-y-4">
          {/* Month nav */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">
              {monthName} {year}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground ml-2">
              {totalThisMonth} task{totalThisMonth !== 1 ? 's' : ''} this month
            </span>
          </div>

          <div className="flex gap-4 flex-col lg:flex-row">
            {/* Grid */}
            <div className="flex-1 rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <div className="grid grid-cols-7">
                {dayNames.map(d => (
                  <div key={d} className="border-b border-r border-border px-2 py-2 text-center text-xs font-medium text-muted-foreground bg-secondary/50">{d}</div>
                ))}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`e-${i}`} className="border-b border-r border-border min-h-[90px] bg-muted/20" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = dayStr === todayStr;
                  const isSelected = selectedDay === day;
                  const dayTasks = tasksByDay[day] || [];
                  const dayHasOverdue = dayTasks.some((t: any) => t.status !== 'completed' && t.status !== 'cancelled' && dayStr < todayStr);

                  return (
                    <div
                      key={day}
                      className={`border-b border-r border-border min-h-[90px] p-1.5 cursor-pointer transition-colors
                        ${isToday ? 'bg-accent' : ''}
                        ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}
                        ${!isToday && !isSelected ? 'hover:bg-secondary/30' : ''}
                      `}
                      onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                          ${isToday ? 'gradient-primary text-primary-foreground font-bold' : 'text-foreground'}
                        `}>
                          {day}
                        </span>
                        {dayTasks.length > 0 && (
                          <span className={`text-xs font-medium px-1.5 rounded-full ${dayHasOverdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                            {dayTasks.length}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {dayTasks.slice(0, 2).map((t: any) => renderTaskChip(t, true))}
                        {dayTasks.length > 2 && (
                          <span className="text-xs text-muted-foreground pl-1">+{dayTasks.length - 2}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day Detail panel */}
            {selectedDay !== null && (
              <div className="lg:w-80 rounded-xl border border-border bg-card shadow-card p-4 space-y-3 h-fit">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{monthName} {selectedDay}</h3>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCreateDialog(selectedDay)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedDay(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {selectedDayTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-2">No tasks on this day</p>
                    <Button variant="outline" size="sm" onClick={() => openCreateDialog(selectedDay)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add Task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayTasks.map((t: any) => renderTaskChip(t))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── List View ── */
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Task list */}
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <ListTodo className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">No tasks found</p>
                <Button onClick={() => openCreateDialog()} className="gradient-primary border-0 gap-1.5" size="sm">
                  <Plus className="h-4 w-4" />
                  Create First Task
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTasks.map((task: any) => {
                  const isOverdue = task.status !== 'completed' && task.status !== 'cancelled' && task.dueDate?.split('T')[0] < todayStr;
                  const isDone = task.status === 'completed';
                  const StatusIcon = STATUS_ICONS[task.status] || Circle;

                  return (
                    <div key={task.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isDone ? 'opacity-60' : 'hover:bg-secondary/30'}`}>
                      <button onClick={() => toggleComplete(task)} className="shrink-0">
                        <StatusIcon className={`h-5 w-5 ${isDone ? 'text-success' : isOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium text-foreground truncate ${isDone ? 'line-through' : ''}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
                          <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[task.category] || task.category}</Badge>
                          {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:block shrink-0">
                        By {task.createdByName || 'Unknown'} · To {task.assignedToUser?.name || task.assignedTo || 'Everyone'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(task)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteConfirm(task)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update the task details below' : 'Create a new task and assign it to a team member'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Title *</Label>
              <Input
                id="taskTitle"
                placeholder="e.g. Follow up with John Smith"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="taskDueDate">Due Date *</Label>
                <Input
                  id="taskDueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Assign To (one or more)</Label>
                <div className="rounded-md border border-border p-2 max-h-40 overflow-y-auto space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Checkbox
                      checked={form.assignedToIds.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setForm({ ...form, assignedTo: EVERYONE_OPTION, assignedToIds: [] });
                        }
                      }}
                    />
                    Everyone (Visible to all)
                  </label>
                  {agents.map((a: any) => {
                    const checked = form.assignedToIds.includes(a.id);
                    return (
                      <label key={a.id} className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            const selected = next === true
                              ? [...form.assignedToIds, a.id]
                              : form.assignedToIds.filter((id) => id !== a.id);
                            const deduped = Array.from(new Set(selected));
                            setForm({
                              ...form,
                              assignedTo: deduped[0] || EVERYONE_OPTION,
                              assignedToIds: deduped,
                            });
                          }}
                        />
                        {a.name}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editingTask && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editingTask.status} onValueChange={async (v) => {
                  try {
                    await updateTask.mutateAsync({ id: editingTask.id, data: { status: v } });
                    setEditingTask({ ...editingTask, status: v });
                    toast.success('Status updated');
                  } catch {
                    toast.error('Failed to update status');
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Link to Lead (optional)</Label>
              <LeadCombobox
                value={form.leadId}
                initialName={form.leadName}
                onSelect={(id, name) => setForm({ ...form, leadId: id, leadName: name })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDesc">Description</Label>
              <Textarea
                id="taskDesc"
                placeholder="Task details..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createTask.isPending || updateTask.isPending}
              className="gradient-primary border-0"
            >
              {(createTask.isPending || updateTask.isPending) ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "<span className="font-semibold text-foreground">{deleteConfirm?.title}</span>"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
