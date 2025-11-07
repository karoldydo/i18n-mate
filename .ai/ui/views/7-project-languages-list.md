# Project Languages List

- **View Path**: `/projects/:id/locales`
- **Main Purpose**: Manage languages assigned to the project
- **Key Information to Display**: Card-based list with locale code (BCP-47 normalized), language label, default indicator (star icon), actions (edit, delete via dropdown menu)
- **Key View Components**: CardList, LocaleCard, AddLanguageButton (in CardList header), confirm dialogs
- **Layout**: Card-based layout (migrated from table) for improved mobile experience and visual consistency
- **UX, Accessibility and Security Considerations**:
  - UX: Highlight default language with star icon, inability to delete default (disabled in dropdown), BCP-47 validation, business-focused page description
  - Accessibility: Card-based layout with proper ARIA labels, keyboard navigation (Enter/Space on cards), action buttons with descriptive labels
  - Security: Block deletion of default language, ownership validation
