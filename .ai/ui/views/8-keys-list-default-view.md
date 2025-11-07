# Keys List (Default Language View)

- **View Path**: `/projects/:id/keys`
- **Main Purpose**: Display keys with values in default language and translation status
- **Key Information to Display**: Card list with full key (prefix.key), default value, missing translation status for other languages
- **Key View Components**: CardList with search, missing filter, pagination, inline editing for default values
- **UX, Accessibility and Security Considerations**:
  - UX: "Contains" search by key, "missing" filter, 50 pagination, autosave on edit, card-based layout for better mobile experience
  - Accessibility: Card layout with ARIA labels, keyboard navigation, screen reader announcements
  - Security: Key format validation, ownership through RLS
