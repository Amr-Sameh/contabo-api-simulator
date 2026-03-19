// ─── Contabo API Response Types ───

export interface IpV4Config {
  ip: string;
  netmaskCidr: number;
  gateway: string;
}

export interface IpV6Config {
  ip: string;
  netmaskCidr: number;
  gateway: string;
}

export interface IpConfig {
  v4: IpV4Config;
  v6: IpV6Config;
}

export interface AddOn {
  id: number;
  quantity: number;
}

export interface ContaboInstance {
  tenantId: string;
  customerId: string;
  additionalIps: { v4: IpV4Config }[];
  name: string;
  displayName: string;
  instanceId: number;
  dataCenter: string;
  region: string;
  regionName: string;
  productId: string;
  imageId: string;
  ipConfig: IpConfig;
  macAddress: string;
  ramMb: number;
  cpuCores: number;
  osType: string;
  diskMb: number;
  sshKeys: number[];
  createdDate: string;
  cancelDate: string;
  status: InstanceStatus;
  vHostId: number;
  vHostNumber: number;
  vHostName: string;
  addOns: AddOn[];
  errorMessage: string | null;
  productType: string;
  productName: string;
  defaultUser: string;
  // Simulator extras (the real Contabo doesn't have these, but we need them for SSH access)
  sshPort?: number;
}

export type InstanceStatus =
  | 'provisioning'
  | 'running'
  | 'stopped'
  | 'error'
  | 'installing'
  | 'unknown';

export interface ContaboPagination {
  size: number;
  totalElements: number;
  totalPages: number;
  page: number;
}

export interface ContaboLinks {
  first: string;
  previous: string;
  self: string;
  next: string;
  last: string;
}

export interface ContaboListResponse<T> {
  _pagination: ContaboPagination;
  data: T[];
  _links: ContaboLinks;
}

export interface ContaboSingleResponse<T> {
  data: T[];
  _links: { self: string };
}

export interface CreateInstanceRequest {
  imageId?: [string]; // UUID of the OS image
  productId?: string;
  region?: string;
  sshKeys?: number[];
  rootPassword?: number; // secretId
  userData?: string;
  license?: string;
  period?: number;
  displayName?: string;
  defaultUser?: string;
  addOns?: Record<string, unknown>;
  applicationId?: string;
}

export interface InstanceActionResponse {
  tenantId: string;
  customerId: string;
  instanceId: number;
  action: string;
}

export interface ContaboImage {
  imageId: string;
  tenantId: string;
  customerId: string;
  name: string;
  description: string;
  url: string;
  sizeMb: number;
  uploadedSizeMb: number;
  osType: string;
  version: string;
  format: string;
  status: string;
  errorMessage: string | null;
  standardImage: boolean;
  creationDate: string;
  lastModifiedDate: string;
  tags: unknown[];
}

export interface ContaboSecret {
  secretId: number;
  tenantId: string;
  customerId: string;
  name: string;
  type: 'ssh' | 'password';
  value: string;
  createdAt: string;
  updatedAt: string;
}

// Internal: tracks Docker container mapping
export interface InstanceRecord {
  instance: ContaboInstance;
  containerId: string;
  rootPassword: string;
}
