export interface LandOcrRecord {
  document_type: string;
  people: Array<{ name: string; role: string | null; address: string | null; identifier: string | null }>;
  parcels: Array<{
    plot_number: string | null;
    survey_number: string | null;
    area: string | null;
    village: string | null;
    district: string | null;
    state: string | null;
    boundaries: string | null;
    other_identifiers: Record<string, string>;
  }>;
  dates: string[];
  monetary_amounts: Array<{ purpose: string | null; amount: string; currency: string | null }>;
  case_or_notice_numbers: string[];
  legal_references: string[];
  issuing_authority: string | null;
  acquisition_purpose: string | null;
  summary: string;
  confidence: number;
  review_required: boolean;
  warnings: string[];
}

export interface OcrExtraction {
  filename: string;
  page_count: number;
  pages: Array<{ page: number; text: string }>;
  record: LandOcrRecord;
}

export async function extractLandDocument(file: File): Promise<OcrExtraction> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/ocr/extract", { method: "POST", body: formData });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Document extraction failed");
  return body as OcrExtraction;
}

export function areaToSquareFeet(area: string | null): string | null {
  if (!area) return null;
  const match = area.toLowerCase().replace(/,/g, "").match(/([\d.]+)\s*(.*)/);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = unit.includes("hectare") || unit === "ha" ? 107639.104
    : unit.includes("acre") ? 43560
    : unit.includes("square metre") || unit.includes("square meter") || unit.includes("sq m") ? 10.7639
    : unit.includes("square foot") || unit.includes("square feet") || unit.includes("sq ft") || unit.includes("sq. ft") ? 1
    : null;
  return multiplier && Number.isFinite(value) ? Math.round(value * multiplier).toString() : null;
}
