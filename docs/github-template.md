# GitHub Template Repository

Enable template mode on the source repository:

```txt
GitHub repo → Settings → General → Template repository
```

Create a public repository from the template:

```bash
gh repo create OWNER/new-pi-extension \
  --public \
  --template OWNER/pi-extension-template \
  --clone
```

Create a private repository from the template:

```bash
gh repo create OWNER/new-pi-extension \
  --private \
  --template OWNER/pi-extension-template \
  --clone
```

Include all branches if needed:

```bash
gh repo create OWNER/new-pi-extension \
  --public \
  --template OWNER/pi-extension-template \
  --include-all-branches \
  --clone
```

After creation:

```bash
cd new-pi-extension
npm install
npm run ci
```