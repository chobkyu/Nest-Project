import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { QueueTalk } from '../utils/Queue';
import { InjectRepository } from '@nestjs/typeorm';
import { SmallSubjectEntity } from 'src/entities/smallSubject.entity';
import { Repository } from 'typeorm';
import { SmallTalkEntity } from 'src/entities/smallTalk.entity';
import { JwtService } from '@nestjs/jwt';
import { GetToken } from 'src/utils/GetToken';
import { checkTokenId } from 'src/utils/CheckToken';
import { DeleteSmallSubDto } from './dto/deleteSmallSub.dto';
import { RandomSubjectEntity } from 'src/entities/randomSubject.entity';

@Injectable()
export class SmallTalkService {
    //private readonly queue = new QueueTalk();
    private readonly logger = new Logger(SmallTalkService.name);

    constructor(
        @InjectRepository(SmallSubjectEntity)
        private readonly smallSubjectRepository : Repository<SmallSubjectEntity>,
        @InjectRepository(SmallTalkEntity)
        private readonly smallTalkRepository : Repository<SmallTalkEntity>,
        @InjectRepository(RandomSubjectEntity)
        private readonly randomSubjectRepository : Repository<RandomSubjectEntity>,
        
        private readonly jwtService : JwtService,
        private getToken : GetToken,
        private queue : QueueTalk,

        
    ){}

    async checkToken(headers) {
        const token = headers.authorization.replace('Bearer ', '');

        return this.jwtService.verify(token, {
          secret: process.env.JWT_CONSTANTS,
        });
      }

