'use client';
import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { usePaginatedLeads } from "@/hooks/useApi"
import { useDebounce } from "@/hooks/useDebounce"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface LeadComboboxProps {
    value: string; // leadId
    onSelect: (leadId: string, leadName: string) => void;
    // allow passing an initial static name in case it's not in the first 10 results loaded
    initialName?: string;
}

export function LeadCombobox({ value, onSelect, initialName }: LeadComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState('')
    const debouncedSearch = useDebounce(search, 300)

    const { data: leadPage, isLoading } = usePaginatedLeads({
        search: debouncedSearch || undefined,
        limit: 10,
    });

    const leads = leadPage?.leads || [];

    // Try to find the selected lead name in loaded leads, or fallback to the provided initialName
    const selectedLead = leads.find((l: any) => l.id === value || l._id === value);
    const getLeadName = (l: any) => {
        if (!l) return '';
        return `${l.firstName} ${l.lastName || ''}`.trim();
    };
    const displayLabel = selectedLead ? getLeadName(selectedLead) : (value && initialName ? initialName : 'Select lead...');

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal h-10"
                >
                    {displayLabel}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start" portalled={false}>
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search leads..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {isLoading ? (
                                <div className="py-6 text-center text-sm flex items-center justify-center text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching...
                                </div>
                            ) : 'No lead found.'}
                        </CommandEmpty>
                        <CommandGroup>
                            {!isLoading && (
                                <CommandItem
                                    value="none"
                                    onSelect={() => {
                                        onSelect('', '');
                                        setOpen(false);
                                    }}
                                    className="font-medium text-destructive cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            !value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    None (Clear selection)
                                </CommandItem>
                            )}
                            {leads.map((lead: any) => {
                                const leadName = getLeadName(lead);
                                return (
                                    <CommandItem
                                        key={lead.id || lead._id}
                                        value={lead.id || lead._id}
                                        onSelect={() => {
                                            onSelect(lead.id || lead._id, leadName);
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === (lead.id || lead._id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div>
                                            <p className="font-medium">{leadName}</p>
                                            <p className="text-xs text-muted-foreground">{lead.companyName || lead.email}</p>
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
