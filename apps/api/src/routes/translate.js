import express from 'express';
import translate from 'translate-google';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /translate - Translate text and save to PocketBase
router.post('/', async (req, res) => {
  const { key, text, targetLanguage } = req.body;

  if (!key || !text || !targetLanguage) {
    return res.status(400).json({ error: 'key, text, and targetLanguage are required' });
  }

  // Translate text to target language
  const translatedText = await translate(text, { to: targetLanguage });

  // Save translation to PocketBase
  const record = await pb.collection('translations').create({
    key,
    target_language_code: targetLanguage,
    translated_text: translatedText,
  });

  logger.info(`Translated key "${key}" to ${targetLanguage}`);

  res.json({
    success: true,
    translation: translatedText,
  });
});

// POST /translate/all - Translate all Spanish translations to target language
router.post('/all', async (req, res) => {
  const { targetLanguage } = req.body;

  if (!targetLanguage) {
    return res.status(400).json({ error: 'targetLanguage is required' });
  }

  // Fetch all Spanish translations from PocketBase
  const records = await pb.collection('translations').getFullList({
    filter: 'target_language_code = "es"',
  });

  if (!records || records.length === 0) {
    throw new Error('No Spanish translation records found in PocketBase');
  }

  const total = records.length;
  let totalTranslated = 0;
  const failedKeys = [];

  // Translate each record
  for (const record of records) {
    try {
      const translatedText = await translate(record.translated_text, { to: targetLanguage });

      // Validate data structure before updating
      const updateData = {
        key: record.key,
        target_language_code: targetLanguage,
        translated_text: translatedText,
      };

      // Update translation in PocketBase
      await pb.collection('translations').update(record.id, updateData);

      totalTranslated++;
      const progress = Math.round((totalTranslated / total) * 100);
      logger.info(`Translation progress: ${totalTranslated}/${total} (${progress}%)`);
    } catch (error) {
      logger.error(`Failed to translate key "${record.key}":`, error.message);
      failedKeys.push(record.key);
    }
  }

  logger.info(`Completed translating ${totalTranslated}/${total} records to ${targetLanguage}`);

  res.json({
    success: true,
    totalTranslated,
    total,
    progress: 'Completed',
    failedKeys: failedKeys.length > 0 ? failedKeys : undefined,
  });
});

export default router;