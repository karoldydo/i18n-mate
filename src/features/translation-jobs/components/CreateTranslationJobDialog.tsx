import { AlertTriangleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { TranslationMode } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

import { useKeysPerLanguageView } from '../../keys/api';
import { useProjectLocales } from '../../locales/api';
import { KeySelector } from './KeySelector';

interface CreateTranslationJobDialogProps {
  isLoading: boolean;
  isOpen: boolean;
  onCreateJob: (params: { key_ids: string[]; mode: TranslationMode; target_locale: string }) => void;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

/**
 * CreateTranslationJobDialog - Modal dialog for creating new translation jobs
 *
 * Allows users to:
 * - Select translation mode (all keys, selected keys, or single key)
 * - Choose target locale (excluding default locale)
 * - Select specific keys (for selected/single modes)
 * - View overwrite warnings for existing translations
 *
 * Validates that no active job exists before allowing creation.
 */
export function CreateTranslationJobDialog({
  isLoading,
  isOpen,
  onCreateJob,
  onOpenChange,
  projectId,
}: CreateTranslationJobDialogProps) {
  const [mode, setMode] = useState<TranslationMode>('all');
  const [targetLocale, setTargetLocale] = useState<string>('');
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]);
  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false);

  // fetch project locales
  const { data: localesData } = useProjectLocales(projectId);
  const locales = localesData || [];

  // filter out default locale for target selection
  const targetLocales = locales.filter((locale) => !locale.is_default);
  const defaultLocale = locales.find((locale) => locale.is_default);

  // fetch existing translations for selected locale to check for overwrites
  // only fetch when we have a target locale selected
  // Note: Hook will handle empty locale gracefully through validation
  const { data: existingTranslationsData } = useKeysPerLanguageView({
    limit: 1000, // fetch all keys to check overwrites
    locale: targetLocale || 'en', // provide fallback to avoid validation errors
    missing_only: false,
    offset: 0,
    project_id: projectId,
  });

  // calculate overwrite count
  const overwriteCount = useMemo(() => {
    if (!existingTranslationsData?.data) return 0;

    const existingKeys = existingTranslationsData.data.filter((key) => key.value !== null && key.value !== '');

    if (mode === 'all') {
      return existingKeys.length;
    } else {
      // for selected/single modes, count only selected keys that have translations
      return existingKeys.filter((key) => key.key_id && selectedKeyIds.includes(key.key_id)).length;
    }
  }, [existingTranslationsData, mode, selectedKeyIds]);

  // reset overwrite confirmation when overwrite count changes
  useEffect(() => {
    setOverwriteConfirmed(false);
  }, [overwriteCount]);

  // reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setMode('all');
      setTargetLocale('');
      setSelectedKeyIds([]);
      setOverwriteConfirmed(false);
    }
    onOpenChange(open);
  };

  // handle job creation
  const handleCreate = () => {
    if (!targetLocale) return;

    const key_ids = mode === 'all' ? [] : selectedKeyIds;

    onCreateJob({
      key_ids,
      mode,
      target_locale: targetLocale,
    });
  };

  // check if form is valid
  const isFormValid = () => {
    if (!targetLocale) return false;
    if (mode === 'selected' && selectedKeyIds.length === 0) return false;
    if (mode === 'single' && selectedKeyIds.length !== 1) return false;
    if (overwriteCount > 0 && !overwriteConfirmed) return false;
    return true;
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Translation Job</DialogTitle>
          <DialogDescription>
            Configure and create a new LLM-powered translation job for this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Translation Mode Selection */}
          <div className="space-y-3">
            <Label>Translation Mode</Label>
            <RadioGroup onValueChange={(value) => setMode(value as TranslationMode)} value={mode}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="mode-all" value="all" />
                <Label className="font-normal" htmlFor="mode-all">
                  <span className="font-medium">All Keys</span> - Translate all keys in the project
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="mode-selected" value="selected" />
                <Label className="font-normal" htmlFor="mode-selected">
                  <span className="font-medium">Selected Keys</span> - Choose specific keys to translate
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="mode-single" value="single" />
                <Label className="font-normal" htmlFor="mode-single">
                  <span className="font-medium">Single Key</span> - Translate one key
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Target Locale Selection */}
          <div className="space-y-3">
            <Label htmlFor="target-locale">Target Language</Label>
            <Select onValueChange={setTargetLocale} value={targetLocale}>
              <SelectTrigger id="target-locale">
                <SelectValue placeholder="Select target language" />
              </SelectTrigger>
              <SelectContent>
                {targetLocales.length === 0 ? (
                  <div className="text-muted-foreground p-2 text-center text-sm">
                    No additional languages available. Add languages in the Locales section.
                  </div>
                ) : (
                  targetLocales.map((locale) => (
                    <SelectItem key={locale.locale} value={locale.locale}>
                      {locale.label} ({locale.locale})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {defaultLocale && (
              <p className="text-muted-foreground text-xs">
                Default language: {defaultLocale.label} ({defaultLocale.locale})
              </p>
            )}
          </div>

          {/* Key Selection (for selected/single modes) */}
          {(mode === 'selected' || mode === 'single') && (
            <div className="space-y-3">
              <Label>Select Keys</Label>
              <KeySelector
                mode={mode}
                onSelectionChange={setSelectedKeyIds}
                projectId={projectId}
                selectedKeyIds={selectedKeyIds}
              />
            </div>
          )}

          {/* Overwrite Warning */}
          {overwriteCount > 0 && (
            <div className="bg-destructive/10 border-destructive/50 space-y-3 rounded-md border p-4">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Existing Translations Will Be Overwritten</p>
                  <p className="text-muted-foreground text-xs">
                    {overwriteCount} existing translation{overwriteCount > 1 ? 's' : ''} will be replaced with new
                    LLM-generated translations. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={overwriteConfirmed}
                  id="overwrite-confirm"
                  onCheckedChange={(checked) => setOverwriteConfirmed(checked as boolean)}
                />
                <Label
                  className="text-sm leading-none font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor="overwrite-confirm"
                >
                  I understand and want to proceed with overwriting existing translations
                </Label>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-muted rounded-md p-3">
            <p className="text-sm">
              <strong>Note:</strong> The translation job will run in the background using LLM. You can monitor progress
              in real-time and cancel the job if needed.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isLoading} onClick={() => handleOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={!isFormValid() || isLoading} onClick={handleCreate}>
            {isLoading ? 'Creating...' : 'Create Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
