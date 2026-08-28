export type MemoPageRow = {
  id: string;
  parent_id: string | null;
  title: string;
  body: string;
  order_index: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by_name?: string | null;
};

const PAGE_SELECT =
  'id, parent_id, title, body, order_index, created_by, updated_by, created_at, updated_at';

export const MEMO_PAGE_SELECT = PAGE_SELECT;
