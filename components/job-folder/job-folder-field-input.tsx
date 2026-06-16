"use client";

import type { ManualFieldDefinition } from "@/lib/job-folder/document-fields";
import { TvDateInput } from "@/components/tv/tv-date-input";
import { TvInput } from "@/components/tv/tv-input";
import { TvMilesInput } from "@/components/tv/tv-miles-input";
import { TvTextarea } from "@/components/tv/tv-textarea";
import {
  fieldKeyToLabel,
  isDateFieldKey,
  isLocationFieldKey,
  isMilesFieldKey,
  LOCATION_FIELD_PLACEHOLDER,
} from "@/lib/job-folder/field-labels";

interface JobFolderFieldInputProps {
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  hideLabel?: boolean;
  label?: string;
  placeholder?: string;
  inputType?: ManualFieldDefinition["inputType"];
  rows?: number;
  className?: string;
}

export function JobFolderFieldInput({
  fieldKey,
  value,
  onChange,
  hideLabel = false,
  label: labelOverride,
  placeholder,
  inputType,
  rows = 3,
  className,
}: JobFolderFieldInputProps) {
  const label = hideLabel ? "" : (labelOverride ?? fieldKeyToLabel(fieldKey));
  const resolvedInputType =
    inputType ?? (isDateFieldKey(fieldKey) ? "date" : "text");

  if (resolvedInputType === "date") {
    return (
      <TvDateInput
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    );
  }

  if (resolvedInputType === "textarea") {
    return (
      <TvTextarea
        label={label}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    );
  }

  if (isMilesFieldKey(fieldKey)) {
    return (
      <TvMilesInput
        label={label}
        value={value}
        onChange={onChange}
        className={className}
      />
    );
  }

  if (isLocationFieldKey(fieldKey)) {
    return (
      <TvInput
        label={label}
        labelVariant="readable"
        borderVariant="gold"
        autoComplete="street-address"
        placeholder={placeholder ?? LOCATION_FIELD_PLACEHOLDER}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    );
  }

  if (fieldKey === "load_value") {
    return (
      <TvInput
        label={label}
        labelVariant="readable"
        borderVariant="gold"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className={className}
      />
    );
  }

  return (
    <TvInput
      label={label}
      labelVariant="readable"
      borderVariant="gold"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    />
  );
}
