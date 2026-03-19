import { Router, Request, Response } from 'express';
import * as store from '../instance-store';
import * as dockerMgr from '../docker-manager';
import { CONFIG } from '../config';
import { InstanceActionResponse } from '../types';

const router = Router();

// Helper to build action response
function actionResponse(instanceId: number, action: string) {
  const data: InstanceActionResponse = {
    tenantId: CONFIG.tenantId,
    customerId: CONFIG.customerId,
    instanceId,
    action,
  };
  return {
    data: [data],
    _links: { self: `/v1/compute/instances/${instanceId}/actions/${action}` },
  };
}

// ─── POST /v1/compute/instances/:instanceId/actions/start ───
router.post('/:instanceId/actions/start', async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.instanceId as string);
    const record = store.getInstance(instanceId);
    if (!record) {
      res.status(404).json({ statusCode: 404, message: `Instance ${instanceId} not found` });
      return;
    }

    await dockerMgr.startContainer(record.containerId);

    // Refresh port info after start
    const status = await dockerMgr.getContainerStatus(record.containerId);
    store.updateInstanceStatus(instanceId, 'running', status.sshPort);

    res.status(201).json(actionResponse(instanceId, 'start'));
  } catch (err: any) {
    console.error('[Actions] Start error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /v1/compute/instances/:instanceId/actions/stop ───
router.post('/:instanceId/actions/stop', async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.instanceId as string);
    const record = store.getInstance(instanceId);
    if (!record) {
      res.status(404).json({ statusCode: 404, message: `Instance ${instanceId} not found` });
      return;
    }

    await dockerMgr.stopContainer(record.containerId);
    store.updateInstanceStatus(instanceId, 'stopped', 0);

    res.status(201).json(actionResponse(instanceId, 'stop'));
  } catch (err: any) {
    console.error('[Actions] Stop error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /v1/compute/instances/:instanceId/actions/restart ───
router.post('/:instanceId/actions/restart', async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.instanceId as string);
    const record = store.getInstance(instanceId);
    if (!record) {
      res.status(404).json({ statusCode: 404, message: `Instance ${instanceId} not found` });
      return;
    }

    await dockerMgr.restartContainer(record.containerId);

    const status = await dockerMgr.getContainerStatus(record.containerId);
    store.updateInstanceStatus(instanceId, 'running', status.sshPort);

    res.status(201).json(actionResponse(instanceId, 'restart'));
  } catch (err: any) {
    console.error('[Actions] Restart error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /v1/compute/instances/:instanceId/actions/shutdown ───
router.post('/:instanceId/actions/shutdown', async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.instanceId as string);
    const record = store.getInstance(instanceId);
    if (!record) {
      res.status(404).json({ statusCode: 404, message: `Instance ${instanceId} not found` });
      return;
    }

    await dockerMgr.stopContainer(record.containerId);
    store.updateInstanceStatus(instanceId, 'stopped', 0);

    res.status(201).json(actionResponse(instanceId, 'shutdown'));
  } catch (err: any) {
    console.error('[Actions] Shutdown error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
