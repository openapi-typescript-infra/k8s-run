# k8s-run

Run a pod that mirrors a deployment but without resource constraints and readiness probes. Drops you into a shell and removes the pod when you finish.

This modifies the deployment by:

1. Turning it into a pod
2. Removing metadata.labels.app
3. Modifying the name to add -(username)

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
