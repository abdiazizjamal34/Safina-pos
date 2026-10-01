const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, organizationId: user.organizationId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

const setRefreshCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'strict',
    secure:   isProd,
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, businessName } = req.body;
    if (!name || !email || !password || !businessName) {
      return res.status(400).json({ error: 'All fields including Cafe/Hotel name are required' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password min 8 characters' });
    const normalizedEmail = email.toLowerCase().trim();
    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    if (!pin) return res.status(400).json({ error: 'PIN is required' });
    if (pin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 characters' });

    const hashed = await bcrypt.hash(password, 12);
    const hashedpin = await bcrypt.hash('string(pin)', 10); // Default PIN for new users, can be changed later
    
    const { user, org } = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const newOrg = await tx.organization.create({
        data: { name: businessName.trim() }
      });
      
      // 2. Create User
      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          password: hashed,
          pin: hashedpin, // Assuming you want to hash the PIN as well
          role: 'ADMIN',
          organizationId: newOrg.id
        }
      });
      
      // 3. Create default payment methods
      await tx.paymentMethod.createMany({
        data: [
          { name: 'CASH', isEnabled: true, organizationId: newOrg.id },
          { name: 'CARD', isEnabled: true, organizationId: newOrg.id },
          { name: 'UPI', isEnabled: true, upiId: '', organizationId: newOrg.id }
        ]
      });
      
      return { user: newUser, org: newOrg };
    });

    const { accessToken, refreshToken } = generateTokens(user);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: org.name
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
};



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true }
    });
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account deactivated' });
    const { accessToken, refreshToken } = generateTokens(user);
    setRefreshCookie(res, refreshToken);
    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name
      }
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Something went wrong' }); }
};

exports.pinLogin = async (req, res) => {
  try {
    const { userId, pin } = req.body;

    if (!userId || !pin) {
      return res.status(400).json({
        error: 'User and PIN are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account deactivated',
      });
    }

    if (!user.pin) {
      return res.status(401).json({
        error: 'PIN login is not configured for this user',
      });
    }

    const validPin = await bcrypt.compare(
      String(pin),
      user.pin
    );

    if (!validPin) {
      return res.status(401).json({
        error: 'Incorrect PIN',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name,
      },
    });
  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: 'Something went wrong',
    });
  }
};


exports.getLoginStaff = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(users);
  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: 'Unable to load staff',
    });
  }
};


exports.refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { organization: true }
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid session' });
    const { accessToken, refreshToken } = generateTokens(user);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken });
  } catch { res.status(401).json({ error: 'Invalid refresh token' }); }
};

exports.logout = (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'strict',
    secure:   isProd,
  });
  res.json({ message: 'Logged out' });
};
