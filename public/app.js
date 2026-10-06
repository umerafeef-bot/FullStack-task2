/**
 * PulseSocial - Main Frontend Application Logic
 * CodeAlpha Task 2: Social Media Platform
 */

const STATE = {
  user: JSON.parse(localStorage.getItem('pulsesocial_user') || 'null'),
  token: localStorage.getItem('pulsesocial_token') || null,
  activeFeed: 'all', // 'all' | 'following'
  activeTag: 'All',
  searchQuery: '',
  posts: [],
  suggestedUsers: [],
  viewingProfileUserId: null,
  theme: localStorage.getItem('pulsesocial_theme') || 'dark'
};

// ==================== DOM ELEMENTS ====================
const elements = {
  // Navigation
  navHomeBtn: document.getElementById('nav-home-btn'),
  navExploreBtn: document.getElementById('nav-explore-btn'),
  navMyProfileBtn: document.getElementById('nav-my-profile-btn'),
  navBrandLogo: document.getElementById('nav-brand-logo'),
  sidebarComposeBtn: document.getElementById('sidebar-compose-btn'),
  sidebarUserCard: document.getElementById('sidebar-user-card'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeText: document.getElementById('theme-text'),

  // Feed Header & Filters
  tabForYou: document.getElementById('tab-for-you'),
  tabFollowing: document.getElementById('tab-following'),
  tagFiltersBar: document.getElementById('tag-filters-bar'),
  postsFeed: document.getElementById('posts-feed'),
  profileViewSection: document.getElementById('profile-view-section'),
  createPostSection: document.getElementById('create-post-section'),

  // Create Post
  composerUserAvatar: document.getElementById('composer-user-avatar'),
  postContentInput: document.getElementById('post-content-input'),
  toggleImageInputBtn: document.getElementById('toggle-image-input-btn'),
  imageInputBox: document.getElementById('image-input-box'),
  postImageUrlInput: document.getElementById('post-image-url-input'),
  postTagSelect: document.getElementById('post-tag-select'),
  charCounter: document.getElementById('char-counter'),
  submitPostBtn: document.getElementById('submit-post-btn'),

  // Right Sidebar & Suggestions
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  suggestedUsersList: document.getElementById('suggested-users-list'),
  mobileSuggestedUsersList: document.getElementById('mobile-suggested-users-list'),

  // Mobile Top & Bottom Navigation
  mobileTopBar: document.getElementById('mobile-top-bar'),
  mobileThemeToggleBtn: document.getElementById('mobile-theme-toggle-btn'),
  mobileTrendsToggleBtn: document.getElementById('mobile-trends-toggle-btn'),
  mobileTrendsModalBackdrop: document.getElementById('mobile-trends-modal-backdrop'),
  closeMobileTrendsBtn: document.getElementById('close-mobile-trends-btn'),
  mobNavHome: document.getElementById('mob-nav-home'),
  mobNavExplore: document.getElementById('mob-nav-explore'),
  mobNavCompose: document.getElementById('mob-nav-compose'),
  mobNavTrends: document.getElementById('mob-nav-trends'),
  mobNavProfile: document.getElementById('mob-nav-profile'),

  // Composer Preview
  composerPreviewContainer: document.getElementById('composer-preview-container'),
  composerPreviewImg: document.getElementById('composer-preview-img'),
  removePreviewBtn: document.getElementById('remove-preview-btn'),

  // Modals
  editProfileModalBackdrop: document.getElementById('edit-profile-modal-backdrop'),
  closeEditProfileBtn: document.getElementById('close-edit-profile-btn'),
  cancelEditProfileBtn: document.getElementById('cancel-edit-profile-btn'),
  editProfileForm: document.getElementById('edit-profile-form'),

  authModalBackdrop: document.getElementById('auth-modal-backdrop'),
  closeAuthModalBtn: document.getElementById('close-auth-modal-btn'),
  authTabLogin: document.getElementById('auth-tab-login'),
  authTabRegister: document.getElementById('auth-tab-register'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),

  toastContainer: document.getElementById('toast-container')
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  // Listeners are wired first so a failure in any later step cannot leave the
  // page without click handlers.
  setupEventListeners();
  await restoreSession();
  fetchFeedPosts();
  fetchSuggestedUsers();
  if (window.lucide) lucide.createIcons();
});

// ==================== HTML ESCAPING HELPERS ====================
// User-supplied text (posts, comments, names, bios) is rendered through
// innerHTML, so it must be escaped to avoid stored XSS. `escapeHTML` is defined
// further down the file (hoisted function declaration) and is the single
// implementation used everywhere.

