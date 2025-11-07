# Keys List (Per-Language View)

- **View Path**: `/projects/:id/keys/:locale`
- **Main Purpose**: Edit translations for selected language
- **Key Information to Display**: Card list with full key, value in selected language, translation metadata
- **Key View Components**: CardList with search, missing filter, inline editing to change language
- **UX, Accessibility and Security Considerations**:
  - UX: "Missing" filter for selected language, debounced autosave, conflict resolution, card-based layout for better mobile experience
  - Accessibility: Card layout with ARIA labels for translation statuses, keyboard navigation
  - Security: Block translation to default language, ownership validation
