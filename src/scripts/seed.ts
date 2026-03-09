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
import { ActivityAction } from '../modules/activity/type/activity.types';
import { Notification } from '../modules/notification/schemas/notification.schema';
import { Subscription } from '../modules/notification/schemas/subscription.schema';
import { Workspace } from '../modules/workspace/entities/workspace.entity';

const PASSWORD = 'Password@123';
const LAST_7_DAYS = 7;
const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

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
    name: 'Devjyoti Banerjee',
    email: 'devjyoti.banerjee@itobuz.com',
    role: Role.SUPERADMIN,
  },
  { name: 'Sujal Gupta', email: 'sujal.gupta@itobuz.com', role: Role.USER },
  { name: 'Esha Tokedar', email: 'esha.tokedar@itobuz.com', role: Role.USER },
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

const seedWorkspaces = [
  { name: 'Client Delivery Workspace' },
  { name: 'Internal Product Workspace' },
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

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_IN_MS);
}

function buildMarkdownDescription(projectName: string, theme: string): string {
  return [
    `## ${theme} rollout`,
    '',
    `Improve **${theme}** for \`${projectName}\` with production-ready acceptance criteria.`,
    '',
    '### Acceptance Criteria',
    `- Support the primary ${theme} workflow end-to-end`,
    '- Handle validation and failure states gracefully',
    '- Add regression coverage for the most likely edge cases',
    '',
    '### QA Checklist',
    '- [ ] Verify happy path in staging',
    '- [ ] Confirm API responses match the contract',
    '- [ ] Capture screenshots or logs for review',
    '',
    '### Notes',
    '```ts',
    `// Follow project conventions when touching ${theme}`,
    "const featureFlag = 'seed-demo';",
    '```',
  ].join('\n');
}

function buildMarkdownComment(theme: string): string {
  return pick([
    [
      `**QA update for ${theme}**`,
      '',
      '- Verified the main flow in staging',
      '- Reproduced the previous edge case once',
      '- Added follow-up notes for the next pass',
    ].join('\n'),
    [
      `Blocked on \`${theme}\` contract clarification.`,
      '',
      '> Waiting on backend confirmation for one response shape before sign-off.',
    ].join('\n'),
    [
      'Pushed a follow-up fix for reviewer notes.',
      '',
      '```md',
      '- tighten validation',
      '- improve empty state copy',
      '- re-test assignment flow',
      '```',
    ].join('\n'),
    [
      'Looks good overall.',
      '',
      '- [x] QA verified in staging',
      '- [ ] Need product sign-off',
    ].join('\n'),
    [
      'Added regression coverage for the issue path.',
      '',
      `Reference: [${theme} checklist](#${theme.toLowerCase().replace(/\s+/g, '-')})`,
    ].join('\n'),
  ]);
}

function randomDateBetween(startDate: Date, endDate: Date): Date {
  const start = startDate.getTime();
  const end = endDate.getTime();

  if (end <= start) {
    return new Date(start);
  }

  return new Date(rand(start, end));
}

function randomDateInLastDays(days: number): Date {
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * DAY_IN_MS);

  return randomDateBetween(windowStart, now);
}

function nextTimelineDate(previousDate: Date, maxAdvanceMs = 36 * HOUR_IN_MS) {
  const now = new Date();
  const earliest = Math.min(
    previousDate.getTime() + MINUTE_IN_MS,
    now.getTime(),
  );
  const latest = Math.min(previousDate.getTime() + maxAdvanceMs, now.getTime());

  if (latest <= earliest) {
    return new Date(now);
  }

  return new Date(rand(earliest, latest));
}

async function setDocumentTimestamps<T>(
  model: Model<T>,
  id: unknown,
  createdAt: Date,
  updatedAt = createdAt,
) {
  await model.collection.updateOne(
    { _id: id } as Record<string, unknown>,
    {
      $set: {
        createdAt,
        updatedAt,
      },
    } as Record<string, unknown>,
  );
}

