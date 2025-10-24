# Project Telemetry

- **View Path**: `/projects/:id/telemetry`
- **Main Purpose**: Display project usage statistics for analytics
- **Key Information to Display**: Table with columns: project_created, language_added, key_created, translation_completed
- **Key View Components**: DataTable with pagination, search/filter
- **UX, Accessibility and Security Considerations**:
  - UX: KPI visualization (percentage of projects with multiple languages, average number of keys)
  - Accessibility: keyboard navigation
  - Security: Only project owner can view telemetry
