export const CONFIG = {
  port: parseInt(process.env.PORT || '5550'),
  tenantId: 'DE',
  customerId: process.env.CUSTOMER_ID || '54321',
  defaultPassword: 'Sim-Pass-123!',
  dockerNetwork: 'contabo-sim-network',
  containerLabel: 'contabo-simulator',
  // Image ID mapping: Contabo UUID → Docker image tag
  imageMapping: {
    'afecbb85-e2fc-46f0-9684-b46b1faf00bb': {
      dockerImage: 'contabo-sim-ubuntu:22.04',
      name: 'Ubuntu 22.04',
      osType: 'Linux',
    },
    'b1a06e61-7a3c-4150-b145-78c85cdfb211': {
      dockerImage: 'contabo-sim-debian:12',
      name: 'Debian 12',
      osType: 'Linux',
    },
  } as Record<string, { dockerImage: string; name: string; osType: string }>,
  // Product ID mapping
  productMapping: {
    V45: { ramMb: 8192, cpuCores: 4, diskMb: 200 * 1024, name: 'VPS S' },
    V92: { ramMb: 16384, cpuCores: 6, diskMb: 400 * 1024, name: 'VPS M' },
    V93: { ramMb: 32768, cpuCores: 8, diskMb: 800 * 1024, name: 'VPS L' },
    V94: { ramMb: 65536, cpuCores: 10, diskMb: 1600 * 1024, name: 'VPS XL' },
  } as Record<string, { ramMb: number; cpuCores: number; diskMb: number; name: string }>,
};
