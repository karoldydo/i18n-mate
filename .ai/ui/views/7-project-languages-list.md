# Project Languages List

- **View Path**: `/projects/:id/locales`
- **Main Purpose**: Manage languages assigned to the project
- **Key Information to Display**: Table with columns: locale (normalized), label, default indicator, actions (edit, delete)
- **Key View Components**: DataTable, add language button, confirm dialogs
- **UX, Accessibility and Security Considerations**:
  - UX: Highlight default language, inability to delete default, BCP-47 validation
  - Accessibility: Table with proper ARIA, keyboard navigation for actions
  - Security: Block deletion of default language, ownership validation
