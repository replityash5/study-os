# Study OS

Personal competitive-exam preparation workspace built with React, Vite, Zustand,
and Firebase.

## Firestore rules

The root `firestore.rules` file limits every user document subtree to its owner.
Deploy it with the Firebase CLI from this project:

```bash
firebase deploy --only firestore:rules
```

No rules are deployed by the app.

## Google Drive setup

Drive access is optional and is granted separately from Firebase sign-in through
Google Identity Services. The app requests only the
`https://www.googleapis.com/auth/drive.file` scope. Access tokens are kept in
memory and are never written to localStorage.

1. In the Google Cloud project associated with Firebase, enable the Google Drive API.
2. Configure the OAuth consent screen with the app name, support email, audience,
   and test users while the app is in testing.
3. Create a **Web application** OAuth client ID and add the app origins to
   Authorized JavaScript origins (for example `http://localhost:5173` and the
   production origin).
4. Ensure Google is enabled under Firebase Authentication → Sign-in method.
5. Add the OAuth client ID to `.env.local`:

   ```bash
   VITE_GOOGLE_OAUTH_CLIENT_ID=your_web_oauth_client_id
   ```

6. Restart Vite after changing environment variables.

The app creates one visible `Study OS` folder and stores its Drive ID at
`users/{uid}/settings/integrations`, which avoids broad Drive enumeration. If
the client ID is missing or consent has not been granted, the workspace keeps
working locally and shows a Connect Google Drive message.

### Media playback limitation

Custom controls use authenticated Drive downloads converted to browser object
URLs. This MVP buffers the complete file, so the viewer refuses files larger
than 100 MB instead of silently attempting to buffer a long lecture. True
range-based seeking would require a chunked MediaSource pipeline or a server-side
proxy and is intentionally deferred until it is justified by real usage.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react';

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
});
```
