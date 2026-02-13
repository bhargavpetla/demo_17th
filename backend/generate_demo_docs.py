"""Generate 5 demo VC investment memo PDFs using reportlab."""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT

DEMO_DIR = os.path.join(os.path.dirname(__file__), "demo_documents")
os.makedirs(DEMO_DIR, exist_ok=True)

PRIMARY_BLUE = HexColor("#1D4ED8")
LIGHT_BLUE = HexColor("#DBEAFE")
DARK = HexColor("#111827")
GRAY = HexColor("#6B7280")

styles = getSampleStyleSheet()
title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=22, textColor=PRIMARY_BLUE, spaceAfter=6)
subtitle_style = ParagraphStyle("Subtitle2", parent=styles["Normal"], fontSize=12, textColor=GRAY, alignment=TA_CENTER, spaceAfter=20)
h2_style = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=14, textColor=PRIMARY_BLUE, spaceBefore=16, spaceAfter=8)
body_style = ParagraphStyle("Body2", parent=styles["Normal"], fontSize=10, textColor=DARK, leading=14, spaceAfter=6)
bullet_style = ParagraphStyle("Bullet2", parent=body_style, leftIndent=20, bulletIndent=10, spaceBefore=2, spaceAfter=2)


def make_table(data, col_widths=None):
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#FFFFFF")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#FFFFFF"), LIGHT_BLUE]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def build_memo(filename, company):
    path = os.path.join(DEMO_DIR, filename)
    doc = SimpleDocTemplate(path, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []

    # Title page
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph(f"CONFIDENTIAL", ParagraphStyle("Conf", parent=body_style, alignment=TA_CENTER, textColor=GRAY, fontSize=9)))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Investment Memo", title_style))
    story.append(Paragraph(company["name"], ParagraphStyle("CompName", parent=title_style, fontSize=28, alignment=TA_CENTER)))
    story.append(Spacer(1, 12))
    story.append(Paragraph(company["pitch"], subtitle_style))
    story.append(Spacer(1, 24))
    story.append(Paragraph(f"{company['stage']} | {company['date']}", ParagraphStyle("Stage", parent=subtitle_style, fontSize=10)))
    story.append(PageBreak())

    # Executive Summary
    story.append(Paragraph("Executive Summary", h2_style))
    story.append(Paragraph(company["exec_summary"], body_style))
    story.append(Spacer(1, 8))

    # Key Metrics Table
    story.append(Paragraph("Key Metrics", h2_style))
    metrics_data = [["Metric", "Value"]] + [[k, v] for k, v in company["metrics"].items()]
    story.append(make_table(metrics_data, col_widths=[2.5*inch, 4*inch]))
    story.append(Spacer(1, 12))

    # Company Overview
    story.append(Paragraph("Company Overview", h2_style))
    story.append(Paragraph(company["overview"], body_style))
    story.append(Spacer(1, 8))

    # Market Opportunity
    story.append(Paragraph("Market Opportunity", h2_style))
    story.append(Paragraph(company["market"], body_style))
    story.append(Spacer(1, 8))

    # Team
    story.append(Paragraph("Founding Team", h2_style))
    team_data = [["Name", "Role", "Background"]] + company["team"]
    story.append(make_table(team_data, col_widths=[1.5*inch, 1.5*inch, 3.5*inch]))
    story.append(Spacer(1, 12))

    # Business Model
    story.append(Paragraph("Business Model", h2_style))
    story.append(Paragraph(company["business_model"], body_style))
    story.append(Spacer(1, 8))

    # Financial Overview
    story.append(Paragraph("Financial Overview", h2_style))
    fin_data = [["Metric", "Value"]] + [[k, v] for k, v in company["financials"].items()]
    story.append(make_table(fin_data, col_widths=[2.5*inch, 4*inch]))
    story.append(Spacer(1, 12))

    # Traction
    story.append(Paragraph("Traction & Milestones", h2_style))
    for item in company["traction"]:
        story.append(Paragraph(f"\u2022 {item}", bullet_style))
    story.append(Spacer(1, 8))

    # Competitive Landscape
    story.append(Paragraph("Competitive Landscape", h2_style))
    story.append(Paragraph(company["competition"], body_style))
    comp_data = [["Competitor", "Differentiation"]] + company["competitors"]
    story.append(make_table(comp_data, col_widths=[2.5*inch, 4*inch]))
    story.append(Spacer(1, 12))

    # Risks
    story.append(Paragraph("Key Risks", h2_style))
    for risk in company["risks"]:
        story.append(Paragraph(f"\u2022 {risk}", bullet_style))
    story.append(Spacer(1, 8))

    # The Ask
    story.append(Paragraph("Funding Ask", h2_style))
    story.append(Paragraph(f"<b>Amount:</b> {company['ask']['amount']}", body_style))
    story.append(Paragraph(f"<b>Valuation:</b> {company['ask']['valuation']}", body_style))
    story.append(Paragraph("<b>Use of Funds:</b>", body_style))
    for use in company["ask"]["use_of_funds"]:
        story.append(Paragraph(f"\u2022 {use}", bullet_style))

    doc.build(story)
    print(f"Generated: {path}")


