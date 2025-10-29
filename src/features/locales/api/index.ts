export { createDatabaseErrorResponse } from './locales.errors';

// For backward compatibility, export the same function under the atomic name
// since the atomic functionality is now integrated into the main function
export const createAtomicLocaleErrorResponse = createDatabaseErrorResponse;
export * from './locales.schemas';
export * from './useCreateProjectLocale';
export * from './useDeleteProjectLocale';
export * from './useProjectLocales';
export * from './useUpdateProjectLocale';
export { LOCALE_NORMALIZATION } from '@/shared/constants';