// Only allow http(s) URLs to be rendered as src/href attributes.
function safeUrl(value) {
  const url = String(value ?? '').trim();
  if (/^https?:\/\//i.test(url)) return escapeHTML(url);
  return '';
}

// Null-safe event binding. A single missing element must never abort
// setupEventListeners(), which would leave the whole page inert.
function on(el, event, handler) {
  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener(event, handler);
  }
  return el;
}

// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  elements.toastContainer.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ==================== THEME CONTROLLER ====================
function initTheme() {
  document.body.setAttribute('data-theme', STATE.theme);
  if (elements.themeText) {
    elements.themeText.innerText = STATE.theme === 'dark' ? 'Dark Mode' : 'Light Mode';
  }
}

function toggleTheme() {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', STATE.theme);
  localStorage.setItem('pulsesocial_theme', STATE.theme);
  if (elements.themeText) {
    elements.themeText.innerText = STATE.theme === 'dark' ? 'Dark Mode' : 'Light Mode';
  }
  if (window.lucide) lucide.createIcons();
}

// ==================== USER AUTH UI ====================
function updateUserUI() {
  if (STATE.user) {
    const avatar = safeUrl(STATE.user.avatar) ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(STATE.user.username || 'user')}`;
    const handle = escapeHTML(STATE.user.username);

    if (elements.composerUserAvatar) {
      elements.composerUserAvatar.src = avatar;
      elements.composerUserAvatar.alt = `${STATE.user.name} avatar`;
    }
    if (elements.postContentInput) elements.postContentInput.disabled = false;
    if (elements.submitPostBtn) elements.submitPostBtn.disabled = false;

    elements.sidebarUserCard.innerHTML = `
      <div class="user-mini-info" onclick="viewUserProfile('${handle}')">
        <img src="${avatar}" alt="${escapeHTML(STATE.user.name)}" class="avatar-sm">
        <div class="user-names-col">
          <span class="user-display-name">${escapeHTML(STATE.user.name)}</span>
          <span class="user-handle">@${handle}</span>
        </div>
      </div>
      <button id="logout-btn" class="action-btn" title="Sign Out" aria-label="Sign Out" style="padding: 6px;">
        <i data-lucide="log-out" style="width: 18px; height: 18px; color: var(--danger);"></i>
      </button>
    `;

    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLogout();
    });
  } else {
    // Signed out: the composer must invite sign-in rather than silently
    // swallowing the post when the API rejects it.
    if (elements.composerUserAvatar) {
      elements.composerUserAvatar.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=guest';
      elements.composerUserAvatar.alt = 'Guest';
    }
    if (elements.postContentInput) {
      elements.postContentInput.disabled = false;
      elements.postContentInput.placeholder = 'Sign in to share what\'s sparking in your mind today...';
    }

    elements.sidebarUserCard.innerHTML = `
      <button class="btn btn-primary btn-block" onclick="openAuthModal('login')">
        <i data-lucide="log-in"></i>
        <span>Sign In / Register</span>
      </button>
    `;
  }
  if (window.lucide) lucide.createIcons();
}

// Validates the stored token against the server on boot. Without this, an
// expired token leaves the UI showing a signed-in user whose writes all 401.
async function restoreSession() {
  if (!STATE.token) {
    updateUserUI();
    return;
  }
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (!res.ok) throw new Error('Session no longer valid');
    const data = await res.json();
    if (data.user) {
      STATE.user = data.user;
      localStorage.setItem('pulsesocial_user', JSON.stringify(data.user));
    }
  } catch (err) {
    STATE.user = null;
    STATE.token = null;
    localStorage.removeItem('pulsesocial_user');
    localStorage.removeItem('pulsesocial_token');
  }
  updateUserUI();
}

// Explicit, user-initiated demo sign-in used by the "Quick Demo Switcher"
// widget. Never called automatically on page load.
async function quickLogin(email) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: email, password: 'password123' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Demo sign-in failed');

    STATE.user = data.user;
    STATE.token = data.token;
    localStorage.setItem('pulsesocial_user', JSON.stringify(data.user));
    localStorage.setItem('pulsesocial_token', data.token);
    updateUserUI();
    return true;
  } catch (err) {
    showToast(err.message || 'Could not switch demo account.', 'error');
    return false;
  }
}

function handleLogout() {
  STATE.user = null;
  STATE.token = null;
  localStorage.removeItem('pulsesocial_user');
  localStorage.removeItem('pulsesocial_token');
  exitProfileView();
  showToast('Logged out of session.', 'info');
  updateUserUI();
  fetchFeedPosts();
  fetchSuggestedUsers();
}

// ==================== FEED & POSTS ====================
async function fetchFeedPosts() {
  try {
    elements.postsFeed.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-dim);">Loading pulse feed...</div>';

    const params = new URLSearchParams();
    if (STATE.activeFeed === 'following') params.append('feed', 'following');
    if (STATE.activeTag && STATE.activeTag !== 'All') params.append('tag', STATE.activeTag);
    if (STATE.searchQuery.trim() !== '') params.append('search', STATE.searchQuery.trim());
    if (STATE.viewingProfileUserId) params.append('userId', STATE.viewingProfileUserId);

    const headers = {};
    if (STATE.token) headers['Authorization'] = `Bearer ${STATE.token}`;

    const res = await fetch(`/api/posts?${params.toString()}`, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    STATE.posts = Array.isArray(data.posts) ? data.posts : [];

    renderPosts(STATE.posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    elements.postsFeed.innerHTML = `
      <div class="empty-state">
        <i data-lucide="wifi-off"></i>
        <h3>Couldn't load the feed</h3>
        <p>Check that the server is running, then try again.</p>
        <button class="btn btn-outline btn-sm" onclick="fetchFeedPosts()">Try Again</button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }
}

