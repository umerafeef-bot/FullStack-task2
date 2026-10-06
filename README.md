# CodeAlpha Task 2: Social Media Platform (PulseSocial)

A full-stack, responsive mini social media application built for the **CodeAlpha Full Stack Development Internship**.

---

## 🌟 Features Implemented

1. **User Profiles**
   - Public user profiles with header banners, custom avatars, biography, location, and website link.
   - Dynamic real-time statistics: Total Posts Count, Followers Count, and Following Count.
   - User-specific posts feed tab.
   - **Edit Profile Modal**: Allows editing display name, bio, location, portfolio website, avatar, and banner images.

2. **Posts & Comments**
   - Rich post creation with text, hashtags/category tags (`Tech`, `Design`, `Art`, `General`), and optional photo attachment (with quick preset image pickers).
   - Dynamic dual feeds:
     - **"For You"**: Global feed of all posts.
     - **"Following"**: Curated feed of posts exclusively from creators you follow.
   - Post author actions: Creators can delete their own posts.
   - **Threaded Comments**: Expandable comments section on any post with author details, timestamps, and instant comment posting.

3. **Like & Follow System**
   - **Instant Like/Unlike**: Heart animation with optimistic UI updates and persistent database counts.
   - **Follow/Unfollow**: Follow any user directly from their profile or from the "Who to Follow" sidebar widget.
   - **Who to Follow Widget**: Real-time suggestions of top creators with one-click follow toggle.
   - **Quick Demo Account Switcher**: 1-click switcher between pre-seeded demo accounts (Alex, Sophia, Marcus) to test mutual follow and like relationships without retyping passwords!

4. **User Registration & Login (Authentication)**
   - Secure account registration and login using PBKDF2/scrypt password hashing.
   - JWT/bearer token session storage in browser `localStorage`, validated against
     `/api/auth/me` on load so an expired token cannot leave a stale signed-in UI.
   - The app **never signs itself in automatically** - it opens on the public feed
     and invites you to sign in. Signing out is permanent across reloads.
   - Pre-seeded Demo Accounts (or use the 1-click switcher in the sidebar):
     - `alex@codealpha.com` / `password123`
     - `sophia@codealpha.com` / `password123`
     - `marcus@codealpha.com` / `password123`

5. **Database Storage**
   - Native SQLite database (`social.db`) storing:
     - `users`
     - `posts`
     - `comments`
     - `likes`
     - `followers`

6. **Design & Aesthetics**
   - 3-Column responsive layout (Twitter / Threads hybrid).
   - Glassmorphism, smooth micro-interactions, dark/light theme switcher.
   - Modern typography (`Plus Jakarta Sans` and `Space Grotesk`).
   - Lucide icons and floating toast notification alerts.

---

## 🛠️ Tech Stack

- **Frontend**: Semantic HTML5, Vanilla CSS3 (Custom Responsive Layout & Glassmorphism), Modern JavaScript (ES6+).
- **Backend**: Node.js & Express.js REST API.
- **Database**: Native SQLite (`node:sqlite`) with WAL mode.
- **Icons**: Lucide Icons CDN.

---

## 🚀 How to Run Locally

### 1. Navigate to the task2 folder:
```bash
cd task2
```

### 2. Install dependencies:
```bash
npm install
```

### 3. (Optional) Re-seed users, posts & follows:
```bash
npm run seed
```

### 4. Start the server:
```bash
npm start
```

### 5. Open the app in your browser:
Visit **[http://localhost:5001](http://localhost:5001)**

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5001` | Port the server listens on. |
| `JWT_SECRET` | **Yes in production** | insecure dev fallback | HMAC secret used to sign session tokens. A warning is printed at startup if unset. Set it so tokens survive restarts and cannot be forged. |

```bash
# PowerShell
$env:JWT_SECRET = "a-long-random-string"; npm start
# bash
JWT_SECRET="a-long-random-string" npm start
```

---

## 🧪 Testing

Both servers must be running (`task1` on 5000 and `task2` on 5001) because the
suites exercise both applications end to end.

```bash
npm test              # functional end-to-end suite
npm run test:edge     # edge cases & security validation
npm run test:regression  # regression tests for previously fixed defects
npm run test:dom      # verifies every getElementById resolves in the markup
```

`npm run reset` deletes the SQLite database so it is rebuilt and re-seeded on the
next start.

---

## 🔑 Demo Credentials

| Name | Email | Username | Password |
|---|---|---|---|
| Alex Rivera | `alex@codealpha.com` | `alexdev` | `password123` |
| Sophia Patel | `sophia@codealpha.com` | `sophiacodes` | `password123` |
| Marcus Vance | `marcus@codealpha.com` | `marcus_v` | `password123` |

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login user & return bearer token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `GET` | `/api/users/:identifier` | Fetch profile details & stats by ID or username *(email returned only to the owner)* |
| `PUT` | `/api/users/profile` | Update current user's profile details |
| `POST` | `/api/users/:id/follow` | Toggle follow / unfollow target user |
| `GET` | `/api/users/suggested/list` | Get suggested creators to follow |
| `GET` | `/api/posts` | Retrieve feed posts (supports `?feed=`, `?tag=`, `?search=`, `?userId=`, `?limit=`, `?page=`) |
| `POST` | `/api/posts` | Create and publish a new post |
| `DELETE` | `/api/posts/:id` | Delete a post (owner only) |
| `POST` | `/api/posts/:id/like` | Toggle like / unlike on a post |
| `GET` | `/api/posts/:id/comments` | Retrieve comments for a post |
| `POST` | `/api/posts/:id/comments` | Add a comment to a post |
| `DELETE` | `/api/comments/:id` | Delete a comment (owner only) |

---

## 🔒 Security Notes

- Passwords are hashed with `scrypt` and a per-user random salt, and compared
  with `crypto.timingSafeEqual`.
- Session tokens are HMAC-SHA256 signed and expire after 7 days. Set
  `JWT_SECRET` in production; signature comparison is constant-time.
- Every SQL statement uses bound parameters.
- The public profile endpoint deliberately omits `email`; the signed-in owner
  still receives their own address, but no other user can read it.
- All user-supplied text is HTML-escaped before rendering, and only `http(s)`
  URLs are accepted for avatar, banner, website and post image fields.
- The feed endpoint is paginated (`limit` capped at 100) and reports `total`
  and `hasMore` so the client can page without loading the whole table.
- Signing out clears the stored session for good; the app no longer signs
  itself back in automatically on reload.
