import { ContaboListResponse, ContaboLinks, ContaboPagination } from './types';

export function buildPaginatedResponse<T>(
  data: T[],
  page: number,
  size: number,
  basePath: string
): ContaboListResponse<T> {
  const totalElements = data.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const startIdx = (safePage - 1) * size;
  const endIdx = startIdx + size;
  const paginatedData = data.slice(startIdx, endIdx);

  const pagination: ContaboPagination = {
    size,
    totalElements,
    totalPages,
    page: safePage,
  };

  const links: ContaboLinks = {
    first: `${basePath}?page=1`,
    previous: safePage > 1 ? `${basePath}?page=${safePage - 1}` : `${basePath}?page=1`,
    self: `${basePath}?page=${safePage}`,
    next: safePage < totalPages ? `${basePath}?page=${safePage + 1}` : `${basePath}?page=${totalPages}`,
    last: `${basePath}?page=${totalPages}`,
  };

  return {
    _pagination: pagination,
    data: paginatedData,
    _links: links,
  };
}

export function buildSingleResponse<T>(data: T, selfPath: string) {
  return {
    data: [data],
    _links: { self: selfPath },
  };
}

export function generateMacAddress(): string {
  const hex = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .toUpperCase()
      .padStart(2, '0');
  return `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}
