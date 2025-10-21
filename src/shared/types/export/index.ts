// Export Feature Types

// Flat JSON object with dotted keys: { "app.home.title": "Welcome Home", ... }
export type ExportedTranslations = Record<string, string>;

// Contains multiple locale files
export type ExportTranslationsData = Record<string, ExportedTranslations>;
