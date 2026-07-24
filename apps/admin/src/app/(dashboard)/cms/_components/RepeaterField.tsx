"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Field {
  key: string;
  label: string;
  type: "input" | "textarea";
  placeholder?: string;
}

interface RepeaterFieldProps {
  label: string;
  items: any[];
  fields: Field[];
  onChange: (items: any[]) => void;
  itemLabelKey?: string;
}

export function RepeaterField({ label, items = [], fields, onChange, itemLabelKey }: RepeaterFieldProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addItem = () => {
    const newItem = fields.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {});
    onChange([...items, newItem]);
    setExpandedIndex(items.length);
  };

  const removeItem = (index: number) => {
    const next = [...items];
    next.splice(index, 1);
    onChange(next);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const updateItem = (index: number, key: string, value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 rounded-full">
          <Plus className="size-3.5 mr-1.5" />
          Додати
        </Button>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-muted rounded-xl">
            <p className="text-xs text-muted-foreground">Список порожній</p>
          </div>
        )}
        
        {items.map((item, index) => {
          const isExpanded = expandedIndex === index;
          const displayLabel = itemLabelKey ? (item[itemLabelKey] || `Елемент ${index + 1}`) : `Елемент ${index + 1}`;

          return (
            <div key={index} className="border border-border rounded-xl bg-card overflow-hidden">
              <div 
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors",
                  isExpanded && "border-b border-border bg-muted/30"
                )}
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <GripVertical className="size-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                <span className="flex-1 text-sm font-medium truncate">{displayLabel}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); removeItem(index); }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {fields.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{f.label}</Label>
                      {f.type === "textarea" ? (
                        <textarea
                          rows={3}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={item[f.key] || ""}
                          placeholder={f.placeholder}
                          onChange={(e) => updateItem(index, f.key, e.target.value)}
                        />
                      ) : (
                        <Input
                          className="h-9 rounded-full"
                          value={item[f.key] || ""}
                          placeholder={f.placeholder}
                          onChange={(e) => updateItem(index, f.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
