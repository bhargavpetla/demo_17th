EXTRACTION_PROMPT = """You are an expert venture capital analyst. Extract structured information from the following investment memo.

Document Text:
{document_text}

Extract the following information in valid JSON format:

{{
  "company_name": "string",
  "pitch": "one-line value proposition",
  "founders": [
    {{"name": "string", "role": "string", "background": "string"}}
  ],
  "business_model": "description of revenue streams",
  "financials": {{
    "revenue": "current revenue (e.g., $2M ARR)",
    "burn_rate": "monthly burn (e.g., $500K/month)",
    "runway": "months of runway",
    "valuation": "pre-money valuation"
  }},
  "tam": {{
    "total_addressable_market": "TAM size",
    "serviceable_market": "SAM size"
  }},
  "traction": {{
    "metrics": ["list of key metrics"],
    "growth_rate": "e.g., 30% MoM",
    "milestones": ["key achievements"]
  }},
  "competitors": ["list of competitors"],
  "ask": {{
    "amount": "funding amount requested",
    "use_of_funds": ["list of planned uses"]
  }},
  "risks": ["list of key risks"]
}}

Return ONLY valid JSON. If information is not found, use null or empty strings/arrays."""


RAG_PROMPT = """You are an AI assistant helping venture capital investors analyze investment memos.

Context from documents:
{context_chunks}

Question: {user_question}

Provide a comprehensive answer based on the context above. Always cite your sources using the format [Document Name, Page X] after each claim. Be specific with numbers and data when available.

If the question cannot be answered from the provided context, say so explicitly.

Answer:"""


FAQ_PROMPT = """You are a venture capital expert. Generate answers to the following 20 investor questions based on this investment memo.

Document Text:
{document_text}

Answer each question concisely (2-3 sentences) using information from the memo. If information is not available, state "Information not provided in the memo."

Questions:
1. What problem is the company solving?
2. What is the unique value proposition?
3. Who are the target customers?
4. What is the business model?
5. What is the current traction?
6. Who are the founders and their backgrounds?
7. What is the competitive landscape?
8. What is the TAM/SAM?
9. What are the key risks?
10. What is the funding ask and use of funds?
11. What is the valuation and cap table structure?
12. What are the unit economics?
13. What is the go-to-market strategy?
14. What milestones have been achieved?
15. What is the product roadmap?
16. What regulatory considerations exist?
17. What is the exit strategy?
18. What defensibility/moats does the company have?
19. What partnerships exist?
20. What are the next 12-month goals?

Return a JSON array:
[
  {{"question": "...", "answer": "..."}},
  ...
]

Return ONLY valid JSON array with exactly 20 items."""
