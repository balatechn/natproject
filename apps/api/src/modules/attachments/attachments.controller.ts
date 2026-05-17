import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  Body,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a file attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        taskId: { type: 'string' },
        projectId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @Body('taskId') taskId: string | undefined,
    @Body('projectId') projectId: string | undefined,
    @CurrentUser('id') userId: string,
  ) {
    return this.attachmentsService.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      taskId,
      projectId,
      uploadedBy: userId,
    });
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'List attachments for a task' })
  getTaskAttachments(@Param('taskId') taskId: string) {
    return this.attachmentsService.findByTask(taskId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'List attachments for a project' })
  getProjectAttachments(@Param('projectId') projectId: string) {
    return this.attachmentsService.findByProject(projectId);
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get a fresh signed download URL' })
  getSignedUrl(@Param('id') id: string) {
    return this.attachmentsService.getSignedUrl(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete attachment' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.attachmentsService.delete(id, userId);
  }
}
