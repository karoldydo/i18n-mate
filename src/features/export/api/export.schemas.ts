import { z } from 'zod';

import { EXPORT_ERROR_MESSAGES } from '@/shared/constants';

// export translations request schema
export const exportTranslationsSchema = z.object({
  project_id: z.string().uuid(EXPORT_ERROR_MESSAGES.INVALID_PROJECT_ID),
});
