import { useQueries, useQuery } from "@tanstack/react-query";

import { listInstitutions } from "@/api/institutions";
import type { InstitutionType } from "@/types/Institution";

/**
 * Fetches all institutions plus, for each one, a per-institution list (via
 * `listFn`), so a page can group entities by institution the same way the
 * Professores page groups qualifications/availability by professor: one
 * eager fetch per group, then client-side lookup — no extra request when a
 * group's modal is opened.
 *
 * `type`, when given, filters which institutions are considered before the
 * per-institution fetches even start — used by Super Admin pages to respect
 * the global University/School mode toggle.
 */
export function useGroupedByInstitution<T>(
  queryKeyPrefix: string,
  listFn: (institutionId: number) => Promise<T[]>,
  type?: InstitutionType
) {
  const { data: allInstitutions, isLoading: institutionsLoading } = useQuery({
    queryKey: ["institutions"],
    queryFn: listInstitutions,
  });

  const institutions = (allInstitutions ?? []).filter(
    (institution) => type === undefined || institution.type === type
  );

  const itemQueries = useQueries({
    queries: institutions.map((institution) => ({
      queryKey: [queryKeyPrefix, institution.id],
      queryFn: () => listFn(institution.id),
    })),
  });

  const isLoading = institutionsLoading || itemQueries.some((query) => query.isLoading);

  const itemsByInstitution = new Map<number, T[]>();
  institutions.forEach((institution, index) => {
    itemsByInstitution.set(institution.id, itemQueries[index]?.data ?? []);
  });

  return {
    institutions,
    itemsByInstitution,
    isLoading,
  };
}
