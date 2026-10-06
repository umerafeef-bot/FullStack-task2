const { db, hashPassword } = require('./database');

function seedDatabase() {
  console.log('Seeding Task 2 Social Media database...');

  // 1. Seed users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, name, email, password_hash, avatar, banner_url, bio, location, website)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const users = [
      {
        username: 'alexdev',
        name: 'Alex Rivera',
        email: 'alex@codealpha.com',
        password: 'password123',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        bio: 'Senior Full Stack Engineer & UI Architect. Passionate about WebGL, Node.js, and building blazing fast digital experiences. 🚀',
        location: 'San Francisco, CA',
        website: 'https://alexrivera.dev'
      },
      {
        name: 'Sophia Patel',
        username: 'sophiacodes',
        email: 'sophia@codealpha.com',
        password: 'password123',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
        banner_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop&q=80',
        bio: 'AI Researcher & Design Technologist. Exploring creative human-computer interaction and generative web experiments. ✨',
        location: 'New York, NY',
        website: 'https://sophiacodes.design'
      },
      {
        name: 'Marcus Vance',
        username: 'marcus_v',
        email: 'marcus@codealpha.com',
        password: 'password123',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        banner_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
        bio: 'Open-source creator, mechanical keyboard enthusiast, and indie founder. Coffee fueled developer. ☕',
        location: 'Austin, TX',
        website: 'https://github.com/marcusvance'
      },
      {
        name: 'Elena Rostova',
        username: 'elena_art',
        email: 'elena@codealpha.com',
        password: 'password123',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
        banner_url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80',
        bio: '3D Artist & Motion Designer. Crafting visual magic and cyber aesthetic landscapes. 🎨',
        location: 'Berlin, Germany',
        website: 'https://artstation.com/elena'
      }
    ];

    for (const u of users) {
      insertUser.run(
        u.username,
        u.name,
        u.email,
        hashPassword(u.password),
        u.avatar,
        u.banner_url,
        u.bio,
        u.location,
        u.website
      );
    }
    console.log(`✔ ${users.length} Users seeded`);
  }

  // 2. Seed posts
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();
  if (postCount.count === 0) {
    const insertPost = db.prepare(`
      INSERT INTO posts (user_id, content, image_url, tag, created_at)
      VALUES (?, ?, ?, ?, datetime('now', ?))
    `);

    const posts = [
      {
        user_id: 1, // Alex
        content: 'Just launched our new minimalist open-source component library built entirely with vanilla CSS and custom properties! Ultra lightweight, zero dependencies, and 100% accessible. Check it out on GitHub! 🚀✨',
        image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&auto=format&fit=crop&q=80',
        tag: 'Tech',
        timeOffset: '-3 hours'
      },
      {
        user_id: 2, // Sophia
        content: 'Late night coding session experimenting with Web Audio API synthesizer nodes and generative visualizers. There is something deeply meditative about turning frequencies into living particle art. 🎧🔮',
        image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000&auto=format&fit=crop&q=80',
        tag: 'Design',
        timeOffset: '-6 hours'
      },
      {
        user_id: 3, // Marcus
        content: 'Finished building my dream 65% custom mechanical keyboard! Lubed Gateron Oil Kings, brass weight plate, double-shot PBT keycaps. The thock sound profile is absolutely hypnotic. ⌨️🔥',
        image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1000&auto=format&fit=crop&q=80',
        tag: 'Tech',
        timeOffset: '-1 day'
      },
      {
        user_id: 4, // Elena
        content: 'Exploration render inspired by cyber-noir aesthetics and volumetric lighting in Unreal Engine 5. Rendered at 4K in real-time. Feedback and thoughts are always welcome! 🏙️💜',
        image_url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1000&auto=format&fit=crop&q=80',
        tag: 'Art',
        timeOffset: '-2 days'
      },
      {
        user_id: 1, // Alex
        content: 'Reminder to all developers: Take regular breaks, hydrate, and stretch your wrists! Sustainable engineering is about endurance, not burnouts. Have a productive week ahead! 💪🌱',
        image_url: null,
        tag: 'General',
        timeOffset: '-3 days'
      }
    ];

    for (const p of posts) {
      insertPost.run(p.user_id, p.content, p.image_url, p.tag, p.timeOffset);
    }
    console.log(`✔ ${posts.length} Posts seeded`);
  }

  // 3. Seed comments
  const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get();
  if (commentCount.count === 0) {
    const insertComment = db.prepare(`
      INSERT INTO comments (post_id, user_id, content, created_at)
      VALUES (?, ?, ?, datetime('now', ?))
    `);

    insertComment.run(1, 2, 'Incredible work Alex! Loving the clean CSS tokens and typography.', '-2 hours');
    insertComment.run(1, 3, 'Starred the repo! Will definitely test this in my upcoming indie project.', '-1 hour');
    insertComment.run(2, 1, 'The visualizer harmonics look surreal Sophia! Would love to see the shader code.', '-4 hours');
    insertComment.run(3, 4, 'That keyboard setup looks stunning on your walnut desk!', '-18 hours');
    console.log('✔ Comments seeded');
  }

  // 4. Seed likes
  const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes').get();
  if (likeCount.count === 0) {
    const insertLike = db.prepare('INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)');
    insertLike.run(2, 1);
    insertLike.run(3, 1);
    insertLike.run(4, 1);
    insertLike.run(1, 2);
    insertLike.run(3, 2);
    insertLike.run(1, 3);
    insertLike.run(2, 3);
    insertLike.run(1, 4);
    insertLike.run(2, 4);
    insertLike.run(3, 4);
    insertLike.run(2, 5);
    console.log('✔ Likes seeded');
  }

  // 5. Seed followers
  const followCount = db.prepare('SELECT COUNT(*) as count FROM followers').get();
  if (followCount.count === 0) {
    const insertFollow = db.prepare('INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)');
    insertFollow.run(1, 2); // Alex follows Sophia
    insertFollow.run(1, 3); // Alex follows Marcus
    insertFollow.run(2, 1); // Sophia follows Alex
    insertFollow.run(3, 1); // Marcus follows Alex
    insertFollow.run(4, 1); // Elena follows Alex
    insertFollow.run(4, 2); // Elena follows Sophia
    console.log('✔ Follow relationships seeded');
  }

  console.log('Task 2 database successfully prepared!');
}

seedDatabase();

module.exports = seedDatabase;
