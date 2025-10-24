# Translation Jobs

- **View Path**: `/projects/:id/translation-jobs`
- **Main Purpose**: Monitor and manage LLM translation jobs
- **Key Information to Display**: Job list with status, progress, actions (cancel), error details
- **Key View Components**: DataTable, progress indicators, confirm dialogs for cancel
- **UX, Accessibility and Security Considerations**:
  - UX: Real-time status updates, progress bars, toast notifications
  - Accessibility: ARIA live regions for status updates, keyboard navigation
  - Security: One active job per project, ownership validation
