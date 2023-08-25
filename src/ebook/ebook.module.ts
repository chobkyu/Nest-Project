import { Module } from '@nestjs/common';
import { EbookController } from './ebook.controller';
import { EbookService } from './ebook.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EbookEntity } from 'src/entities/ebook.entity';
import { GetToken } from 'src/utils/GetToken';
import { EbookSeriesEntity } from 'src/entities/ebookSeries.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EbookEntity, EbookSeriesEntity])],
  controllers: [EbookController],
  providers: [EbookService, GetToken],
})
export class EbookModule {}
