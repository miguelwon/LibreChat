const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { connectJustinaDb } = require('~/db/justina');
const { logger } = require('~/config');

const router = Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  logger.debug(`[getAcordao] Received request for id: ${id}`);

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'A valid acordao_id is required' });
  }

  try {
    const justinaDb = await connectJustinaDb();
    const Acordao = justinaDb.collection('acordaos');

    const doc = await Acordao.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return res.status(404).json({ message: 'Acordao not found' });
    }

    res.json(doc);
  } catch (error) {
    logger.error(`[getAcordao] Error fetching from Justina DB for acordao_id: ${id}`, error);
    res.status(500).json({ message: 'Failed to fetch data from Justina DB' });
  }
});

module.exports = router; 