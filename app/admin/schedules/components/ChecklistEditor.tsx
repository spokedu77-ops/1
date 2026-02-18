'use client';

import { useState } from 'react';
import { Check, Square, Plus, Trash2 } from 'lucide-react';
import type { ChecklistItem } from '@/app/lib/schedules/types';

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  disabled?: boolean;
}

function genId() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ChecklistEditor({ items, onChange, disabled }: ChecklistEditorProps) {
  const [newText, setNewText] = useState('');

  const add = () => {
    const t = newText.trim();
    if (!t) return;
    onChange([...items, { id: genId(), text: t, done: false }]);
    setNewText('');
  };

  const toggle = (id: string) => {
    onChange(
      items.map((it) => (it.id === id ? { ...it, done: !it.done } : it))
    );
  };

  const remove = (id: string) => {
    onChange(items.filter((it) => it.id !== id));
  };

  const updateText = (id: string, text: string) => {
    onChange(
      items.map((it) => (it.id === id ? { ...it, text } : it))
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="항목 추가"
          disabled={disabled}
          className="flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={disabled || !newText.trim()}
          className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2 group">
            <button
              type="button"
              onClick={() => toggle(it.id)}
              disabled={disabled}
              className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {it.done ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
            <input
              type="text"
              value={it.text}
              onChange={(e) => updateText(it.id, e.target.value)}
              disabled={disabled}
              className={`flex-1 min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-slate-300 focus:outline-none ${
                it.done ? 'line-through text-slate-500' : 'text-slate-700'
              }`}
            />
            <button
              type="button"
              onClick={() => remove(it.id)}
              disabled={disabled}
              className="shrink-0 rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
