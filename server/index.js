const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Helper for simple hashing (In production, use bcrypt)
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.send('OK');
});

// --- Database Initialization ---
const initDb = async () => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await db.query(schemaSql);
        console.log('Database schema initialized successfully.');
    } else {
        console.warn('schema.sql not found, skipping initialization.');
    }
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
  }
};

// --- Socket.io Logic ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('typing', ({ roomId, userName }) => {
    socket.to(roomId).emit('user_typing', { userName });
  });
  
  socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('user_stop_typing');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  let { email, password, name } = req.body;
  
  if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
  }

  const hashedPassword = hashPassword(password);

  try {
    // Check if user exists
    let result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length > 0) {
        // Login: Check password
        const user = result.rows[0];
        // Note: In a real app, use bcrypt.compare
        // If the user was created via OAuth (password_hash is null) or password mismatch
        if (!user.password_hash || user.password_hash !== hashedPassword) {
             return res.status(401).json({ error: "Invalid credentials" });
        }
        
        return res.json({
            id: user.id,
            name: user.display_name,
            avatar: user.avatar_url,
            status: user.status || 'online'
        });
    } else {
        // Register (if name provided)
        if (!name) {
            return res.status(404).json({ error: "User not found. Please register." });
        }
        
        result = await db.query(
         'INSERT INTO users (email, display_name, password_hash, avatar_url, provider) VALUES ($1, $2, $3, $4, $5) RETURNING *',
         [email, name, hashedPassword, `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`, 'local']
        );
        
        const user = result.rows[0];
        return res.json({
            id: user.id,
            name: user.display_name,
            avatar: user.avatar_url,
            status: user.status || 'online'
        });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Room Routes ---
app.get('/api/rooms', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM rooms ORDER BY created_at DESC');
    const rooms = result.rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        createdAt: new Date(r.created_at).getTime(),
        members: [] 
    }));
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  const { name, description, ownerId } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO rooms (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, ownerId]
    );
    const r = result.rows[0];
    
    const newRoom = {
        id: r.id,
        name: r.name,
        description: r.description,
        createdAt: new Date(r.created_at).getTime(),
        members: [ownerId]
    };
    io.emit('room_created', newRoom);
    
    res.json(newRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Message Routes ---
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await db.query(
        'SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC', 
        [roomId]
    );
    const messages = result.rows.map(m => ({
        id: m.id,
        userId: m.user_id,
        roomId: m.room_id,
        content: m.content,
        type: m.type,
        timestamp: new Date(m.created_at).getTime(),
        reactions: m.reactions || {}
    }));
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  const { roomId, userId, content, type } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO messages (room_id, user_id, content, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [roomId, userId, content, type]
    );
    const m = result.rows[0];
    
    const messagePayload = {
        id: m.id,
        userId: m.user_id,
        roomId: m.room_id,
        content: m.content,
        type: m.type,
        timestamp: new Date(m.created_at).getTime(),
        reactions: {}
    };

    io.to(roomId).emit('receive_message', messagePayload);
    res.json(messagePayload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/:id/react', async (req, res) => {
    const { id } = req.params;
    const { emoji } = req.body;
    try {
        const current = await db.query('SELECT * FROM messages WHERE id = $1', [id]);
        if (current.rows.length === 0) return res.status(404).json({error: 'Not found'});
        
        const reactions = current.rows[0].reactions || {};
        reactions[emoji] = (reactions[emoji] || 0) + 1;

        await db.query(
            'UPDATE messages SET reactions = $1 WHERE id = $2',
            [JSON.stringify(reactions), id]
        );

        io.to(current.rows[0].room_id).emit('message_reaction', {
            messageId: id,
            emoji: emoji
        });

        res.json({ success: true, reactions });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
server.listen(PORT, async () => {
  await initDb(); // Initialize DB tables on start
  console.log(`Server running on port ${PORT}`);
});