# Synthia Network Lab Runner — Dry-Run Package

This is a **customer-operated Linux dry-run tool**. It verifies a Synthia-issued Ed25519 manifest with a local public key and prints a constrained plan. It deliberately contains no `VBoxManage`, child-process, network-client, image-import, or device-control code.

Run it only after downloading an approved manifest and installing the paired public key locally:

```bash
pnpm exec tsx runner/synthia-network-lab-runner.ts \
  --manifest /safe/local/path/approved-manifest.json \
  --public-key ~/.config/synthia-network-lab/manifest-public.pem \
  --confirm-dry-run
```

It rejects expired or altered manifests, unsafe network policies, unknown aliases, bridged or NAT policies, port forwarding, unsafe configuration content, and configurations outside the declared limits. Its evidence helper is intentionally **inconclusive** and marks every assertion `not_run`; it does not claim a lab was validated. A future execution package must remain separately reviewed and must preserve this verification boundary.
