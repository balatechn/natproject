import { Test, TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  const mockPrisma = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  it('returns status "ok" when DB responds', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe(true);
    expect(result.ts).toBeDefined();
  });

  it('returns status "degraded" when DB is unreachable', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.db).toBe(false);
  });

  it('returns a valid ISO timestamp', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const result = await controller.check();
    const parsed = Date.parse(result.ts);

    expect(Number.isNaN(parsed)).toBe(false);
  });
});
