import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export function TimeSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation("adminInfrastructure");
  const [hour, minute] = value ? value.split(":") : ["", ""];

  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={(newHour) => onChange(`${newHour}:${minute || "00"}`)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={t("hourPlaceholder")} />
        </SelectTrigger>
        <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}h
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select
        value={minute}
        onValueChange={(newMinute) => onChange(`${hour || "00"}:${newMinute}`)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("minutePlaceholder")} />
        </SelectTrigger>
        <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}min
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
