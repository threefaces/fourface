# testfour
test four 

## 밥메이트

The SNU social dining app lives in `babmate/`.

```sh
cd babmate
npm install
npm run dev
```

Open http://127.0.0.1:3000. Without Supabase configuration, it runs in local demo mode. On Windows PowerShell, use `npm.cmd` if script execution is disabled.

See [the app README](babmate/README.md) for Supabase setup and tests.

### Vercel

Import this shared repository into Vercel and set **Root Directory** to **`babmate`**. Use the Next.js framework preset and the default build settings. Leave Supabase environment variables unset to deploy the demo.

Or deploy from the app directory:

```sh
cd babmate
npx vercel@latest --prod
```
