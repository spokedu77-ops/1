export type MemoBlockType = 'text' | 'checklist' | 'toggle';

export type MemoPageRow = {
  id: string;
  parent_id: string | null;
  title: string;
  order_index: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by_name?: string | null;
};

export type MemoBlockRow = {
  id: string;
  memo_id: string;
  parent_block_id: string | null;
  type: MemoBlockType;
  content: string;
  checked: boolean;
  collapsed: boolean;
  order_index: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};
