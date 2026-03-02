// Stub for ag-grid-community CSS imports and type exports

export interface ColDef<TData = unknown, TValue = unknown> {
  headerName?: string;
  field?: string;
  width?: number;
  editable?: boolean | ((params: { data: TData }) => boolean);
  checkboxSelection?: boolean | ((params: { data: TData }) => boolean);
  valueGetter?: (params: { data: TData }) => TValue;
  [key: string]: unknown;
}

export interface ColGroupDef<TData = unknown> {
  headerName?: string;
  children?: (ColDef<TData> | ColGroupDef<TData>)[];
  [key: string]: unknown;
}

export const AllCommunityModule = {};
