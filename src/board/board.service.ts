import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { BoardRepository } from './repository/board.repository';
import { BoardEntity } from 'src/entities/board.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BoardNotifyEntity } from 'src/entities/boardNotify.entity';
import { BoardCategoryEntity } from 'src/entities/boardCategory.entity';
import { JwtService } from '@nestjs/jwt';
import { Page } from 'src/utils/Page';
import { checkTokenId } from 'src/utils/CheckToken';
import { GetToken } from 'src/utils/GetToken';
import { GetSearchSql } from 'src/utils/GetSearchSql';
import { GetS3Url } from 'src/utils/GetS3Url';
import { BoardRecommendEntity } from 'src/entities/boardRecommend.entity';

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);
  constructor(
    @InjectRepository(BoardEntity)
    private readonly boardRepository: Repository<BoardEntity>,
    @InjectRepository(BoardNotifyEntity)
    private readonly boardNofityRepository: Repository<BoardNotifyEntity>,
    @InjectRepository(BoardCategoryEntity)
    private readonly boardCategoryRepository: Repository<BoardCategoryEntity>,
    @InjectRepository(BoardRecommendEntity)
    private readonly boardRecommendRepository: Repository<BoardRecommendEntity>,
    private dataSource: DataSource,
    private jwtService: JwtService,
    private readonly getToken: GetToken,
    private readonly getSearchSql: GetSearchSql,
    private readonly getS3Url: GetS3Url,
  ) {}

  async getTotalCount() {
    try {
      const count = await this.boardRepository.query(`
      select
        count(*)
        from board
        where "isDeleted" = false
        and ban = false`);
      return count[0].count;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 개수 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async getAllSearchCount(query) {
    try {
      const count = await this.boardRepository.query(`
      select
        count(*)
        from board
        where "isDeleted" = false
        and ban = false
        ${query}
        `);
      return count[0].count;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 전체 검색 개수 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async getTitleSearchCount(query) {
    try {
      const count = await this.boardRepository.query(`
      select
        count(*)
        from board
        where "isDeleted" = false
        and ban = false
        ${query}
        `);
      return count[0].count;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 제목 검색 개수 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }
  async getContentSearchCount(query) {
    try {
      const count = await this.boardRepository.query(`
      select
        count(*)
        from board
        where "isDeleted" = false
        and ban = false
        ${query}
        `);
      return count[0].count;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 내용 검색 개수 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async getTypedTotalCount(categoryId) {
    try {
      const count = await this.boardRepository.query(`
      select
        count(*)
        from board
        where "isDeleted" = false
        and ban = false
        and "boardCategoryId" = ${categoryId}
    `);
      return count[0].count;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '타입별 게시판 개수 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async getMyCount(userId) {
    try {
      const count = await this.boardRepository.query(`
      select
        count(*)
        from board
        where "isDeleted" = false
        and ban = false
        and "userId" = ${userId}
    `);
      return count[0].count;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '내 게시판 개수 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async getLikedCount(userId) {
    try {
      const count = await this.boardRecommendRepository.query(`
      select
        count(*)
        from "boardRecommend"
        where "check" = true
        and "userId" = ${userId}
    `);
      return count[0].count;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '좋아요 게시판 개수 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**
   * get all boards with nickname
   * @return board
   */
  async getAll(page): Promise<object> {
    try {
      const count = await this.getTotalCount();
      const offset = page.getOffset();
      const limit = page.getLimit();
      const board = await this.boardRepository.query(
        `select
        a.id,
        title,
        "dateTime",
        "category",
        "recommendCount",
        nickname
        from board as a
        join (
          select
            "id"
            from board
            where board."isDeleted" = false
            and board.ban = false
            order by board.id desc
            offset ${offset}
            limit ${limit}
        ) as temp
        on temp.id = a.id
        inner join (
          select
            "id",
            "category"
            from "boardCategory"
        ) b
        on a."boardCategoryId" = b.id
        inner join (
          select
            "id",
            nickname
            from "user"
        ) c
        on a."userId" = c.id
        left join (
          select
            "boardId",
            count (*) as "recommendCount"
            from "boardRecommend"
            where "check" = true
            group by "boardId"
        ) d
        on a.id = d."boardId"
        `,
      );

      return new Page(count, page.pageSize, board);
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**
   * create board
   * @param createData
   * @return success: true
   */
  async create(createData, headers): Promise<object> {
    try {
      const verified = await this.getToken.getToken(headers);

      const boardData = new BoardEntity();
      boardData.title = createData.title;
      boardData.contents = createData.contents;
      boardData.user = verified.userId;
      boardData.boardCategory = createData.boardCategoryId;
      boardData.ban = false;
      boardData.dateTime = new Date();
      boardData.isDeleted = false;
      boardData.isModified = false;
      boardData.recommend = 0;

      await this.boardRepository.save(boardData);

      return { success: true };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 생성 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**
   * delete board
   * @param deleteData
   * @return success: true
   */
  async delete(deleteData, headers): Promise<object> {
    try {
      const verified = await this.getToken.getToken(headers);
      const userId = await this.getBoardUserId(deleteData.id);
      const check = checkTokenId(userId, verified.userId);
      if (check) {
        await this.boardRepository
          .createQueryBuilder('board')
          .update()
          .set({
            isDeleted: true,
          })
          .where('id = :id', { id: deleteData.id })
          .andWhere('userId = :userId', { userId: userId })
          .execute();

        return { success: true };
      } else return { success: false, msg: '유저 불일치' };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 삭제 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async checkUser(boardId, userId) {
    try {
      const id = await this.boardRepository
        .createQueryBuilder()
        .select('"userId"')
        .where('id = :boardId', { boardId: boardId })
        .getRawOne();
      if (userId === id.userId) {
        return true;
      } else return false;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '유저 체크 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**
   *
   * @param ids
   * @returns board
   */
  async getUpdate(id, headers): Promise<object> {
    try {
      const verified = await this.getToken.getToken(headers);
      const check = await this.checkUser(id, verified.userId);
      if (check) {
        const board = await this.getOne(id);

        return board;
      } else {
        this.logger.log('not same user');
        return { success: false, msg: '유저 불일치', status: '401.1' };
      }
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '업데이트 전 가져오기 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**
   * update board
   * @param updateData
   * @returns success: true
   */
  async update(updateData, headers): Promise<object> {
    try {
      const verified = await this.getToken.getToken(headers);
      const userId = await this.getBoardUserId(updateData.id);
      const check = checkTokenId(userId, verified.userId);
      if (check) {
        const boardData = new BoardEntity();
        boardData.id = updateData.id;
        boardData.title = updateData.title;
        boardData.contents = updateData.contents;
        boardData.user = userId;
        boardData.boardCategory = updateData.boardCategoryId;
        boardData.isModified = true;

        await this.boardRepository
          .createQueryBuilder('board')
          .update()
          .set({
            title: boardData.title,
            contents: boardData.contents,
            boardCategory: boardData.boardCategory,
            isModified: boardData.isModified,
          })
          .where('id = :id', { id: boardData.id })
          .andWhere('userId = :userId', { userId: boardData.user })
          .execute();

        return { success: true };
      } else return { success: false, msg: '유저 불일치' };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 수정 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**
   * get one board
   * @param number - id
   * @returns one board
   */
  async getOne(id): Promise<object> {
    try {
      const board = await this.boardRepository.query(
        `select 
            a."id",
            "title",
            "contents",
            "dateTime",
            "boardCategoryId",
            "recommendCount",
            "nickname",
            "category",
            "userId"
          from "board" a
          inner join (
            select 
              "id",
              "category"
            from "boardCategory"
          ) b
          on a."boardCategoryId" = b."id"
          inner join (
            select 
              "id",
               nickname
            from "user"
            ) c
          on a."userId" = c.id
          left join (
            select 
              "boardId",
              count (*) as "recommendCount"
            from "boardRecommend"
            where "boardId" = ${id}
            and "check" = true
            group by "boardId"
            ) d
          on a.id = d."boardId"
          where a.id=${id}
          and a."isDeleted" = false
          and a.ban = false`,
      );

      const res =
        board[0] == undefined
          ? { success: false, msg: '삭제된 게시글입니다' }
          : board[0];

      return res;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시글 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**
   * get typed board
   * @param type
   * @returns typed board
   */
  async getTyped(categoryId, page): Promise<object> {
    try {
      const count = await this.getTypedTotalCount(categoryId);
      const offset = page.getOffset();
      const limit = page.getLimit();
      const board = await this.boardRepository.query(
        `select
          a.id,
          title,
          "dateTime",
          "category",
          "recommendCount",
          nickname
          from board as a
          join (
            select
              "id"
              from board
              where board."isDeleted" = false
              and board.ban = false
              and board."boardCategoryId" = ${categoryId}
              order by board.id desc
              offset ${offset}
              limit ${limit}
          ) as temp
          on temp.id = a.id
          inner join (
            select
              "id",
              "category"
              from "boardCategory"
          ) b
          on a."boardCategoryId" = b.id
          inner join (
            select
              "id",
              nickname
              from "user"
          ) c
          on a."userId" = c.id
        left join (
          select
            "boardId",
            count (*) as "recommendCount"
            from "boardRecommend"
            where "check" = true
            group by "boardId"
        ) d
        on a.id = d."boardId"
        `,
      );

      return new Page(count, page.pageSize, board);
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '타입 별 게시판 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**
   * recommend board
   * @param recommendData
   * @returns success: true, msg: 'create recommend' | 'cancle recommend' | 'reRecommend, recommend: ${recommend}'
   */
  async recommend(recommendDto, headers): Promise<object> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const verified = await this.getToken.getToken(headers);
      const recommendData = {
        boardId: recommendDto.boardId,
        userId: verified.userId,
      };
      const check = await this.checkRecommend(
        recommendData.boardId,
        recommendData.userId,
        queryRunner,
      );

      const res = await this.checkAndCall(check, recommendData, queryRunner);

      if (res['success']) {
        await queryRunner.commitTransaction();
        return res;
      } else {
        this.logger.error('게시글 추천 중 에러 발생');
        await queryRunner.rollbackTransaction();
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          success: false,
          msg: '게시글 추천 중 에러 발생',
        };
      }
    } catch (err) {
      this.logger.error(err);
      await queryRunner.rollbackTransaction();
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시글 추천 중 에러 발생',
          success: false,
        },
        500,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async checkRecommend(boardId, userId, queryRunner) {
    try {
      const res = await queryRunner.query(
        `select * from public."boardRecommend" where "userId" = ${userId} and "boardId" = ${boardId}`,
      );

      return res;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '추천 체크 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async checkAndCall(check, recommendData, queryRunner) {
    try {
      let res;
      if (!!check[0]) {
        if (check[0].check) {
          res = await this.cancelRecommend(
            recommendData.boardId,
            recommendData.userId,
            queryRunner,
          );
        } else {
          res = await this.reRecommend(
            recommendData.boardId,
            recommendData.userId,
            queryRunner,
          );
        }
      } else {
        res = await this.createRecommend(
          recommendData.boardId,
          recommendData.userId,
          queryRunner,
        );
      }
      return res;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '체크 확인 후 함수 호출 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async getRecommend(boardId, queryRunner) {
    try {
      const recommend = await queryRunner.query(`
      select count(*) from "boardRecommend" where "boardId" = ${boardId} and "check" = true`);
      return recommend[0].count;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '추천수 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async createRecommend(boardId, userId, queryRunner) {
    try {
      await queryRunner.query(
        `insert into "boardRecommend"("check", "userId", "boardId") values(TRUE, ${userId}, ${boardId})`,
      );

      const recommend = await this.getRecommend(boardId, queryRunner);

      return { success: true, msg: 'create recommend', recommend: recommend };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '추천 생성 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async cancelRecommend(boardId, userId, queryRunner) {
    try {
      await queryRunner.query(
        `UPDATE "boardRecommend" set "check" = FALSE where "boardId" = ${boardId} and "userId" = ${userId}`,
      );

      const recommend = await this.getRecommend(boardId, queryRunner);

      return { success: true, msg: 'cancel recommend', recommend: recommend };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '추천 취소 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async reRecommend(boardId, userId, queryRunner) {
    try {
      await queryRunner.query(
        `UPDATE "boardRecommend" set "check" = TRUE where "boardId" = ${boardId} and "userId" = ${userId}`,
      );

      const recommend = await this.getRecommend(boardId, queryRunner);

      return { success: true, msg: 'reRecommend', recommend: recommend };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '재추천 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**신고 리스트 불러오기 */
  async getNotiList() {
    try {
      const res = await this.boardNofityRepository
        .createQueryBuilder('boardNotify')
        .select()
        .where('"IsDeleted" =:IsDeleted ', { IsDeleted: false })
        .getMany();

      return res;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '신고 리스트 불러오기 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**신고 접수 */
  async insertNotify(notifyDto, headers) {
    try {
      const verified = await this.getToken.getToken(headers);

      const boardNotifyEntity = new BoardNotifyEntity();

      boardNotifyEntity.reason = notifyDto.reason;
      boardNotifyEntity.dateTime = new Date();
      boardNotifyEntity.IsChecked = false;
      boardNotifyEntity.IsDeleted = false;
      boardNotifyEntity.board = notifyDto.boardId;
      boardNotifyEntity.user = verified.userId;

      await this.boardNofityRepository.save(boardNotifyEntity);

      return { success: true };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '신고 접수 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**신고 접수 후 게시물 밴 */
  async banBoard(banBoardDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //유저 권한 체크 jwt 이후 추가 예정

      const res = await this.banBoardCotents(banBoardDto.boardId, queryRunner);

      if (res['success']) {
        await this.checkBoardNotiy(banBoardDto.boardNotifyId, queryRunner);
      } else {
        this.logger.error('글 추천 중 에러 발생');
        await queryRunner.rollbackTransaction();
        return res;
      }

      await queryRunner.commitTransaction();

      return { success: true };
    } catch (err) {
      this.logger.error(err);
      await queryRunner.rollbackTransaction();
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '신고 접수 후 게시물 밴 중 에러 발생',
          success: false,
        },
        500,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**게시물 밴 처리 */
  async banBoardCotents(boardId, queryRunner) {
    try {
      await queryRunner.query(
        `UPDATE "board" set "ban" = true where "id" = ${boardId}`,
      );

      return { success: true, msg: '게시물 밴' };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시물 밴 처리 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**신고 삭제 */
  async checkBoardNotiy(boardNotifyId, queryRunner) {
    try {
      await queryRunner.query(
        `UPDATE "boardNotify" set "IsDeleted" = true where "id" = ${boardNotifyId}`,
      );

      return { success: true, msg: '신고 삭제' };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '신고 삭제 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async getCategoryList() {
    try {
      const res = await this.boardCategoryRepository.find();

      return res;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '카테고리 리스트 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**get s3 presigned url */
  async s3url() {
    this.logger.log('s3url');
    return await this.getS3Url.s3url();
  }

  async getBoardUserId(id: number) {
    try {
      const board = await this.boardRepository
        .createQueryBuilder()
        .select(['"userId"'])
        .where('id = :id', { id: id })
        .andWhere('"isDeleted" = :isDeleted', { isDeleted: false })
        .getRawOne();

      return board.userId;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '해당 게시판 유저 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async searchAll(page) {
    try {
      const offset = page.getOffset();
      const limit = page.getLimit();
      const whiteSpaceSql = this.getSearchSql.getWhiteSpaceOrSql(
        'board',
        { title: 'title', contents: 'contents' },
        page.keyword,
      );
      const count = await this.getAllSearchCount(whiteSpaceSql);
      const board = await this.boardRepository.query(
        `select
        a.id,
        title,
        "dateTime",
        "category",
        "recommendCount",
        nickname
        from board as a
        join (
          select
            "id"
            from board
            where board."isDeleted" = false
            and board.ban = false
            ${whiteSpaceSql}
            order by board.id desc
            offset ${offset}
            limit ${limit}
        ) as temp
        on temp.id = a.id
        inner join (
          select
            "id",
            "category"
            from "boardCategory"
        ) b
        on a."boardCategoryId" = b.id
        inner join (
          select
            "id",
            nickname
            from "user"
        ) c
        on a."userId" = c.id
        left join (
          select
            "boardId",
            count (*) as "recommendCount"
            from "boardRecommend"
            where "check" = true
            group by "boardId"
        ) d
        on a.id = d."boardId"
        `,
      );

      return new Page(count, page.pageSize, board);
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 전체 검색 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async searchTitle(page) {
    try {
      const offset = page.getOffset();
      const limit = page.getLimit();
      const whiteSpaceSql = this.getSearchSql.getWhiteSpaceOrSql(
        'board',
        'title',
        page.keyword,
      );
      const count = await this.getTitleSearchCount(whiteSpaceSql);
      const board = await this.boardRepository.query(
        `select
        a.id,
        title,
        "dateTime",
        "category",
        "recommendCount",
        nickname
        from board as a
        join (
          select
            "id"
            from board
            where board."isDeleted" = false
            and board.ban = false
            ${whiteSpaceSql}
            order by board.id desc
            offset ${offset}
            limit ${limit}
        ) as temp
        on temp.id = a.id
        inner join (
          select
            "id",
            "category"
            from "boardCategory"
        ) b
        on a."boardCategoryId" = b.id
        inner join (
          select
            "id",
            nickname
            from "user"
        ) c
        on a."userId" = c.id
        left join (
          select
            "boardId",
            count (*) as "recommendCount"
            from "boardRecommend"
            where "check" = true
            group by "boardId"
        ) d
        on a.id = d."boardId"
        `,
      );

      return new Page(count, page.pageSize, board);
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 제목 검색 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  async searchContent(page) {
    try {
      const offset = page.getOffset();
      const limit = page.getLimit();
      const whiteSpaceSql = this.getSearchSql.getWhiteSpaceOrSql(
        'board',
        'contents',
        page.keyword,
      );
      const count = await this.getContentSearchCount(whiteSpaceSql);
      const board = await this.boardRepository.query(
        `select
        a.id,
        title,
        "dateTime",
        "category",
        "recommendCount",
        nickname
        from board as a
        join (
          select
            "id"
            from board
            where board."isDeleted" = false
            and board.ban = false
            ${whiteSpaceSql}
            order by board.id desc
            offset ${offset}
            limit ${limit}
        ) as temp
        on temp.id = a.id
        inner join (
          select
            "id",
            "category"
            from "boardCategory"
        ) b
        on a."boardCategoryId" = b.id
        inner join (
          select
            "id",
            nickname
            from "user"
        ) c
        on a."userId" = c.id
        left join (
          select
            "boardId",
            count (*) as "recommendCount"
            from "boardRecommend"
            where "check" = true
            group by "boardId"
        ) d
        on a.id = d."boardId"
        `,
      );

      return new Page(count, page.pageSize, board);
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '게시판 내용 검색 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**최근 업로드 된 게시글 불러오기 */
  async lastBoard() {
    try {
      const res = await this.boardRepository.find({
        take: 5,
        order: { id: 'DESC' },
      });

      return res;
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '최근 업로드 게시판 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**해당 유저가 작성한 게시판 불러오기 */
  async getMyBoard(page, headers) {
    try {
      const verified = await this.getToken.getToken(headers);
      const count = await this.getMyCount(verified.userId);
      const offset = page.getOffset();
      const limit = page.getLimit();
      const board = await this.boardRepository.query(
        `
        select
        a.id,
        title,
        "dateTime",
        "category",
        "recommendCount",
        nickname
        from board as a
        join (
          select
            "id"
            from board
            where board."isDeleted" = false
            and board.ban = false
            and board."userId" = ${verified.userId}
            order by board.id desc
            offset ${offset}
            limit ${limit}
        ) as temp
        on temp.id = a.id
        inner join (
          select
            "id",
            "category"
            from "boardCategory"
        ) b
        on a."boardCategoryId" = b.id
        inner join (
          select
            "id",
            nickname
            from "user"
        ) c
        on a."userId" = c.id
        left join (
          select
            "boardId",
            count (*) as "recommendCount"
            from "boardRecommend"
            where "check" = true
            group by "boardId"
        ) d
        on a.id = d."boardId"
        `,
      );

      return new Page(count, page.pageSize, board);
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '내 게시판 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }

  /**좋아요 누른 게시판 조회*/
  async getLikedBoard(page, headers) {
    try {
      const verified = await this.getToken.getToken(headers);
      const count = await this.getLikedCount(verified.userId);
      const offset = page.getOffset();
      const limit = page.getLimit();
      const board = await this.boardRecommendRepository.query(
        `
        select
          a."boardId" as id,
          title,
          "dateTime",
          category,
          nickname,
          "recommendCount"
        from "boardRecommend" as a
        join(
          select
            id
          from "boardRecommend"
          where "userId" = ${verified.userId}
          and "check" = true
          order by "boardRecommend".id desc
          offset ${offset}
          limit ${limit}
        ) as temp
        on temp.id = a.id
        inner join (
          select
            id,
            "userId",
            title,
            "dateTime",
            "boardCategoryId"
          from board
        ) b
        on a."boardId" = b.id
        inner join (
          select
            id,
            category
          from "boardCategory"
        ) c
        on b."boardCategoryId" = c.id
        inner join (
          select
            id,
            nickname
          from public."user"
        ) d
        on b."userId" = d.id
        left join (
          select
            "boardId", count (*) as "recommendCount"
          from "boardRecommend"
          where "check" = true
          group by "boardId"
        ) e
        on a."boardId" = e."boardId"
        `,
      );

      return new Page(count, page.pageSize, board);
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: '내 추천 게시판 조회 중 에러 발생',
          success: false,
        },
        500,
      );
    }
  }
}
