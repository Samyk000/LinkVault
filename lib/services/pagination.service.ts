/**
 * @file lib/services/pagination.service.ts
 * @description Pagination utilities for handling large datasets efficiently
 * @created 2025-11-11
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

/**
 * Creates a cursor from an item's ID and sort field
 * @param {string} id - Item ID
 * @param {string | number} sortValue - Sort field value
 * @returns {string} Encoded cursor
 */
export function createCursor(id: string, sortValue: string | number): string {
  const data = `${sortValue}_${id}`;
  return Buffer.from(data).toString('base64');
}

/**
 * Decodes a cursor to get ID and sort value
 * @param {string} cursor - Encoded cursor
 * @returns {{id: string, sortValue: string} | null} Decoded cursor data
 */
export function decodeCursor(cursor: string): { id: string; sortValue: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [sortValue, id] = decoded.split('_');
    return { id, sortValue };
  } catch (error) {
    return null;
  }
}

/**
 * Builds pagination query conditions for Supabase
 * @param {PaginationOptions} options - Pagination options
 * @param {string} sortField - Field to sort by
 * @returns {Object} Query conditions
 */
export function buildPaginationQuery(
  options: PaginationOptions,
  sortField: string = 'created_at'
): {
  limit: number;
  orderBy: { column: string; ascending: boolean };
  range?: { from: number; to: number };
  cursorCondition?: { column: string; operator: string; value: any };
} {
  const limit = Math.min(options.limit || 20, 100); // Max 100 items per page
  const orderDirection = options.orderDirection || 'desc';
  const orderBy = {
    column: options.orderBy || sortField,
    ascending: orderDirection === 'asc',
  };

  // Cursor-based pagination (preferred for infinite scroll)
  if (options.cursor) {
    const cursorData = decodeCursor(options.cursor);
    if (cursorData) {
      const operator = orderDirection === 'desc' ? 'lt' : 'gt';
      return {
        limit,
        orderBy,
        cursorCondition: {
          column: orderBy.column,
          operator,
          value: cursorData.sortValue,
        },
      };
    }
  }

  // Offset-based pagination (fallback)
  const page = Math.max(1, options.page || 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return {
    limit,
    orderBy,
    range: { from, to },
  };
}

/**
 * Calculates pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {T[]} data - Current page data
 * @returns {PaginatedResult<T>['meta']} Pagination metadata
 */
export function calculatePaginationMeta<T extends { id: string; [key: string]: any }>(
  total: number,
  page: number,
  limit: number,
  data: T[],
  orderBy: string = 'created_at'
): PaginatedResult<T>['meta'] {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Generate cursors
  let nextCursor: string | undefined;
  let prevCursor: string | undefined;

  if (data.length > 0) {
    // Next cursor from last item
    const lastItem = data[data.length - 1];
    const lastSortValue = lastItem[orderBy] || lastItem.id;
    nextCursor = createCursor(lastItem.id, lastSortValue);

    // Prev cursor from first item
    const firstItem = data[0];
    const firstSortValue = firstItem[orderBy] || firstItem.id;
    prevCursor = createCursor(firstItem.id, firstSortValue);
  }

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextCursor,
    prevCursor,
  };
}

/**
 * Optimized pagination for Supabase with cursor-based navigation
 * @param {any} supabase - Supabase client
 * @param {string} table - Table name
 * @param {PaginationOptions} options - Pagination options
 * @param {Object} filters - Additional filters
 * @returns {Promise<PaginatedResult<any>>} Paginated result
 */
export async function paginateSupabaseQuery(
  supabase: any,
  table: string,
  options: PaginationOptions = {},
  filters: Record<string, any> = {}
): Promise<PaginatedResult<any>> {
  const { limit, orderBy, range, cursorCondition } = buildPaginationQuery(options);

  let query = supabase
    .from(table)
    .select('*', { count: 'exact' });

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });

  // Apply cursor condition for cursor-based pagination
  if (cursorCondition) {
    query = query[cursorCondition.operator](cursorCondition.column, cursorCondition.value);
  }

  // Apply range for offset-based pagination
  if (range) {
    query = query.range(range.from, range.to);
  }

  // Apply ordering
  query = query.order(orderBy.column, { ascending: orderBy.ascending });

  // Apply limit
  query = query.limit(limit);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const page = options.page || 1;
  const meta = calculatePaginationMeta(
    count || 0,
    page,
    limit,
    data || [],
    orderBy.column
  );

  return {
    data: data || [],
    meta,
  };
}