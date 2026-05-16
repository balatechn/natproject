import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { TasksService } from './tasks.service';
import { PrismaService } from '../../common/prisma/prisma.service';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const makePrisma = () => ({
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  taskComment: {
    create: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
});

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('TasksService', () => {
  let service: TasksService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated tasks with defaults', async () => {
      const tasks = [
        { id: 't1', title: 'Fix bug', status: 'TODO', priority: 'HIGH' },
        { id: 't2', title: 'Write tests', status: 'IN_PROGRESS', priority: 'MEDIUM' },
      ];
      prisma.$transaction.mockResolvedValue([tasks, 2]);

      const result = await service.findAll('org-1', {});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('returns empty when no tasks match filter', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll('org-1', { status: 'DONE', projectId: 'p-none' });

      expect(result.data).toHaveLength(0);
      expect(result.totalPages).toBe(0);
    });

    it('applies pagination correctly', async () => {
      prisma.$transaction.mockResolvedValue([[], 100]);

      const result = await service.findAll('org-1', { page: 2, pageSize: 25 });

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(4);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the task when found', async () => {
      const task = { id: 't1', title: 'Fix bug', status: 'TODO' };
      prisma.task.findUnique.mockResolvedValue(task);

      expect(await service.findById('t1')).toEqual(task);
    });

    it('throws NotFoundException when task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a task without assignees', async () => {
      const created = { id: 't3', title: 'New Task', status: 'TODO', priority: 'LOW' };
      prisma.task.create.mockResolvedValue(created);

      const result = await service.create({
        title: 'New Task',
        projectId: 'p1',
        status: 'TODO',
        priority: 'LOW',
      } as any);

      expect(result).toEqual(created);
      expect(prisma.task.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates task status', async () => {
      const task = { id: 't1', title: 'Fix bug', status: 'TODO' };
      const updated = { ...task, status: 'DONE' };
      prisma.task.findUnique.mockResolvedValue(task);
      prisma.task.update.mockResolvedValue(updated);

      const result = await service.update('t1', { status: 'DONE' } as any);

      expect(result.status).toBe('DONE');
    });

    it('throws NotFoundException when task not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { status: 'DONE' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
