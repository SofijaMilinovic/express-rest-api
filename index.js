const express = require('express');
const session = require('express-session');
const app = express();
const pool = require('./db');
const bcrypt = require('bcrypt');
require('dotenv').config();


app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,       
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }     
}));

app.get('/', (req, res) => {
  res.send('Hello Express!');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username i password su obavezni' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Korisnik ne postoji' });
    }

    const user = rows[0];

    
    // if (user.password !== password) {
    //   return res.status(401).json({ error: 'Pogrešna lozinka' });
    // }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Pogrešna lozinka' });
    }
     req.session.user = {
      role: user.role,
      id: user.id
    };


    res.json(user);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška sa serverom' });
  }
});


app.post('/createTask', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Niste ulogovani' });
  }

  if (req.session.user.role != 'basic') {
    return res.status(403).json({ error: 'Nemate permisije!' });
  }

  const { taskBody } = req.body;

  try {
    const [result] = await pool.query(
      'INSERT INTO tasks (body, userId) VALUES (?, ?)',
      [taskBody, req.session.user.id]
    );

    const createdTask = {
      id: result.insertId,
      body: taskBody,
      userId: req.session.user.id
    };

    res.json(createdTask);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška sa serverom' });
  }
});

app.post('/updateTask/:taskId', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Niste ulogovani' });
  }

  const { taskId } = req.params;
  const { taskBody } = req.body;
  const currentUser = req.session.user;

  try {
    const [taskRows] = await pool.query(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({ error: 'Task ne postoji' });
    }

    const task = taskRows[0];

    const isAdmin = currentUser.role === 'admin';
    const isOwner = task.userId === currentUser.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Nemate dozvolu da menjate ovaj task' });
    }

    await pool.query(
      'UPDATE tasks SET body = ? WHERE id = ?',
      [taskBody, taskId]
    );

    const updatedTask = {
      id: task.id,
      body: taskBody,
      userId: task.userId
    };

    res.json(updatedTask);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška sa serverom' });
  }
});

app.get('/getAllTasks', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Niste ulogovani' });
  }

  const sort = req.query.sort === 'desc' ? 'DESC' : 'ASC';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const user = req.session.user;

  try {
    let query;
    let params = [];

    if (user.role === 'admin') {
      query = `SELECT id, body, userId, createdDate FROM tasks ORDER BY createdDate ${sort} LIMIT ? OFFSET ?`;
      params = [limit, offset];
    } else {
      query = `SELECT id, body, userId, createdDate FROM tasks WHERE userId = ? ORDER BY createdDate ${sort} LIMIT ? OFFSET ?`;
      params = [user.id, limit, offset];
    }

    const [tasks] = await pool.query(query, params);

    res.json({ page, limit, tasks });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška sa serverom' });
  }
});


app.get('/getTaskById/:taskId', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Niste ulogovani' });
  }

  const user = req.session.user;
  const taskId = req.params.taskId;

  try {
    const [rows] = await pool.query(
      'SELECT id, body, userId FROM tasks WHERE id = ?',
      [taskId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task ne postoji' });
    }

    const task = rows[0];

    if (user.role !== 'admin' && task.userId !== user.id) {
      return res.status(403).json({ error: 'Nemate pristup ovom tasku' });
    }

    
    res.json(task);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška na serveru' });
  }
});

app.get('/getTasksByUsername/:username', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Niste ulogovani' });

  const sort = req.query.sort === 'desc' ? 'DESC' : 'ASC';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const user = req.session.user;

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Nemate dozvolu za ovu operaciju' });
  }

  const username = req.params.username;

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Korisnik sa tim username-om nije pronađen.' });
    }

    const userId = rows[0].id;

    const [tasks] = await pool.query(`SELECT id, body, userId, createdDate FROM tasks WHERE userId = ? ORDER BY createdDate ${sort} LIMIT ? OFFSET ?`, [userId, limit, offset]);

    res.json({ page, limit, tasks });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška sa serverom.' });
  }
});


app.post('/updatePersonalData', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Niste ulogovani' });

  const userId = req.session.user.id;

  const allowedFields = ['firstName', 'lastName', 'username', 'email', 'password'];

  // const updates = allowedFields
  //   .filter(field => req.body[field] !== undefined)
  //   .map(field => `${field} = ?`);
  // const params = allowedFields
  //   .filter(field => req.body[field] !== undefined)
  //   .map(field => req.body[field]);
  const updates = [];
  const params = [];
  for (const field of allowedFields) {

    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (field === 'password') {
        const hashedPassword = await bcrypt.hash(req.body[field], 10);
        params.push(hashedPassword);
      } else {
        params.push(req.body[field]);
      }
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nije poslato ništa za update.' });

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  params.push(userId);
  
  try {
    const [result] = await pool.query(query, params);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Korisnik nije pronađen.' });

    res.json({ message: 'Podaci uspešno ažurirani.' });

  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email ili username već postoji.' });
    res.status(500).json({ error: 'Greška sa serverom.' });
  }
});

app.post('/updatePersonalDataByUsername/:username', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Niste ulogovani' });

  const user = req.session.user;

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Nemate dozvolu za ovu operaciju' });
  }

  const username = req.params.username;
  const allowedFields = ['firstName', 'lastName', 'username', 'email', 'password', 'role']; 

  if (req.body.role && !['basic', 'admin'].includes(req.body.role)) {
    return res.status(400).json({ error: "Role može biti samo 'basic' ili 'admin'." });
  }

  const updates = allowedFields
    .filter(field => req.body[field] !== undefined)
    .map(field => `${field} = ?`);

  const params = allowedFields
    .filter(field => req.body[field] !== undefined)
    .map(field => req.body[field]);

  if (updates.length === 0) return res.status(400).json({ error: 'Nije poslato ništa za update.' });

  const query = `UPDATE users SET ${updates.join(', ')} WHERE username = ?`;
  params.push(username);

  try {
    const [result] = await pool.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Korisnik sa tim username-om nije pronađen.' });
    }

    res.json({ message: 'Podaci korisnika uspešno ažurirani.' });

  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email ili username već postoji.' });
    res.status(500).json({ error: 'Greška sa serverom.' });
  }
});




app.listen(3000, () => {
  console.log('Server radi na http://localhost:3000');
});
