from pydantic import BaseModel, Field, model_validator


class Person(BaseModel):
    name: str
    role: str | None = Field(
        default=None,
        description="For example owner, tenant, claimant, witness, officer, or purchaser",
    )
    address: str | None = None
    identifier: str | None = Field(
        default=None,
        description="Identifier exactly as printed; do not infer missing values",
    )


class Parcel(BaseModel):
    plot_number: str | None = None
    survey_number: str | None = None
    area: str | None = Field(default=None, description="Area including its printed unit")
    village: str | None = None
    district: str | None = None
    state: str | None = None
    boundaries: str | None = None
    other_identifiers: dict[str, str] = Field(
        default_factory=dict,
        description="Jurisdiction-specific references such as khasra, khata, title, deed, or folio",
    )


class MoneyAmount(BaseModel):
    purpose: str | None = Field(default=None, description="For example compensation or market value")
    amount: str
    currency: str | None = None


class LandRecord(BaseModel):
    document_type: str = "unknown"
    people: list[Person] = Field(default_factory=list)
    parcels: list[Parcel] = Field(default_factory=list)
    dates: list[str] = Field(default_factory=list)
    monetary_amounts: list[MoneyAmount] = Field(default_factory=list)
    case_or_notice_numbers: list[str] = Field(default_factory=list)
    legal_references: list[str] = Field(default_factory=list)
    issuing_authority: str | None = None
    acquisition_purpose: str | None = None
    summary: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    review_required: bool = True
    warnings: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_review_for_low_confidence(self) -> "LandRecord":
        if self.confidence < 0.85:
            self.review_required = True
            if not any("confidence" in warning.lower() for warning in self.warnings):
                self.warnings.append("Extraction confidence is below 0.85.")
        return self


class PageText(BaseModel):
    page: int
    text: str


class ExtractionResponse(BaseModel):
    filename: str
    page_count: int
    pages: list[PageText]
    record: LandRecord
