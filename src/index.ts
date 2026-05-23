#!/usr/bin/env node
/* eslint-disable no-console */
import { spawn } from 'child_process';
import { pathToFileURL } from 'url';

import minimist from 'minimist';
import { usernameSync } from 'username';
import type { V1Pod } from '@kubernetes/client-node';
import { AppsV1Api, CoreV1Api, KubeConfig } from '@kubernetes/client-node';

const argv = minimist(process.argv.slice(2), {
  string: ['context', 'namespace'],
  boolean: ['restartable', 'take-traffic', 'retain'],
});

const kc = new KubeConfig();
kc.loadFromDefault();

let ctx: string | undefined;
if (typeof argv.context === 'string' && argv.context.length > 0) {
  const context = kc.getContexts().find((c) => c.name.toLowerCase() === argv.context.toLowerCase());

  if (context) {
    ctx = context.name;
    kc.setCurrentContext(context.name);
  } else {
    console.error(`Context ${argv.context} not found in kubeconfig.`);
    process.exit(1);
  }
}

const k8sApi = kc.makeApiClient(AppsV1Api);
const k8sPodApi = kc.makeApiClient(CoreV1Api);

const ns: string = argv.namespace || 'default';

function log(...args: unknown[]) {
  if (!argv.quiet) {
    console.log(...args);
  }
}

async function isUp(name: string, retryCount: number) {
  const status = await k8sPodApi.readNamespacedPod({ name, namespace: ns });
  const conditions = status.status?.conditions;
  if (conditions?.find((c) => c.type === 'Ready' && c.status === 'True')) {
    log(`${name} is ready.`);
    return true;
  }
  process.stdout.write('.');
  await new Promise((resolve) => setTimeout(resolve, retryCount > 10 ? 1000 : 2500));
  if (retryCount > 0) {
    return isUp(name, retryCount - 1);
  }
  return false;
}

export async function run() {
  const name = argv._[0];
  const uname = usernameSync();
  const { spec } = await k8sApi.readNamespacedDeployment({
    name: argv._[0] as string,
    namespace: ns,
  });
  const deployment = spec?.template as V1Pod;

  Object.assign(deployment, {
    apiVersion: 'v1',
    kind: 'Pod',
  });

  if (!argv['take-traffic'] && deployment.metadata?.labels?.app) {
    delete deployment.metadata.labels.app;
  }
  deployment.metadata = deployment.metadata || {};
  deployment.metadata.name = `${name}-${uname}`;
  deployment.spec?.containers.forEach((c) => {
    delete c.readinessProbe;
    delete c.livenessProbe;
    delete c.resources;
    if (c.name === name) {
      if (argv.restartable) {
        c.command = [
          '/bin/sh',
          '-c',
          'while /entrypoint.sh node-app || true; do echo "restarting..."; done',
        ];
      } else {
        c.command = ['sleep', '999999'];
      }
      if (argv.image) {
        c.image = (c.image as string).replace(/:([A-Za-z0-9_]+)$/, `:${argv.image}`);
        log('Using image', c.image);
      }
    }
  });

  await k8sPodApi.createNamespacedPod({ namespace: ns, body: deployment });
  log(`${deployment.metadata.name} pod is created.`);

  if (!argv.detach) {
    const ok = await isUp(deployment.metadata.name, 20);
    if (ok) {
      spawn(
        'kubectl',
        [
          ...(ctx ? ['--context', ctx] : []),
          ...(ns !== 'default' ? ['--namespace', ns] : []),
          'exec',
          '-it',
          deployment.metadata.name,
          '--',
          '/bin/sh',
        ],
        {
          stdio: 'inherit',
        },
      ).once('exit', async () => {
        if (!argv.retain) {
          await k8sPodApi.deleteNamespacedPod({
            name: deployment.metadata?.name as string,
            namespace: ns,
          });
          log(`${deployment.metadata?.name} pod has been deleted.`);
        }
      });
    }
  }
}

function isMainModule() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
