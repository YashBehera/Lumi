import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { json, urlencoded } from 'express';
import multer from 'multer';
import { MediaRecord } from '@prisma/client';

import { prisma } from './lib/prisma';
import {
  hashPassword,
  verifyPassword,
  signToken,
  authMiddleware,
  requireRole,
  AuthRequest,
} from './lib/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage (uses UPLOAD_DIR)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  },
});
const upload = multer({ storage });

app.use(cors());
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true }));

// Serve uploads (for admin review)
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// ======================
// Health check
// ======================
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// ======================
// Auth: register / login / me
// ======================

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, candidateId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, role required' });
    }
    if (!['CANDIDATE', 'INTERVIEWER'].includes(role)) {
      return res.status(400).json({ error: 'invalid_role' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'email_taken' });

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        candidateId: role === 'CANDIDATE' ? candidateId || null : null,
      },
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        candidateId: user.candidateId,
      },
    });
  } catch (e) {
    console.error('register error', e);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email, password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'invalid_credentials' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'invalid_credentials' });

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        candidateId: user.candidateId,
      },
    });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Current user
app.get('/api/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    candidateId: user.candidateId,
  });
});

// ======================
// Candidate: self interviews (/api/me/interviews)
// ======================
app.get(
  '/api/me/interviews',
  authMiddleware,
  requireRole('CANDIDATE'),
  async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'user_not_found' });

    const where = {
      OR: [
        { candidateEmail: user.email },
        user.candidateId ? { candidateId: user.candidateId } : undefined,
      ].filter(Boolean) as any[],
      status: { not: 'cancelled' },
    };

    const interviews = await prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: { template: true },
    });

    res.json(
      interviews.map((iv: any) => ({
        id: iv.id,
        candidateName: iv.candidateName,
        candidateEmail: iv.candidateEmail,
        candidateId: iv.candidateId,
        status: iv.status,
        scheduledAt: iv.scheduledAt,
        template: iv.template
          ? {
              id: iv.template.id,
              name: iv.template.name,
              role: iv.template.role,
              level: iv.template.level,
            }
          : null,
      }))
    );
  }
);

// ======================
// Interview config (for candidate client)
// ======================
app.get('/api/interviews/:id/config', async (req: Request, res: Response) => {
  const { id } = req.params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: { template: true },
  });

  if (!interview) return res.status(404).json({ error: 'Not found' });

  const tpl = interview.template;
  const cfg = (tpl?.config as any) || {};

  const defaultProctor = {
    heartbeatMs: 5000,
    frameIntervalMs: 5000, // 5s default chunk
    focusLossThreshold: 3,
  };

  const proctorConfig = cfg.proctor || defaultProctor;
  const questions = Array.isArray(cfg.questions) ? cfg.questions : [];

  res.json({
    id: interview.id,
    candidateName: interview.candidateName,
    status: interview.status,
    template: tpl
      ? {
          id: tpl.id,
          name: tpl.name,
          role: tpl.role,
          level: tpl.level,
        }
      : null,
    questions,
    proctorConfig,
  });
});

// ======================
// Proctor events / media uploads
// ======================

// Events (focus changes, fullscreen, YOLO warnings, etc.)
app.post('/api/interviews/:id/events', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, payload } = req.body || {};

  if (!type) return res.status(400).json({ error: 'type required' });

  await prisma.proctorEvent.create({
    data: {
      interviewId: id,
      type,
      payload: payload || {},
    },
  });

  res.json({ ok: true });
});

// Video upload (webcam recording chunks)
app.post(
  '/api/interviews/:id/video',
  upload.single('video'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'video required' });

    const relPath = path.relative(process.cwd(), req.file.path);

    const record = await prisma.mediaRecord.create({
      data: {
        interviewId: id,
        type: 'video',
        path: relPath,
        // yoloProcessed defaults to false -> pending for worker
      },
    });

    await prisma.proctorEvent.create({
      data: {
        interviewId: id,
        type: 'video_chunk_uploaded',
        payload: { mediaId: record.id, path: relPath },
      },
    });

    res.json({ ok: true, path: relPath, id: record.id });
  }
);

