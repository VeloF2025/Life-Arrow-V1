import type { NormalizedScanDataItem, EpdScores, EbcScores } from '@/types';

// Defines the path IDs associated with each color group for EPD analysis.
const EPD_COLOR_GROUPS = {
  red: [1020, 1021, 1022, 1023, 1024],
  orange: [1025, 1026, 1027, 1028, 1029],
  yellow: [1030, 1031, 1032, 1033, 1034],
  green: [1035, 1036, 1037, 1038, 1039],
  cyan: [1040, 1041, 1042, 1043, 1044],
  blue: [1045, 1046, 1047, 1048, 1049],
  violet: [1050, 1051, 1052, 1053, 1054],
};

/**
 * Performs EPD analysis on normalized scan data.
 * @param scanData - An array of normalized scan data items.
 * @returns An object containing the calculated percentage scores for each color group.
 */
export const processEpdAnalysis = (scanData: NormalizedScanDataItem[]): EpdScores => {
  const scores: EpdScores = {
    red: 0,
    orange: 0,
    yellow: 0,
    green: 0,
    cyan: 0,
    blue: 0,
    violet: 0,
  };

  console.log('Starting EPD analysis with normalized data:', scanData);

  for (const [color, pathIds] of Object.entries(EPD_COLOR_GROUPS)) {
    // Use a Map to ensure each pathId is processed only once, preventing errors from duplicate data.
    const groupDataMap = new Map<number, NormalizedScanDataItem>();
    scanData.forEach(item => {
      if (pathIds.includes(item.pathId) && !groupDataMap.has(item.pathId)) {
        groupDataMap.set(item.pathId, item);
      }
    });
    const groupData = Array.from(groupDataMap.values());

    // A positive score is any value greater than 0.
    const positiveCount = groupData.filter(item => item.value > 0).length;
    
    const totalCount = pathIds.length;
    
    if (totalCount > 0) {
      scores[color as keyof typeof scores] = Math.round((positiveCount / totalCount) * 100);
    }
  }

  console.log('EPD analysis complete. Calculated scores:', scores);
  return scores;
};

/**
 * Processes EPD scores to generate Emotional Binary Code (EBC) scores.
 * @param epdScores - The EPD percentage scores for each color.
 * @returns The calculated EBC scores (-1, 0, or 1) for each color.
 */
export function processEbcAnalysis(epdScores: EpdScores): EbcScores {
  const ebcScores: Partial<EbcScores> = {};

  (Object.keys(epdScores) as Array<keyof EpdScores>).forEach(key => {
    const score = epdScores[key];
    if (score <= 39) {
      ebcScores[key] = -1;
    } else if (score >= 40 && score <= 60) {
      ebcScores[key] = 0;
    } else {
      ebcScores[key] = 1;
    }
  });

  return ebcScores as EbcScores;
}
