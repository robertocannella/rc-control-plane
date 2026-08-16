# rc-control-plane

A [Next.js](https://nextjs.org) app with Google sign-in via [Auth.js (NextAuth.js)](https://authjs.dev).

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Google OAuth client at the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

3. Copy the env example and fill in the values:

   ```bash
   cp .env.local.example .env.local
   ```

   Set `AUTH_SECRET` to the output of `openssl rand -base64 33`, and set
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from step 2.

4. Run the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

## Deployment

The app runs on [Cloud Run](https://console.cloud.google.com/run) in the
`rc-control-plane` GCP project, served at
[www.robertocannella.com](https://www.robertocannella.com). There's no CI/CD —
deploys are manual, run from `main`.

### One-time setup (already done for this project)

These don't need to be repeated for normal deploys, only listed here for
reference:

- `AUTH_SECRET` and `GOOGLE_CLIENT_SECRET` are stored in
  [Secret Manager](https://console.cloud.google.com/security/secret-manager),
  with the Cloud Run service account
  (`847358490342-compute@developer.gserviceaccount.com`) granted
  `roles/secretmanager.secretAccessor` on each.
- Custom domain mapping: `www.robertocannella.com` → Cloud Run service
  `rc-control-plane` (`gcloud beta run domain-mappings create`), with the
  `www` CNAME pointing to `ghs.googlehosted.com` at the DNS provider
  (Cloudflare, set to **DNS only**, not proxied).
- The OAuth client at
  [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
  has `https://www.robertocannella.com/api/auth/callback/google` registered
  as an authorized redirect URI.

### Deploying

1. Make sure you're on `main` with the changes you want to ship, and that
   `gcloud` is authenticated and pointed at the right project:

   ```bash
   gcloud auth login
   gcloud config set project rc-control-plane
   ```

2. Deploy:

   ```bash
   gcloud run deploy rc-control-plane \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "GOOGLE_CLIENT_ID=847358490342-ac13endnhb2erbvk537drhrc7cd6s1rn.apps.googleusercontent.com,AUTH_URL=https://www.robertocannella.com" \
     --set-secrets "AUTH_SECRET=AUTH_SECRET:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest"
   ```

   This builds the container from the `Dockerfile` via Cloud Build and
   rolls out a new revision — takes a few minutes. `GOOGLE_CLIENT_ID` isn't
   a secret, but you do need the actual value each time since
   `--set-env-vars` replaces the full set rather than merging.

3. To change just an env var without a full rebuild/redeploy of source
   (e.g. rotating `AUTH_URL`), use `gcloud run services update` instead:

   ```bash
   gcloud run services update rc-control-plane \
     --region us-central1 \
     --update-env-vars "SOME_VAR=value"
   ```

4. To rotate a secret value, add a new version and Cloud Run will pick it
   up on the next deploy (since `--set-secrets` references `:latest`):

   ```bash
   printf '%s' "new-value" | gcloud secrets versions add AUTH_SECRET --data-file=-
   ```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Auth.js Documentation](https://authjs.dev)


## TODOs
- Allow users to create their own set of data in weight tracker and timesheets
- Allow column sorting in Content list view
- Allow content searching/filtering in Content List view 
- Add Private Post Types docs. only visisble/edi to certain users.
