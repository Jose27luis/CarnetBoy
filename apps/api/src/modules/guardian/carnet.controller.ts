import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ApiErrorDto } from '../../common/swagger/api-error.dto';
import { RequireRoles } from '../../infrastructure/auth/auth-metadata';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { CarnetPdfService } from './carnet-pdf.service';
import { GuardianCarnetDto, GuardianChildCardDto, UploadPhotoDto } from './carnet.dto';
import { ChildPhotoService } from './child-photo.service';
import { CarnetService } from './carnet.service';

@ApiTags('guardian')
@ApiBearerAuth()
@RequireRoles('GUARDIAN')
@ApiResponse({ status: 401, type: ApiErrorDto })
@ApiResponse({ status: 403, type: ApiErrorDto })
@Controller('me/carnet')
export class CarnetController {
  constructor(
    private readonly carnet: CarnetService,
    private readonly pdf: CarnetPdfService,
    private readonly photos: ChildPhotoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Tarjetas de los niños con vínculo activo y su avance de vacunas' })
  @ApiResponse({ status: 200, type: [GuardianChildCardDto] })
  cards(@CurrentUser() user: AuthenticatedUser): Promise<GuardianChildCardDto[]> {
    return this.carnet.cards(user.id);
  }

  @Get(':childId')
  @ApiOperation({ summary: 'Carnet completo de un niño vinculado: vacunas, crecimiento, hemoglobina, hierro, citas y logros' })
  @ApiResponse({ status: 200, type: GuardianCarnetDto })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'El niño no existe o el vínculo no está activo' })
  carnetOf(@CurrentUser() user: AuthenticatedUser, @Param('childId', ParseUUIDPipe) childId: string): Promise<GuardianCarnetDto> {
    return this.carnet.carnet(user.id, childId);
  }

  @Get(':childId/photo')
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOperation({ summary: 'Foto del niño que subió este apoderado; solo la ve él' })
  @ApiResponse({ status: 200, description: 'Imagen' })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  async photoOf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<StreamableFile> {
    const photo = await this.photos.load(user.id, childId);
    void reply.header('cache-control', 'private, max-age=31536000, immutable');

    return new StreamableFile(photo.data, { type: photo.contentType, length: photo.data.length });
  }

  @Put(':childId/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sube o reemplaza la foto del niño (JPG, PNG o WebP, máximo 700 KB)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  async savePhoto(@CurrentUser() user: AuthenticatedUser, @Param('childId', ParseUUIDPipe) childId: string, @Body() body: UploadPhotoDto): Promise<void> {
    await this.photos.save(user.id, childId, body.image);
  }

  @Post(':childId/photo/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quita la foto del niño' })
  @ApiResponse({ status: 204 })
  async removePhoto(@CurrentUser() user: AuthenticatedUser, @Param('childId', ParseUUIDPipe) childId: string): Promise<void> {
    await this.photos.remove(user.id, childId);
  }

  @Get(':childId/pdf')
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Carnet en PDF, generado al momento y sin guardarse' })
  @ApiResponse({ status: 200, description: 'Documento PDF' })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  async pdfOf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId', ParseUUIDPipe) childId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<StreamableFile> {
    const file = await this.pdf.render(user.id, childId);
    void reply.header('cache-control', 'no-store');

    return new StreamableFile(file.content, { type: 'application/pdf', disposition: `attachment; filename="${file.fileName}"`, length: file.content.length });
  }
}