async function setLatestActivityTimestamp(
  activityModel: Model<Activity>,
  params: {
    taskId: unknown;
    action: ActivityAction;
    byUserId?: unknown;
    targetUserId?: unknown;
    createdAt: Date;
  },
) {
  const { taskId, action, byUserId, targetUserId, createdAt } = params;
  const filter: Record<string, unknown> = {
    task: taskId,
    action,
  };

  if (byUserId) {
    filter.byUser = byUserId;
  }

  if (targetUserId) {
    filter.targetUser = targetUserId;
  }

  const activity = await activityModel.findOne(filter).sort({ createdAt: -1 });

  if (!activity) {
    return;
  }

  await setDocumentTimestamps(activityModel, activity._id, createdAt);
}

async function createSeedActivity(
  activityModel: Model<Activity>,
  params: {
    taskId: unknown;
    action: ActivityAction;
    byUserId: unknown;
    targetUserId?: unknown;
    updatedFields?: Record<string, { from: string; to: string }>;
    createdAt: Date;
  },
) {
  const activity = new activityModel({
    task: params.taskId,
    action: params.action,
    byUser: params.byUserId,
    targetUser: params.targetUserId,
    updatedFields: params.updatedFields,
  } as Partial<Activity>);

  await activity.save();

  await setDocumentTimestamps(activityModel, activity._id, params.createdAt);
  return activity;
}

interface SeededTaskTimeline {
  task: Task;
  projectUsers: UserDocument[];
  taskCreatedAt: Date;
  latestTimelineAt: Date;
}

interface ProjectSeedSummary {
  name: string;
  type: ProjectType;
  workspace: string;
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
  const workspaceModel = app.get<Model<Workspace>>(
    getModelToken(Workspace.name),
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
      workspaceModel.deleteMany({}),
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
        `  workspaces: ${cleanupResults[8].deletedCount ?? 0}`,
        `  users: ${cleanupResults[9].deletedCount ?? 0}`,
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

    const createdWorkspaces = await workspaceModel.create(seedWorkspaces);
    console.log(`Workspaces seeded: ${createdWorkspaces.length}`);

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
          workspaceId:
            createdWorkspaces[
              projectSummaries.length % createdWorkspaces.length
            ]._id.toString(),
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
      const seededTasks: SeededTaskTimeline[] = [];

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
          description: buildMarkdownDescription(p.name, theme),
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
        const taskCreatedAt = randomDateInLastDays(LAST_7_DAYS);
        let latestTimelineAt = taskCreatedAt;

        if (Math.random() < 0.3) {
          task.attachments.push({
            url: pick(UNSPLASH_LINKS),
            key: crypto.randomUUID(),
            name: 'seed-image.jpg',
            mimeType: 'image/jpeg',
            size: 500000,
          });
        }

        await task.save();
        await setDocumentTimestamps(taskModel, task._id, taskCreatedAt);
        await setLatestActivityTimestamp(activityModel, {
          taskId: task._id,
          action: ActivityAction.TASK_CREATED,
          byUserId: reporter._id,
          createdAt: taskCreatedAt,
        });

        if (assignee) {
          latestTimelineAt = nextTimelineDate(taskCreatedAt, 6 * HOUR_IN_MS);
          await setLatestActivityTimestamp(activityModel, {
            taskId: task._id,
            action: ActivityAction.ASSIGNEE_CHANGED,
            byUserId: reporter._id,
            targetUserId: assignee._id,
            createdAt: latestTimelineAt,
          });
        }

        createdTaskIds.push(task._id.toString());

        const commentCount = rand(1, 3);
        for (let c = 0; c < commentCount; c++) {
          const author = pick(projectUsers);
          const createCommentDto: CreateCommentDto = {
            message: buildMarkdownComment(theme),
          };

          const comment = await commentService.create(
            author._id,
            author.role,
            task._id.toString(),
            createCommentDto,
          );

          comment.attachment =
            Math.random() < 0.2 ? pick(UNSPLASH_LINKS) : null;

          await comment.save();

          const commentCreatedAt = nextTimelineDate(latestTimelineAt);
          latestTimelineAt = commentCreatedAt;

          await setDocumentTimestamps(
            commentModel,
            comment._id,
            commentCreatedAt,
          );
          await setLatestActivityTimestamp(activityModel, {
            taskId: task._id,
            action: ActivityAction.COMMENT_ADDED,
            byUserId: author._id,
            createdAt: commentCreatedAt,
          });

          projectCommentCount += 1;
          totalComments += 1;
        }

        seededTasks.push({
          task,
          projectUsers,
          taskCreatedAt,
          latestTimelineAt,
        });
      }