function renderPosts(posts) {
  if (posts.length === 0) {
    if (STATE.activeFeed === 'following') {
      elements.postsFeed.innerHTML = `
        <div style="padding: 60px 20px; text-align: center; color: var(--text-muted);">
          <i data-lucide="users" style="width: 48px; height: 48px; opacity: 0.5; margin-bottom: 12px; color: var(--primary);"></i>
          <h3>No posts in your Following feed</h3>
          <p style="max-width: 380px; margin: 0 auto 16px;">You haven't followed any creators yet, or they haven't posted recently.</p>
          <button class="btn btn-outline" onclick="openTrendsModal()">
            <i data-lucide="sparkles"></i> Explore Creators
          </button>
        </div>
      `;
    } else {
      elements.postsFeed.innerHTML = `
        <div style="padding: 60px 20px; text-align: center; color: var(--text-muted);">
          <i data-lucide="sparkles" style="width: 44px; height: 44px; opacity: 0.4; margin-bottom: 12px;"></i>
          <h3>No posts found</h3>
          <p>Try clearing your search query or selecting another topic filter.</p>
        </div>
      `;
    }
    if (window.lucide) lucide.createIcons();
    return;
  }

  elements.postsFeed.innerHTML = posts.map(post => {
    const formattedDate = new Date(post.created_at).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const authorAvatar = safeUrl(post.user_avatar);
    const handle = escapeHTML(post.username);

    return `
      <article class="post-article" id="post-${post.id}">
        <img src="${authorAvatar}" alt="${escapeHTML(post.user_name)}" class="avatar-md" onclick="viewUserProfile('${handle}')" style="cursor: pointer;">

        <div class="post-main">
          <div class="post-header">
            <div class="post-author-meta" onclick="viewUserProfile('${handle}')">
              <span class="author-name">${escapeHTML(post.user_name)}</span>
              <span class="author-handle">@${handle}</span>
              <span class="post-tag-badge">#${escapeHTML(post.tag)}</span>
            </div>
            <span class="post-time">${formattedDate}</span>
          </div>

          <div class="post-content">${escapeHTML(post.content)}</div>

          ${post.image_url && safeUrl(post.image_url) ? `
            <div class="post-image-preview">
              <img src="${safeUrl(post.image_url)}" alt="Post image" loading="lazy">
            </div>
          ` : ''}

          <!-- Action bar -->
          <div class="post-action-bar">
            <!-- Like -->
            <button class="action-btn like-btn ${post.is_liked ? 'liked' : ''}" onclick="toggleLikePost(${post.id})">
              <i data-lucide="heart" style="width: 17px; height: 17px;"></i>
              <span id="like-count-${post.id}">${post.likes_count}</span>
            </button>

            <!-- Comments Toggle -->
            <button class="action-btn comment-btn" onclick="toggleCommentsSection(${post.id})">
              <i data-lucide="message-square" style="width: 17px; height: 17px;"></i>
              <span id="comment-count-${post.id}">${post.comments_count}</span>
            </button>

            <!-- Share -->
            <button class="action-btn" onclick="copyPostLink(${post.id})" title="Copy link">
              <i data-lucide="share-2" style="width: 17px; height: 17px;"></i>
            </button>

            <!-- Delete if owner -->
            ${post.is_owner ? `
              <button class="action-btn delete-btn" onclick="deletePost(${post.id})" title="Delete post">
                <i data-lucide="trash-2" style="width: 17px; height: 17px;"></i>
              </button>
            ` : ''}
          </div>

          <!-- Dynamic Comments Wrapper (Initially Hidden) -->
          <div class="post-comments-wrapper" id="comments-wrapper-${post.id}" style="display: none;">
            <div class="comments-list" id="comments-list-${post.id}">
              <div style="font-size: 0.8rem; color: var(--text-dim);">Loading comments...</div>
            </div>
            
            <form class="add-comment-box" onsubmit="submitComment(event, ${post.id})">
              <input type="text" placeholder="Write a reply..." required id="comment-input-${post.id}">
              <button type="submit" class="btn btn-primary btn-sm">Reply</button>
            </form>
          </div>
        </div>
      </article>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// Null-safe so it can be applied to any database field without a guard.
function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// ==================== LIKES & COMMENTS ====================
async function toggleLikePost(postId) {
  if (!STATE.token) {
    openAuthModal('login');
    return;
  }

  const post = STATE.posts.find(p => p.id === postId);
  if (!post) return;

  // Optimistic update, with an explicit rollback if the request fails.
  const previousLiked = post.is_liked;
  const previousCount = post.likes_count;

  post.is_liked = !post.is_liked;
  post.likes_count += post.is_liked ? 1 : -1;

  const btn = document.querySelector(`#post-${postId} .like-btn`);
  const countSpan = document.getElementById(`like-count-${postId}`);
  if (btn) btn.classList.toggle('liked', post.is_liked);
  if (countSpan) countSpan.innerText = post.likes_count;

  try {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not update like.');

    post.likes_count = data.likesCount;
    post.is_liked = data.isLiked;
    if (countSpan) countSpan.innerText = data.likesCount;
  } catch (err) {
    // Restore the pre-click state so the UI never disagrees with the server.
    post.is_liked = previousLiked;
    post.likes_count = previousCount;
    if (btn) btn.classList.toggle('liked', previousLiked);
    if (countSpan) countSpan.innerText = previousCount;
    showToast(err.message || 'Failed to update like.', 'error');
  }
}

async function toggleCommentsSection(postId) {
  const wrapper = document.getElementById(`comments-wrapper-${postId}`);
  if (!wrapper) return;

  if (wrapper.style.display === 'none') {
    wrapper.style.display = 'block';
    loadComments(postId);
  } else {
    wrapper.style.display = 'none';
  }
}

async function loadComments(postId) {
  const container = document.getElementById(`comments-list-${postId}`);
  try {
    const res = await fetch(`/api/posts/${postId}/comments`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not load comments.');

    if (!data.comments || data.comments.length === 0) {
      container.innerHTML = '<div class="list-placeholder">No replies yet. Be the first to comment!</div>';
      return;
    }

    container.innerHTML = data.comments.map(c => `
      <div class="comment-bubble" id="comment-${c.id}">
        <img src="${safeUrl(c.user_avatar)}" alt="${escapeHTML(c.user_name)}" class="avatar-sm" style="width: 28px; height: 28px; cursor: pointer;" onclick="viewUserProfile('${escapeHTML(c.username)}')">
        <div style="flex: 1;">
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span class="comment-author-name" onclick="viewUserProfile('${escapeHTML(c.username)}')" style="cursor: pointer;">${escapeHTML(c.user_name)}</span>
            <span class="comment-time">${new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ${STATE.user && STATE.user.id === c.user_id ? `
              <button class="comment-del-btn" onclick="deleteComment(${c.id}, ${postId})" title="Delete comment" aria-label="Delete comment">
                <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
              </button>
            ` : ''}
          </div>
          <p class="comment-text">${escapeHTML(c.content)}</p>
        </div>
      </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="list-placeholder" style="color: var(--danger);">${escapeHTML(err.message || 'Failed to load comments.')}</div>`;
  }
}

async function deleteComment(commentId, postId) {
  if (!confirm('Are you sure you want to delete this comment?')) return;
  try {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not delete comment.');

    document.getElementById(`comment-${commentId}`)?.remove();
    const countSpan = document.getElementById(`comment-count-${postId}`);
    if (countSpan) {
      const current = Math.max(0, parseInt(countSpan.innerText || '1', 10) - 1);
      countSpan.innerText = current;
    }
    showToast('Comment deleted.', 'info');
  } catch (err) {
    showToast(err.message || 'Failed to delete comment.', 'error');
  }
}

async function submitComment(e, postId) {
  e.preventDefault();
  if (!STATE.token) {
    openAuthModal('login');
    return;
  }

  const input = document.getElementById(`comment-input-${postId}`);
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const content = input.value.trim();
  if (!content) {
    showToast('Please write a reply before posting.', 'error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  try {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify({ content })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not post comment.');

    input.value = '';
    loadComments(postId);
    const countSpan = document.getElementById(`comment-count-${postId}`);
    if (countSpan) countSpan.innerText = data.commentsCount;
    showToast('Comment posted!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to post comment.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      document.getElementById(`post-${postId}`)?.remove();
      showToast('Post deleted.', 'info');
    }
  } catch (err) {
    showToast('Failed to delete post.', 'error');
  }
}

function copyPostLink(postId) {
  navigator.clipboard.writeText(`${window.location.origin}/#post-${postId}`);
  showToast('Post link copied to clipboard!', 'info');
}

// ==================== CREATE POST ====================
async function handleCreatePost() {
  if (!STATE.token) {
    openAuthModal('login');
    return;
  }

  const content = elements.postContentInput.value.trim();
  const image_url = elements.postImageUrlInput.value.trim();
  const tag = elements.postTagSelect.value;

  if (!content) {
    showToast('Please type some content for your post.', 'error');
    return;
  }

  elements.submitPostBtn.disabled = true;

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify({ content, image_url, tag })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create post');

    // Reset inputs
    elements.postContentInput.value = '';
    elements.postImageUrlInput.value = '';
    elements.imageInputBox.style.display = 'none';
    updateComposerImagePreview('');
    elements.charCounter.innerText = '400';

    showToast('Post published to PulseSocial! 🚀', 'success');
    fetchFeedPosts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.submitPostBtn.disabled = false;
  }
}

// ==================== USER PROFILE VIEW ====================
async function viewUserProfile(identifier) {
  try {
    const headers = {};
    if (STATE.token) headers['Authorization'] = `Bearer ${STATE.token}`;

    const res = await fetch(`/api/users/${encodeURIComponent(identifier)}`, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Profile not found');

    const profile = data.profile;
    STATE.viewingProfileUserId = profile.id;

    // Show profile section, hide create post
    elements.profileViewSection.style.display = 'block';
    elements.createPostSection.style.display = profile.isSelf ? 'block' : 'none';

    const banner = safeUrl(profile.banner_url) ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';
    const avatar = safeUrl(profile.avatar) ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile.username || 'user')}`;
    const website = safeUrl(profile.website);
    const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : null;

    elements.profileViewSection.innerHTML = `
      <div class="profile-banner-box">
        <img src="${banner}" alt="Profile banner">
      </div>
      <div class="profile-content-box">
        <div class="profile-top-row">
          <img src="${avatar}" alt="${escapeHTML(profile.name)}" class="avatar-lg">
          <div>
            ${profile.isSelf ? `
              <button class="btn btn-outline btn-sm" id="edit-profile-trigger-btn">
                <i data-lucide="edit-3"></i> Edit Profile
              </button>
            ` : `
              <button class="btn ${profile.isFollowing ? 'btn-outline' : 'btn-primary'} btn-sm" onclick="toggleFollowUser(${profile.id}, this)">
                ${profile.isFollowing ? 'Following' : 'Follow'}
              </button>
            `}
          </div>
        </div>

        <div class="profile-names">
          <h2>${escapeHTML(profile.name)}</h2>
          <span class="profile-handle">@${escapeHTML(profile.username)}</span>
        </div>

        <p class="profile-bio">${escapeHTML(profile.bio || 'No bio yet.')}</p>

        <div class="profile-meta-row">
          ${profile.location ? `<span><i data-lucide="map-pin" style="width: 14px;"></i> ${escapeHTML(profile.location)}</span>` : ''}
          ${website ? `<a href="${website}" target="_blank" rel="noopener noreferrer"><i data-lucide="link" style="width: 14px;"></i> ${escapeHTML(website.replace(/^https?:\/\//, ''))}</a>` : ''}
          ${joinedYear ? `<span><i data-lucide="calendar" style="width: 14px;"></i> Joined ${joinedYear}</span>` : ''}
        </div>

        <div class="profile-stats-row">
          <div class="stat-item"><span class="stat-count">${profile.stats.posts}</span><span class="stat-title">Posts</span></div>
          <div class="stat-item"><span class="stat-count" id="profile-followers-count">${profile.stats.followers}</span><span class="stat-title">Followers</span></div>
          <div class="stat-item"><span class="stat-count">${profile.stats.following}</span><span class="stat-title">Following</span></div>
        </div>
      </div>
      <div class="profile-nav-tabs">
        <div class="profile-nav-tab">Posts (${profile.stats.posts})</div>
      </div>
    `;

    document.getElementById('edit-profile-trigger-btn')?.addEventListener('click', () => {
      openEditProfileModal(profile);
    });

    if (window.lucide) lucide.createIcons();
    fetchFeedPosts();
  } catch (err) {
    // Render a real error state instead of only toasting, so the previous
    // profile is never left on screen pretending to be this one.
    elements.profileViewSection.style.display = 'block';
    elements.createPostSection.style.display = 'none';
    elements.profileViewSection.innerHTML = `
      <div class="empty-state">
        <i data-lucide="user-x"></i>
        <h3>Profile unavailable</h3>
        <p>${escapeHTML(err.message || 'This profile could not be loaded.')}</p>
        <button class="btn btn-outline btn-sm" onclick="exitProfileView()">Back to Feed</button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }
}

function exitProfileView() {
  STATE.viewingProfileUserId = null;
  elements.profileViewSection.style.display = 'none';
  elements.createPostSection.style.display = 'block';
  fetchFeedPosts();
}

// ==================== FOLLOW / UNFOLLOW SYSTEM ====================
async function toggleFollowUser(targetUserId, btnElement) {
  if (!STATE.token) {
    openAuthModal('login');
    return;
  }

  try {
    const res = await fetch(`/api/users/${targetUserId}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Follow action failed');

    if (btnElement) {
      if (data.isFollowing) {
        btnElement.innerText = 'Following';
        btnElement.className = 'btn btn-outline btn-sm follow-toggle-btn following';
        showToast('Followed creator! 🎉', 'success');
      } else {
        btnElement.innerText = 'Follow';
        btnElement.className = 'btn btn-primary btn-sm follow-toggle-btn';
        showToast('Unfollowed.', 'info');
      }
    }

    const followersCountSpan = document.getElementById('profile-followers-count');
    if (followersCountSpan) followersCountSpan.innerText = data.followersCount;

    fetchSuggestedUsers();
  } catch (err) {
    showToast(err.message || 'Follow action failed', 'error');
  }
}

async function fetchSuggestedUsers() {
  try {
    const headers = {};
    if (STATE.token) headers['Authorization'] = `Bearer ${STATE.token}`;

    const res = await fetch('/api/users/suggested/list', { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not load suggestions.');
    STATE.suggestedUsers = data.suggested || [];

    const html = STATE.suggestedUsers.map(u => `
      <div class="suggested-user-row">
        <div class="suggested-user-info" onclick="viewUserProfile('${escapeHTML(u.username)}')">
          <img src="${safeUrl(u.avatar)}" alt="${escapeHTML(u.name)}" class="avatar-sm">
          <div>
            <div class="suggested-name">${escapeHTML(u.name)}</div>
            <div class="suggested-handle">@${escapeHTML(u.username)}</div>
          </div>
        </div>
        <button class="follow-toggle-btn ${u.is_following ? 'following' : 'btn-primary'}" onclick="toggleFollowUser(${u.id}, this)">
          ${u.is_following ? 'Following' : 'Follow'}
        </button>
      </div>
    `).join('') || '<div class="list-placeholder">No suggestions available.</div>';

    if (elements.suggestedUsersList) elements.suggestedUsersList.innerHTML = html;
    if (elements.mobileSuggestedUsersList) elements.mobileSuggestedUsersList.innerHTML = html;
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    const fallback = `<div class="list-placeholder">${escapeHTML(err.message || 'Could not load suggestions.')}</div>`;
    if (elements.suggestedUsersList) elements.suggestedUsersList.innerHTML = fallback;
    if (elements.mobileSuggestedUsersList) elements.mobileSuggestedUsersList.innerHTML = fallback;
  }
}

// ==================== EDIT PROFILE MODAL ====================
function openEditProfileModal(profile) {
  document.getElementById('edit-name').value = profile.name || '';
  document.getElementById('edit-bio').value = profile.bio || '';
  document.getElementById('edit-location').value = profile.location || '';
  document.getElementById('edit-website').value = profile.website || '';
  document.getElementById('edit-avatar').value = profile.avatar || '';
  document.getElementById('edit-banner').value = profile.banner_url || '';
  elements.editProfileModalBackdrop.classList.add('open');
}

function closeEditProfileModal() {
  elements.editProfileModalBackdrop.classList.remove('open');
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const name = document.getElementById('edit-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const location = document.getElementById('edit-location').value.trim();
  const website = document.getElementById('edit-website').value.trim();
  const avatar = document.getElementById('edit-avatar').value.trim();
  const banner_url = document.getElementById('edit-banner').value.trim();

  if (!name) {
    showToast('Display name cannot be empty.', 'error');
    document.getElementById('edit-name').focus();
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify({ name, bio, location, website, avatar, banner_url })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not update profile.');

    STATE.user = data.user;
    localStorage.setItem('pulsesocial_user', JSON.stringify(data.user));
    updateUserUI();
    closeEditProfileModal();
    showToast('Profile updated!', 'success');
    viewUserProfile(data.user.username);
  } catch (err) {
    showToast(err.message || 'Failed to update profile.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ==================== AUTH MODAL ====================
function openAuthModal(tab = 'login') {
  if (tab === 'login') {
    elements.authTabLogin.classList.add('active');
    elements.authTabRegister.classList.remove('active');
    elements.loginForm.style.display = 'block';
    elements.registerForm.style.display = 'none';
  } else {
    elements.authTabRegister.classList.add('active');
    elements.authTabLogin.classList.remove('active');
    elements.registerForm.style.display = 'block';
    elements.loginForm.style.display = 'none';
  }
  elements.authModalBackdrop.classList.add('open');
}

function closeAuthModal() {
  elements.authModalBackdrop.classList.remove('open');
}

async function handleLogin(e) {
  e.preventDefault();
  const login = document.getElementById('login-identifier').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    STATE.user = data.user;
    STATE.token = data.token;
    localStorage.setItem('pulsesocial_user', JSON.stringify(data.user));
    localStorage.setItem('pulsesocial_token', data.token);

    closeAuthModal();
    updateUserUI();
    showToast(`Welcome back, ${data.user.name}!`, 'success');
    fetchFeedPosts();
    fetchSuggestedUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    STATE.user = data.user;
    STATE.token = data.token;
    localStorage.setItem('pulsesocial_user', JSON.stringify(data.user));
    localStorage.setItem('pulsesocial_token', data.token);

    closeAuthModal();
    updateUserUI();
    showToast(`Welcome to PulseSocial, @${data.user.username}!`, 'success');
    fetchFeedPosts();
    fetchSuggestedUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==================== EVENT LISTENERS SETUP ====================
function setupEventListeners() {
  // Theme toggle
  on(elements.themeToggleBtn, 'click', toggleTheme);

  // Nav Links
  on(elements.navHomeBtn, 'click', () => {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    elements.navHomeBtn.classList.add('active');
    exitProfileView();
  });

  on(elements.navBrandLogo, 'click', (e) => {
    e.preventDefault();
    exitProfileView();
  });

  on(elements.navExploreBtn, 'click', () => {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    elements.navExploreBtn.classList.add('active');
    STATE.activeFeed = 'all';
    STATE.activeTag = 'All';
    exitProfileView();
  });

  on(elements.navMyProfileBtn, 'click', () => {
    if (!STATE.user) {
      openAuthModal('login');
      return;
    }
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    elements.navMyProfileBtn.classList.add('active');
    viewUserProfile(STATE.user.username);
  });

  on(elements.sidebarComposeBtn, 'click', () => {
    exitProfileView();
    elements.postContentInput.focus();
  });

  // Feed switcher tabs
  on(elements.tabForYou, 'click', () => {
    elements.tabForYou.classList.add('active');
    if (elements.tabFollowing) elements.tabFollowing.classList.remove('active');
    STATE.activeFeed = 'all';
    fetchFeedPosts();
  });

  on(elements.tabFollowing, 'click', () => {
    if (!STATE.token) {
      openAuthModal('login');
      return;
    }
    elements.tabFollowing.classList.add('active');
    if (elements.tabForYou) elements.tabForYou.classList.remove('active');
    STATE.activeFeed = 'following';
    fetchFeedPosts();
  });

  // Tag filter chips
  document.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      STATE.activeTag = chip.dataset.tag;
      fetchFeedPosts();
    });
  });

  // Trending topic clicks
  document.querySelectorAll('.trending-item').forEach(item => {
    item.addEventListener('click', () => {
      const tag = item.dataset.tag;
      STATE.activeTag = tag;
      document.querySelectorAll('.tag-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.tag === tag);
      });
      fetchFeedPosts();
      showToast(`Filtered feed by #${tag}`, 'info');
    });
  });

  // Image toggle in composer
  on(elements.toggleImageInputBtn, 'click', () => {
    const isHidden = elements.imageInputBox.style.display === 'none';
    elements.imageInputBox.style.display = isHidden ? 'block' : 'none';
    if (isHidden) elements.postImageUrlInput.focus();
  });

  // Preset picks
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.postImageUrlInput.value = btn.dataset.url;
      updateComposerImagePreview(btn.dataset.url);
      showToast('Photo attached!', 'info');
    });
  });

  // Image input listener for live preview
  if (elements.postImageUrlInput) {
    on(elements.postImageUrlInput, 'input', (e) => {
      updateComposerImagePreview(e.target.value);
    });
  }

  // Remove preview button
  if (elements.removePreviewBtn) {
    on(elements.removePreviewBtn, 'click', () => {
      elements.postImageUrlInput.value = '';
      updateComposerImagePreview('');
    });
  }

  // Char counter
  on(elements.postContentInput, 'input', (e) => {
    const remaining = 400 - e.target.value.length;
    elements.charCounter.innerText = remaining;
    if (remaining < 20) elements.charCounter.style.color = 'var(--danger)';
    else elements.charCounter.style.color = 'var(--text-dim)';
  });

  // Submit post
  on(elements.submitPostBtn, 'click', handleCreatePost);

  // Search
  let searchTimeout;
  on(elements.searchInput, 'input', (e) => {
    clearTimeout(searchTimeout);
    const val = e.target.value;
    if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = val ? 'flex' : 'none';
    searchTimeout = setTimeout(() => {
      STATE.searchQuery = val;
      fetchFeedPosts();
    }, 300);
  });

  on(elements.clearSearchBtn, 'click', () => {
    elements.searchInput.value = '';
    if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = 'none';
    STATE.searchQuery = '';
    fetchFeedPosts();
  });

  // Quick Demo Account Switcher
  document.querySelectorAll('.demo-account-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const email = chip.dataset.email;
      await quickLogin(email);
      showToast(`Switched account to ${chip.innerText.trim()}!`, 'success');
      exitProfileView();
      closeTrendsModal();
      fetchSuggestedUsers();
    });
  });

  // Mobile Top & Bottom Navigation
  if (elements.mobileThemeToggleBtn) {
    on(elements.mobileThemeToggleBtn, 'click', toggleTheme);
  }

  if (elements.mobileTrendsToggleBtn) {
    on(elements.mobileTrendsToggleBtn, 'click', openTrendsModal);
  }

  if (elements.closeMobileTrendsBtn) {
    on(elements.closeMobileTrendsBtn, 'click', closeTrendsModal);
  }

  if (elements.mobNavHome) {
    elements.mobNavHome.addEventListener('click', () => {
      document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
      elements.mobNavHome.classList.add('active');
      exitProfileView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (elements.mobNavExplore) {
    elements.mobNavExplore.addEventListener('click', () => {
      document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
      elements.mobNavExplore.classList.add('active');
      STATE.activeFeed = 'all';
      STATE.activeTag = 'All';
      exitProfileView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (elements.mobNavCompose) {
    elements.mobNavCompose.addEventListener('click', () => {
      exitProfileView();
      elements.postContentInput.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (elements.mobNavTrends) {
    elements.mobNavTrends.addEventListener('click', openTrendsModal);
  }

  if (elements.mobNavProfile) {
    elements.mobNavProfile.addEventListener('click', () => {
      if (!STATE.user) {
        openAuthModal('login');
        return;
      }
      document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
      elements.mobNavProfile.classList.add('active');
      viewUserProfile(STATE.user.username);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Edit profile modal
  on(elements.closeEditProfileBtn, 'click', closeEditProfileModal);
  on(elements.cancelEditProfileBtn, 'click', closeEditProfileModal);
  on(elements.editProfileForm, 'submit', handleProfileUpdate);

  // Auth modal
  on(elements.closeAuthModalBtn, 'click', closeAuthModal);
  on(elements.authTabLogin, 'click', () => openAuthModal('login'));
  on(elements.authTabRegister, 'click', () => openAuthModal('register'));
  on(elements.loginForm, 'submit', handleLogin);
  on(elements.registerForm, 'submit', handleRegister);

  // Keyboard accessibility (ESC key)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditProfileModal();
      closeAuthModal();
      closeTrendsModal();
    }
  });
}

function updateComposerImagePreview(url) {
  if (elements.composerPreviewContainer && elements.composerPreviewImg) {
    if (url && url.trim() !== '') {
      elements.composerPreviewImg.src = url.trim();
      elements.composerPreviewContainer.style.display = 'block';
      if (window.lucide) lucide.createIcons();
    } else {
      elements.composerPreviewImg.src = '';
      elements.composerPreviewContainer.style.display = 'none';
    }
  }
}

function openTrendsModal() {
  if (elements.mobileTrendsModalBackdrop) {
    elements.mobileTrendsModalBackdrop.classList.add('open');
    if (window.lucide) lucide.createIcons();
  }
}

function closeTrendsModal() {
  if (elements.mobileTrendsModalBackdrop) {
    elements.mobileTrendsModalBackdrop.classList.remove('open');
  }
}
