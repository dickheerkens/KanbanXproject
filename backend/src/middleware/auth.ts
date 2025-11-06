import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../config/database';
import { HumanTokenPayload, AgentTokenPayload, AuthenticatedRequest, User, Agent } from '../types';

export class AuthService {
  private static instance: AuthService;
  private jwtSecret: string;

  private constructor() {
    this.jwtSecret = process.env['JWT_SECRET'] || 'your-super-secret-key-change-in-production';
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Human authentication
  public generateHumanToken(user: { id: string; username: string; role: string }): string {
    const payload: HumanTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    return jwt.sign(payload, this.jwtSecret);
  }

  public verifyHumanToken(token: string): HumanTokenPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as HumanTokenPayload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  // Agent authentication
  public generateAgentToken(agent: { id: string; role: string; capabilities: string[] }): string {
    const payload: AgentTokenPayload = {
      agentId: agent.id,
      role: agent.role,
      capabilities: agent.capabilities,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    
    return jwt.sign(payload, this.jwtSecret);
  }

  public verifyAgentToken(token: string): AgentTokenPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as AgentTokenPayload;
    } catch (error) {
      console.error('Agent token verification failed:', error);
      return null;
    }
  }

  // Password hashing
  public async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 12);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }
}

// Middleware for human authentication
export const authenticateHuman = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const authService = AuthService.getInstance();
    const payload = authService.verifyHumanToken(token);

    if (!payload) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }

    // Get user from database
    const db = getDatabase();
    const user = await db.get<Omit<User, 'password_hash'>>(
      'SELECT id, username, display_name, role, created_at, updated_at FROM users WHERE id = ?',
      [payload.sub]
    );

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    (req as AuthenticatedRequest).user = user as User;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

// Middleware for agent authentication
export const authenticateAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No agent token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const authService = AuthService.getInstance();
    const payload = authService.verifyAgentToken(token);

    if (!payload) {
      res.status(401).json({ success: false, error: 'Invalid agent token' });
      return;
    }

    // Get agent from database
    const db = getDatabase();
    const agent = await db.get<Omit<Agent, 'capabilities'> & { capabilities: string }>(
      'SELECT id, name, role, capabilities, is_active, created_at, updated_at, last_active FROM agents WHERE id = ?',
      [payload.agentId]
    );

    if (!agent) {
      res.status(401).json({ success: false, error: 'Agent not found' });
      return;
    }

    if (!agent.is_active) {
      res.status(401).json({ success: false, error: 'Agent is inactive' });
      return;
    }

    // Update last_active timestamp
    await db.run(
      'UPDATE agents SET last_active = ? WHERE id = ?',
      [new Date().toISOString(), payload.agentId]
    );

    (req as AuthenticatedRequest).agent = {
      ...agent,
      capabilities: JSON.parse(agent.capabilities || '[]')
    } as Agent;
    next();
  } catch (error) {
    console.error('Agent authentication error:', error);
    res.status(500).json({ success: false, error: 'Agent authentication failed' });
  }
};

// Middleware for role-based access control
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    const userRole = authReq.user?.role || authReq.agent?.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
};

// Middleware for agent capability checking
export const requireCapability = (capability: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.agent) {
      res.status(403).json({ success: false, error: 'Agent authentication required' });
      return;
    }
    
    if (!authReq.agent.capabilities.includes(capability)) {
      res.status(403).json({ 
        success: false, 
        error: `Agent lacks required capability: ${capability}` 
      });
      return;
    }
    
    next();
  };
};