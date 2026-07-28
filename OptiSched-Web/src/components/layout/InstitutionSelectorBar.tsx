import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listInstitutions } from "@/api/institutions";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";

const INSTITUTIONS_QUERY_KEY = ["institutions"] as const;

export function InstitutionSelectorBar() {
  const { data: institutions } = useQuery({
    queryKey: INSTITUTIONS_QUERY_KEY,
    queryFn: listInstitutions,
  });
  const { selectedInstitutionId, setSelectedInstitutionId } = useSelectedInstitution();

  return (
    <div className="border-b border-border/70 bg-secondary/40">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <span className="text-sm font-medium text-foreground">Instituição:</span>
        <Select
          value={selectedInstitutionId !== null ? String(selectedInstitutionId) : ""}
          onValueChange={(value) => setSelectedInstitutionId(value ? Number(value) : null)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecione uma instituição">
              {(value: string) =>
                institutions?.find((institution) => String(institution.id) === value)?.name ??
                value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
            {institutions?.map((institution) => (
              <SelectItem key={institution.id} value={String(institution.id)}>
                {institution.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
