'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Employee, EmployeePhone } from '@/features/leads/types/leads';

interface PhoneWithId extends EmployeePhone {
  _uid: string;
}

interface EmployeeFormProps {
  initial?: Partial<Employee>;
  onSave: (employee: Omit<Employee, 'id'>) => void;
  onCancel: () => void;
}

const PHONE_TYPES: EmployeePhone['type'][] = [
  'office',
  'direct',
  'home',
  'corporate',
  'company',
];

const PHONE_TYPE_LABELS: Record<EmployeePhone['type'], string> = {
  office: 'Office',
  direct: 'Direct Number',
  home: 'Home Number',
  corporate: 'Corporate Number',
  company: 'Company Number',
};

export function EmployeeForm({ initial, onSave, onCancel }: EmployeeFormProps) {
  const uidCounter = useRef(0);
  const genUid = () => `phone_${++uidCounter.current}_${Date.now()}`;

  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [linkedin, setLinkedin] = useState(initial?.linkedin ?? '');
  const [linkedinError, setLinkedinError] = useState('');
  const [isDecisionMaker, setIsDecisionMaker] = useState(initial?.isDecisionMaker ?? false);
  const [leftOrganization, setLeftOrganization] = useState(initial?.leftOrganization ?? false);
  const [phones, setPhones] = useState<PhoneWithId[]>(
    (initial?.phones ?? []).map((p) => ({ ...p, _uid: genUid() }))
  );

  const addPhone = () => {
    setPhones((previous) => [...previous, { type: 'direct', number: '', extension: '', _uid: genUid() }]);
  };

  const removePhone = (index: number) => {
    setPhones((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  };

  const updatePhone = (index: number, patch: Partial<EmployeePhone>) => {
    setPhones((previous) =>
      previous.map((phone, currentIndex) =>
        currentIndex === index
          ? {
              ...phone,
              ...patch,
            }
          : phone,
      ),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    // Validate LinkedIn URL to prevent javascript: XSS
    const trimmedLinkedin = linkedin.trim();
    if (trimmedLinkedin && !/^https?:\/\//i.test(trimmedLinkedin)) {
      setLinkedinError('LinkedIn URL must start with http:// or https://');
      return;
    }
    setLinkedinError('');

    onSave({
      name: name.trim(),
      email: email.trim(),
      linkedin: trimmedLinkedin || undefined,
      isDecisionMaker,
      leftOrganization,
      phones: phones
        .map((phone) => ({
          type: phone.type,
          number: phone.number.trim(),
          extension: phone.extension?.trim() || undefined,
        }))
        .filter((phone) => phone.number),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            required
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@company.com"
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">LinkedIn</label>
        <input
          type="url"
          value={linkedin}
          onChange={(event) => {
            setLinkedin(event.target.value);
            setLinkedinError('');
          }}
          placeholder="https://linkedin.com/in/..."
          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {linkedinError && <p className="text-xs text-destructive mt-1">{linkedinError}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-muted-foreground">Phone Numbers</label>
          <button
            type="button"
            onClick={addPhone}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Phone
          </button>
        </div>

        <div className="space-y-2">
          {phones.map((phone, index) => (
            <div key={phone._uid} className="flex items-center gap-2">
              <select
                value={phone.type}
                onChange={(event) =>
                  updatePhone(index, {
                    type: event.target.value as EmployeePhone['type'],
                  })
                }
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              >
                {PHONE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PHONE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={phone.number}
                onChange={(event) => updatePhone(index, { number: event.target.value })}
                placeholder="Number"
                className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <input
                type="text"
                value={phone.extension ?? ''}
                onChange={(event) => updatePhone(index, { extension: event.target.value })}
                placeholder="Ext"
                className="w-20 h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => removePhone(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {phones.length === 0 && (
            <p className="text-xs text-muted-foreground">No phone numbers added.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isDecisionMaker}
            onChange={(event) => setIsDecisionMaker(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Decision Maker
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={leftOrganization}
            onChange={(event) => setLeftOrganization(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Left Organization
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          Save Employee
        </Button>
      </div>
    </form>
  );
}