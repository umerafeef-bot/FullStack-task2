const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { db, hashPassword, verifyPassword, generateToken, verifyToken } = require('./database');
const seedDatabase = require('./seed');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Sign in required.' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }
  req.user = payload;
  next();
}

// Optional Auth middleware
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    req.user = verifyToken(token) || null;
  } else {
    req.user = null;
  }
  next();
}

// Shared input validation helpers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NAME_LEN = 80;
const MAX_USERNAME_LEN = 30;
const MAX_BIO_LEN = 300;
const MAX_POST_LEN = 400;
const MAX_COMMENT_LEN = 500;

function normalizeEmail(value) {
  return String(value || '').toLowerCase().trim();
}

function isValidEmail(value) {
  return EMAIL_RE.test(normalizeEmail(value));
}

// Trim and cap a free-text field, returning null when it is empty.
function cleanText(value, maxLength) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

// Accept only http(s) URLs for user-supplied image and website fields.
function cleanUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return null;
  if (!/^https?:\/\/\S+$/i.test(url)) return undefined; // undefined == invalid
  return url.slice(0, 500);
}

// The public projection of a user. Deliberately excludes `email` so the
// profile endpoint cannot be used to harvest every account's address.
const PUBLIC_USER_FIELDS = 'id, username, name, avatar, banner_url, bio, location, website, created_at';

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    if (!username || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const cleanUsername = String(username).toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3 || cleanUsername.length > MAX_USERNAME_LEN) {
      return res.status(400).json({ error: `Username must be 3-${MAX_USERNAME_LEN} alphanumeric characters or underscores.` });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (password.length > 200) {
      return res.status(400).json({ error: 'Password must be under 200 characters.' });
    }
    const cleanName = cleanText(name, MAX_NAME_LEN);
    if (!cleanName) {
      return res.status(400).json({ error: 'Please enter a valid display name.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const cleanEmail = normalizeEmail(email);

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(cleanEmail, cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already in use.' });
    }

    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;
    const defaultBanner = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';

    const insertResult = db.prepare(`
      INSERT INTO users (username, name, email, password_hash, avatar, banner_url, bio)
      VALUES (?, ?, ?, ?, ?, ?, 'Hello! I just joined Pulse Social.')
    `).run(cleanUsername, cleanName, cleanEmail, hashPassword(password), defaultAvatar, defaultBanner);

    const user = {
      id: Number(insertResult.lastInsertRowid),
      username: cleanUsername,
      name: cleanName,
      email: cleanEmail,
      avatar: defaultAvatar,
      banner_url: defaultBanner,
      bio: 'Hello! I just joined Pulse Social.'
    };

    const token = generateToken(user);
    res.status(201).json({ message: 'Welcome to Pulse Social!', user, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    const cleanLogin = login.toLowerCase().trim();
    const userRow = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(cleanLogin, cleanLogin);
    if (!userRow) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isValid = (() => {
      try {
        return verifyPassword(password, userRow.password_hash);
      } catch (hashErr) {
        return false;
      }
    })();
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = {
      id: userRow.id,
      username: userRow.username,
      name: userRow.name,
      email: userRow.email,
      avatar: userRow.avatar,
      banner_url: userRow.banner_url,
      bio: userRow.bio,
      location: userRow.location,
      website: userRow.website
    };

    const token = generateToken(user);
    res.json({ message: 'Login successful', user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Current User
app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const userRow = db.prepare('SELECT id, username, name, email, avatar, banner_url, bio, location, website, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!userRow) return res.status(404).json({ error: 'User not found' });
    res.json({ user: userRow });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== USER PROFILES & FOLLOWS ====================

// Get User Profile with Stats
app.get('/api/users/:identifier', optionalAuth, (req, res) => {
  try {
    const iden = String(req.params.identifier).trim();
    const isNum = /^\d+$/.test(iden);
    const user = isNum
      ? db.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`).get(iden)
      : db.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE username = ?`).get(iden.toLowerCase());

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Own profile additionally carries the email, for the signed-in owner only.
    const isSelf = req.user ? req.user.id === user.id : false;
    const profile = { ...user };
    if (isSelf) {
      profile.email = db.prepare('SELECT email FROM users WHERE id = ?').get(user.id).email;
    }

    // Stats
    const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(user.id).count;
    const followersCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE following_id = ?').get(user.id).count;
    const followingCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE follower_id = ?').get(user.id).count;

    // Is following?
    let isFollowing = false;
    if (req.user && req.user.id !== user.id) {
      const check = db.prepare('SELECT id FROM followers WHERE follower_id = ? AND following_id = ?').get(req.user.id, user.id);
      isFollowing = !!check;
    }

    res.json({
      profile: {
        ...profile,
        stats: {
          posts: postsCount,
          followers: followersCount,
          following: followingCount
        },
        isFollowing,
        isSelf
      }
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update Profile
app.put('/api/users/profile', authMiddleware, (req, res) => {
  try {
    const { name, bio, location, website, avatar, banner_url } = req.body;

    // Only fields actually present in the request are considered, so a partial
    // update cannot blank out unrelated values.
    const updates = {};

    if (name !== undefined) {
      const cleanName = cleanText(name, MAX_NAME_LEN);
      if (!cleanName) return res.status(400).json({ error: 'Display name cannot be empty.' });
      updates.name = cleanName;
    }

    if (bio !== undefined) {
      // An explicitly empty string is a valid "clear this field" request.
      updates.bio = bio === null ? null : String(bio).trim().slice(0, MAX_BIO_LEN);
    }

    if (location !== undefined) {
      updates.location = location === null ? null : cleanText(location, MAX_NAME_LEN);
    }

    for (const [field, value] of [['website', website], ['avatar', avatar], ['banner_url', banner_url]]) {
      if (value === undefined) continue;
      if (value === null || String(value).trim() === '') {
        updates[field] = null;
        continue;
      }
      const cleanValue = cleanUrl(value);
      if (cleanValue === undefined) {
        return res.status(400).json({ error: `${field.replace('_', ' ')} must be a valid http(s) URL.` });
      }
      updates[field] = cleanValue;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No profile fields provided to update.' });
    }

    const assignments = Object.keys(updates).map(k => `${k} = ?`);
    db.prepare(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`)
      .run(...Object.values(updates), req.user.id);

    const updatedUser = db.prepare(`SELECT ${PUBLIC_USER_FIELDS}, email FROM users WHERE id = ?`).get(req.user.id);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Toggle Follow / Unfollow
app.post('/api/users/:id/follow', authMiddleware, (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const currentUserId = req.user.id;

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetUserId);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = db.prepare('SELECT id FROM followers WHERE follower_id = ? AND following_id = ?').get(currentUserId, targetUserId);

    let isFollowing = false;
    if (existing) {
      db.prepare('DELETE FROM followers WHERE id = ?').run(existing.id);
      isFollowing = false;
    } else {
      db.prepare('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)').run(currentUserId, targetUserId);
      isFollowing = true;
    }

    const followersCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE following_id = ?').get(targetUserId).count;
    res.json({ isFollowing, followersCount });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'Failed to toggle follow status' });
  }
});

// Suggested Users to Follow
app.get('/api/users/suggested/list', optionalAuth, (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : 0;
    const users = db.prepare(`
      SELECT u.id, u.username, u.name, u.avatar, u.bio,
        (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as followers_count,
        EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) as is_following
      FROM users u
      WHERE u.id != ?
      ORDER BY followers_count DESC
      LIMIT 5
    `).all(currentUserId, currentUserId);

    res.json({ suggested: users.map(u => ({ ...u, is_following: !!u.is_following })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suggested users' });
  }
});

// ==================== POSTS & FEED ====================

// Get Feed Posts
app.get('/api/posts', optionalAuth, (req, res) => {
  try {
    const { feed, tag, userId, search } = req.query;
    const currentUserId = req.user ? req.user.id : 0;

    // Bounded page size: the feed must not scale without limit.
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.id, p.user_id, p.content, p.image_url, p.tag, p.created_at,
             u.username, u.name as user_name, u.avatar as user_avatar,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [currentUserId];

    if (userId) {
      query += ' AND p.user_id = ?';
      params.push(userId);
    }

    if (tag && tag !== 'All') {
      query += ' AND p.tag = ?';
      params.push(tag);
    }

    if (feed === 'following' && currentUserId > 0) {
      query += ' AND p.user_id IN (SELECT following_id FROM followers WHERE follower_id = ?)';
      params.push(currentUserId);
    }

    if (search && search.trim() !== '') {
      query += ' AND (p.content LIKE ? OR p.tag LIKE ? OR u.name LIKE ? OR u.username LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const posts = db.prepare(query).all(...params).map(p => ({
      ...p,
      is_liked: !!p.is_liked,
      is_owner: currentUserId > 0 && currentUserId === p.user_id
    }));

    // Total for the active filter set, so the client can offer "load more".
    let countQuery = 'SELECT COUNT(*) as count FROM posts p JOIN users u ON p.user_id = u.id WHERE 1=1';
    const countParams = [];
    if (userId) { countQuery += ' AND p.user_id = ?'; countParams.push(userId); }
    if (tag && tag !== 'All') { countQuery += ' AND p.tag = ?'; countParams.push(tag); }
    if (feed === 'following' && currentUserId > 0) {
      countQuery += ' AND p.user_id IN (SELECT following_id FROM followers WHERE follower_id = ?)';
      countParams.push(currentUserId);
    }
    if (search && search.trim() !== '') {
      countQuery += ' AND (p.content LIKE ? OR p.tag LIKE ? OR u.name LIKE ? OR u.username LIKE ?)';
      const s = `%${search.trim()}%`;
      countParams.push(s, s, s, s);
    }
    const total = db.prepare(countQuery).get(...countParams).count;

    res.json({ posts, count: posts.length, total, page, limit, hasMore: offset + posts.length < total });
  } catch (err) {
    console.error('Fetch posts error:', err);
    res.status(500).json({ error: 'Failed to fetch posts feed' });
  }
});

// Create Post
app.post('/api/posts', authMiddleware, (req, res) => {
  try {
    const { content, image_url, tag } = req.body;

    const cleanContent = cleanText(content, MAX_POST_LEN);
    if (!cleanContent) {
      return res.status(400).json({ error: 'Post content cannot be empty.' });
    }

    let postImg = null;
    if (image_url !== undefined && image_url !== null && String(image_url).trim() !== '') {
      postImg = cleanUrl(image_url);
      if (postImg === undefined) {
        return res.status(400).json({ error: 'Image must be a valid http(s) URL.' });
      }
    }

    const ALLOWED_TAGS = ['Tech', 'Design', 'Art', 'General'];
    const requestedTag = cleanText(tag, 20);
    const postTag = requestedTag && ALLOWED_TAGS.includes(requestedTag) ? requestedTag : 'General';

    const result = db.prepare(`
      INSERT INTO posts (user_id, content, image_url, tag)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, cleanContent, postImg, postTag);

    const newPost = db.prepare(`
      SELECT p.id, p.user_id, p.content, p.image_url, p.tag, p.created_at,
             u.username, u.name as user_name, u.avatar as user_avatar,
             0 as likes_count, 0 as comments_count, 0 as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Post created successfully!',
      post: {
        ...newPost,
        is_liked: false,
        is_owner: true
      }
    });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

// Delete Post
app.delete('/api/posts/:id', authMiddleware, (req, res) => {
  try {
    const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this post.' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Toggle Like
app.post('/api/posts/:id/like', authMiddleware, (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.user.id;

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }

    // Without this guard, liking a deleted post reported success and left an
    // orphaned like row (or a foreign key failure).
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(userId, postId);

    let isLiked = false;
    if (existing) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
      isLiked = false;
    } else {
      db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(userId, postId);
      isLiked = true;
    }

    const likesCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId).count;
    res.json({ isLiked, likesCount });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// ==================== COMMENTS ====================

// Get Comments for a Post
app.get('/api/posts/:id/comments', (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT c.id, c.content, c.created_at,
             u.id as user_id, u.username, u.name as user_name, u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.id ASC
    `).all(req.params.id);

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add Comment
app.post('/api/posts/:id/comments', authMiddleware, (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }

    // Without this guard, commenting on a deleted post raised a foreign key
    // violation and surfaced as an opaque 500.
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { content } = req.body;
    const cleanComment = cleanText(content, MAX_COMMENT_LEN);
    if (!cleanComment) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    const result = db.prepare(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(postId, req.user.id, cleanComment);

    const newComment = db.prepare(`
      SELECT c.id, c.content, c.created_at,
             u.id as user_id, u.username, u.name as user_name, u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    const commentsCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(postId).count;

    res.status(201).json({
      message: 'Comment added',
      comment: newComment,
      commentsCount
    });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete Comment
app.delete('/api/comments/:id', authMiddleware, (req, res) => {
  try {
    const comment = db.prepare('SELECT id, user_id FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(comment.id);
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Unknown API routes must return JSON, not the SPA shell.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 CodeAlpha Task 2: Social Media Platform Server running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`👤 Demo Account: alex@codealpha.com | password123`);
  console.log(`=======================================================`);
});
