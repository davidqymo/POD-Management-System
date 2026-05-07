# AI Resource Allocation Recommendation System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an AI-powered allocation recommendation system that analyzes project requirements, resource availability, and constraints to propose optimal resource allocation plans with full decision reasoning, allowing users to review and confirm.

**Architecture:** LLM-powered allocation engine with configurable rules engine. Frontend integrates into Project Detail page. Backend provides API endpoints for recommendation generation and allocation creation.

**Tech Stack:** React + TypeScript (frontend), Spring Boot + Java 17 (backend), OpenAI GPT-4 (configurable LLM), PostgreSQL

---

## 1. Problem Statement

Currently, resource allocation to projects requires manual analysis of multiple factors:
- Resource skill match to project requirements
- Resource availability across timeline
- Budget constraints and funding limits
- Utilization optimization (avoid over/under allocation)
- Resource level vs project complexity

This is time-consuming and error-prone. The goal is to leverage AI to analyze these factors and propose intelligent allocation recommendations with transparent reasoning.

## 2. User Stories

### 2.1 Project Manager
- "As a Project Manager, I want to click an 'AI Recommend' button on my project so that I get 3 allocation options with clear reasoning"
- "As a Project Manager, I want to review detailed breakdown of each option before confirming"
- "As a Project Manager, I want the AI to suggest alternatives when optimal allocation isn't possible"

### 2.2 Admin
- "As a System Admin, I want to configure LLM settings (API key, base URL) so the system works with different LLM providers"
- "As a System Admin, I want to configure allocation rules (hard/soft constraints, weights) so the AI follows business policies"

## 3. Architecture Design

### 3.1 High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐   │
│  │ Project Detail  │  │ AI Recommendation │  │  Review &     │   │
│  │ Page           │  │ Modal            │  │  Confirm UI   │   │
│  └────────┬────────┘  └────────┬─────────┘  └──────┬────────┘   │
└───────────┼────────────────────┼──────────────────┼───────────┘
            │                    │                  │
            └────────────────────┴──────────────────┘
                                  │
                        /api/v1/projects/{id}/ai-recommend
                                  │
┌─────────────────────────────────┴────────────────────────────────┐
│                        Backend                                    │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ ProjectController│  │ AllocationService│  │ AllocationRepo │ │
│  └────────┬─────────┘  └────────┬──────────┘  └───────┬────────┘ │
│           │                   │                     │          │
│  ┌────────┴───────────────────┴─────────────────────┴────────┐ │
│  │                  AllocationAgent                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │ │
│  │  │ RulesEngine │  │ ScoringCalc │  │ LLMRecommendationSvc │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Backend Components

