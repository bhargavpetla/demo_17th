from pydantic import BaseModel, field_validator
from typing import Optional


class Founder(BaseModel):
    name: str = ""
    role: str = ""
    background: str = ""

    @field_validator("name", "role", "background", mode="before")
    @classmethod
    def none_to_empty(cls, v):
        return v if v is not None else ""


class Financials(BaseModel):
    revenue: str = ""
    burn_rate: str = ""
    runway: str = ""
    valuation: str = ""

    @field_validator("revenue", "burn_rate", "runway", "valuation", mode="before")
    @classmethod
    def none_to_empty(cls, v):
        return v if v is not None else ""


class TAM(BaseModel):
    total_addressable_market: str = ""
    serviceable_market: str = ""

    @field_validator("total_addressable_market", "serviceable_market", mode="before")
    @classmethod
    def none_to_empty(cls, v):
        return v if v is not None else ""


class Traction(BaseModel):
    metrics: list[str] = []
    growth_rate: str = ""
    milestones: list[str] = []

    @field_validator("growth_rate", mode="before")
    @classmethod
    def none_to_empty(cls, v):
        return v if v is not None else ""

    @field_validator("metrics", "milestones", mode="before")
    @classmethod
    def none_to_list(cls, v):
        return v if v is not None else []


class Ask(BaseModel):
    amount: str = ""
    use_of_funds: list[str] = []

    @field_validator("amount", mode="before")
    @classmethod
    def none_to_empty(cls, v):
        return v if v is not None else ""

    @field_validator("use_of_funds", mode="before")
    @classmethod
    def none_to_list(cls, v):
        return v if v is not None else []


class ExtractionResult(BaseModel):
    doc_id: str
    company_name: str = ""
    pitch: str = ""
    founders: list[Founder] = []
    business_model: str = ""
    financials: Financials = Financials()
    tam: TAM = TAM()
    traction: Traction = Traction()
    competitors: list[str] = []
    ask: Ask = Ask()
    risks: list[str] = []
    status: str = "pending"
    error_message: Optional[str] = None

    @field_validator("company_name", "pitch", "business_model", mode="before")
    @classmethod
    def none_to_empty(cls, v):
        return v if v is not None else ""

    @field_validator("founders", "competitors", "risks", mode="before")
    @classmethod
    def none_to_list(cls, v):
        return v if v is not None else []
