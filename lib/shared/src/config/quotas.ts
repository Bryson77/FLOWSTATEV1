import type { PricingTier } from '../types';

export interface QuotaLimits {
  maxDecks: number;
  maxCardsPerDeck: number;
  maxSavedDecks: number;
  maxCollaboratorsPerDeck: number;
  maxImportBatchSize: number;
  canExportDeck: boolean;
  canUseMatchMode: boolean;
}

export const TECHNICAL_SAFETY_CEILINGS = {
  maxDeckTitleLength: 150,
  maxDeckDescriptionLength: 500,
  maxCardsPerDeckHardLimit: 2000,
  maxCardTextLength: 5000,
  maxImportBatchSizeHardLimit: 1000,
  maxBatchPayloadBytes: 2 * 1024 * 1024, // 2MB
  maxImageSizeBytes: 5 * 1024 * 1024, // 5MB
};

export const QUOTA_CONFIG: Record<PricingTier, QuotaLimits> = {
  free: {
    maxDecks: 5,
    maxCardsPerDeck: 250,
    maxSavedDecks: 10,
    maxCollaboratorsPerDeck: 1,
    maxImportBatchSize: 250,
    canExportDeck: true,
    canUseMatchMode: true,
  },
  standard: {
    maxDecks: 50,
    maxCardsPerDeck: 1000,
    maxSavedDecks: 100,
    maxCollaboratorsPerDeck: 5,
    maxImportBatchSize: 500,
    canExportDeck: true,
    canUseMatchMode: true,
  },
  pro: {
    maxDecks: TECHNICAL_SAFETY_CEILINGS.maxCardsPerDeckHardLimit,
    maxCardsPerDeck: TECHNICAL_SAFETY_CEILINGS.maxCardsPerDeckHardLimit,
    maxSavedDecks: 500,
    maxCollaboratorsPerDeck: 25,
    maxImportBatchSize: TECHNICAL_SAFETY_CEILINGS.maxImportBatchSizeHardLimit,
    canExportDeck: true,
    canUseMatchMode: true,
  },
};
