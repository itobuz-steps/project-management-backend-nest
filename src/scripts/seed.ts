import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/auth.service';
import { Role } from '../modules/auth/types/auth.types';
import { User, UserDocument } from '../modules/auth/schemas/user.schema';
import { Otp } from '../modules/auth/schemas/otp.schema';

import { Project } from '../modules/project/schema/project.schema';
import {
  ProjectRole,
  ProjectType,
} from '../modules/project/type/project.types';
import { ProjectService } from '../modules/project/services/project.service';

import { Task } from '../modules/tasks/entities/task.entity';
import { TasksService } from '../modules/tasks/tasks.service';
import { CreateTaskDto } from '../modules/tasks/dto/create-task.dto';
import { TASK_PRIORITIES, TASK_TYPES } from '../constants/task.constants';

import { Sprint } from '../modules/sprint/schema/sprint.schema';
import { SprintService } from '../modules/sprint/sprint.service';

import { Comment } from '../modules/comment/entities/comment.entity';
import { CommentService } from '../modules/comment/comment.service';
import { CreateCommentDto } from '../modules/comment/dto/create-comment.dto';

import { Activity } from '../modules/activity/schemas/activity.schemas';
import { Notification } from '../modules/notification/schemas/notification.schema';
import { Subscription } from '../modules/notification/schemas/subscription.schema';

const PASSWORD = 'Password@123';

const UNSPLASH_LINKS = [
  'https://images.unsplash.com/photo-1518773553398-650c184e0bb3',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4',
  'https://images.unsplash.com/photo-1537432376769-00aabc2805d2',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d',
];

const seedUsers = [
  {
    name: 'Ava Thompson',
    email: 'ava.superadmin@pm.local',
    role: Role.SUPERADMIN,
  },
  { name: 'Liam Carter', email: 'liam@pm.local', role: Role.USER },
  { name: 'Noah Patel', email: 'noah@pm.local', role: Role.USER },
  { name: 'Emma Walker', email: 'emma@pm.local', role: Role.USER },
  { name: 'Olivia Kim', email: 'olivia@pm.local', role: Role.USER },
  { name: 'Ethan Rossi', email: 'ethan@pm.local', role: Role.USER },
];