# ============ 5 DEMO COMPANIES ============

COMPANIES = [
    {
        "name": "Acme AI",
        "pitch": "AI-powered workflow automation platform for mid-market enterprises",
        "stage": "Series A",
        "date": "January 2025",
        "exec_summary": "Acme AI is building an enterprise workflow automation platform powered by large language models. The company targets mid-market enterprises (500-5,000 employees) with a no-code AI agent builder that automates repetitive back-office workflows across HR, Finance, and Operations. Founded in 2023 by two ex-Google engineers, the company has achieved $2M ARR in just 14 months with 150 enterprise customers. The platform reduces manual workflow processing time by 85% and integrates with 40+ enterprise SaaS tools. Acme AI is seeking $10M in Series A funding to expand its sales team and accelerate product development.",
        "overview": "Acme AI was founded in San Francisco in October 2023 by Sarah Chen (CEO) and Michael Rodriguez (CTO), both former Google AI researchers. The platform enables non-technical business users to build AI-powered workflow automations using natural language instructions. Unlike traditional RPA tools that require scripting, Acme AI leverages LLMs to understand context and handle exceptions intelligently. The platform currently supports 40+ integrations including Salesforce, Workday, SAP, and NetSuite. Key use cases include automated invoice processing, employee onboarding workflows, customer support ticket routing, and compliance document review.",
        "market": "The global intelligent process automation market is projected to reach $50B by 2028 (Gartner). The serviceable addressable market (SAM) for AI workflow automation in mid-market enterprises is estimated at $12B. Key market drivers include: (1) Labor shortages pushing enterprises toward automation, (2) LLM capabilities enabling more sophisticated automation, (3) Mid-market enterprises being underserved by enterprise-focused vendors like UiPath and Automation Anywhere. The target segment of 500-5,000 employee companies represents 200,000+ organizations in North America alone.",
        "team": [
            ["Sarah Chen", "CEO", "Ex-Google Brain researcher (6 years). PhD in ML from Stanford. Led Google's enterprise AI automation initiative. Published 15 papers on NLP."],
            ["Michael Rodriguez", "CTO", "Ex-Google Cloud engineer (8 years). MS in CS from MIT. Built Google's internal workflow orchestration platform serving 50K employees."],
            ["Lisa Park", "VP Sales", "Ex-Salesforce enterprise sales (10 years). Consistently exceeded quota by 150%. Built and managed teams of 30+ AEs."],
        ],
        "business_model": "Acme AI operates a B2B SaaS model with tiered pricing. The Starter plan ($500/month) includes 10 AI agents and 1,000 workflow runs. The Professional plan ($2,000/month) includes 50 agents and 10,000 runs. The Enterprise plan ($5,000+/month) offers unlimited agents and runs with dedicated support. Average contract value is $15K/year with net revenue retention of 135%. Professional services (implementation and training) contribute an additional 15% of revenue.",
        "metrics": {
            "ARR": "$2.0M",
            "MRR": "$167K",
            "MoM Growth": "30%",
            "Customers": "150 enterprise accounts",
            "Net Revenue Retention": "135%",
            "Gross Margin": "78%",
            "CAC Payback": "8 months",
            "Average Contract Value": "$15K/year",
        },
        "financials": {
            "Current ARR": "$2.0M",
            "Monthly Burn Rate": "$350K",
            "Runway": "8 months (at current burn)",
            "Previous Funding": "$3M Seed (2023)",
            "Total Raised": "$3M",
            "Cash on Hand": "$2.8M",
            "Revenue Growth (YoY)": "N/A (founded 14 months ago)",
        },
        "traction": [
            "Reached $2M ARR in 14 months from launch",
            "150 paying enterprise customers across 12 industries",
            "30% month-over-month revenue growth for last 6 months",
            "Net revenue retention of 135% driven by seat expansion",
            "40+ SaaS integrations live (Salesforce, Workday, SAP, NetSuite)",
            "Named 'Cool Vendor' in Gartner's Intelligent Automation category",
            "Reduced customer workflow processing time by 85% on average",
            "Strategic partnership with Microsoft Azure Marketplace",
        ],
        "competition": "The workflow automation space is competitive but fragmented. Legacy RPA vendors (UiPath, Automation Anywhere) focus on large enterprises with complex, scripted automations. Newer AI-native players are emerging but most target developers rather than business users.",
        "competitors": [
            ["UiPath", "Enterprise-focused, requires technical expertise. Acme targets mid-market with no-code approach."],
            ["Zapier", "Consumer/SMB focused, no AI capabilities. Acme offers intelligent exception handling."],
            ["Microsoft Power Automate", "Part of M365 ecosystem. Acme is platform-agnostic with superior AI."],
            ["Moveworks", "IT-focused chatbot. Acme covers broader back-office workflows."],
        ],
        "risks": [
            "Platform risk from LLM providers (OpenAI, Anthropic) - mitigated by multi-model architecture",
            "Enterprise sales cycle length (3-6 months) may slow growth",
            "Competition from Microsoft and Google building similar features into existing products",
            "Data security concerns from enterprises regarding AI processing sensitive workflows",
            "Dependency on third-party integrations that may change APIs",
        ],
        "ask": {
            "amount": "$10M",
            "valuation": "$40M pre-money",
            "use_of_funds": [
                "Sales & Marketing (50%): Expand sales team from 5 to 15, increase demand gen",
                "Engineering (30%): Hire 10 engineers, build advanced AI features and new integrations",
                "Customer Success (15%): Scale CS team to support growing enterprise base",
                "G&A (5%): Legal, compliance, and operational infrastructure",
            ],
        },
    },
    {
        "name": "Beta Fintech",
        "pitch": "Modern banking infrastructure for small and medium businesses in underserved markets",
        "stage": "Seed Round",
        "date": "February 2025",
        "exec_summary": "Beta Fintech is building a neobank platform specifically designed for SMBs in underserved markets. Traditional banks fail to serve the 30M+ small businesses in the US with modern financial tools. Beta Fintech offers business checking accounts, invoicing, expense management, and working capital loans through a single mobile-first platform. Founded by an ex-Stripe product lead and an ex-Goldman Sachs investment banker, the company has achieved $500K ARR with 10K signups and 1,000 active users in just 8 months. Beta Fintech is raising $3M in Seed funding to expand product capabilities and grow its user base.",
        "overview": "Beta Fintech launched in June 2024, targeting small businesses with 1-50 employees that are underserved by traditional banks. The platform offers: (1) Business checking accounts with zero fees, (2) Integrated invoicing and payment collection, (3) Automated expense categorization and bookkeeping, (4) Revenue-based working capital advances up to $50K. The company partners with a chartered bank for deposits (FDIC insured) and uses proprietary ML models for credit underwriting. The mobile-first platform is designed for business owners who manage finances on-the-go, with an average session time of 12 minutes.",
        "market": "The US SMB banking market represents a $30B revenue opportunity. There are 33M small businesses in the US, and 82% report dissatisfaction with their current banking provider (2024 J.D. Power study). The addressable market for SMB fintech solutions is growing at 25% annually. Key tailwinds include: increasing digitization of SMB operations, regulatory changes enabling fintech partnerships, and growing demand for integrated financial platforms versus point solutions.",
        "team": [
            ["James Wright", "CEO", "Ex-Stripe Product Lead (5 years). Led Stripe Atlas, growing it to $100M+ in revenue. MBA from Wharton."],
            ["Priya Patel", "CFO/Co-founder", "Ex-Goldman Sachs VP in Investment Banking (7 years). Specialized in fintech M&A. CFA charterholder."],
            ["Tom Harris", "CTO", "Ex-Plaid senior engineer (4 years). Built Plaid's transaction enrichment engine processing 1B+ transactions/month."],
        ],
        "business_model": "Beta Fintech generates revenue through: (1) Interchange fees on debit card transactions (1.5% average), (2) SaaS subscription for premium features ($29/month), (3) Interest margin on working capital advances (18-24% APR), (4) Payment processing fees on invoicing (2.9% + $0.30). Current revenue mix: 40% interchange, 25% subscriptions, 25% lending, 10% payment processing. Target blended take rate of 3.5% of SMB financial volume.",
        "metrics": {
            "ARR": "$500K",
            "Total Signups": "10,000",
            "Active Users": "1,000",
            "Deposit Volume": "$15M",
            "Monthly Transaction Volume": "$8M",
            "Average Revenue Per User": "$42/month",
            "Churn Rate": "3% monthly",
            "NPS Score": "62",
        },
        "financials": {
            "Current ARR": "$500K",
            "Monthly Burn Rate": "$180K",
            "Runway": "6 months",
            "Previous Funding": "$1.5M Pre-Seed (friends & family + angels)",
            "Total Raised": "$1.5M",
            "Cash on Hand": "$1.1M",
            "Loan Default Rate": "2.1% (vs. industry avg 5%)",
        },
        "traction": [
            "10,000 signups in 8 months with $0 paid acquisition (waitlist + referral)",
            "1,000 active business accounts processing $8M/month in transactions",
            "$500K ARR achieved in 8 months",
            "Loan default rate of 2.1% vs. industry average of 5%",
            "Partnership with Cross River Bank for FDIC-insured deposits",
            "Featured in TechCrunch and Forbes '25 Fintechs to Watch'",
            "NPS score of 62 (industry average for SMB banking: 25)",
            "Waitlist of 8,000+ businesses across 40 states",
        ],
        "competition": "The SMB neobank space is growing rapidly. Major players target different segments. Mercury focuses on startups, Relay targets SMBs but lacks lending, and traditional banks offer poor digital experiences for small businesses.",
        "competitors": [
            ["Mercury", "Startup-focused, not designed for traditional SMBs. Beta targets Main Street businesses."],
            ["Relay", "SMB banking but no lending or credit products. Beta offers integrated working capital."],
            ["Brex", "Corporate card focused on funded startups. Beta targets bootstrapped SMBs."],
            ["Square Banking", "Payment-centric. Beta is banking-first with deeper financial tools."],
        ],
        "risks": [
            "Regulatory risk in lending and banking partnerships",
            "High customer acquisition cost in competitive fintech market",
            "Credit risk from SMB working capital advances in economic downturn",
            "Dependency on banking partner for core infrastructure",
            "Need to scale compliance and fraud detection capabilities",
        ],
        "ask": {
            "amount": "$3M",
            "valuation": "$10M pre-money",
            "use_of_funds": [
                "Engineering (40%): Build lending infrastructure, expand payment features",
                "Growth (30%): Launch referral program, partnerships with SMB associations",
                "Compliance (15%): Hire compliance officer, build AML/KYC automation",
                "Operations (15%): Customer support, banking partner management",
            ],
        },
    },
    {
        "name": "Gamma Health",
        "pitch": "AI-powered telehealth platform democratizing access to mental health care",
        "stage": "Series A",
        "date": "January 2025",
        "exec_summary": "Gamma Health is a telehealth platform focused exclusively on mental health care, using AI to improve access, reduce costs, and enhance outcomes. The platform connects patients with licensed therapists and psychiatrists via video, chat, and async messaging, while using proprietary AI tools to assist clinicians with treatment planning and progress monitoring. Founded by a practicing psychiatrist and an ex-Teladoc engineer, the company has grown to $3M ARR with 50K patients and 500 providers on the platform. Gamma Health's AI-assisted clinical model reduces provider burnout and enables 40% more patient sessions per provider. The company is raising $15M in Series A to expand nationally and launch employer/health plan partnerships.",
        "overview": "Mental health care in the US is in crisis: 160M Americans live in mental health professional shortage areas, the average wait time for a new patient appointment is 48 days, and 56% of adults with mental illness receive no treatment. Gamma Health addresses these gaps with a technology-first approach. The platform offers: (1) On-demand therapy sessions (video/chat) with <24-hour wait times, (2) AI-powered clinical decision support for providers, (3) Continuous patient monitoring between sessions via digital biomarkers, (4) Structured treatment programs for anxiety, depression, PTSD, and substance use. The AI engine analyzes session transcripts, patient-reported outcomes, and engagement data to recommend personalized treatment adjustments.",
        "market": "The US behavioral health market is $280B and growing at 7% annually. The telehealth mental health segment is projected to reach $100B by 2027. There are 57M adults and 17M children in the US with diagnosed mental health conditions, with 50%+ receiving inadequate treatment. Key market drivers: (1) Insurance coverage mandates for telehealth post-COVID, (2) Employer investment in mental health benefits (90% of large employers now offer EAP), (3) Reduced stigma driving higher utilization. Gamma Health's serviceable market is the $25B outpatient mental health therapy and psychiatry segment.",
        "team": [
            ["Dr. Emily Foster", "CEO", "Board-certified psychiatrist with 15 years of clinical experience. Former Clinical Director at Kaiser Permanente behavioral health. MD from Johns Hopkins."],
            ["Raj Sharma", "CTO", "Ex-Teladoc senior engineer (5 years). Built Teladoc's behavioral health platform serving 2M+ patients. MS in CS from Carnegie Mellon."],
            ["Maria Gonzalez", "VP Clinical Ops", "Ex-Ginger/Headspace Health clinical operations lead. Managed network of 1,000+ therapists. Licensed Clinical Psychologist."],
        ],
        "business_model": "Gamma Health operates a B2B2C model with three revenue streams: (1) Direct-to-consumer subscriptions ($60-150/month for therapy, $200-350/month with psychiatry), (2) Employer contracts (per-employee-per-month model, $8-15 PEPM), (3) Health plan partnerships (fee-for-service or value-based contracts). Current revenue mix: 60% D2C, 25% employer, 15% health plan. Average revenue per patient is $120/month with 70% gross margin on therapy sessions.",
        "metrics": {
            "ARR": "$3.0M",
            "Active Patients": "50,000",
            "Providers on Platform": "500 licensed therapists and psychiatrists",
            "Average Wait Time": "<24 hours (vs. 48-day industry average)",
            "Patient Satisfaction": "4.7/5.0 stars",
            "Clinical Outcomes": "65% of patients show significant symptom reduction within 8 weeks",
            "Provider Utilization": "85% (vs. 60% industry average)",
            "Monthly Session Volume": "45,000 sessions",
        },
        "financials": {
            "Current ARR": "$3.0M",
            "Monthly Burn Rate": "$800K",
            "Runway": "10 months",
            "Previous Funding": "$5M Seed (Andreessen Horowitz, Flare Capital)",
            "Total Raised": "$5M",
            "Cash on Hand": "$8M",
            "Gross Margin": "70%",
        },
        "traction": [
            "50,000 active patients across 35 states",
            "500 licensed providers on the platform with 4.8/5.0 average rating",
            "$3M ARR growing 25% quarter-over-quarter",
            "65% of patients show clinically significant improvement within 8 weeks",
            "10 employer contracts including 2 Fortune 500 companies",
            "AI clinical decision support reduces documentation time by 45%",
            "Partnerships with 3 health plans covering 5M+ lives",
            "SOC 2 Type II and HITRUST certified",
        ],
        "competition": "The telehealth mental health space has seen rapid growth. Major players include BetterHelp (consumer-focused, quality concerns), Talkspace (public company, B2B pivot), and Ginger/Headspace Health (meditation + coaching).",
        "competitors": [
            ["BetterHelp", "Consumer marketplace model with quality concerns. Gamma offers clinician-vetted, outcomes-driven care."],
            ["Talkspace", "Public company pivoting to B2B. Gamma has superior AI capabilities and clinical outcomes."],
            ["Headspace Health", "Meditation-first, therapy as add-on. Gamma is clinical-first with AI-enhanced treatment."],
            ["Cerebral", "Medication-focused. Gamma offers full-spectrum therapy and psychiatry with better outcomes."],
        ],
        "risks": [
            "Regulatory complexity across 50 states (licensure, prescribing, telehealth parity laws)",
            "Provider recruitment and retention in competitive market",
            "Reimbursement rate pressure from health plans",
            "Patient engagement and retention challenges in mental health",
            "AI liability and clinical decision support regulatory framework evolving",
        ],
        "ask": {
            "amount": "$15M",
            "valuation": "$60M pre-money",
            "use_of_funds": [
                "Provider Network (35%): Recruit 500 additional providers, expand to all 50 states",
                "Technology (30%): Advance AI clinical tools, build employer dashboard, enhance patient app",
                "Sales & Partnerships (20%): Hire enterprise sales team, expand employer and health plan contracts",
                "Clinical Operations (10%): Quality assurance, outcomes research, regulatory compliance",
                "G&A (5%): Legal, HR, and operational infrastructure",
            ],
        },
    },
    {
        "name": "Delta Logistics",
        "pitch": "AI-optimized last-mile delivery routing that reduces costs by 30% for e-commerce retailers",
        "stage": "Seed Round",
        "date": "December 2024",
        "exec_summary": "Delta Logistics provides an AI-powered last-mile delivery optimization platform for e-commerce retailers and logistics companies. The platform uses proprietary algorithms combining real-time traffic data, delivery density optimization, and driver behavior modeling to reduce last-mile delivery costs by 30% while improving on-time delivery rates. Founded by an ex-Uber routing engineer and an ex-Amazon logistics manager, the company has signed 20 enterprise customers and achieved $1M ARR in just 10 months. Delta Logistics is raising $5M in Seed funding to scale the platform and expand its customer base.",
        "overview": "Last-mile delivery represents 53% of total shipping costs and is the fastest-growing segment of logistics spending. Most retailers rely on inefficient manual route planning or basic optimization tools that fail to account for dynamic real-world conditions. Delta Logistics' platform integrates directly with warehouse management systems and delivery fleet tools to provide: (1) Dynamic route optimization updated every 15 minutes, (2) Predictive delivery windows with 95% accuracy, (3) Delivery density clustering to maximize drops per route, (4) Real-time driver assignment based on capacity and proximity, (5) Carbon footprint tracking and optimization. The platform processes 500K+ deliveries per month and has demonstrated consistent 30% cost reduction across customers.",
        "market": "The global last-mile delivery market is $200B and growing at 14% annually, driven by e-commerce growth. The logistics optimization software market is $15B and expected to reach $30B by 2028. In the US alone, there are 1M+ delivery fleets making 2B+ last-mile deliveries annually. Key market drivers: (1) E-commerce growth (20% of retail, growing), (2) Rising fuel and labor costs, (3) Customer expectations for faster, predictable delivery, (4) Sustainability mandates driving route efficiency needs.",
        "team": [
            ["Alex Kim", "CEO", "Ex-Uber senior routing engineer (6 years). Led development of UberEats delivery optimization serving 80M+ orders/month. MS in Operations Research from Georgia Tech."],
            ["Diana Brooks", "COO", "Ex-Amazon Last Mile Operations Manager (5 years). Managed 200+ delivery stations and 15,000 drivers across the Southeast US. MBA from Columbia."],
            ["Yuri Tanaka", "CTO", "Ex-FedEx principal engineer (8 years). Built FedEx's real-time package tracking and routing engine. PhD in CS from University of Tokyo."],
        ],
        "business_model": "Delta Logistics charges a per-delivery fee model: $0.15-0.35 per optimized delivery (based on volume). Enterprise contracts include a $2,000/month platform fee plus per-delivery charges. Average contract value is $50K/year. The company also offers a premium analytics tier ($500/month) for fleet performance insights and carbon reporting. Current ACV breakdown: 70% per-delivery fees, 20% platform fees, 10% analytics.",
        "metrics": {
            "ARR": "$1.0M",
            "Enterprise Customers": "20",
            "Deliveries Optimized": "500K+/month",
            "Cost Reduction": "30% average across customers",
            "On-Time Delivery Rate": "95% (vs. 82% industry average)",
            "Average Contract Value": "$50K/year",
            "Net Revenue Retention": "140%",
            "Carbon Reduction": "22% per route on average",
        },
        "financials": {
            "Current ARR": "$1.0M",
            "Monthly Burn Rate": "$250K",
            "Runway": "10 months",
            "Previous Funding": "$1.5M Pre-Seed (Y Combinator + angels)",
            "Total Raised": "$1.5M",
            "Cash on Hand": "$2.5M",
            "Gross Margin": "82%",
        },
        "traction": [
            "20 enterprise customers including 3 top-50 e-commerce retailers",
            "$1M ARR in 10 months from launch",
            "500K+ deliveries optimized per month across customer base",
            "30% cost reduction and 22% carbon footprint reduction demonstrated",
            "95% on-time delivery rate (vs. 82% industry average)",
            "Named in Y Combinator's Top 10 logistics companies (W24 batch)",
            "Strategic pilot with a major US parcel carrier (NDA)",
            "Net revenue retention of 140% driven by volume growth and upsell",
        ],
        "competition": "The route optimization space includes legacy players (Routific, OptimoRoute) with basic algorithms and large logistics platforms (Onfleet, Bringg) that offer optimization as a feature rather than core product.",
        "competitors": [
            ["Routific", "Basic optimization, no real-time updates. Delta offers dynamic 15-minute re-optimization."],
            ["OptimoRoute", "Field service focused, not e-commerce. Delta purpose-built for e-commerce last-mile."],
            ["Onfleet", "Delivery management platform, optimization is add-on. Delta's core AI is superior."],
            ["Google OR-Tools", "Open source, requires significant engineering. Delta is turnkey SaaS."],
        ],
        "risks": [
            "Large logistics companies building similar capabilities in-house",
            "Integration complexity with diverse customer tech stacks",
            "Seasonality in e-commerce delivery volumes",
            "Competition from well-funded logistics tech startups",
            "Dependency on third-party data sources for traffic and mapping",
        ],
        "ask": {
            "amount": "$5M",
            "valuation": "$20M pre-money",
            "use_of_funds": [
                "Engineering (45%): Expand AI team, build predictive analytics, improve real-time engine",
                "Sales (30%): Hire 5 enterprise sales reps, expand to logistics and grocery verticals",
                "Customer Success (15%): Scale implementation and support for enterprise accounts",
                "Infrastructure (10%): Cloud computing, data pipeline scaling",
            ],
        },
    },
    {
        "name": "Epsilon EdTech",
        "pitch": "Personalized AI tutoring platform that adapts to each student's learning style and pace",
        "stage": "Series A",
        "date": "January 2025",
        "exec_summary": "Epsilon EdTech is building an AI-powered personalized tutoring platform for K-12 students. The platform uses adaptive learning algorithms and conversational AI to provide 1-on-1 tutoring experiences across math, science, and language arts. Unlike traditional edtech tools that offer static content, Epsilon's AI tutor dynamically adjusts difficulty, teaching style, and pacing based on real-time student performance. Founded by two former high school teachers and an ML engineer from DeepMind, the company has achieved $4M ARR with 100K active students across 5,000 schools. Studies show Epsilon students improve standardized test scores by an average of 25%. The company is raising $12M in Series A to expand subject coverage and launch internationally.",
        "overview": "The US education system faces a critical tutoring gap: research shows 1-on-1 tutoring improves student performance by 2 standard deviations (Bloom's 2-sigma problem), but human tutoring at $40-80/hour is unaffordable for most families. Epsilon EdTech solves this by providing AI tutoring at $15/month per student. The platform features: (1) Conversational AI tutor with voice and text interaction, (2) Adaptive learning engine that identifies knowledge gaps and adjusts curriculum, (3) Multimodal explanations (text, diagrams, animations, worked examples), (4) Real-time progress dashboards for teachers and parents, (5) Alignment with Common Core and state-specific standards. The AI tutor handles 85% of student interactions autonomously, with human tutors available for escalation.",
        "market": "The global K-12 edtech market is $80B, growing at 16% annually. The US tutoring and supplemental education market is $20B. Key market drivers: (1) Post-COVID learning loss affecting 65% of students, (2) Growing achievement gaps in underserved communities, (3) Teacher shortages (300K+ unfilled positions in the US), (4) School districts investing in personalized learning technology. The platform targets the $12B school-purchased supplemental education segment and the $8B consumer tutoring market.",
        "team": [
            ["Jennifer Walsh", "CEO", "Former high school math teacher (8 years). Education Policy Fellow at Harvard Graduate School of Education. Named in Forbes 30 Under 30 (Education)."],
            ["David Okafor", "CTO", "Ex-DeepMind research engineer (4 years). Worked on adaptive AI systems and reinforcement learning. PhD in Computer Science from Oxford."],
            ["Amanda Torres", "VP Product", "Former science teacher (6 years) turned edtech product leader at Khan Academy (3 years). Led Khan Academy's personalized learning initiative."],
        ],
        "business_model": "Epsilon EdTech operates a dual B2B/B2C model. B2B (schools/districts): Per-student license at $120-180/year, sold to schools and districts in annual contracts. Average district contract: $200K/year. B2C (families): Monthly subscription at $15/student/month for up to 3 subjects. Current revenue split: 65% B2B (school contracts), 35% B2C (family subscriptions). B2B contracts include teacher dashboards, admin analytics, and professional development resources.",
        "metrics": {
            "ARR": "$4.0M",
            "Active Students": "100,000",
            "Schools": "5,000",
            "Average Test Score Improvement": "25% (standardized assessments)",
            "Student Engagement": "35 minutes avg daily session",
            "Teacher Adoption": "92% of teachers report positive impact",
            "Monthly Student Retention": "94%",
            "District Contract Renewal": "98%",
        },
        "financials": {
            "Current ARR": "$4.0M",
            "Monthly Burn Rate": "$500K",
            "Runway": "14 months",
            "Previous Funding": "$4M Seed (Reach Capital, NewSchools Venture Fund)",
            "Total Raised": "$4M",
            "Cash on Hand": "$7M",
            "Gross Margin": "85%",
            "LTV:CAC Ratio": "6:1 (B2B), 4:1 (B2C)",
        },
        "traction": [
            "100K active students across 5,000 schools in 32 states",
            "$4M ARR with 120% net revenue retention in B2B segment",
            "25% average standardized test score improvement (validated by 3 independent studies)",
            "98% district contract renewal rate",
            "Partnerships with 3 state education departments for supplemental instruction",
            "35 minutes average daily engagement per student",
            "Awarded ISTE Seal of Alignment for Common Core standards",
            "Named 'Best AI Education Tool' by EdSurge (2024)",
        ],
        "competition": "The edtech tutoring space is crowded but differentiated. Khan Academy offers free content but limited personalization. IXL provides adaptive practice but not conversational tutoring. Photomath handles math problems but doesn't teach conceptual understanding.",
        "competitors": [
            ["Khan Academy", "Free content, limited AI personalization. Epsilon offers true 1-on-1 adaptive AI tutoring."],
            ["IXL Learning", "Adaptive practice, no conversational AI. Epsilon provides interactive, dialogue-based teaching."],
            ["Duolingo", "Language only, gamified. Epsilon covers math, science, language arts with deeper pedagogy."],
            ["Age of Learning (ABCmouse)", "Early childhood only. Epsilon serves K-12 with rigorous academic content."],
        ],
        "risks": [
            "School budget constraints and lengthy procurement cycles (6-12 months)",
            "Concerns about AI replacing human teachers (requires careful positioning)",
            "Student data privacy regulations (FERPA, COPPA) across states",
            "Competition from free tools (Khan Academy) and well-funded competitors",
            "Need for continuous curriculum development as standards evolve",
        ],
        "ask": {
            "amount": "$12M",
            "valuation": "$50M pre-money",
            "use_of_funds": [
                "Product Development (40%): Expand to 5 new subjects, build Spanish-language version, enhance AI tutor",
                "Sales & Marketing (30%): Hire district sales team, launch B2C marketing campaign",
                "Research & Efficacy (15%): Fund 2 peer-reviewed efficacy studies, partner with university researchers",
                "Infrastructure (10%): Scale cloud infrastructure for 500K+ concurrent students",
                "Operations (5%): Compliance, legal, and operational systems",
            ],
        },
    },
]

if __name__ == "__main__":
    for i, company in enumerate(COMPANIES):
        filename = f"{i+1}_{company['name'].replace(' ', '_')}_Investment_Memo.pdf"
        build_memo(filename, company)
    print(f"\nGenerated {len(COMPANIES)} demo documents in {DEMO_DIR}")
