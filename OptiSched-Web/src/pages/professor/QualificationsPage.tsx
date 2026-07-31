import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { listQualifications } from "@/api/professor-qualifications";
import { useAuth } from "@/hooks/UseAuth";

function EmptyNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

export function QualificationsPage() {
  const { t } = useTranslation("professorQualifications");
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? null;
  const professorId = user?.professorId ?? null;

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-6">
        {institutionId === null || professorId === null ? (
          <EmptyNotice text={t("noProfessorRecord")} />
        ) : (
          <QualificationsContent institutionId={institutionId} professorId={professorId} />
        )}
      </div>
    </div>
  );
}

function QualificationsContent({
  institutionId,
  professorId,
}: {
  institutionId: number;
  professorId: number;
}) {
  const { t } = useTranslation("professorQualifications");
  const { data: qualifications, isLoading } = useQuery({
    queryKey: ["qualifications", institutionId],
    queryFn: () => listQualifications(institutionId),
  });

  const myQualifications = (qualifications ?? [])
    .filter((q) => q.professorId === professorId)
    .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));

  return (
    <div className="card-elevated rounded-2xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnCode")}</TableHead>
            <TableHead>{t("columnSubject")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground">
                {t("common:status.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && myQualifications.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground">
                {t("noQualifications")}
              </TableCell>
            </TableRow>
          )}
          {myQualifications.map((qualification) => (
            <TableRow key={qualification.subjectId}>
              <TableCell className="font-medium">{qualification.subjectCode}</TableCell>
              <TableCell>{qualification.subjectName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
