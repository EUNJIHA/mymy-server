const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cron = require('node-cron');
const moment = require('moment');
const moment2 = require('moment-timezone');
async function axiosCall (method, url){
    const options = {
        method: method,
        url: url,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json;charset=UTF-8'
        }
    };
    let response = await axios(options);
    let responseOK = response && response.status === 200 && response.statusText === 'OK';
    if (responseOK) {
        let data = await response.data;
        return data;
    }else{
        return false;
    }
}
/**
 update : 2020.10.06
2-1	GET	/recommended-songs	노래 추천(필터)
 **/
exports.getRecommendedSongs = async function (req, res) { 
    const token = req.headers['x-access-token'];
    const userIdx = jwt.decode(token).idx;
    const option = req.query['option'];
    const genre = req.query['genre'];
    const genreArray = ["", "발라드", "댄스", "힙합", "R&B", "락", "트로트", "OST", "인디", "팝", "일본곡", "메들리", "동요&만화", "CCM"]
    if(genre){
        if(genreArray.indexOf(genre) === -1){
            return res.json({isSuccess: false, code: 361, message: "genre를 확인하세요"});
        }
    }
    const genreIdx = genreArray.indexOf(genre);
    console.log(genreIdx);
    if(!option){
        return res.json({isSuccess: false, code: 350, message: "option을 입력하세요"});
    }
    if(option !== 'all' && option !== 'popular' && option !=='genre'){
        return res.json({isSuccess: false, code: 351, message: "option을 확인하세요"});
    }
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            if(option === 'all'){
                const selectAllSongsQuery = `
                select brand,
                no,
                S.title                  title,
                singer_name              singer,
                IFNULL(G.genre_image, '')  genreImage,
                IFNULL(G.genre_image_back, '')  genreImageBack,
                IFNULL(G.genre_name, '') genre,
                CASE WHEN sex = 'M' THEN '남성' WHEN sex = 'F' THEN '여성' WHEN sex = 'D' THEN '기본 성별' END sex,
                CASE WHEN pitch = 'D' THEN '기본 음정' ELSE CONCAT('음정 ', pitch) END pitch,
                CASE WHEN tempo = 'D' THEN '기본 박자' ELSE CONCAT('박자 ', tempo) END tempo,
                IFNULL(memo, '') memo
                From Song S
                  left join Genre G on S.genre_idx = G.idx
                  right join (select song_idx, idx, title, sex, pitch, tempo, memo
                              from PlaylistSong PS
                                       inner join (select idx, title From Playlist where user_idx = ? and status = 'N') PLAYLIST
                                                  ON PLAYLIST.idx = PS.playlist_idx
                              where status = 'N'
                              order by RAND()
                              limit 10) ALL_RANDOM ON ALL_RANDOM.song_idx = S.idx
                where S.status = 'N';
                `;
                let userIdxParams = [userIdx];
                const [allSongsRows] = await connection.query( 
                    selectAllSongsQuery,
                    userIdxParams
                );
                connection.release();
                return res.json({songs: allSongsRows, isSuccess: true, code: 201, message: "전체 플레이리스트 노래 추천"});
            }else if(option === 'popular'){
                const selectPopularSongsQuery = `
                select brand,
                no,
                title,
                singer_name                    singer,
                IFNULL(genre_image, '')        genreImage,
                IFNULL(G.genre_image_back, '') genreImageBack,
                IFNULL(G.genre_name, '')       genre,
                ''                             sex,
                ''                             pitch,
                ''                             tempo,
                ''                             memo
         From Song S
                  left join Genre G on S.genre_idx = G.idx
                  right join (select * from Ranking order by RAND() limit 10) POPULAR_RANDOM ON POPULAR_RANDOM.song_idx = S.idx;
                `;
                const [popularSongsRows] = await connection.query( 
                    selectPopularSongsQuery
                );
                connection.release();
                return res.json({songs: popularSongsRows, isSuccess: true, code: 202, message: "인기차트 노래 추천"});
            }else if(option === 'genre'){
                if(!genre){
                    connection.release();
                    return res.json({isSuccess: false, code: 360, message: "genre를 입력하세요."});
                }
                const selectGenreSongsQuery = `
                select brand,
                no,
                title,
                singer_name                    singer,
                IFNULL(G.genre_image, '')      genreImage,
                IFNULL(G.genre_image_back, '') genreImageBack,
                IFNULL(G.genre_name, '')       genre,
                ''                             sex,
                ''                             pitch,
                ''                             tempo,
                ''                             memo
         From Song S
                  left join Genre G on S.genre_idx = G.idx
         where S.genre_idx = ?
           and S.status = 'N'
         order by RAND()
         limit 10;
                `;
                let genreParams = [genreIdx];
                const [genreSongsRows] = await connection.query( 
                    selectGenreSongsQuery,
                    genreParams
                );
                connection.release();
                return res.json({songs: genreSongsRows, isSuccess: true, code: 203, message: "장르별 노래 추천"});
            }
        } catch (err) {
            logger.error(`getThemes Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.json({isSuccess: false, code: 500, message: "서버 오류"});
        }
    } catch (err) {
        logger.error(`getThemes DB Connection error\n: ${JSON.stringify(err)}`);
        return res.json({isSuccess: false, code: 500, message: "서버 오류"});
    }
};
/**
 update : 2020.09.28
2-2	GET	/songs	노래 검색
 **/
exports.getSongs = async function (req, res) {
    let url = 'https:
    const keyword = encodeURI(req.query['keyword']);
    console.log(keyword);
    if (!keyword) 
    return res.json({isSuccess: false, code: 330, message: "keyword를 입력해주세요."});
    let kumyoungUrl;
    let tjUrl;
    try{
        tjUrl = url +`/singer/${keyword}/tj.json`;
        let tjSingerResultData = await axiosCall('GET', tjUrl);
        let singerResult = tjSingerResultData;
        tjUrl = url+`/song/${keyword}/tj.json`;
        tjTitleResultData = await axiosCall('GET', tjUrl);
        let titleResult = tjTitleResultData;
        let result = singerResult.concat(titleResult);
        result.forEach((element)=>{
            delete element.composer;
            delete element.lyricist;
            delete element.release;
            element.genre = "";
            element.genreImage = "";
        })
        return res.json({songs: result, isSuccess: true, code: 200, message: "노래 검색 성공"});
    }catch(err){
        return res.json({isSuccess: false, code: 400, message: "노래 검색 실패"});
    }
};
/**
 update : 2020.09.28
2-3	GET	/song	특정 노래 조회
 **/
exports.getSong = async function (req, res) {
    const brand = req.query['brand'];
    if (!brand) 
        return res.json({isSuccess: false, code: 300, message: "brand를 입력해주세요."});
    const brands = ['tj'];
    if (!brands.includes(brand)) {
        return res.json({isSuccess: false, code: 301, message: "brand를 확인해주세요."})
    }
    const no = req.query['no'];
    if (!no) 
        return res.json({isSuccess: false, code: 310, message: "no를 입력해주세요."});
    if(isNaN(no)){
        return res.json({isSuccess: false, code: 311, message: "no는 숫자만 가능합니다."});
    }
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const selectSongQuery = `
            select  brand, no, title, singer_name singer, IFNULL(G.genre_name, '') genre
            from Song S
                     left join Genre G on S.genre_idx = G.idx
            where brand = ?
              and no = ?
              and S.status = 'N';
            `;
            let selectSongParams = [brand, no];
            const [SongRows] = await connection.query(
                selectSongQuery,
                selectSongParams
            );
            if (SongRows == 0) {
                connection.release();
                const url = 'https:
                let lastUrl;
                if(brand === 'kumyoung'){
                    lastUrl =`/${no}/kumyoung.json`
                }else if(brand === 'tj'){
                    lastUrl =`/${no}/tj.json`
                }
                const finalUrl = url + lastUrl;
                console.log('This is ' + finalUrl);
                const options = {
                    method: 'GET',
                    url: finalUrl,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json;charset=UTF-8'
                    }
                };
                let response = await axios(options);
                let responseOK = response && response.status === 200 && response.statusText === 'OK';
                if (responseOK) {
                    let data = await response.data;
                    console.log(data);
                    if(data.length === 0){
                        return res.json({isSuccess: false, code: 400, message: "존재하지 않는 노래입니다."});
                    }
                    let finalData = data[0];
                    finalData.genre=[];
                    delete finalData.composer;
                    delete finalData.lyricist;
                    delete finalData.release;
                    finalData.genreImage="";
                    return res.json({song: finalData, isSuccess: true, code: 200, message: "특정 노래 조회"});
                }
                return res.json({isSuccess: false, code: 502, message: "외부 서버 오류"});
            }
            const songIdx = SongRows[0].idx;
            SongRows[0].genreImage = "";
            connection.release();
            return res.json(
                {song: SongRows[0], isSuccess: true, code: 200, message: "특정 노래 조회"}
            );
        } catch (err) {
            logger.error(`example non transaction Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.json({isSuccess: false, code: 500, message: "서버 오류"});
}
    } catch (err) {
        logger.error(`example non transaction DB Connection error\n: ${JSON.stringify(err)}`);
        return res.json({isSuccess: false, code: 500, message: "서버 오류"});
    }
};
/**
 update : 2020.10.02
2-4	GET	/songs/ranking	랭킹 조회
 **/
