"use client";

import { useMemo } from "react";
import { SortOrder } from "@/lib/types";

type Filterable = { title: string; desc: string; tags: string[] };

export function useFilteredItems<T extends Filterable>(
  items: T[],
  filters: string[],
  query: string,
  sortOrder: SortOrder,
  calcPt: (item: T) => number,
): T[] {
  return useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    let result = items;

    if (filters.length > 0)
      result = result.filter((item) =>
        filters.every((t) => item.tags.includes(t)),
      );

    if (lowerQuery)
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerQuery) ||
          item.desc.toLowerCase().includes(lowerQuery) ||
          item.tags.some((t) => t.toLowerCase().includes(lowerQuery)),
      );

    if (sortOrder === "pt-desc")
      result = [...result].sort((a, b) => calcPt(b) - calcPt(a));
    if (sortOrder === "pt-asc")
      result = [...result].sort((a, b) => calcPt(a) - calcPt(b));

    return result;
  }, [items, filters, query, sortOrder, calcPt]);
}
