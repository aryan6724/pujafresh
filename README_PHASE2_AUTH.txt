PujaFresh Production Backend - Phase 2 Auth Pack

This phase adds:
- Auth.js / NextAuth credentials login
- Real login page
- Real register page
- Register API that saves users to PostgreSQL
- Session test API /api/me
- Server helper requireAuth for later route protection

Important:
- Do NOT add middleware yet.
- First test register/login.
- After login/register work, Phase 2B will protect admin/customer routes safely.

Expected test:
1. Run npm install next-auth@beta
2. Add AUTH_SECRET/NEXTAUTH_SECRET/NEXTAUTH_URL to .env
3. Place files in exact paths
4. Restart npm run dev
5. Open /register and create a customer account
6. Open /login and login with admin/customer
7. Open /api/me after login