const seedProjects = [
  {
    name: 'Atlas Mobile Banking',
    projectType: ProjectType.SCRUM,
    memberCount: 3,
    columns: ['backlog', 'todo', 'in-progress', 'review', 'done'],
    themes: [
      'KYC onboarding',
      '2FA login',
      'transaction history',
      'beneficiary management',
      'card controls',
    ],
  },
  {
    name: 'Nimbus HR Platform',
    projectType: ProjectType.SCRUM,
    memberCount: 3,
    columns: ['backlog', 'todo', 'in-progress', 'qa', 'done'],
    themes: [
      'leave management',
      'attendance sync',
      'payroll export',
      'org chart',
      'employee profile',
    ],
  },
  {
    name: 'Mercury Commerce Suite',
    projectType: ProjectType.SCRUM,
    memberCount: 5,
    columns: ['backlog', 'todo', 'in-progress', 'review', 'done'],
    themes: [
      'checkout flow',
      'coupon rules',
      'order tracking',
      'inventory sync',
      'returns workflow',
    ],
  },
  {
    name: 'Pulse Marketing Ops',
    projectType: ProjectType.KANBAN,
    memberCount: 2,
    columns: ['todo', 'in-progress', 'review', 'done'],
    themes: [
      'campaign planner',
      'asset approvals',
      'lead routing',
      'email automation',
      'analytics dashboard',
    ],
  },
  {
    name: 'Vertex Design System',
    projectType: ProjectType.KANBAN,
    memberCount: 2,
    columns: ['todo', 'in-progress', 'review', 'done'],
    themes: [
      'component library',
      'token migration',
      'docs portal',
      'storybook upgrade',
      'a11y audit',
    ],
  },
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}
function sample<T>(arr: T[], count: number): T[] {
  const clone = [...arr];
  const out: T[] = [];
  while (clone.length && out.length < count) {
    out.push(clone.splice(rand(0, clone.length - 1), 1)[0]);
  }
  return out;
}
function dueDate(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

interface ProjectSeedSummary {
  name: string;
  type: ProjectType;
  memberCount: number;
  taskCount: number;
  commentCount: number;
  sprintCount: number;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);
  const projectService = app.get(ProjectService);
  const tasksService = app.get(TasksService);
  const sprintService = app.get(SprintService);
  const commentService = app.get(CommentService);

  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const otpModel = app.get<Model<Otp>>(getModelToken(Otp.name));
  const projectModel = app.get<Model<Project>>(getModelToken(Project.name));
  const taskModel = app.get<Model<Task>>(getModelToken(Task.name));
  const sprintModel = app.get<Model<Sprint>>(getModelToken(Sprint.name));
  const commentModel = app.get<Model<Comment>>(getModelToken(Comment.name));
  const activityModel = app.get<Model<Activity>>(getModelToken(Activity.name));
  const notificationModel = app.get<Model<Notification>>(
    getModelToken(Notification.name),
  );
  const subscriptionModel = app.get<Model<Subscription>>(
    getModelToken(Subscription.name),
  );

  try {
    console.log('Seed started');

    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    const projectSummaries: ProjectSeedSummary[] = [];
    let totalTasks = 0;
    let totalComments = 0;
    let totalSprints = 0;

    // reset data (safe for local/dev)
    const cleanupResults = await Promise.all([
      commentModel.deleteMany({}),
      activityModel.deleteMany({}),
      taskModel.deleteMany({}),
      sprintModel.deleteMany({}),
      notificationModel.deleteMany({}),
      subscriptionModel.deleteMany({}),
      otpModel.deleteMany({}),
      projectModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);

    console.log('Cleanup completed');
    console.log(
      [
        `  comments: ${cleanupResults[0].deletedCount ?? 0}`,
        `  activities: ${cleanupResults[1].deletedCount ?? 0}`,
        `  tasks: ${cleanupResults[2].deletedCount ?? 0}`,
        `  sprints: ${cleanupResults[3].deletedCount ?? 0}`,
        `  notifications: ${cleanupResults[4].deletedCount ?? 0}`,
        `  subscriptions: ${cleanupResults[5].deletedCount ?? 0}`,
        `  otps: ${cleanupResults[6].deletedCount ?? 0}`,
        `  projects: ${cleanupResults[7].deletedCount ?? 0}`,
        `  users: ${cleanupResults[8].deletedCount ?? 0}`,
      ].join('\n'),
    );

    // users
    const createdUsers: UserDocument[] = [];
    for (const u of seedUsers) {
      const created = await authService.createUser(
        u.name,
        u.email,
        hashedPassword,
      );
      created.role = u.role;
      created.verified = true;
      await created.save();
      createdUsers.push(created);
    }

    console.log(`Users seeded: ${createdUsers.length}`);

    const superadmin = createdUsers.find((u) => u.role === Role.SUPERADMIN);
    const normalUsers = createdUsers.filter((u) => u.role === Role.USER);

    if (!superadmin) throw new Error('Superadmin not created');

    // projects + tasks + comments + sprints
    for (const p of seedProjects) {
      let projectCommentCount = 0;
      let projectSprintCount = 0;

      const project = await projectService.createProject(
        superadmin._id,
        Role.SUPERADMIN,
        {
          name: p.name,
          projectType: p.projectType,
          columns: p.columns,
        },
      );

      // member distribution (includes superadmin admin)
      const selectedMembers = sample(
        normalUsers,
        Math.max(0, p.memberCount - 1),
      );
      project.members = [
        { user: superadmin._id, role: ProjectRole.ADMIN },
        ...selectedMembers.map((m) => ({
          user: m._id,
          role: ProjectRole.MEMBER,
        })),
      ];
      await project.save();

      const projectUsers = [superadmin, ...selectedMembers];
      const taskCount = rand(10, 15);
      const createdTaskIds: string[] = [];

      for (let i = 0; i < taskCount; i++) {
        const theme = pick(p.themes);
        const reporter = pick(projectUsers);
        const assignee = Math.random() < 0.85 ? pick(projectUsers) : undefined;

        const createTaskDto: CreateTaskDto = {
          projectId: project._id.toString(),
          title: `${theme} - ${pick([
            'implementation',
            'bugfix',
            'refactor',
            'API integration',
            'UI polish',
            'validation',
          ])}`,
          description: `Work item for ${p.name}: improve ${theme} with production-ready acceptance criteria and tests.`,
          type: pick(TASK_TYPES),
          status: pick(p.columns),
          priority: pick(TASK_PRIORITIES),
          tags: sample(
            [
              'backend',
              'frontend',
              'api',
              'qa',
              'ux',
              'security',
              'performance',
            ],
            rand(1, 3),
          ),
          dueDate: dueDate(rand(-4, 21)),
          assignee: assignee?._id.toString(),
          storyPoint: pick([1, 2, 3, 5, 8]),
        };

        const task = await tasksService.create(
          reporter._id,
          reporter.role,
          createTaskDto,
        );

        if (Math.random() < 0.3) {
          task.attachments.push(pick(UNSPLASH_LINKS));
        }

        await task.save();

        createdTaskIds.push(task._id.toString());

        const commentCount = rand(1, 3);
        for (let c = 0; c < commentCount; c++) {
          const author = pick(projectUsers);
          const createCommentDto: CreateCommentDto = {
            message: pick([
              'I validated the acceptance criteria and updated edge cases.',
              'Blocked on API contract clarification. Syncing with backend.',
              'Pushed a follow-up fix for reviewer notes.',
              'Looks good; pending QA verification in staging.',
              'Added test coverage for the regression path.',
            ]),
            attachment: Math.random() < 0.3 ? pick(UNSPLASH_LINKS) : undefined,
          };

          await commentService.create(
            author._id,
            author.role,
            task._id.toString(),
            createCommentDto,
          );

          projectCommentCount += 1;
          totalComments += 1;
        }
      }

      totalTasks += taskCount;

      if (p.projectType === ProjectType.SCRUM) {
        const sprint1 = await sprintService.createSprint(
          { dueDate: dueDate(14), storyPoint: rand(20, 35) },
          {
            userId: superadmin._id,
            projectId: project._id.toString(),
            role: Role.SUPERADMIN,
          },
        );

        const sprint2 = await sprintService.createSprint(
          { dueDate: dueDate(28), storyPoint: rand(25, 40) },
          {
            userId: superadmin._id,
            projectId: project._id.toString(),
            role: Role.SUPERADMIN,
          },
        );

        await sprintModel.collection.updateOne({ _id: sprint1._id }, {
          $set: {
            name: `${project.name} Sprint 1`,
          },
        } as Record<string, unknown>);

        await sprintModel.collection.updateOne({ _id: sprint2._id }, {
          $set: {
            name: `${project.name} Sprint 2`,
          },
        } as Record<string, unknown>);

        projectSprintCount += 2;
        totalSprints += 2;

        const sprint1Tasks = sample(
          createdTaskIds,
          Math.min(rand(4, 7), createdTaskIds.length),
        );
        const remaining = createdTaskIds.filter(
          (id) => !sprint1Tasks.includes(id),
        );
        const sprint2Tasks = sample(
          remaining,
          Math.min(rand(4, 7), remaining.length),
        );

        if (sprint1Tasks.length) {
          await sprintService.addTasksIntoSprint(sprint1Tasks, {
            userId: superadmin._id,
            projectId: project._id.toString(),
            sprintId: sprint1._id,
            role: Role.SUPERADMIN,
          });
        }

        if (sprint2Tasks.length) {
          await sprintService.addTasksIntoSprint(sprint2Tasks, {
            userId: superadmin._id,
            projectId: project._id.toString(),
            sprintId: sprint2._id,
            role: Role.SUPERADMIN,
          });
        }

        project.currentSprint = sprint2._id;
        await project.save();
      }

      projectSummaries.push({
        name: p.name,
        type: p.projectType,
        memberCount: project.members.length,
        taskCount,
        commentCount: projectCommentCount,
        sprintCount: projectSprintCount,
      });

      console.log(
        `Project seeded: ${p.name} | type=${p.projectType} | members=${project.members.length} | tasks=${taskCount} | comments=${projectCommentCount} | sprints=${projectSprintCount}`,
      );
    }

    console.log('Seed completed successfully');
    console.log('Summary');
    console.log(
      [
        `  users: ${createdUsers.length}`,
        `  projects: ${projectSummaries.length}`,
        `  tasks: ${totalTasks}`,
        `  comments: ${totalComments}`,
        `  sprints: ${totalSprints}`,
      ].join('\n'),
    );
    console.log('Project breakdown');
    for (const summary of projectSummaries) {
      console.log(
        `  ${summary.name} | type=${summary.type} | members=${summary.memberCount} | tasks=${summary.taskCount} | comments=${summary.commentCount} | sprints=${summary.sprintCount}`,
      );
    }
    console.log(`Users password for all seeded accounts: ${PASSWORD}`);
  } catch (e) {
    console.error('Seed failed:', e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
