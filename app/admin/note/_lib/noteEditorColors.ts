export const NOTE_TEXT_COLOR_OPTIONS = [
  { id: 'default', value: null as string | null, swatch: 'bg-slate-800' },
  { id: 'gray', value: '#57534e', swatch: 'bg-stone-500' },
  { id: 'brown', value: '#92400e', swatch: 'bg-amber-800' },
  { id: 'orange', value: '#ea580c', swatch: 'bg-orange-600' },
  { id: 'yellow', value: '#ca8a04', swatch: 'bg-yellow-600' },
  { id: 'green', value: '#16a34a', swatch: 'bg-green-600' },
  { id: 'blue', value: '#2563eb', swatch: 'bg-blue-600' },
  { id: 'purple', value: '#7c3aed', swatch: 'bg-violet-600' },
  { id: 'pink', value: '#db2777', swatch: 'bg-pink-600' },
  { id: 'red', value: '#dc2626', swatch: 'bg-red-600' },
] as const;

export const NOTE_HIGHLIGHT_COLOR_OPTIONS = [
  { id: 'default', value: null as string | null, swatch: 'bg-white border border-slate-200' },
  { id: 'yellow', value: '#fef08a', swatch: 'bg-yellow-200' },
  { id: 'green', value: '#bbf7d0', swatch: 'bg-green-200' },
  { id: 'blue', value: '#bfdbfe', swatch: 'bg-blue-200' },
  { id: 'purple', value: '#e9d5ff', swatch: 'bg-purple-200' },
  { id: 'pink', value: '#fbcfe8', swatch: 'bg-pink-200' },
  { id: 'red', value: '#fecaca', swatch: 'bg-red-200' },
  { id: 'gray', value: '#e7e5e4', swatch: 'bg-stone-200' },
] as const;