    queueInsert(id:number){
        try{
            this.logger.log('add');
            this.queue.add(id);
            return {success:true};
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '큐 삽입 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }
    
    queuePop(){
        try{
            this.logger.log('pop');
            this.queue.popleft();
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '큐 데이터 추출 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    readAll(){
        try{
            const res = this.queue.readAllQueue();
            console.log(res);
            return res;
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '큐 조회 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    /**주제 저장 */
    async insertSmallTalkSub(createSmallSub,headers){
        try{
            
            //const verified = await this.checkToken(headers);
            const verified = await this.getToken.getToken(headers)

            const checkSubTitle = await this.checkSubTitle(createSmallSub.title);
            if(checkSubTitle[0]) return {success:false, msg:'타이틀 중복'}
            
            this.logger.debug(verified)

            const res = await this.insertSubDB(verified,createSmallSub);

            return res.success==true ? {success:true} : {success:false};
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '스몰 톡 주제 생성 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    /**주제 디비 저장 */
    async insertSubDB(verified,createSmallSub){
        try{
            const smallTalkSub = new SmallSubjectEntity();

            smallTalkSub.date = new Date();
            smallTalkSub.isDeleted = false;
            smallTalkSub.isModified = false;
            smallTalkSub.title = createSmallSub.title;
            smallTalkSub.detail = createSmallSub.detail;
            smallTalkSub.user = verified.userId;
            smallTalkSub.imgUrl = createSmallSub.imgUrl;

            await this.smallSubjectRepository.save(smallTalkSub);

            return {success:true};
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '스몰 톡 주제 생성 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    /**이미 있는 주제인지 확인 */
    async checkSubTitle(title:string){
        try{
            const res = await this.smallSubjectRepository.find({
                where:{
                    title:title
                }
            });

            return res;
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '스몰 톡 제목 체크 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    /**주제 삭제 */
    async deleteSub(deleteData:DeleteSmallSubDto, headers) {
        try {
            const verified = await this.getToken.getToken(headers)

            const checkUser = checkTokenId(deleteData.userId,verified.userId)

            if(!checkUser){
                await this.smallSubjectRepository
                .createQueryBuilder()
                .update()
                .set({
                    isDeleted:true,
                })
                .where('id = :id',{id:deleteData.id})
                .execute();

                return {success :true};
            }else{
                return {success:false,msg:'유저 불일치'};
            }
           
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '스몰 톡 주제 삭제 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    /**스몰톡 주제 리스트 가져오기 */
    async getAllList(title?:string) {
        try{    
            console.log('title : '+title);
            const qb = this.smallSubjectRepository.createQueryBuilder('smallSubject')
                    .select('smallSubject.id', 'id')
                    .addSelect('smallSubject.title','title')
                    .addSelect('smallSubject.detail','detail')
                    .addSelect('smallSubject.isDeleted','isDeleted')
                    .addSelect('smallSubject.isModified','isModified')
                    .addSelect('smallSubject.imgUrl','imgUrl')
                    .addSelect('smallSubject.date','date')
                    .addSelect('user.id','userId')
                    .addSelect('user.name','name')
                    .addSelect('user.nickname','nickname')
                    .addSelect('user.img','userImg')
                    .leftJoin("smallSubject.user",'user')
                    .where('smallSubject.isDeleted = false')
            
            //리팩토링 예정
            if(title!==undefined) {
                if(title!==''){
                    const searchKey = `%${title}%`
                    qb.andWhere("smallSubject.title LIKE :title" ,{title:searchKey});
                }
               
            }
            
            const res = await qb.orderBy('smallSubject.date','DESC')
                        .getRawMany();
                        
            console.log(res);
            return res;
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '스몰 톡 리스트 조회 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }


    /**스몰 톡 주제랑 내용 가져오기 */
    async getSmallOne(id:number) {
        try{
            const sub = await this.getSmallTalkSubOne(id);
            const list = await this.getSmallTalkList(id);

            const res = {
                sub,
                list,
            }

            return res;

        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '스몰 톡 내용 불러오는 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    /**스몰 톡 내용 가져오기 */
    async getSmallTalkList(id) {
        try{
            const res = await this.smallTalkRepository
                        .createQueryBuilder('smallTalk')
                        .select('smallTalk.id','id')
                        .addSelect('smallTalk.isDeleted','isDeleted')
                        .addSelect('smallTalk.smallSubjectId','smallSubjectId')
                        .addSelect('smallTalk.contents','contents')
                        .addSelect('user.name','name')
                        .addSelect('user.nickname','userName')
                        .addSelect('user.img','userImg')
                        .leftJoin('smallTalk.user','user')
                        .where('smallTalk.smallSubjectId = :id',{id:id})
                        .andWhere('smallTalk.isDeleted = false')
                        .getRawMany();

            return res;

        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '스몰 톡 내용 불러오는 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    /**스몰 톡 저장 */
    async insertSmallTalk(insertSmallTalkDto, headers) {
        try{
            console.log('dsfsd '+headers)
            const verified = await this.getToken.getSmallTalkToken(headers);

            const smallTalkEntity = new SmallTalkEntity();

            smallTalkEntity.contents = insertSmallTalkDto.contents;
            smallTalkEntity.smallSubject = insertSmallTalkDto.smallSubjectId ;
            smallTalkEntity.isDeleted = false;
            smallTalkEntity.user = verified.userId;

            await this.smallTalkRepository.save(smallTalkEntity);

            return {success : true, verified};
             
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '스몰 톡 삽입 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    /**스몰 톡 주제 불러오기 */
    async getSmallTalkSubOne(id:number) {
        try{
            const res = await this.smallSubjectRepository
                .createQueryBuilder('smallSubject')
                .select('smallSubject.id', 'id')
                .addSelect('smallSubject.title','title')
                .addSelect('smallSubject.detail','detail')
                .addSelect('smallSubject.isDeleted','isDeleted')
                .addSelect('smallSubject.isModified','isModified')
                .addSelect('smallSubject.imgUrl','imgUrl')
                .addSelect('smallSubject.date','date')
                .addSelect('user.id','userId')
                .addSelect('user.name','name')
                .addSelect('user.nickname','nickname')
                .addSelect('user.img','userImg')
                .leftJoin("smallSubject.user",'user')
                .where('smallSubject.isDeleted = false')
                .andWhere('smallSubject.id = :id',{id:id})
                .orderBy('smallSubject.date','DESC')
                .getRawOne();

            return res;
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '스몰 톡 주제 가져오는 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    /**랜덤으로 랜덤 톡 주제 가져오기 */
    async getRandomSub() {
        try{
            const res = await this.randomSubjectRepository
                        .createQueryBuilder('randomSubject')
                        .select()
                        .orderBy('RANDOM()')
                        .getOne();

            return res;

        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '랜덤 톡 주제 가져오는 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }

    /**랜덤 톡 insert */
    async randomQueueAdd(headers){
        try{
            const verified = await this.getToken.getToken(headers);

            console.log(verified);
            this.queue.add(verified);

            return {success:true};
        }catch(err){
            this.logger.error(err);
            throw new HttpException(
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  error: '랜덤 톡 큐 삽입 중 에러 발생',
                  success: false,
                },
                500,
            );
        }
    }
   
}