// Audio upload (answers)
app.post(
  '/api/interviews/:id/audio',
  upload.single('audio'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'audio required' });

    const relPath = path.relative(process.cwd(), req.file.path);

    const record = await prisma.mediaRecord.create({
      data: {
        interviewId: id,
        type: 'audio',
        path: relPath,
      },
    });

    await prisma.proctorEvent.create({
      data: {
        interviewId: id,
        type: 'audio_answer_uploaded',
        payload: { mediaId: record.id, path: relPath },
      },
    });

    res.json({ ok: true, path: relPath, id: record.id });
  }
);

// ======================
// Admin interview details (for review)
// ======================
app.get('/api/admin/interviews/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      template: true,
      proctorEvents: { orderBy: { createdAt: 'asc' } },
      mediaRecords: true,
    },
  });
  if (!interview) return res.status(404).json({ error: 'Not found' });
  res.json(interview);
});

// ======================
// Admin: templates (INTERVIEWER only)
// ======================

// Create a new interview template
app.post(
  '/api/admin/templates',
  authMiddleware,
  requireRole('INTERVIEWER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, role, level, description, config } = req.body;

      if (!name || !role || !level) {
        return res.status(400).json({ error: 'name, role, level required' });
      }

      const tpl = await prisma.interviewTemplate.create({
        data: {
          name,
          role,
          level,
          description: description || '',
          config: config || {},
        },
      });

      res.json(tpl);
    } catch (e) {
      console.error('Create template error', e);
      res.status(500).json({ error: 'internal_error' });
    }
  }
);

// Search candidates (by name, email, or candidateId)
app.get(
  '/api/admin/candidates',
  authMiddleware,
  requireRole('INTERVIEWER'),
  async (req: AuthRequest, res: Response) => {
    const q = String(req.query.query || '').trim();
    if (!q) return res.json([]);

    const candidates = await prisma.user.findMany({
      where: {
        role: 'CANDIDATE',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { candidateId: { contains: q } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      candidates.map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        candidateId: c.candidateId,
      }))
    );
  }
);

// List templates
app.get(
  '/api/admin/templates',
  authMiddleware,
  requireRole('INTERVIEWER'),
  async (req: AuthRequest, res: Response) => {
    const templates = await prisma.interviewTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  }
);

// Get a single template
app.get(
  '/api/admin/templates/:id',
  authMiddleware,
  requireRole('INTERVIEWER'),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tpl = await prisma.interviewTemplate.findUnique({
      where: { id },
    });
    if (!tpl) return res.status(404).json({ error: 'not_found' });
    res.json(tpl);
  }
);

// ======================
// Admin: interviews (INTERVIEWER only)
// ======================

// Schedule an interview
app.post(
  '/api/admin/interviews',
  authMiddleware,
  requireRole('INTERVIEWER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        candidateName,
        candidateEmail,
        candidateId, // registration / employee id
        templateId,
        scheduledAt,
      } = req.body;

      if (!candidateName || !candidateEmail || !templateId || !candidateId) {
        return res.status(400).json({
          error:
            'candidateName, candidateEmail, candidateId, templateId required',
        });
      }

      const dt = scheduledAt ? new Date(scheduledAt) : null;

      const interview = await prisma.interview.create({
        data: {
          candidateName,
          candidateEmail,
          candidateId,
          templateId,
          scheduledAt: dt,
          status: 'scheduled',
          interviewerId: req.user!.id,
        },
      });

      res.json(interview);
    } catch (e) {
      console.error('Schedule interview error', e);
      res.status(500).json({ error: 'internal_error' });
    }
  }
);

// List interviews (for admin dashboard)
app.get(
  '/api/admin/interviews',
  authMiddleware,
  requireRole('INTERVIEWER'),
  async (req: AuthRequest, res: Response) => {
    const interviews = await prisma.interview.findMany({
      orderBy: { createdAt: 'desc' },
      include: { template: true },
    });
    res.json(interviews);
  }
);

