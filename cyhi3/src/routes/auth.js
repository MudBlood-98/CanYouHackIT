const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = user;
    next();
  });
};

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { prisma } = req;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Sign Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, rollNumber: user.rollNumber },
      process.env.JWT_SECRET || 'supersecretjwtkey',
      { expiresIn: '24h' }
    );

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        userId: user.id,
        details: `User ${user.email} logged in successfully.`
      }
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get Current User
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { prisma } = req;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        rollNumber: true,
        role: true,
        active: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
