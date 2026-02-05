import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import mongoose, { HydratedDocument, Model, PipelineStage } from 'mongoose';
import { Task } from './entities/task.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Project } from '../project/schema/project.schema';
import { ObjectIdLike } from 'src/type/common.type';
import { TaskFilters } from './interfaces/tasks.interface';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {}

  async create(userId: ObjectIdLike, createTaskDto: CreateTaskDto) {
    const project = await this.projectModel.findOne({
      _id: createTaskDto.projectId,
      'members.user': userId,
    });

    if (!project) {
      throw new UnauthorizedException('User is not a member of the project');
    }

    const newTask = await this.taskModel.create({
      ...createTaskDto,
      reporter: userId,
      key: `${project.prefix}-${project.lastKey + 1}`,
    });

    project.lastKey += 1;

    await project.save();

    return newTask;
  }

  async findAll(userId: ObjectIdLike, filter: TaskFilters = {}) {
    const pipeline: PipelineStage[] = [];

    if (filter.projectId) {
      pipeline.push({
        $match: {
          projectId: new mongoose.Types.ObjectId(filter.projectId),
        },
      });
    } else {
      const projectIds = await this.projectModel.find(
        { 'members.user': userId },
        { _id: 1 },
      );
      pipeline.push({
        $match: { projectId: { $in: projectIds.map((p) => p._id) } },
      });
    }

    if (filter.searchQuery) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: filter.searchQuery, $options: 'i' } },
            { description: { $regex: filter.searchQuery, $options: 'i' } },
            { key: { $regex: filter.searchQuery, $options: 'i' } },
          ],
        },
      });
    }

    if (filter.priority) {
      pipeline.push({
        $match: {
          priority: filter.priority,
        },
      });
    }

    if (filter.status) {
      pipeline.push({
        $match: {
          status: filter.status,
        },
      });
    }

    if (filter.tags && filter.tags.length > 0) {
      pipeline.push({
        $match: {
          tags: { $in: filter.tags },
        },
      });
    }

    if (filter.assignee) {
      pipeline.push({
        $match: {
          assignee: new mongoose.Types.ObjectId(filter.assignee),
        },
      });
    }

    if (filter.sortBy) {
      const sortOrder = filter.sortOrder === 'asc' ? 1 : -1;
      pipeline.push({
        $sort: {
          [filter.sortBy]: sortOrder,
        },
      });
    } else {
      pipeline.push({
        $sort: {
          createdAt: -1,
        },
      });
    }

    const result =
      await this.taskModel.aggregate<HydratedDocument<Task>>(pipeline);

    return result;
  }

  async findAllAssignedTasks(userId: ObjectIdLike) {
    const result = await this.taskModel
      .find({ assignee: userId })
      .populate('projectId', 'name');

    return result;
  }

  async findOne(userId: ObjectIdLike, id: string) {
    const task = await this.taskModel.findById(id);

    if (!task) {
      throw new Error('Task not found');
    }

    const project = await this.projectModel.findOne({
      _id: task.projectId,
      'members.user': userId,
    });

    if (!project) {
      throw new Error('Unauthorized');
    }

    return task;
  }

  async update(
    userId: ObjectIdLike,
    id: ObjectIdLike,
    updateTaskDto: UpdateTaskDto,
  ) {
    const task = await this.taskModel.findById(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkMembership(userId, task.projectId);

    const updatedTask = await this.taskModel.findByIdAndUpdate(
      id,
      updateTaskDto,
      {
        new: true,
      },
    );

    return updatedTask;
  }

  async delete(userId: ObjectIdLike, id: string) {
    const task = await this.taskModel.findById(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkMembership(userId, task.projectId);

    const deletedTask = await this.taskModel.findByIdAndDelete(id);

    return deletedTask;
  }

  async checkMembership(
    userId: string | mongoose.Types.ObjectId,
    projectId: string | mongoose.Types.ObjectId,
  ) {
    const project = await this.projectModel.findOne({
      _id: projectId,
      'members.user': userId,
    });

    if (!project) {
      throw new UnauthorizedException('User is not a member of this project');
    }
  }
}
