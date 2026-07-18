// API envelope — shared response shapes for client + mock layer.

export interface ApiError {
  message: string;
  code?: string;
}

export interface ApiException {
  error: ApiError;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
