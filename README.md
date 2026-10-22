# MiniLedger

A small app to keep track of money you lend to friends. It runs online, so you open it in your phone's browser and don't need to install anything.

- Log in with your phone number and a one-time code (OTP)
- Add a loan: friend's name, amount, due date, and an optional receipt photo
- See all your loans. Overdue ones are shown in **red** at the top
- Mark a loan as repaid
- A summary card shows total lent, total repaid and the overdue amount

## Live links

| What | Link |
| --- | --- |
| App (open on your phone) | `https://miniledger-cc814.web.app/` |
| Backend health check | `https://miniledger-api.onrender.com/health` (should show `{"ok":true}`) |

## How it is hosted

| Part | Where it runs | Built with |
| --- | --- | --- |
| App (`app/`) | Firebase Hosting (free) | React Native + Expo, built as a web app |
| Backend (`backend/`) | Render (free) | Node.js, TypeScript, Express |
| Database | Render PostgreSQL (free) | PostgreSQL |

---

## How to use it

1. Open the **app link** in Chrome (Android) or Safari (iPhone).
2. Type your phone number, for example `+919876543210`, and tap **Send OTP**.
3. Get the OTP from the server log. It is a **mock OTP**, so no SMS is sent:
   - Go to https://dashboard.render.com, then **miniledger-api**, then **Logs**.
   - Find the line `[mock SMS] OTP for +919876543210 is 482913`.
4. Type the 6 digits in the app and tap **Log in**.
5. Tap **+ Add entry** to add a loan. Tap **Mark repaid** when your friend pays you back.

Optional: tap **Add to Home Screen** in your browser menu to get an app icon.

---

## How to deploy it yourself

### 1. Backend + database on Render

1. Go to https://render.com and sign in with **GitHub**.
2. Click **New + > Blueprint** and pick this repository.
3. Render reads `render.yaml` and creates **miniledger-api** (backend) and **miniledger-db** (database). Click **Apply**.
4. Wait until **miniledger-api** shows **Live** (about 5 minutes).
5. Copy its URL, for example `https://miniledger-api.onrender.com`.
6. Open `https://<that-url>/health`. You should see `{"ok":true}`.

### 2. App on Firebase Hosting

1. Go to https://console.firebase.google.com and click **Create a project**. Analytics is not needed.
2. Copy the **Project ID** from ⚙️ **Project settings**.
3. In the `app` folder, create a file named `.env` with your Render URL:
   ```
   EXPO_PUBLIC_API_URL=https://miniledger-api.onrender.com
   ```
4. In a terminal:
   ```bash
   npm install -g firebase-tools
   firebase login
   cd app
   npm install
   npm run build:web
   firebase deploy --only hosting --project YOUR-PROJECT-ID
   ```
5. It prints the **Hosting URL**. That is your app link.

### Updating

- **Backend changes:** push to GitHub. Render redeploys by itself.
- **App changes:** run `npm run build:web` and the `firebase deploy` command again.

---

## Backend settings (Render > miniledger-api > Environment)

| Name | What it does |
| --- | --- |
| `DATABASE_URL` | Database connection. Render fills it in for you |
| `JWT_SECRET` | Secret for login tokens. Render generates it |
| `SHOW_OTP_IN_RESPONSE` | `false` = OTP only in the server log (default). `true` = also show it on the login screen, for demos |

## Troubleshooting

| Problem | Fix |
| --- | --- |
| App says "Cannot reach the server" | Open the `/health` link to wake the backend, then try again. Check that `app/.env` has the right Render URL, then build and deploy again. |
| OTP not in the logs | On Render, check **Events** shows "Deploy live", open **Logs** in **Live tail** mode, then tap Send OTP again. Search for `mock`. |
| "OTP expired" | Codes last 5 minutes. Tap **Use a different number**, then send a new one. |
| Render build failed | Open **miniledger-api > Logs** and read the red lines. |
