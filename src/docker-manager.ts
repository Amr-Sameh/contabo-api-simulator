import Docker from 'dockerode';
import { CONFIG } from './config';

const docker = new Docker();

const CONTAINER_LABEL_KEY = 'managed-by';
const CONTAINER_LABEL_VALUE = CONFIG.containerLabel;
const NETWORK_NAME = CONFIG.dockerNetwork;

async function ensureNetwork(): Promise<void> {
  try {
    const network = docker.getNetwork(NETWORK_NAME);
    await network.inspect();
  } catch {
    await docker.createNetwork({
      Name: NETWORK_NAME,
      Driver: 'bridge',
      Labels: { [CONTAINER_LABEL_KEY]: CONTAINER_LABEL_VALUE },
    });
    console.log(`[DockerManager] Created network: ${NETWORK_NAME}`);
  }
}

export interface ContainerCreateResult {
  containerId: string;
  sshPort: number;
  containerIp: string;
}

export async function createContainer(
  dockerImage: string,
  rootPassword: string,
  instanceId: number,
  displayName: string,
  userData?: string,
  sshPublicKeys?: string[]
): Promise<ContainerCreateResult> {
  await ensureNetwork();

  const containerName = `contabo-sim-${instanceId}`;

  const container = await docker.createContainer({
    Image: dockerImage,
    name: containerName,
    Labels: {
      [CONTAINER_LABEL_KEY]: CONTAINER_LABEL_VALUE,
      'contabo-sim-instance-id': String(instanceId),
      'contabo-sim-display-name': displayName,
    },
    ExposedPorts: { '22/tcp': {} },
    HostConfig: {
      PortBindings: {
        '22/tcp': [{ HostPort: '0' }], // dynamic port assignment
      },
      NetworkMode: NETWORK_NAME,
    },
    Cmd: [
      '/bin/bash',
      '-c',
      `echo "root:${rootPassword}" | chpasswd && /usr/sbin/sshd -D`,
    ],
  });

  await container.start();

  // Get assigned port
  const info = await container.inspect();
  const portBindings = info.NetworkSettings.Ports['22/tcp'];
  const sshPort = portBindings && portBindings[0]
    ? parseInt(portBindings[0].HostPort || '0')
    : 0;

  // Get container IP on our network
  const networkInfo = info.NetworkSettings.Networks[NETWORK_NAME];
  const containerIp = networkInfo ? networkInfo.IPAddress : '127.0.0.1';

  // Inject SSH public keys into authorized_keys if provided
  if (sshPublicKeys && sshPublicKeys.length > 0) {
    try {
      console.log(`[DockerManager] Injecting ${sshPublicKeys.length} SSH key(s) into container ${containerName}`);
      const authorizedKeys = sshPublicKeys.join('\n');
      const b64Keys = Buffer.from(authorizedKeys).toString('base64');
      const sshExec = await container.exec({
        Cmd: [
          '/bin/bash',
          '-c',
          `mkdir -p /root/.ssh && chmod 700 /root/.ssh && echo '${b64Keys}' | base64 -d > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys`,
        ],
        AttachStdout: true,
        AttachStderr: true,
      });
      const sshStream = await sshExec.start({});
      await new Promise<void>((resolve, reject) => {
        sshStream.on('data', () => {});
        sshStream.on('end', resolve);
        sshStream.on('error', reject);
      });
      console.log(`[DockerManager] SSH keys injected in container ${containerName}`);
    } catch (err: any) {
      console.error(`[DockerManager] Failed to inject SSH keys in ${containerName}: ${err.message}`);
    }
  }

  // Execute userData (cloud-init script) if provided
  if (userData && userData.trim()) {
    try {
      console.log(`[DockerManager] Executing userData script in container ${containerName}`);
      const b64 = Buffer.from(userData).toString('base64');
      const exec = await container.exec({
        Cmd: [
          '/bin/bash',
          '-c',
          `echo '${b64}' | base64 -d > /tmp/user-data.sh && chmod +x /tmp/user-data.sh && /bin/bash /tmp/user-data.sh > /tmp/user-data.log 2>&1`,
        ],
        AttachStdout: true,
        AttachStderr: true,
      });
      const stream = await exec.start({});
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          console.log(`[DockerManager] userData output: ${chunk.toString().trim()}`);
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      console.log(`[DockerManager] userData script completed in container ${containerName}`);
    } catch (err: any) {
      console.error(`[DockerManager] Failed to execute userData in ${containerName}: ${err.message}`);
    }
  }

  console.log(
    `[DockerManager] Created container ${containerName} (ID: ${container.id.substring(0, 12)}) SSH port: ${sshPort}`
  );

  return {
    containerId: container.id,
    sshPort,
    containerIp,
  };
}

export async function startContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.start();
  console.log(`[DockerManager] Started container ${containerId.substring(0, 12)}`);
}

export async function stopContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.stop();
  console.log(`[DockerManager] Stopped container ${containerId.substring(0, 12)}`);
}

export async function restartContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.restart();
  console.log(`[DockerManager] Restarted container ${containerId.substring(0, 12)}`);
}

export async function removeContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  try {
    await container.stop();
  } catch {
    // container might already be stopped
  }
  await container.remove({ force: true });
  console.log(`[DockerManager] Removed container ${containerId.substring(0, 12)}`);
}

export async function getContainerStatus(
  containerId: string
): Promise<{ status: string; sshPort: number }> {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    const isRunning = info.State.Running;
    const portBindings = info.NetworkSettings.Ports['22/tcp'];
    const sshPort = portBindings && portBindings[0]
      ? parseInt(portBindings[0].HostPort || '0')
      : 0;
    return {
      status: isRunning ? 'running' : 'stopped',
      sshPort: isRunning ? sshPort : 0,
    };
  } catch {
    return { status: 'error', sshPort: 0 };
  }
}

export async function buildImages(): Promise<void> {
  console.log('[DockerManager] Checking if SSH images exist...');
  const images = await docker.listImages();

  for (const [, mapping] of Object.entries(CONFIG.imageMapping)) {
    const [repo, tag] = mapping.dockerImage.split(':');
    const exists = images.some((img) =>
      img.RepoTags?.some((t) => t === mapping.dockerImage)
    );
    if (!exists) {
      console.log(
        `[DockerManager] Image ${mapping.dockerImage} not found. Please build it with: npm run build:docker`
      );
    } else {
      console.log(`[DockerManager] Image ${mapping.dockerImage} ✓`);
    }
  }
}