      const extraActivityTargets = sample(
        seededTasks,
        Math.min(rand(5, 6), seededTasks.length),
      );

      for (const seededTask of extraActivityTargets) {
        const availableActions = ['description', 'priority', 'title'];
        const finalColumn = p.columns[p.columns.length - 1];

        if (seededTask.task.status !== finalColumn) {
          availableActions.push('status');
        }

        const actionSequence = sample(
          availableActions,
          rand(2, Math.min(3, availableActions.length)),
        );

        for (const extraAction of actionSequence) {
          const actor = pick(seededTask.projectUsers);

          if (extraAction === 'status') {
            const previousStatus = seededTask.task.status;

            seededTask.latestTimelineAt = nextTimelineDate(
              seededTask.latestTimelineAt,
            );

            seededTask.task.status = finalColumn;
            await seededTask.task.save();
            await setDocumentTimestamps(
              taskModel,
              seededTask.task._id,
              seededTask.taskCreatedAt,
              seededTask.latestTimelineAt,
            );

            await createSeedActivity(activityModel, {
              taskId: seededTask.task._id,
              action: ActivityAction.STATUS_CHANGED,
              byUserId: actor._id,
              updatedFields: {
                status: { from: previousStatus, to: finalColumn },
              },
              createdAt: seededTask.latestTimelineAt,
            });

            continue;
          }

          if (extraAction === 'description') {
            const previousDescription = seededTask.task.description ?? '';
            const nextDescription = [
              previousDescription,
              '',
              '### Update',
              pick([
                '- Clarified rollout notes for QA handoff.',
                '- Added edge-case handling for the release candidate.',
                '- Updated implementation notes after stakeholder review.',
              ]),
              pick([
                '> Reviewer note: double-check markdown rendering in the task drawer.',
                '> Keep the final copy concise for stakeholder demos.',
                '> Add one more verification pass before release.',
              ]),
            ]
              .join('\n')
              .trim();

            seededTask.latestTimelineAt = nextTimelineDate(
              seededTask.latestTimelineAt,
            );
            seededTask.task.description = nextDescription;
            await seededTask.task.save();
            await setDocumentTimestamps(
              taskModel,
              seededTask.task._id,
              seededTask.taskCreatedAt,
              seededTask.latestTimelineAt,
            );

            await createSeedActivity(activityModel, {
              taskId: seededTask.task._id,
              action: ActivityAction.TASK_UPDATED,
              byUserId: actor._id,
              updatedFields: {
                description: {
                  from: previousDescription,
                  to: nextDescription,
                },
              },
              createdAt: seededTask.latestTimelineAt,
            });

            continue;
          }

          if (extraAction === 'priority') {
            const priorityOptions = TASK_PRIORITIES.filter(
              (priority) => priority !== seededTask.task.priority,
            );
            const nextPriority = pick(priorityOptions);
            const previousPriority = seededTask.task.priority;

            seededTask.latestTimelineAt = nextTimelineDate(
              seededTask.latestTimelineAt,
            );
            seededTask.task.priority = nextPriority;
            await seededTask.task.save();
            await setDocumentTimestamps(
              taskModel,
              seededTask.task._id,
              seededTask.taskCreatedAt,
              seededTask.latestTimelineAt,
            );

            await createSeedActivity(activityModel, {
              taskId: seededTask.task._id,
              action: ActivityAction.TASK_UPDATED,
              byUserId: actor._id,
              updatedFields: {
                priority: {
                  from: previousPriority,
                  to: nextPriority,
                },
              },
              createdAt: seededTask.latestTimelineAt,
            });

            continue;
          }

          const previousTitle = seededTask.task.title;
          const nextTitle = `${previousTitle} (${pick([
            'handoff',
            'release-ready',
            'final pass',
          ])})`;

          seededTask.latestTimelineAt = nextTimelineDate(
            seededTask.latestTimelineAt,
          );
          seededTask.task.title = nextTitle;
          await seededTask.task.save();
          await setDocumentTimestamps(
            taskModel,
            seededTask.task._id,
            seededTask.taskCreatedAt,
            seededTask.latestTimelineAt,
          );

          await createSeedActivity(activityModel, {
            taskId: seededTask.task._id,
            action: ActivityAction.TASK_UPDATED,
            byUserId: actor._id,
            updatedFields: {
              title: {
                from: previousTitle,
                to: nextTitle,
              },
            },
            createdAt: seededTask.latestTimelineAt,
          });
        }
      }

