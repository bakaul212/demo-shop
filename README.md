# Demo Shop — Assignment Demo

Frontend + backend connected demo. This is a school assignment project,
not a real shop.

- Frontend: `frontend/index.html` (Netlify publish folder: `frontend`)
- Backend: `backend/` (Express, JSON-file database, Render web service)

## How the connection works

The frontend has a `DEFAULT_API_BASE` setting near the top of its script.
When the backend is hosted on Render, that value is set to the Render
public URL, so every device (including the sir's phone) uses the same
backend automatically. No per-device Settings change is needed after that.

## Demo only — intentionally not real

- bKash / SSLCommerz: only a "not-configured" stub (501). No real
  payment is taken, and no sandbox merchant key is included.
- Steadfast / Pathao: only a demo consignment. No real courier booking.
- Database: JSON file. On a free hosted service it may reset on
  restart/redeploy.
- Demo admin login is in the backend seed (hashed) and frontend demo.
  Share the backend URL only with the sir for testing, not publicly.

## Run locally

Backend:
```
cd backend
npm install
npm start
# http://localhost:4000/api/health
```
Frontend: open `frontend/index.html`, or serve the `frontend` folder.
Set Backend API URL in Admin > Settings to `http://localhost:4000`
for local testing.
