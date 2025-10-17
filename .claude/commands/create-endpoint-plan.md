# You are an experienced software architect whose task is to create a detailed implementation plan for a REST API endpoint. Your plan will guide the development team in effectively and correctly implementing this endpoint

Before we begin, review the following information:

1. Route API specification:

   <route_api_specification>
   {{api}} (this value will be provided as a parameter to the command).
   </route_api_specification>

2. Related database resources:

   <related_db_resources>
   {{table}} (this value will be provided as a parameter to the command).
   [Table Relationships](../../.ai/database/tables/table-relationships.md)
   </related_db_resources>

3. Type definitions:

   <type_definitions>
   [Type Definitions](../../src/shared/types/types.ts)
   </type_definitions>

4. Tech stack:

   <tech_stack>
   [Tech Stack](../../.ai/tech-stack.md)
   </tech_stack>

5. Implementation rules:

   <implementation_rules>
   [Shared rules](../../.cursor/rules/shared.mdc)
   [Frontend rules](../../.cursor/rules/frontend.mdc)
   [Backend rules](../../.cursor/rules/backend.mdc)
   </implementation_rules>

6. Style and format of output document:
   <style_and_format>
   [Style and format](../../.ai/api/plans/1-projects-implementation-plan.md)
   </style_and_format>

Your task is to create a comprehensive implementation plan for the REST API endpoint. Before delivering the final plan, use `<analysis>` tags to analyze the information and outline your approach. In this analysis, ensure that:

1. Summarize key points of the API specification.
2. List required and optional parameters from the API specification.
3. List necessary DTO types and Command Models.
4. Identify where business logic should be implemented (typically within TanStack Query hooks or custom React hooks, without extracting to separate service layers).
5. Plan input validation according to the API endpoint specification, database resources, and implementation rules.
6. Determine how to log errors in the error table (if applicable).
7. Identify potential security threats based on the API specification and tech stack.
8. Outline potential error scenarios and corresponding status codes.

After conducting the analysis, create a detailed implementation plan in markdown format. The plan should contain the following sections:

1. Endpoint Overview
2. Request Details
3. Response Details
4. Data Flow
5. Security Considerations
6. Error Handling
7. Performance
8. Implementation Steps

Throughout the plan, ensure that you:

- Use correct API status codes:
  - 200 for successful read
  - 201 for successful creation
  - 400 for invalid input
  - 401 for unauthorized access
  - 404 for not found resources
  - 500 for server-side errors
- Adapt to the provided tech stack
- Follow the provided implementation rules

The final output should be a well-organized implementation plan in markdown format. Here's an example of what the output should look like:

``markdown

## API Endpoint Implementation Plan: [Endpoint Name]

## 1. Endpoint Overview

[Brief description of endpoint purpose and functionality]

### 2. Request Details

- HTTP Method: [GET/POST/PUT/DELETE]
- URL Structure: [URL pattern]
- Parameters:
  - Required: [List of required parameters]
  - Optional: [List of optional parameters]
- Request Body: [Request body structure, if applicable]

### 3. Used Types

[DTOs and Command Models necessary for implementation]

### 3. Response Details

[Expected response structure and status codes]

### 4. Data Flow

[Description of data flow from user interaction through React components, TanStack Query hooks (where business logic resides), to Supabase client calls and database operations, including any RPC functions or triggers]

### 5. Security Considerations

[Authentication, authorization, and data validation details]

### 6. Error Handling

[List of potential errors and how to handle them]

### 7. Performance Considerations

[Potential bottlenecks and optimization strategies]

### 8. Implementation Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]
   ...

```text
The final output should consist solely of the implementation plan in markdown format and should not duplicate or repeat any work done in the analysis section.

Remember to save your implementation plan as a single output file: .ai/api/plans/[NUMBER]-[ENDPOINT-NAME]-implementation-plan.md. Ensure the plan is detailed, clear, and provides comprehensive guidance for the development team.
```
