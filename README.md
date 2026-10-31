# k8s-run

Run a pod that mirrors a deployment but without resource constraints or startup, liveness, and readiness probes. Drops you into a shell and removes the pod when you finish.

This modifies the deployment by:

1. Turning it into a pod
2. Removing metadata.labels.app
3. Modifying the name to add -(username)
4. Removing startup, liveness, and readiness probes so debugging containers are not restarted by application health checks
5. Making the main container's root filesystem writable, preserving its other security settings

Usage
=====

To install `k8s-run` globally, make sure NodeJS is installed and run:
```sh
$ npm install -g @openapi-typescript-infra/k8s-run
```
And then to use it:
```sh
$ k8s-run your-service
```

By default, `k8s-run` uses the namespace configured on the active Kubernetes
context. Use `-n` (or `--namespace`) to override it:

```sh
$ k8s-run -n another-namespace your-service
```
