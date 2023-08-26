import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EbookService } from './ebook.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { CreateEbookDto } from './dto/create-ebook.dto';
import { UpdateEbookDto } from './dto/update-ebook.dto';
import { DeleteEbookDto } from './dto/delete-ebook.dto';
import { StarRateDto } from './dto/starRate-ebook.dto';
import { CreateSeriesDto } from './dto/create-series.dto';
import { PageRequest } from 'src/utils/PageRequest';

@Public()
@Controller('ebook')
@ApiTags('ebook API')
export class EbookController {
  constructor(private ebookService: EbookService) {}
  private readonly logger = new Logger(EbookController.name);

  @ApiOperation({ summary: 'ebook 전체 조회' })
  @Get()
  async getAll() {
    this.logger.log('-----GET /ebook');
    return await this.ebookService.getAll();
  }

  @ApiOperation({ summary: 'ebook 열람' })
  @Get('/one/:id')
  async getOne(@Param('id') id: number) {
    this.logger.log('-----GET /ebook/:id');
    return await this.ebookService.getOne(id);
  }

  @ApiOperation({ summary: 'ebook 작성' })
  @Post()
  async create(@Body() createEbookDto: CreateEbookDto, @Headers() headers) {
    this.logger.log('-----POST /ebook');
    return await this.ebookService.create(createEbookDto, headers);
  }

  @ApiOperation({ summary: 'ebook 수정 전 가져오기' })
  @Get('/getupdate/:id')
  async getUpdate(@Param('id') id: number, @Headers() headers) {
    this.logger.log('-----GET /ebook/getupdate');
    return await this.ebookService.getUpdate(id, headers);
  }

  @ApiOperation({ summary: 'ebook 수정' })
  @Patch()
  async update(@Body() updateEbookDto: UpdateEbookDto, @Headers() headers) {
    this.logger.log('-----PATCH /ebook');
    return await this.ebookService.update(updateEbookDto, headers);
  }

  @ApiOperation({ summary: 'ebook 삭제' })
  @Delete()
  async delete(@Body() deleteEbookDto: DeleteEbookDto, @Headers() headers) {
    this.logger.log('-----DELETE /ebook');
    return await this.ebookService.delete(deleteEbookDto, headers);
  }

  @ApiOperation({ summary: '별점 부여' })
  @Post('/starRating')
  async starRate(@Body() starRateDto: StarRateDto, @Headers() headers) {
    this.logger.log('-----POST /ebook/starRating');
    return await this.ebookService.starRate(starRateDto, headers);
  }

  @ApiOperation({ summary: '별점 순으로 ebook 조회' })
  @Get('/starRating')
  async getEbookOrderByStarRating(@Query() page: PageRequest) {
    this.logger.log('-----GET /ebook/starRating');
    return await this.ebookService.getEbookOrderByStarRating(page);
  }

  //series 관련
  @ApiOperation({ summary: '해당 유저 시리즈 조회' })
  @Get('/series')
  async getSeries(@Headers() headers) {
    this.logger.log('-----GET /ebook/series');
    return await this.ebookService.getSeries(headers);
  }

  @ApiOperation({ summary: '시리즈 생성' })
  @Post('/series')
  async createSeries(
    @Body() createSeriesDto: CreateSeriesDto,
    @Headers() headers,
  ) {
    this.logger.log('----POST /ebook/series');
    return await this.ebookService.createSeries(createSeriesDto, headers);
  }
}
