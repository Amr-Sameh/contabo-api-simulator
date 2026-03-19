import { Router, Request, Response } from 'express';
import { CONFIG } from '../config';
import * as store from '../instance-store';
import * as dockerMgr from '../docker-manager';
import { buildPaginatedResponse, buildSingleResponse } from '../response-builder';
import { CreateInstanceRequest } from '../types';

const router = Router();

// ─── GET /v1/compute/instances ───
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    const records = store.getAllInstances();

    // Refresh status from Docker for each instance
    for (const record of records) {
      const dockerStatus = await dockerMgr.getContainerStatus(record.containerId);
      store.updateInstanceStatus(
        record.instance.instanceId,
        dockerStatus.status as any,
        dockerStatus.sshPort
      );
    }

    const instances = records.map((r) => r.instance);
    const response = buildPaginatedResponse(instances, page, size, '/v1/compute/instances');
    res.json(response);
  } catch (err: any) {
    console.error('[Instances] List error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /v1/compute/instances ───
router.post('/', async (req: Request, res: Response) => {
  try {
    const body: CreateInstanceRequest = req.body;
    const imageId = (body.imageId as any) || 'afecbb85-e2fc-46f0-9684-b46b1faf00bb'; // default Ubuntu
    const productId = body.productId || 'V45';
    const region = body.region || 'EU';
    const displayName = body.displayName || 'VPS';
    const defaultUser = body.defaultUser || 'root';
    const sshKeys = body.sshKeys || [];
    const userData = body.userData;
    const rootPassword = CONFIG.defaultPassword;

    // Resolve SSH key secret IDs to actual public key values
    const sshPublicKeys: string[] = [];
    for (const secretId of sshKeys) {
      const secret = store.getSecret(secretId);
      if (secret && secret.type === 'ssh') {
        sshPublicKeys.push(secret.value);
      } else if (secret) {
        console.warn(`[Instances] Secret ${secretId} is type '${secret.type}', not 'ssh' — skipping`);
      } else {
        console.warn(`[Instances] SSH key secret ${secretId} not found — skipping`);
      }
    }

    // Resolve Docker image from Contabo image ID
    const imageInfo = CONFIG.imageMapping[imageId];
    if (!imageInfo) {
      res.status(400).json({
        statusCode: 400,
        message: `Unknown imageId: ${imageId}. Available: ${Object.keys(CONFIG.imageMapping).join(', ')}`,
      });
      return;
    }

    // Create Docker container
    const containerResult = await dockerMgr.createContainer(
      imageInfo.dockerImage,
      rootPassword,
      Date.now() % 100000, // temp ID for container naming
      displayName,
      userData,
      sshPublicKeys.length > 0 ? sshPublicKeys : undefined
    );

    // Store instance record
    const record = store.createInstance({
      imageId,
      productId,
      region,
      displayName,
      defaultUser,
      sshKeys,
      containerId: containerResult.containerId,
      sshPort: containerResult.sshPort,
      containerIp: containerResult.containerIp,
      rootPassword,
      osType: imageInfo.osType,
    });

    if (userData) {
      console.log(`[Instances] Instance ${record.instance.instanceId} created with userData (cloud-init)`);
    }
    console.log(
      `[Instances] Created instance ${record.instance.instanceId} → container ${containerResult.containerId.substring(0, 12)}, SSH port: ${containerResult.sshPort}`
    );

    const response = buildSingleResponse(
      record.instance,
      `/v1/compute/instances/${record.instance.instanceId}`
    );
    res.status(201).json(response);
  } catch (err: any) {
    console.error('[Instances] Create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /v1/compute/instances/:instanceId ───
router.get('/:instanceId', async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.instanceId as string);
    const record = store.getInstance(instanceId);
    if (!record) {
      res.status(404).json({ statusCode: 404, message: `Instance ${instanceId} not found` });
      return;
    }

    // Refresh status from Docker
    const dockerStatus = await dockerMgr.getContainerStatus(record.containerId);
    store.updateInstanceStatus(instanceId, dockerStatus.status as any, dockerStatus.sshPort);

    res.json(buildSingleResponse(record.instance, `/v1/compute/instances/${instanceId}`));
  } catch (err: any) {
    console.error('[Instances] Get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /v1/compute/instances/:instanceId ───
router.patch('/:instanceId', async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.instanceId as string);
    const record = store.getInstance(instanceId);
    if (!record) {
      res.status(404).json({ statusCode: 404, message: `Instance ${instanceId} not found` });
      return;
    }

    const updates: any = {};
    if (req.body.displayName) updates.displayName = req.body.displayName;

    const updated = store.updateInstance(instanceId, updates);
    res.json(buildSingleResponse(updated!.instance, `/v1/compute/instances/${instanceId}`));
  } catch (err: any) {
    console.error('[Instances] Patch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /v1/compute/instances/:instanceId ───
router.delete('/:instanceId', async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.instanceId as string);
    const record = store.deleteInstance(instanceId);
    if (!record) {
      res.status(404).json({ statusCode: 404, message: `Instance ${instanceId} not found` });
      return;
    }

    await dockerMgr.removeContainer(record.containerId);
    console.log(`[Instances] Deleted instance ${instanceId}`);
    res.status(204).send();
  } catch (err: any) {
    console.error('[Instances] Delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
