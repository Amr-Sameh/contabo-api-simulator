import { Router, Request, Response } from 'express';
import { CONFIG } from '../config';
import { ContaboImage } from '../types';
import { buildPaginatedResponse } from '../response-builder';

const router = Router();

// Build the available images list from config
function getAvailableImages(): ContaboImage[] {
  return Object.entries(CONFIG.imageMapping).map(([imageId, info]) => ({
    imageId,
    tenantId: CONFIG.tenantId,
    customerId: CONFIG.customerId,
    name: info.name,
    description: `${info.name} with SSH pre-installed (Contabo Simulator)`,
    url: '',
    sizeMb: 2048,
    uploadedSizeMb: 2048,
    osType: info.osType,
    version: info.dockerImage.split(':')[1] || 'latest',
    format: 'qcow2',
    status: 'ready',
    errorMessage: null,
    standardImage: true,
    creationDate: '2024-01-01T00:00:00.000Z',
    lastModifiedDate: '2024-01-01T00:00:00.000Z',
    tags: [],
  }));
}

// ─── GET /v1/compute/images ───
router.get('/', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const size = parseInt(req.query.size as string) || 10;
  const images = getAvailableImages();
  res.json(buildPaginatedResponse(images, page, size, '/v1/compute/images'));
});

// ─── GET /v1/compute/images/:imageId ───
router.get('/:imageId', (req: Request, res: Response) => {
  const images = getAvailableImages();
  const image = images.find((i) => i.imageId === req.params.imageId);
  if (!image) {
    res.status(404).json({ statusCode: 404, message: `Image ${req.params.imageId} not found` });
    return;
  }
  res.json({ data: [image], _links: { self: `/v1/compute/images/${req.params.imageId}` } });
});

export default router;