exports.getSongsRanking = async function (req, res) {
    let week;
    try{
        const format = "YY.MM.DD";
        const last_monday = moment()
            .day(-6)
            .format(format);
        const last_sunday = moment()
            .day(0)
            .format(format);
        week = `${last_monday} ~ ${last_sunday}`;
    } catch(err) {
        return res.json({isSuccess: false, code: 500, message: "서버 오류"});
    }
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const selectRankingQuery = `
            select R.song_idx              songIdx,
            R.ranking,
            R.variation,
            S.brand,
            S.no,
            S.title,
            S.singer_name           singer,
            G.genre_name genre,
            IFNULL(genre_image, '') genreImage
     from Ranking R
              left join Song S ON S.idx = R.song_idx
              left join Genre G on S.genre_idx = G.idx
     order by ranking;
            `;
            const [SongGenreRows] = await connection.query(
                selectRankingQuery
            );
            connection.release();
            return res.json({week: week, songs: SongGenreRows, isSuccess: true, code: 200, message: "랭킹 조회"});
        } catch (err) {
            logger.error(`2-4 Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.json({isSuccess: false, code: 500, message: "서버 오류"});
        }
    } catch (err) {
        logger.error(`2-4 DB Connection error\n: ${JSON.stringify(err)}`);
        return res.json({isSuccess: false, code: 500, message: "서버 오류"});
    }
};
cron.schedule('00 12 * * 1', async () => {
    const Monday = moment2().tz("Asia/Seoul").format('YYYY-MM-DD');
    console.log("moment " + Monday);
    const lastMonday = moment2().tz("Asia/Seoul").subtract(7, 'days').format('YYYY-MM-DD');
    console.log("moment " + lastMonday);
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            await connection.beginTransaction(); 
            const deleteRankingTempQuery = `
                        DELETE
                        FROM RankingTemp;
                        `;
            await connection.query(deleteRankingTempQuery);
                console.log("this is delete Temp test ");
            const insertTempRankingQuery = `    
            INSERT INTO RankingTemp
            (ranking, song_idx, variation)
        select BOARD.currentRanking, song_idx,
               IF(BOARD.pastRanking is null, 'new',
                  (CAST(BOARD.pastRanking as SIGNED) - CAST(BOARD.currentRanking as SIGNED))) newRanking
        FROM (
                 select LATEST_RANKING.song_idx, Ranking.ranking pastRanking, LATEST_RANKING.ranking currentRanking
                 from Ranking
                          right join (select ranking, song_idx
                                      from Song
                                               right join (select ROW_NUMBER() over (order by RANKING.num desc) ranking, song_idx
                                                           from (select song_idx, count(*) num
                                                                 from PlaylistSong
                                                                  where created_at >= ?
                                                                   and created_at <= ?
                                                                 group by song_idx) RANKING
                                                           limit 100) FINAL_RANK
                                                          on FINAL_RANK.song_idx = Song.idx) LATEST_RANKING
                                     ON LATEST_RANKING.song_idx = Ranking.song_idx) BOARD
        order by BOARD.currentRanking;
            `;
            let dayParams = [lastMonday, Monday];
            await connection.query(
                insertTempRankingQuery,
                dayParams
            );
            console.log(typeof(NewRankingRows));
            const deleteRankingQuery = `
            DELETE
            FROM Ranking;
            `;
            await connection.query(deleteRankingQuery);
            console.log('delete temp');
            const insertSongQuery = `
            INSERT INTO Ranking SELECT * FROM RankingTemp  
                `;
            await connection.query(insertSongQuery);
            console.log("this is 4th test ");
            await connection.commit(); 
            connection.release();
        } catch (err) {
            logger.error(`example non transaction Query error\n: ${JSON.stringify(err)}`);
            console.log(err.message);
            connection.release();
            return false;
        }
    } catch (err) {
        logger.error(`example non transaction DB Connection error\n: ${JSON.stringify(err)}`);
        console.log(err.message);
        return false;
    }
    console.log("Cron 실행 완료");
}, {
    scheduled: true,
    timezone: "Asia/Seoul"
});