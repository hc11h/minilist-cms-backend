import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlogStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getMetricsForUser(email: string) {

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        loginHistory: true,
        editors: { select: { id: true } },
        blogAuthors: { select: { id: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

  
    const loginCount = user.loginHistory.length;
    const lastLogin = user.lastLogin;

 
    const editorIds = user.editors.map((editor) => editor.id);
    let editorMetrics = {};
    if (editorIds.length > 0) {
      const totalEditorBlogs = await this.prisma.blog.count({
        where: { editorId: { in: editorIds } },
      });
      const publishedEditorBlogs = await this.prisma.blog.count({
        where: { editorId: { in: editorIds }, status: BlogStatus.PUBLIC },
      });
      const draftEditorBlogs = await this.prisma.blog.count({
        where: { editorId: { in: editorIds }, status: BlogStatus.DRAFT },
      });
      editorMetrics = {
        totalEditorBlogs,
        publishedEditorBlogs,
        draftEditorBlogs,
      };
    }


    const blogAuthorIds = user.blogAuthors.map((author) => author.id);
    let authorMetrics = {};
    if (blogAuthorIds.length > 0) {
      const totalAuthoredBlogs = await this.prisma.blog.count({
        where: { blogAuthorId: { in: blogAuthorIds } },
      });
      const publishedAuthoredBlogs = await this.prisma.blog.count({
        where: {
          blogAuthorId: { in: blogAuthorIds },
          status: BlogStatus.PUBLIC,
        },
      });
      const draftAuthoredBlogs = await this.prisma.blog.count({
        where: {
          blogAuthorId: { in: blogAuthorIds },
          status: BlogStatus.DRAFT,
        },
      });
      authorMetrics = {
        totalAuthoredBlogs,
        publishedAuthoredBlogs,
        draftAuthoredBlogs,
      };
    }

    return {
      loginMetrics: { loginCount, lastLogin },
      editorMetrics,
      authorMetrics,
    };
  }
}
