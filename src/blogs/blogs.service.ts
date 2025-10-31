import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { ScheduleBlogDto } from './dto/schedule-blog.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from 'async-mutex';
const publishingMutex = new Mutex();

@Injectable()
export class BlogsService {
  private readonly logger = new Logger(BlogsService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.blog.findMany({
      where: {
        isDeleted: false,
        blogAuthor: { userId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const blog = await this.prisma.blog.findFirst({
      where: { id, isDeleted: false, blogAuthor: { userId } },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  async create(userId: string, dto: CreateBlogDto) {
    const [editor, blogAuthor] = await Promise.all([
      this.prisma.editor.findFirst({
        where: { id: dto.editorId, userId, isDeleted: false },
      }),
      this.prisma.blogAuthor.findFirst({
        where: { id: dto.blogAuthorId, userId, isDeleted: false },
      }),
    ]);
    if (!editor) throw new NotFoundException('Editor not found');
    if (!blogAuthor) throw new NotFoundException('Blog author not found');
    return this.prisma.blog.create({
      data: {
        ...dto,
        status: dto.status || 'DRAFT',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateBlogDto) {
    const blog = await this.prisma.blog.findFirst({
      where: { id, isDeleted: false, blogAuthor: { userId } },
    });

    if (!blog) throw new NotFoundException('Blog not found');

    if (dto.editorId) {
      const editor = await this.prisma.editor.findFirst({
        where: { id: dto.editorId, userId, isDeleted: false },
      });
      if (!editor) throw new NotFoundException('Editor not found');
    }

    return this.prisma.blog.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  async softDelete(userId: string, id: string) {
    const blog = await this.prisma.blog.findFirst({
      where: { id, isDeleted: false, blogAuthor: { userId } },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return this.prisma.blog.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async publish(userId: string, id: string) {
    const blog = await this.prisma.blog.findFirst({
      where: { id, isDeleted: false, blogAuthor: { userId } },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return this.prisma.blog.update({
      where: { id },
      data: { status: 'PUBLIC', publishedAt: new Date(), scheduledAt: null },
    });
  }

  async schedule(userId: string, id: string, dto: ScheduleBlogDto) {
    const blog = await this.prisma.blog.findFirst({
      where: { id, isDeleted: false, blogAuthor: { userId } },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return this.prisma.blog.update({
      where: { id },
      data: { status: 'SCHEDULED', scheduledAt: new Date(dto.scheduledAt) },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPublishing() {
    const release = await publishingMutex.acquire();
    try {
      const now = new Date();

      const blogs = await this.prisma.blog.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lte: now },
          isDeleted: false,
        },
        select: { id: true }, 
      });

      if (blogs.length === 0) return;

      this.logger.log(`Publishing ${blogs.length} scheduled blog(s)...`);


      await Promise.all(
        blogs.map((blog) =>
          this.prisma.blog.update({
            where: { id: blog.id },
            data: {
              status: 'PUBLIC',
              publishedAt: now,
              scheduledAt: null,
            },
          }),
        ),
      );

      this.logger.log(`Published ${blogs.length} blog(s) successfully.`);
    } catch (err) {
      this.logger.error('Error publishing scheduled blogs', err.stack);
    } finally {
      release();
    }
  }
}
