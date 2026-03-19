import { InstanceRecord, ContaboInstance, InstanceStatus, ContaboSecret } from './types';
import { CONFIG } from './config';
import { generateMacAddress } from './response-builder';

let nextInstanceId = 100;
let nextSecretId = 1;
let nextVHostId = 73000;

// In-memory stores
const instances = new Map<number, InstanceRecord>();
const secrets = new Map<number, ContaboSecret>();

// ─── Instance Operations ───

export function createInstance(params: {
  imageId: string;
  productId: string;
  region: string;
  displayName: string;
  defaultUser: string;
  sshKeys: number[];
  containerId: string;
  sshPort: number;
  containerIp: string;
  rootPassword: string;
  osType: string;
}): InstanceRecord {
  const instanceId = nextInstanceId++;
  const vHostId = nextVHostId++;

  const product = CONFIG.productMapping[params.productId] || CONFIG.productMapping['V45'];

  const instance: ContaboInstance = {
    tenantId: CONFIG.tenantId,
    customerId: CONFIG.customerId,
    additionalIps: [],
    name: `vmd${instanceId}`,
    displayName: params.displayName || `VPS ${instanceId}`,
    instanceId,
    dataCenter: params.region === 'US' ? 'United States 1' : 'European Union 1',
    region: params.region || 'EU',
    regionName: params.region === 'US' ? 'United States' : 'European Union',
    productId: params.productId || 'V45',
    imageId: params.imageId,
    ipConfig: {
      v4: {
        ip: '127.0.0.1',
        netmaskCidr: 32,
        gateway: '127.0.0.1',
      },
      v6: {
        ip: '::1',
        netmaskCidr: 128,
        gateway: '::1',
      },
    },
    macAddress: generateMacAddress(),
    ramMb: product.ramMb,
    cpuCores: product.cpuCores,
    osType: params.osType,
    diskMb: product.diskMb,
    sshKeys: params.sshKeys || [],
    createdDate: new Date().toISOString(),
    cancelDate: '',
    status: 'running' as InstanceStatus,
    vHostId,
    vHostNumber: vHostId,
    vHostName: `m${vHostId}`,
    addOns: [],
    errorMessage: null,
    productType: 'ssd',
    productName: product.name,
    defaultUser: params.defaultUser || 'root',
    sshPort: params.sshPort,
  };

  const record: InstanceRecord = {
    instance,
    containerId: params.containerId,
    rootPassword: params.rootPassword,
  };

  instances.set(instanceId, record);
  return record;
}

export function getInstance(instanceId: number): InstanceRecord | undefined {
  return instances.get(instanceId);
}

export function getAllInstances(): InstanceRecord[] {
  return Array.from(instances.values());
}

export function updateInstance(
  instanceId: number,
  updates: Partial<ContaboInstance>
): InstanceRecord | undefined {
  const record = instances.get(instanceId);
  if (!record) return undefined;
  Object.assign(record.instance, updates);
  return record;
}

export function updateInstanceStatus(
  instanceId: number,
  status: InstanceStatus,
  sshPort?: number
): void {
  const record = instances.get(instanceId);
  if (record) {
    record.instance.status = status;
    if (sshPort !== undefined) {
      record.instance.sshPort = sshPort;
    }
  }
}

export function deleteInstance(instanceId: number): InstanceRecord | undefined {
  const record = instances.get(instanceId);
  if (record) {
    instances.delete(instanceId);
  }
  return record;
}

// ─── Secret Operations ───

export function createSecret(params: {
  name: string;
  type: 'ssh' | 'password';
  value: string;
}): ContaboSecret {
  const secretId = nextSecretId++;
  const secret: ContaboSecret = {
    secretId,
    tenantId: CONFIG.tenantId,
    customerId: CONFIG.customerId,
    name: params.name,
    type: params.type,
    value: params.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  secrets.set(secretId, secret);
  return secret;
}

export function getSecret(secretId: number): ContaboSecret | undefined {
  return secrets.get(secretId);
}

export function getAllSecrets(): ContaboSecret[] {
  return Array.from(secrets.values());
}
