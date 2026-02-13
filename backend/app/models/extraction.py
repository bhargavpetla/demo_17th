from pydantic import BaseModel
from typing import Optional


class Founder(BaseModel):
    name: str = ""
    role: str = ""
    background: str = ""


class Financials(BaseModel):
    revenue: str = ""
    burn_rate: str = ""
    runway: str = ""
    valuation: str = ""


class TAM(BaseModel):
    total_addressable_market: str = ""
    serviceable_market: str = ""


class Traction(BaseModel):
    metrics: list[str] = []
    growth_rate: str = ""
    milestones: list[str] = []


class Ask(BaseModel):
    amount: str = ""
    use_of_funds: list[str] = []


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
    status: str = "pending"  # pending, processing, completed, error
    error_message: Optional[str] = None
