import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'nat-demo' },
    update: {},
    create: {
      name: 'NAT Demo Organization',
      slug: 'nat-demo',
      plan: 'enterprise',
    },
  });
  console.log(`✅ Organization: ${org.name}`);

  // Location
  const location = await prisma.location.upsert({
    where: { id: 'loc-hq' },
    update: {},
    create: { id: 'loc-hq', organizationId: org.id, name: 'HQ', city: 'São Paulo', country: 'Brazil' },
  });

  // Department
  const dept = await prisma.department.upsert({
    where: { id: 'dept-it' },
    update: {},
    create: { id: 'dept-it', organizationId: org.id, name: 'Technology', code: 'IT' },
  });

  // Roles
  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'admin' } },
    update: {},
    create: { organizationId: org.id, name: 'admin', description: 'Full access' },
  });
  const managerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'manager' } },
    update: {},
    create: { organizationId: org.id, name: 'manager', description: 'Project and team management' },
  });
  const memberRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'member' } },
    update: {},
    create: { organizationId: org.id, name: 'member', description: 'Standard member access' },
  });
  console.log(`✅ Roles: admin, manager, member`);

  // Admin user
  const adminHash = await argon2.hash('Admin@123');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@natproject.app' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@natproject.app',
      name: 'System Admin',
      passwordHash: adminHash,
      jobTitle: 'System Administrator',
      departmentId: dept.id,
      locationId: location.id,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // Demo manager
  const managerHash = await argon2.hash('Manager@123');
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@natproject.app' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'manager@natproject.app',
      name: 'Project Manager',
      passwordHash: managerHash,
      jobTitle: 'Project Manager',
      departmentId: dept.id,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: managerUser.id, roleId: managerRole.id } },
    update: {},
    create: { userId: managerUser.id, roleId: managerRole.id },
  });

  // Demo member
  const memberHash = await argon2.hash('Member@123');
  const memberUser = await prisma.user.upsert({
    where: { email: 'member@natproject.app' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'member@natproject.app',
      name: 'Team Member',
      passwordHash: memberHash,
      jobTitle: 'Developer',
      departmentId: dept.id,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: memberUser.id, roleId: memberRole.id } },
    update: {},
    create: { userId: memberUser.id, roleId: memberRole.id },
  });
  console.log(`✅ Users: admin@natproject.app, manager@natproject.app, member@natproject.app`);

  // Team
  const team = await prisma.team.upsert({
    where: { id: 'team-alpha' },
    update: {},
    create: {
      id: 'team-alpha',
      organizationId: org.id,
      name: 'Team Alpha',
      color: '#16a34a',
      leadId: managerUser.id,
    },
  });
  for (const userId of [managerUser.id, memberUser.id]) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId } },
      update: {},
      create: { teamId: team.id, userId },
    });
  }

  // Sample project
  const project = await prisma.project.upsert({
    where: { id: 'proj-demo-001' },
    update: {},
    create: {
      id: 'proj-demo-001',
      organizationId: org.id,
      code: 'DEMO-001',
      name: 'Digital Transformation 2025',
      description: 'Sample project to demonstrate NAT Project capabilities',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      color: '#3b82f6',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      budget: 500000,
      teamId: team.id,
      createdById: adminUser.id,
    },
  });
  console.log(`✅ Project: ${project.name}`);

  // Milestone
  const milestone = await prisma.milestone.upsert({
    where: { id: 'ms-q1' },
    update: {},
    create: {
      id: 'ms-q1',
      projectId: project.id,
      name: 'Q1 Deliverables',
      dueDate: new Date('2025-03-31'),
    },
  });

  // Tasks
  const taskData = [
    { id: 'task-001', title: 'Requirements Analysis', status: 'DONE', priority: 'HIGH' },
    { id: 'task-002', title: 'System Architecture Design', status: 'IN_PROGRESS', priority: 'HIGH' },
    { id: 'task-003', title: 'Backend API Development', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { id: 'task-004', title: 'Frontend UI Development', status: 'TODO', priority: 'MEDIUM' },
    { id: 'task-005', title: 'Integration Testing', status: 'BACKLOG', priority: 'LOW' },
  ];
  for (const t of taskData) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: {
        ...t,
        projectId: project.id,
        milestoneId: milestone.id,
        estimatedHours: 40,
        assignments: { create: [{ userId: memberUser.id }] },
      },
    });
  }
  console.log(`✅ Tasks: ${taskData.length} demo tasks`);

  // CRM pipeline stages
  const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  for (let i = 0; i < stages.length; i++) {
    await prisma.pipelineStage.upsert({
      where: { organizationId_name: { organizationId: org.id, name: stages[i] } },
      update: {},
      create: { organizationId: org.id, name: stages[i], position: i, color: '#6366f1' },
    });
  }
  console.log(`✅ CRM pipeline stages: ${stages.join(', ')}`);

  // Org settings
  for (const [key, value] of [
    ['timezone', 'America/Sao_Paulo'],
    ['dateFormat', 'DD/MM/YYYY'],
    ['currency', 'BRL'],
    ['workingHoursPerDay', '8'],
  ]) {
    await prisma.setting.upsert({
      where: { organizationId_key: { organizationId: org.id, key } },
      update: {},
      create: { organizationId: org.id, key, value },
    });
  }

  console.log('\n🎉 Seed complete!');
  console.log('📧 Credentials:');
  console.log('   admin@natproject.app   / Admin@123   (admin)');
  console.log('   manager@natproject.app / Manager@123 (manager)');
  console.log('   member@natproject.app  / Member@123  (member)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
