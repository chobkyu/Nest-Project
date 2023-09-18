import { InjectRepository } from '@nestjs/typeorm';
import { HttpException,HttpCode, HttpStatus, Injectable,UnauthorizedException,Logger} from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { QnaEntity } from 'src/entities/qna/qna.entity';
import { QnaCommentEntity } from 'src/entities/qna/qnacomment.entity';
import{ Page }from 'src/utils/page';
import { GetToken } from 'src/utils/GetToken';
import { GetSearchSql } from 'src/utils/GetSearchSql';
@Injectable()
export class QnaService 
{private readonly logger = new Logger(QnaService.name);
  constructor(
    @InjectRepository(QnaEntity)
    private readonly qnaRepository: Repository<QnaEntity>,
    @InjectRepository(QnaCommentEntity)
    private readonly qnaCommentEntity: Repository<QnaCommentEntity>,
    private readonly jwtService: JwtService,
    private readonly gettoken:GetToken,
    private readonly getsearchsql:GetSearchSql,
    ){}
    /** qna전체조회
     *
     *@param page
     *@return {success,status,page}
     */ 
     async checkUser(qnaboardId, userId):Promise<any[]> 
     {
      return [];
     }
    async getAll(page):Promise<object>
    {
      try{
      const offset = page.getOffset();
      const limit = page.getLimit();
      const count=await this.qnaRepository.query(`select count(*) from "Qna"`);
      const pg=await this.qnaRepository.query(`select qa."id",qa."title",qa."dateTime" from "Qna" as qa join (select "id" from "Qna" as q where q."ban"=false and q."isDeleted"=false order by q."id" desc offset ${offset} limit ${limit}) as temp on temp."id"=qa."id" `);
      const rtpage=new Page(count,page.pageSize,pg);
      return {success:true,status:HttpStatus.OK,rtpage};
      }
      catch(err)
      {
        this.logger.error(err);
        throw new HttpException(
          {
            status:HttpStatus.INTERNAL_SERVER_ERROR,
            error:'Qna 전체조회중 오류발생',
            success:false,
          },HttpStatus.INTERNAL_SERVER_ERROR)
      }
    }
     /** qna 생성
     *
     *@param createQnaDto,headers
     *@return  { success,status};
     */ 
    async create(createQnaDto,headers):Promise<object>
    {try
      {
        const verified=await this.gettoken.getToken(headers);
        const QnaData = new QnaEntity();
        QnaData.title = createQnaDto.title;
        QnaData.contents = createQnaDto.contents;
        QnaData.user = verified.userId;
        QnaData.username=verified.username;
        QnaData.dateTime = new Date();
        QnaData.isDeleted = false;
        QnaData.isModified = false;
        QnaData.issecret=createQnaDto.isSecret;
        if(!QnaData.issecret)
        {
          QnaData.username=verified.username;
        }
        await this.qnaRepository.save(QnaData);
        return { success: true,status:HttpStatus.CREATED};
      }
    catch(err)
    {
      this.logger.error(err);
        throw new HttpException(
          {
            status:HttpStatus.INTERNAL_SERVER_ERROR,
            error:'Qna 생성중 오류발생',
            success:false,
          },HttpStatus.INTERNAL_SERVER_ERROR)
    }
    }
    async getOne(id,headers):Promise<Object>
    {
      try{
      const verified=await this.gettoken.getToken(headers);
      //const pg=await this.qnaRepository.query(`select * from "Qna" as q left join "QnaComment" as qc on q."id"=qc."qnaId" where q."ban"=false and q."id"=${id} and (q."userId"=${verified.userId} or q."issecret"=false)`);
      const pg=await this.qnaRepository.query(`select * from "Qna" as q where q."ban"=false and q."isDeleted"=false and q."id"=${id} and (q."userId"=${verified.userId} or q."issecret"=false)`);
      console.log(pg,typeof(pg),pg.length);
      if(pg.length>0) 
      {
        return { success: true,status:HttpStatus.OK,pg};
      }
      else
      {
        return { success: false,status:HttpStatus.BAD_REQUEST};
      }}
      catch(err)
    {
      this.logger.error(err);
        throw new HttpException(
          {
            status:HttpStatus.INTERNAL_SERVER_ERROR,
            error:'Qna 조회중 오류발생',
            success:false,
          },HttpStatus.INTERNAL_SERVER_ERROR)
    }
    }
    // async getOnebyAdmin(id,headers)
    // {
    //   const verified=await this.gettoken.getToken(headers);
    //   const pg=await this.qnaRepository.query(`select * from "Qna" as q left join "QnaComment" as qc where q."ban"=false and q."isDeleted"=false and q."id"=${id} and q.user=${verified.userId}`); 
    // }
     /** qna 수정전 정보가져오기
     *
     *@param createQnaDto,headers
     *@return  { success,status};
     */ 
    async getUpdate(id, headers)
    {
    }
    async update(updateQnaDto, headers){}
    async delete(deleteQnaDto, headers)
    {

    }
  }


