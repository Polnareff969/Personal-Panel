# GodGarou Private Panel

My own online panel for my COD:M and ExpressVPN checker

## Setup
1. Deploy to Render.
2. Link to Supabase.
3. Add Environment Variables:
   - `MY_PANEL_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

## API Endpoints
- POST `/api`: Auth/Redeem logic.
- GET `/health`: UptimeRobot heartbeat.
