# Project Telemetry

- **View Path**: `/projects/:id/telemetry`
- **Main Purpose**: Display project usage statistics for analytics
- **Key Information to Display**: Card-based list of telemetry events (project_created, language_added, key_created, translation_completed) with inline JSON properties
- **Key View Components**: CardList with pagination, KPI cards (KPICard), TelemetryCard for individual events
- **UX, Accessibility and Security Considerations**:
  - UX: KPI visualization cards (percentage of projects with multiple languages, average number of keys, LLM translations percentage), card-based event list with inline JSON display
  - Accessibility: keyboard navigation, semantic HTML structure
  - Security: Only project owner can view telemetry (enforced by RLS policy)
  - Layout: Events always sorted by newest first (created_at.desc), no user sorting controls
