# Clinicfinale

Angular clinic appointment system using **Firebase Emulator Suite only** (no cloud Firebase).

## Quick start

### 1. Start emulators (with persistence)

```bash
npm run emulators
```

Data is imported from and exported to `.firebase/emulator-data` on start/stop, so registered users and Firestore records survive emulator restarts.

### 2. Start the app

```bash
npm start
```

Open `http://localhost:4200/`.

## Firebase (emulator only)

| Feature | Backend |
|--------|---------|
| Login, register, sessions, forgot password | **Auth emulator** (port 9099) |
| Appointments, users, doctors | **Firestore emulator** (port 8080) |
| Emulator UI | port **4000** |

### Emulator ports

- Auth: `9099`
- Firestore: `8080`
- Emulator UI: `http://127.0.0.1:4000`

### Persistence

- `npm run emulators` — starts Auth + Firestore with `--import` and `--export-on-exit` to `.firebase/emulator-data`
- `npm run emulators:export` — manually export current emulator state (while emulators are running)
- Always stop emulators with **Ctrl+C** so export-on-exit runs

### Forgot password (local)

1. Register an account on the register page.
2. Open **Forgot Password**, enter the same email.
3. Open **Emulator UI → Authentication** (`http://127.0.0.1:4000`) and copy the reset link, **or** open the link if it routes to `/reset-password?oobCode=...`.
4. Set a new password on the reset page, then sign in with the new password on the emulator.

No real email is sent.

## Implemented roles

- Login: email/password + role selection + forgot password
- Admin: monitors activity and approves/rejects appointments
- Doctor: dashboard with live stats, pie chart, appointment queues
- Patient: books appointments and sees them on the dashboard

## Development

```bash
ng serve          # dev server
ng build          # production build
ng test           # unit tests
```
