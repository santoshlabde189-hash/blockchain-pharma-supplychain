import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../services/db';
import { config } from '../config';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  orgId: z.string(),
  role: z.enum(['MANUFACTURER', 'DISTRIBUTOR', 'PHARMACY', 'REGULATOR', 'ADMIN'])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

authRouter.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const { name, email, password, orgId, role } = req.body;

  const existing = db.users.find(u => u.email === email);
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: db.getNextUserId(),
    name,
    email,
    passwordHash,
    orgId,
    role,
    isActive: true,
    createdAt: new Date()
  };

  db.users.push(user);

  res.status(201).json({
    message: 'User registered successfully',
    user: { id: user.id, name: user.name, email: user.email, orgId: user.orgId, role: user.role }
  });
});

authRouter.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, orgId: user.orgId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, orgId: user.orgId, role: user.role }
  });
});

authRouter.get('/me', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.user?.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const org = db.organizations.find(o => o.id === user.orgId);
  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    organization: org || null
  });
});