      const subtaskParents = sample(
        seededTasks,
        Math.min(rand(2, 3), Math.max(seededTasks.length - 1, 0)),
      );
      const reservedSubtaskIds = new Set<string>();

      for (const parentSeed of subtaskParents) {
        const parentId = parentSeed.task._id.toString();

        if (reservedSubtaskIds.has(parentId)) {
          continue;
        }

        const childCandidates = seededTasks.filter((candidate) => {
          const candidateId = candidate.task._id.toString();

          return (
            candidateId !== parentId &&
            !reservedSubtaskIds.has(candidateId) &&
            !candidate.task.parentTask
          );
        });

        const selectedChildren = sample(
          childCandidates,
          Math.min(rand(1, 2), childCandidates.length),
        );

        if (!selectedChildren.length) {
          continue;
        }

        parentSeed.task.subTasks = selectedChildren.map(
          (child) => child.task._id,
        );
        parentSeed.latestTimelineAt = nextTimelineDate(
          parentSeed.latestTimelineAt,
          12 * HOUR_IN_MS,
        );
        await parentSeed.task.save();
        await setDocumentTimestamps(
          taskModel,
          parentSeed.task._id,
          parentSeed.taskCreatedAt,
          parentSeed.latestTimelineAt,
        );

        for (const childSeed of selectedChildren) {
          reservedSubtaskIds.add(childSeed.task._id.toString());
          childSeed.task.parentTask = parentSeed.task._id;
          childSeed.latestTimelineAt = nextTimelineDate(
            childSeed.latestTimelineAt,
            12 * HOUR_IN_MS,
          );
          await childSeed.task.save();
          await setDocumentTimestamps(
            taskModel,
            childSeed.task._id,
            childSeed.taskCreatedAt,
            childSeed.latestTimelineAt,
          );
        }
      }

      const linkedTaskPairCount = Math.min(rand(3, 4), seededTasks.length - 1);
      const linkedPairKeys = new Set<string>();
      let linkedPairsCreated = 0;
      let linkAttempts = 0;

