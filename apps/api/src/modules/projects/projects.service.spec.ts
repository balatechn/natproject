import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { ProjectsService } from './projects.service';
import { PrismaService } from '../../common/prisma/prisma.service';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const makePrisma = () => ({
  project: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  milestone: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
});

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: ReturnType<typeof makePrisma>;

  const ORG = 'org-test-1';
  const USER = 'user-test-1';

  beforeEach(async () => {
    prisma = makePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated results with defaults', async () => {
      const projects = [{ id: 'p1', name: 'Alpha', organizationId: ORG }];
      prisma.$transaction.mockResolvedValue([projects, 1]);

      const result = await service.findAll(ORG, {});

      expect(result.data).toEqual(projects);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('returns empty results when no projects exist', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll(ORG, { search: 'nonexistent' });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('respects pagination parameters', async () => {
      prisma.$transaction.mockResolvedValue([[], 50]);

      const result = await service.findAll(ORG, { page: 3, pageSize: 10 });

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(5);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the project when found', async () => {
      const project = { id: 'p1', name: 'Alpha', organizationId: ORG };
      prisma.project.findFirst.mockResolvedValue(project);

      expect(await service.findById('p1', ORG)).toEqual(project);
    });

    it('throws NotFoundException when project does not exist', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.findById('nonexistent', ORG)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a project and returns it', async () => {
      const created = { id: 'p2', name: 'Beta', organizationId: ORG };
      prisma.project.create.mockResolvedValue(created);

      const result = await service.create(ORG, USER, {
        name: 'Beta',
        code: 'BETA-1',
      } as any);

      expect(result).toEqual(created);
      expect(prisma.project.create).toHaveBeenCalledTimes(1);
      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Beta', organizationId: ORG, createdById: USER }),
        }),
      );
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns the project', async () => {
      const existing = { id: 'p1', name: 'Alpha', organizationId: ORG };
      const updated = { ...existing, name: 'Alpha Updated' };
      prisma.project.findFirst.mockResolvedValue(existing);
      prisma.project.update.mockResolvedValue(updated);

      const result = await service.update('p1', ORG, { name: 'Alpha Updated' } as any);

      expect(result.name).toBe('Alpha Updated');
    });

    it('throws NotFoundException when updating non-existent project', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', ORG, { name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── delete ───────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the project', async () => {
      const existing = { id: 'p1', name: 'Alpha', organizationId: ORG };
      prisma.project.findFirst.mockResolvedValue(existing);
      prisma.project.delete.mockResolvedValue(existing);

      await expect(service.delete('p1', ORG)).resolves.not.toThrow();
      expect(prisma.project.delete).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when deleting non-existent project', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.delete('nonexistent', ORG)).rejects.toThrow(NotFoundException);
    });
  });
});