#### 3.2.1 LLM Configuration Service
- **Purpose:** Manage LLM connection settings
- **Fields:**
  - `provider` (enum: OPENAI, AZURE, CUSTOM)
  - `apiKey` (encrypted string)
  - `baseUrl` (string, default: https://api.openai.com/v1)
  - `model` (string, default: gpt-4)
  - `temperature` (double, default: 0.7)
  - `maxTokens` (int, default: 2000)
- **API:** `GET/PUT /api/v1/admin/config/llm`

#### 3.2.2 Rules Engine
- **Purpose:** Enforce allocation business rules
- **Rule Types:**
  - **Hard Constraints:** Must never violate (e.g., max 144 hours/month, budget cannot exceed)
  - **Soft Constraints:** Try to avoid but can override (e.g., utilization 70-90%, no over-allocation)
  - **Priority Weights:** Adjust factor importance in scoring (0-100 scale)
- **Default Rules:**
  - Hard: maxMonthlyHours=144, maxProjectsPerResource=5
  - Soft: minUtilization=30, maxUtilization=100, preferBillable=true
  - Weights: budget=100, utilization=90, availability=80, skill=70, level=50, cost=30

#### 3.2.3 Allocation Agent
- **Purpose:** Coordinate recommendation generation
- **Process:**
  1. Load project details (budget, timeline, required skills)
  2. Load available resources with skills, levels, current allocations
  3. Run Rules Engine to filter invalid combinations
  4. Build prompt for LLM with all context
  5. Parse LLM response into structured recommendations
  6. Return 3 options with full reasoning

### 3.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/config/llm` | Get LLM configuration |
| PUT | `/api/v1/admin/config/llm` | Update LLM configuration |
| GET | `/api/v1/admin/config/rules` | Get allocation rules |
| PUT | `/api/v1/admin/config/rules` | Update allocation rules |
| POST | `/api/v1/projects/{id}/ai-recommend` | Generate allocation recommendations |
| POST | `/api/v1/projects/{id}/ai-recommend/apply` | Apply selected recommendation |

## 4. LLM Prompt Design

### System Prompt
```
You are an expert resource allocation planner for a professional services company.
Your role is to analyze project requirements and available resources to propose optimal allocation plans.

You must consider these factors in priority order:
1. Budget/Funding - Allocation must stay within project budget
2. Utilization Optimization - Maximize resource utilization (avoid over/under)
3. Availability - Resources must be available in the requested time period
4. Skill Match - Resource skills should match project requirements
5. Level Match - Resource level should match project complexity
6. Cost Efficiency - Prefer lower-cost resources when skills are similar

For each recommendation, provide:
- Which resources to allocate
- Hours/HCM allocation per month
- Detailed reasoning for each choice
- Trade-offs considered
- Any constraints that limited options

Output exactly 3 different options, each with different trade-offs.
```

### User Prompt Template
```
Project: {projectName}
Budget: ${budgetTotalK}K USD
Timeline: {startDate} to {endDate}
Required Skills: {skills}
Required Levels: {levels}

Available Resources:
{resourcesList}

Generate 3 allocation options considering:
1. Stay within ${budgetTotalK}K budget
2. Optimize resource utilization
3. Match skills and levels to requirements
4. Consider resource availability

For each option, provide:
- Resource allocations (name, hours/HCM per month)
- Total cost
- Utilization percentage
- Detailed reasoning
```

## 5. Frontend Design

### 5.1 Project Detail Page - AI Recommend Button
Location: Resource Planning section header
- Button: "✨ AI Recommend" with icon
- Opens recommendation modal on click

### 5.2 AI Recommendation Modal

#### Step 1: Configure Request (optional)
- Timeline selector (defaults to project period)
- Required skills (multi-select from Standard Data)
- Required level range (slider 1-10)
- Click "Generate" to proceed

#### Step 2: Loading State
- Animated spinner
- "Analyzing resources and generating recommendations..."

#### Step 3: Options Display
- 3 cards showing options side-by-side
- Each card shows:
  - Option name (e.g., "Optimal Budget", "Max Utilization", "Balanced")
  - Resource count + total cost
  - Key metrics (budget used, utilization)
  - "View Details" button
- Click option to select → "Review" button enabled

#### Step 4: Review Screen
- Full breakdown of selected option:
  - Resource allocation table (name, skill, level, hours/month, cost)
  - Timeline view (Gantt-style)
  - Budget breakdown chart
  - Full AI reasoning text
- "Confirm & Apply" button
- "Back to Options" button

### 5.3 Alternative Suggestions
When no good options found:
- Warning banner with specific reasons
- Suggestion cards:
  - "Increase budget by $X"
  - "Extend timeline by X months"
  - "Add external contractor"

## 6. Data Model

### 6.1 LLMConfig (new entity)
```java
@Entity
@Table(name = "llm_config")
public class LLMConfig {
    @Id
    private Long id = 1L; // Singleton
    private String provider; // OPENAI, AZURE, CUSTOM
    @Encrypted // Encrypt at rest
    private String apiKey;
    private String baseUrl;
    private String model;
    private Double temperature;
    private Integer maxTokens;
    private Boolean isActive;
}
```

### 6.2 AllocationRule (new entity)
```java
@Entity
@Table(name = "allocation_rules")
public class AllocationRule {
    @Id
    @GeneratedValue
    private Long id;
    private String ruleType; // HARD, SOFT, WEIGHT
    private String ruleName;
    private String ruleKey;
    private Integer ruleValue; // For numeric rules
    private Boolean enabled;
}
```

### 6.3 AIRecommendation (DTO, not persisted)
```java
public class AIRecommendation {
    private String optionName;
    private List<ResourceAllocation> allocations;
    private BigDecimal totalCost;
    private Double utilizationPercent;
    private String reasoning;
    private List<String> tradeoffs;
    private List<String> alternatives; // If suboptimal
}
```

## 7. Security Considerations

- **API Key Storage:** Encrypt API keys at rest using AES-256
- **LLM Cost Control:** Add per-user/day request limits
- **Prompt Injection:** Sanitize user inputs in prompts
- **Audit Logging:** Log all AI recommendation requests

## 8. Acceptance Criteria

### 8.1 Configuration
- [ ] Admin can save LLM configuration (API key, base URL, model)
- [ ] Admin can configure hard/soft constraints and weights
- [ ] Configuration persists in database

### 8.2 Recommendation Generation
- [ ] "AI Recommend" button appears on Project Detail page
- [ ] Click generates 3 distinct options within 30 seconds
- [ ] Each option shows resource allocations with reasoning
- [ ] Options have different trade-offs (e.g., budget-focused vs utilization-focused)

### 8.3 Review & Confirm
- [ ] User can view detailed breakdown of selected option
- [ ] "Confirm & Apply" creates actual allocation records
- [ ] Allocations appear in Resource Planning section

### 8.4 Error Handling
- [ ] Graceful fallback when LLM unavailable
- [ ] Clear error messages for configuration issues
- [ ] Alternative suggestions when no good options found

## 9. Implementation Phases

### Phase 1: Foundation (MVP)
- LLM configuration UI + backend
- Basic rules engine (hard constraints only)
- AI recommendation API
- Frontend: button + modal + 3-option display
- Review screen + confirm

### Phase 2: Enhancement
- Soft constraints + priority weights
- Alternative suggestions
- Timeline visualization
- Performance optimization

### Phase 3: Advanced
- Prompt templates for different project types
- Learning from user corrections
- Batch recommendation for multiple projects