// Update interview (edit anything)
app.put(
  '/api/admin/interviews/:id',
  authMiddleware,
  requireRole('INTERVIEWER'),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const {
      candidateName,
      candidateEmail,
      candidateId,
      templateId,
      scheduledAt,
      status,
    } = req.body;

    try {
      const dt = scheduledAt ? new Date(scheduledAt) : null;

      const iv = await prisma.interview.update({
        where: { id },
        data: {
          candidateName,
          candidateEmail,
          candidateId,
          templateId,
          scheduledAt: dt,
          status,
        },
      });
      res.json(iv);
    } catch (e) {
      console.error('update interview error', e);
      res.status(500).json({ error: 'internal_error' });
    }
  }
);

// ======================
// Candidate: by candidateId (legacy / optional)
// ======================
app.get(
  '/api/candidates/:candidateId/interviews',
  async (req: Request, res: Response) => {
    const { candidateId } = req.params;

    const interviews = await prisma.interview.findMany({
      where: {
        candidateId,
        status: { not: 'cancelled' },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        template: true,
      },
    });

    res.json(
      interviews.map((iv: any) => ({
        id: iv.id,
        candidateName: iv.candidateName,
        candidateEmail: iv.candidateEmail,
        candidateId: iv.candidateId,
        status: iv.status,
        scheduledAt: iv.scheduledAt,
        template: iv.template
          ? {
              id: iv.template.id,
              name: iv.template.name,
              role: iv.template.role,
              level: iv.template.level,
            }
          : null,
      }))
    );
  }
);

// ======================
// YOLO worker endpoints
// ======================

// List unprocessed video media records
app.get('/api/worker/yolo/pending', async (req: Request, res: Response) => {
  const limit = Number(req.query.limit || 10);

  const videos = await prisma.mediaRecord.findMany({
    where: {
      type: 'video',
      yoloProcessed: false,
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  res.json(
    videos.map((v: MediaRecord) => ({
      id: v.id,
      interviewId: v.interviewId,
      path: v.path,
    }))
  );
});

// YOLO worker posts summary + events for a single mediaId
app.post(
  '/api/worker/yolo/result/:mediaId',
  async (req: Request, res: Response) => {
    const { mediaId } = req.params;
    const { summary, events } = req.body || {};

    const media = await prisma.mediaRecord.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      return res.status(404).json({ error: 'media_not_found' });
    }

    await prisma.mediaRecord.update({
      where: { id: mediaId },
      data: {
        yoloProcessed: true,
        yoloSummary: summary || {},
      },
    });

    if (Array.isArray(events)) {
      for (const ev of events) {
        await prisma.proctorEvent.create({
          data: {
            interviewId: media.interviewId,
            type: ev.type || 'yolo_event',
            payload: ev.payload || {},
          },
        });
      }
    }

    res.json({ ok: true });
  }
);

// Recent alerts for a candidate (YOLO / proctor warnings)
app.get('/api/interviews/:id/alerts', async (req: Request, res: Response) => {
  const { id } = req.params;

  const lookbackMs = 30_000; // last 30s
  const since = new Date(Date.now() - lookbackMs);

  const events = await prisma.proctorEvent.findMany({
    where: {
      interviewId: id,
      createdAt: { gte: since },
      type: {
        in: [
          'yolo_phone_detected',
          'yolo_multiple_people_detected',
          'yolo_forbidden_objects_detected',
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  if (!events.length) {
    return res.json({ hasWarning: false });
  }

  const ev = events[0];
  const payload: any = ev.payload || {};

  res.json({
    hasWarning: true,
    type: ev.type,
    message:
      payload.message ||
      'We detected a suspicious object or activity in your camera frame.',
    createdAt: ev.createdAt,
  });
});

// ======================
// Start server
// ======================
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
