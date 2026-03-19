import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as store from '../instance-store';
import { buildPaginatedResponse, buildSingleResponse } from '../response-builder';

const router = Router();

// ─── GET /v1/secrets ───
router.get('/', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const size = parseInt(req.query.size as string) || 10;
  const secrets = store.getAllSecrets();
  res.json(buildPaginatedResponse(secrets, page, size, '/v1/secrets'));
});

// ─── POST /v1/secrets ───
router.post('/', (req: Request, res: Response) => {
  const { name, type, value } = req.body;
  if (!name) {
    res.status(400).json({ statusCode: 400, message: 'name is required' });
    return;
  }

  let secretValue = value;

  // Auto-generate SSH keypair when type is 'ssh'
  if ((type || 'password') === 'ssh') {
    try {
      const sshDir = join(homedir(), '.ssh');
      const privateKeyPath = join(sshDir, name);
      const pubKeyPath = `${privateKeyPath}.pub`;

      // Remove existing key if any
      if (existsSync(privateKeyPath)) unlinkSync(privateKeyPath);
      if (existsSync(pubKeyPath)) unlinkSync(pubKeyPath);

      // Generate SSH keypair using ssh-keygen (produces proper OpenSSH format)
      execSync(
        `ssh-keygen -t ed25519 -f "${privateKeyPath}" -N "" -C "${name}@contabo-simulator" -q`,
        { stdio: 'pipe' }
      );

      // Read the generated public key
      secretValue = readFileSync(pubKeyPath, 'utf-8').trim();

      console.log(`[Secrets] Generated ED25519 SSH keypair:`);
      console.log(`[Secrets]   Private key: ${privateKeyPath}`);
      console.log(`[Secrets]   Public key:  ${pubKeyPath}`);
    } catch (err: any) {
      console.error(`[Secrets] Failed to generate SSH keypair: ${err.message}`);
      res.status(500).json({ statusCode: 500, message: `SSH key generation failed: ${err.message}` });
      return;
    }
  } else if (!value) {
    res.status(400).json({ statusCode: 400, message: 'value is required for non-ssh secrets' });
    return;
  }

  const secret = store.createSecret({
    name,
    type: type || 'password',
    value: secretValue,
  });
  res.status(201).json(buildSingleResponse(secret, `/v1/secrets/${secret.secretId}`));
});

// ─── GET /v1/secrets/:secretId ───
router.get('/:secretId', (req: Request, res: Response) => {
  const secretId = parseInt(req.params.secretId as string);
  const secret = store.getSecret(secretId);
  if (!secret) {
    res.status(404).json({ statusCode: 404, message: `Secret ${secretId} not found` });
    return;
  }
  res.json(buildSingleResponse(secret, `/v1/secrets/${secretId}`));
});

export default router;
