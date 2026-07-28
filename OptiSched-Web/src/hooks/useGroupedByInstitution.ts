import { useQueries, useQuery } from "@tanstack/react-query";

import { listInstitutions } from "@/api/institutions";

/**
 * Fetches all institutions plus, for each one, a per-institution list (via
 * `listFn`), so a page can group entities by institution the same way the
 * Professores page groups qualifications/availability by professor: one
 * eager fetch per group, then client-side lookup — no extra request when a
 * group's modal is opened.
 */
export function useGroupedByInstitution<T>(
  queryKeyPrefix: string,
  listFn: (institutionId: number) => Promise<T[]>
) {
  const { data: institutions, isLoading: institutionsLoading } = useQuery({
    queryKey: ["institutions"],
    queryFn: listInstitutions,
  });

  const itemQueries = useQueries({
    queries: (institutions ?? []).map((institution) => ({
      queryKey: [queryKeyPrefix, institution.id],
      queryFn: () => listFn(institution.id),
    })),
  });

  const isLoading = institutionsLoading || itemQueries.some((query) => query.isLoading);

  const itemsByInstitution = new Map<number, T[]>();
  (institutions ?? []).forEach((institution, index) => {
    itemsByInstitution.set(institution.id, itemQueries[index]?.data ?? []);
  });

  return {
    institutions: institutions ?? [],
    itemsByInstitution,
    isLoading,
  };
}