      while (linkedPairsCreated < linkedTaskPairCount && linkAttempts < 25) {
        linkAttempts += 1;

        const leftSeed = pick(seededTasks);
        const rightCandidates = seededTasks.filter(
          (candidate) =>
            candidate.task._id.toString() !== leftSeed.task._id.toString() &&
            candidate.task.parentTask?.toString() !==
              leftSeed.task._id.toString() &&
            leftSeed.task.parentTask?.toString() !==
              candidate.task._id.toString(),
        );

        if (!rightCandidates.length) {
          continue;
        }

        const rightSeed = pick(rightCandidates);
        const pairKey = [
          leftSeed.task._id.toString(),
          rightSeed.task._id.toString(),
        ]
          .sort()
          .join(':');

        if (linkedPairKeys.has(pairKey)) {
          continue;
        }

        linkedPairKeys.add(pairKey);
        linkedPairsCreated += 1;

        leftSeed.task.relatesTo = [...(leftSeed.task.relatesTo ?? [])];
        rightSeed.task.relatesTo = [...(rightSeed.task.relatesTo ?? [])];

        if (
          !leftSeed.task.relatesTo.some(
            (relatedTaskId) =>
              relatedTaskId.toString() === rightSeed.task._id.toString(),
          )
        ) {
          leftSeed.task.relatesTo.push(rightSeed.task._id);
        }

        if (
          !rightSeed.task.relatesTo.some(
            (relatedTaskId) =>
              relatedTaskId.toString() === leftSeed.task._id.toString(),
          )
        ) {
          rightSeed.task.relatesTo.push(leftSeed.task._id);
        }

        leftSeed.latestTimelineAt = nextTimelineDate(
          leftSeed.latestTimelineAt,
          12 * HOUR_IN_MS,
        );
        rightSeed.latestTimelineAt = nextTimelineDate(
          rightSeed.latestTimelineAt,
          12 * HOUR_IN_MS,
        );

        await leftSeed.task.save();
        await rightSeed.task.save();

        await setDocumentTimestamps(
          taskModel,
          leftSeed.task._id,
          leftSeed.taskCreatedAt,
          leftSeed.latestTimelineAt,
        );
        await setDocumentTimestamps(
          taskModel,
          rightSeed.task._id,
          rightSeed.taskCreatedAt,
          rightSeed.latestTimelineAt,
        );
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

        const completedSprintCount = rand(1, 2);

        for (
          let completedSprintIndex = 0;
          completedSprintIndex < completedSprintCount;
          completedSprintIndex++
        ) {
          const completedSprintTasks = sample(
            seededTasks,
            Math.min(rand(3, 5), seededTasks.length),
          );

          if (!completedSprintTasks.length) {
            continue;
          }

          const completionAnchor = completedSprintTasks.reduce(
            (latest, seededTask) =>
              seededTask.latestTimelineAt > latest
                ? seededTask.latestTimelineAt
                : latest,
            daysAgo(LAST_7_DAYS),
          );
          const sprintEndDate = randomDateBetween(completionAnchor, new Date());
          const sprintDueDate = new Date(
            sprintEndDate.getTime() - rand(2, 5) * DAY_IN_MS,
          );
          const sprintCreatedAt = new Date(
            sprintDueDate.getTime() - rand(4, 8) * DAY_IN_MS,
          );
          const sprintNumber = project.sprintCount + 1;
          const sprintTasks = completedSprintTasks.map(
            (seededTask) => seededTask.task._id,
          );
          const sprintStoryPoint = completedSprintTasks.reduce(
            (sum, seededTask) => sum + seededTask.task.storyPoint,
            0,
          );

          const completedSprint = await sprintModel.create({
            key: `${project.prefix}-sprint-${sprintNumber}`,
            projectId: project._id,
            tasks: sprintTasks,
            dueDate: sprintDueDate,
            isCompleted: true,
            storyPoint: sprintStoryPoint,
            endDate: sprintEndDate,
            taskStatusesAtCompletion: new Map(
              completedSprintTasks.map((seededTask) => [
                seededTask.task._id.toString(),
                seededTask.task.status,
              ]),
            ),
          });

          await sprintModel.collection.updateOne({ _id: completedSprint._id }, {
            $set: {
              name: `${project.name} Completed Sprint ${completedSprintIndex + 1}`,
              createdAt: sprintCreatedAt,
              updatedAt: sprintEndDate,
            },
          } as Record<string, unknown>);

          project.sprintCount += 1;
          projectSprintCount += 1;
          totalSprints += 1;
        }

        project.currentSprint = sprint2._id;
        await project.save();
      }

      projectSummaries.push({
        name: p.name,
        type: p.projectType,
        workspace:
          createdWorkspaces[projectSummaries.length % createdWorkspaces.length]
            .name,
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
        `  workspaces: ${createdWorkspaces.length}`,
        `  projects: ${projectSummaries.length}`,
        `  tasks: ${totalTasks}`,
        `  comments: ${totalComments}`,
        `  sprints: ${totalSprints}`,
      ].join('\n'),
    );
    console.log('Project breakdown');
    for (const summary of projectSummaries) {
      console.log(
        `  ${summary.name} | workspace=${summary.workspace} | type=${summary.type} | members=${summary.memberCount} | tasks=${summary.taskCount} | comments=${summary.commentCount} | sprints=${summary.sprintCount}`,
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
