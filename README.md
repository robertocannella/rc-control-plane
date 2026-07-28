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

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Auth.js Documentation](https://authjs.dev)
