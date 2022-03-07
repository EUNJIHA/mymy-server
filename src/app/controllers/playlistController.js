const {pool} = require('../../../config/database');
const {knex} = require('../../../config/knex');
const {logger} = require('../../../config/winston');
const jwt = require('jsonwebtoken');
const axios = require('axios');
/**
 update : 2020.09.18
3-1	GET	/playlist	플레이리스트 조회 / 검색
 */
exports.getThemes = async function (req, res) {
    const word = req.query['word'];
    const token = req.headers['x-access-token'];
    const userIdx = jwt.decode(token).idx;
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            if (word) {
                const selectSpecificPlaylistQuery = `
                                        select idx playlistIdx, user_idx userIdx, title, color, date_format(created_at, '%Y.%m.%d') createdAt, IF(countTB.songCount is null, 0, countTB.songCount) songCount
                                        from Playlist
                                        left join (select playlist_idx, COUNT(song_idx) songCount from PlaylistSong group by playlist_idx
                                        ) countTB on countTB.playlist_idx = Playlist.idx
                                        where status = 'N' and (user_idx = 0 or user_idx = ?) and title LIKE concat('%', ?,'%');
                                                            `;
                const selectSpecificPlaylistParams = [userIdx, word];
                const [specificPlaylistRows] = await connection.query(
                    selectSpecificPlaylistQuery,
                    selectSpecificPlaylistParams
                );
                const result = {
                    main: specificPlaylistRows
                }
                connection.release();
                return res.json({result: result, isSuccess: true, code: 201, message: "플레이리스트 검색 성공"});
            }
            const selectPlaylistQuery = `
                        select idx playlistIdx, title, color, date_format(created_at, '%Y.%m.%d') createdAt, IF(countTB.songCount is null, 0, countTB.songCount) songCount
                        from Playlist
                        left join (select playlist_idx, COUNT(song_idx) songCount from PlaylistSong group by playlist_idx
                        ) countTB on countTB.playlist_idx = Playlist.idx
                        where status = 'N' and user_idx = ?;
                                        `;
            const selectPlaylistParams = [userIdx];
            const [playlistRows] = await connection.query(
                selectPlaylistQuery,
                selectPlaylistParams
            );
            const [adminPlaylistRows] = await connection.query(
                `
                select idx playlistIdx, title, color, date_format(created_at, '%Y.%m.%d') createdAt, IF(countTB.songCount is null, 0, countTB.songCount) songCount
                from Playlist
                left join (select playlist_idx, COUNT(song_idx) songCount from PlaylistSong group by playlist_idx
                ) countTB on countTB.playlist_idx = Playlist.idx
                where status = 'N' and user_idx = 0;
                `
            );
            const result = {
                main: playlistRows,
                recommend: adminPlaylistRows
            }
            connection.release();
            return res.json({result: result, isSuccess: true, code: 200, message: "플레이리스트 조회 성공"});
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
 update : 2020.09.18
3-2	POST	/playlist	플레이리스트 추가
 */
exports.postTheme = async function (req, res) {
    const {title, color} = req.body;
    const token = req.headers['x-access-token'];
    const userIdx = jwt.decode(token).idx;
    if (!title) 
    return res.json({isSuccess: false, code: 300, message: "title을 입력해주세요."});
    if (title.length > 45) 
    return res.json(
        {isSuccess: false, code: 301, message: "title은 45자리 미만으로 입력해주세요."}
    );
    if (!color) 
    return res.json({isSuccess: false, code: 310, message: "color를 입력해주세요."});
    var regex = /^#(?:[0-9a-f]{3}){1,2}$/i;
    if (!regex.test(color)) {
        return res.json({isSuccess: false, code: 311, message: "color 형식을 확인해주세요."});
    }
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const selectPlaylistQuery = `
            select * from Playlist where title =? and color =? and user_idx =?
                                    `;
            const selectPlaylistParams = [title, color, userIdx];
            const [playlistRows] = await connection.query(
                selectPlaylistQuery,
                selectPlaylistParams
            );
            if (playlistRows.length > 0) {
                connection.release();
                return res.json({isSuccess: false, code: 400, message: "이미 있는 플레이리스트"});
            }
            const insertPlaylistQuery = 
            `
            insert into Playlist (user_idx, title, color) values (?, ?, ?);
            `;
            const insertPlaylistParams = [userIdx, title, color];
            await connection.query(insertPlaylistQuery, insertPlaylistParams);
            connection.release();
            return res.json({isSuccess: true, code: 200, message: "플레이리스트 추가"});
        } catch (err) {
            logger.error(`3-2 Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.json({isSuccess: false, code: 500, message: "서버 오류"});
            }
    } catch (err) {
        logger.error(`3-2 DB Connection error\n: ${JSON.stringify(err)}`);
        return res.json({isSuccess: false, code: 501, message: "서버 오류"});
    }
};
/**
 update : 2020.09.22
3-3	PATCH	/playlist/{playlistIdx}	플레이리스트 수정
 */
exports.patchTheme = async function (req, res) {
    const playlistIdx = req.params.playlistIdx;
    const {title, color} = req.body;
    const token = req.headers['x-access-token'];
    const userIdx = jwt.decode(token).idx;
    if(isNaN(playlistIdx)){
        return res.json({isSuccess: false, code: 300, message: "playlistIdx는 숫자만 가능합니다."});
    }
    if(!title && !color){
        return res.json(
            {isSuccess: false, code: 300, message: "수정할 값이 없습니다."}
        ); 
    }
    if (title){
        if (title.length > 45) 
        return res.json(
            {isSuccess: false, code: 301, message: "title은 45자리 미만으로 입력해주세요."}
        );
    } 
    if (color){
        var regex = /^#(?:[0-9a-f]{3}){1,2}$/i;
        if (!regex.test(color)) {
            return res.json({isSuccess: false, code: 311, message: "color 형식을 확인해주세요."});
        }
    } 
knex.transaction(function(trx) {
    knex('Playlist')
        .select('*')
        .where({
            idx: playlistIdx,
            user_idx: userIdx
        })
      .transacting(trx)
      .then(function(exist) {
          console.log(exist);
        if(exist.length === 0){
            return res.json({isSuccess: false, code: 501, message: "해당 Playlist가 존재하지 않습니다."});
        }
        return knex('Playlist')
        .where({
        user_idx: userIdx,
        idx: playlistIdx 
        })
        .update({
        title: title,
        color: color
        })
        .transacting(trx);
      })
      .then(trx.commit)
      .catch(trx.rollback)
  })
  .then(function() {
      return res.json({isSuccess: true, code: 200, message: "Playlist 수정 성공"});
  })
  .catch(function(error) {
    console.log(error.message);
  })
};
/**
 update : 2020.09.24
3-4	DELETE	/playlist/{playlistIdx}	플레이리스트 삭제
 */
exports.deleteTheme = async function (req, res) {
    const playlistIdx = req.params.playlistIdx;
    const token = req.headers['x-access-token'];
    const userIdx = jwt.decode(token).idx;
    if(isNaN(playlistIdx)){
        return res.json({isSuccess: false, code: 300, message: "playlistIdx는 숫자만 가능합니다."});
    }
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const selectPlaylistQuery = `
            select EXISTS(select * from Playlist where idx =? and user_idx =?) as EXIST
            ;
            `;
            let selectPlaylistParams = [playlistIdx, userIdx];
            const [existPlaylistRows] = await connection.query(
                selectPlaylistQuery,
                selectPlaylistParams
            );
            if (existPlaylistRows[0].EXIST === 0) {
                connection.release();
                return res.json({isSuccess: false, code: 501, message: "해당 Playlist가 존재하지 않습니다."});
            }
            const selectPlaylistStatusQuery = `
            select status from Playlist where user_idx =? and idx = ?;
            ;
            `;
            let selectPlaylistStatusParams = [userIdx, playlistIdx];
            const [existPlaylistStatusRows] = await connection.query(
                selectPlaylistStatusQuery,
                selectPlaylistStatusParams
            );
            if (existPlaylistStatusRows[0].status === 'Y') {
                connection.release();
                return res.json({isSuccess: false, code: 502, message: "이미 삭제된 Playlist입니다."});
            }
            const updateStatusQuery = `
            UPDATE Playlist
            SET status = 'Y'
            WHERE user_idx = ? and idx = ?;
                            `;
            const updateStatusQueryParams = [userIdx, playlistIdx];
            await connection.query(updateStatusQuery, updateStatusQueryParams);
            connection.release();
            return res.json({isSuccess: true, code: 200, message: "Playlist 삭제 성공"});
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
 update : 2020.09.24
3-5	GET	/playlist/{playlistIdx}/songs	플레이리스트에 해당하는 노래 조회
 */
exports.getThemeSongs = async function (req, res) {
    const playlistIdx = req.params.playlistIdx;
    const token = req.headers['x-access-token'];
    const userIdx = jwt.decode(token).idx;
    if(isNaN(playlistIdx)){
        return res.json({isSuccess: false, code: 300, message: "playlistIdx는 숫자만 가능합니다."});
    }
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const selectAdminPlaylistQuery = `
            select user_idx from Playlist where idx = ?;
            ;
            `;
            let isAdminPlaylistParams = [playlistIdx];
            const [adminPlaylistRows] = await connection.query(
                selectAdminPlaylistQuery,
                isAdminPlaylistParams
            );
            if (adminPlaylistRows[0].user_idx !== 0) {
                const selectPlaylistQuery = `
                        select EXISTS(select * from Playlist where idx =? and user_idx =?) as EXIST
                        ;
                        `;
                let selectPlaylistParams = [playlistIdx, userIdx];
                const [existPlaylistRows] = await connection.query(
                    selectPlaylistQuery,
                    selectPlaylistParams
                );
                if (existPlaylistRows[0].EXIST === 0) {
                    connection.release();
                    return res.json(
                        {isSuccess: false, code: 501, message: "해당 Playlist가 존재하지 않습니다."}
                    );
                }
            }
            const selectPlaylistSongQuery = `
            select PlaylistSong.song_idx songIdx, SongDetail.title, singer, brand, no, genre_name genre, genre_image genreImage
            from PlaylistSong
                     left join (select S.idx       song_idx,
                                       title,
                                       singer_name singer,
                                       no,
                                       brand,
                                       G.genre_name,
                                       S.status,
                                       G.genre_image
                                from Song S
                                         left join Genre G on S.genre_idx = G.idx) SongDetail
                               on SongDetail.song_idx = PlaylistSong.song_idx
            where playlist_idx = ?
              and PlaylistSong.status = 'N';
                                        `;
            const selectPlaylistSongParams = [playlistIdx];
            const [playlistSongRows] = await connection.query(
                selectPlaylistSongQuery,
                selectPlaylistSongParams
            );
            connection.release();
            return res.json({result: playlistSongRows, isSuccess: true, code: 200, message: "플레이리스트 노래 조회 성공"});
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
 update : 2020.10.01
3-6	POST	/playlist/{playlistIdx}/songs	플레이리스트-노래 추가
 */
exports.postThemeSong = async function (req, res) {
    const playlistIdx = req.params.playlistIdx;
    let {
        brand,
        no,
        sex,
        pitch,
        tempo,
        memo
    } = req.body;
    const token = req.headers['x-access-token'];
    const userIdx = jwt
        .decode(token)
        .idx;
    if (isNaN(playlistIdx)) {
        return res.json(
            {isSuccess: false, code: 399, message: "playlistIdx는 숫자만 가능합니다."}
        );
    }
    if (!brand) 
        return res.json({isSuccess: false, code: 300, message: "brand를 입력해주세요."});
    const brands = ['tj'];
    if (!brands.includes(brand)) {
        return res.json({isSuccess: false, code: 301, message: "brand를 확인해주세요."})
    }
    if (!no) 
        return res.json({isSuccess: false, code: 310, message: "no를 입력해주세요."});
    if (isNaN(no)) {
        return res.json({isSuccess: false, code: 311, message: "no는 숫자만 가능합니다."});
    }
    if (sex) {
        const sexDictionary = {
            "여성": "F",
            "남성": "M",
            "기본": "D"
        };
        if (sex in sexDictionary) {
            sex = sexDictionary[sex];
        }
        if (sex != "M" && sex != "F" && sex != "D") {
            return res.json({isSuccess: false, code: 401, message: "성별 형식을 확인해주세요."});
        }
    }
    const regexInt = /^[+-]+?\d*$/;
    if (pitch) {
        if (pitch == "기본") {
            pitch = "D"
        }
        if (!regexInt.test(pitch) && pitch != "D") {
            return res.json({isSuccess: false, code: 402, message: "음정 형식을 확인해주세요."});
        }
    }
    if (tempo) {
        if (tempo == "기본") {
            tempo = "D"
        }
        if (!regexInt.test(tempo) && tempo != "D") {
            return res.json({isSuccess: false, code: 403, message: "박자 형식을 확인해주세요."});
        }
    }
    if (memo) {
        if (memo.length > 100) 
            return res.json(
                {isSuccess: false, code: 404, message: "메모는 최대 100자까지 입력해주세요."}
            );
        }
    let songIdx;
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const selectPlaylistQuery = `
            select EXISTS(select * from Playlist where idx =? and user_idx =?) as EXIST
            ;
            `;
            let selectPlaylistParams = [playlistIdx, userIdx];
            const [existPlaylistRows] = await connection.query(
                selectPlaylistQuery,
                selectPlaylistParams
            );
            if (existPlaylistRows[0].EXIST === 0) {
                connection.release();
                return res.json(
                    {isSuccess: false, code: 501, message: "해당 Playlist가 존재하지 않습니다."}
                );
            }
            const selectSongQuery = `
             select *
             From Song S
             where brand = ? and no = ? and status = 'N'
             `;
            let selectSongParams = [brand, no];
            const [SongRows] = await connection.query(selectSongQuery, selectSongParams);
            if (SongRows == 0) {
                const url = 'https:
                let lastUrl;
                if (brand === 'kumyoung') {
                    lastUrl = `/${no}/kumyoung.json`
                } else if (brand === 'tj') {
                    lastUrl = `/${no}/tj.json`
                }
                const finalUrl = url + lastUrl;
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
                    if (data.length === 0) {
                        connection.release();
                        return res.json({isSuccess: false, code: 400, message: "존재하지 않는 노래입니다."});
                    }
                    const titleForInsert = data[0].title;
                    const singerForInsert = data[0].singer;
                    await connection.beginTransaction(); 
                    const insertSongQuery = `
                    insert into Song(title, singer_name, no, brand)
                    VALUES (?, ?, ?, ?);
                        `;
                    const insertSongParams = [titleForInsert, singerForInsert, no, brand];
                    await connection.query(insertSongQuery, insertSongParams);
                    const lastInsertIdxQuery = "SELECT LAST_INSERT_ID() lastIdx;";
                    const [lastInsertIdxRows] = await connection.query(lastInsertIdxQuery);
                    await connection.commit(); 
                    songIdx = lastInsertIdxRows[0].lastIdx;
                } else {
                    connection.release();
                    return res.json({isSuccess: false, code: 502, message: "외부 서버 오류"});
                }
            } else { 
                songIdx = SongRows[0].idx;
                const selectPlaylistSongQuery = `
                            select EXISTS(select * from PlaylistSong where playlist_idx = ? and song_idx =?) as EXIST
                            ;
                            `;
                let selectPlaylistSongParams = [playlistIdx, songIdx];
                const [existPlaylistSongRows] = await connection.query(
                    selectPlaylistSongQuery,
                    selectPlaylistSongParams
                );
                if (existPlaylistSongRows[0].EXIST === 1) {
                    connection.release();
                    return res.json({isSuccess: false, code: 503, message: "이미 추가된 Song 입니다."});
                }
            }
            try {
                knex('PlaylistSong')
                    .insert({
                        playlist_idx: playlistIdx,
                        song_idx: songIdx,
                        sex: sex,
                        pitch: pitch,
                        tempo: tempo,
                        memo: memo
                    })
                    .then((success) => {
                        connection.release();
                        return res.json({isSuccess: true, code: 200, message: "Playlist - Song 추가 성공"});
                    });
            } catch (error) {
                connection.release();
                console.log(error.message);
            }
        } catch (err) {
            logger.error(`example non transaction Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.json({isSuccess: false, code: 500, message: "서버 오류"});
        }
    } catch (err) {
        logger.error(
            `example non transaction DB Connection error\n: ${JSON.stringify(err)}`
        );
        return res.json({isSuccess: false, code: 500, message: "서버 오류"});
    }
};
/**
 update : 2020.09.18
3-7	DELETE	/playlist/{playlistIdx}/songs/{songIdx}	플레이리스트-노래 삭제
 */
exports.deleteThemeSong = async function (req, res) {
    const playlistIdx = req.params.playlistIdx;
    const songIdx = req.params.songIdx;
    const token = req.headers['x-access-token'];
    const userIdx = jwt.decode(token).idx;
    if(isNaN(playlistIdx)){
        return res.json({isSuccess: false, code: 300, message: "playlistIdx는 숫자만 가능합니다."});
    }
    if(isNaN(songIdx)){
        return res.json({isSuccess: false, code: 301, message: "songIdx는 숫자만 가능합니다."});
    }
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const selectSongQuery = `
            select EXISTS(select * from Song where idx = ?) as EXIST
            ;
            `;
            let selectSongParams = [songIdx];
            const [existSongRows] = await connection.query(
                selectSongQuery,
                selectSongParams
            );
            if (existSongRows[0].EXIST === 0) {
                connection.release();
                return res.json({isSuccess: false, code: 502, message: "해당 Song이 존재하지 않습니다."});
            }
            const selectPlaylistQuery = `
            select EXISTS(select * from Playlist where idx =? and user_idx =?) as EXIST
            ;
            `;
            let selectPlaylistParams = [playlistIdx, userIdx];
            const [existPlaylistRows] = await connection.query(
                selectPlaylistQuery,
                selectPlaylistParams
            );
            if (existPlaylistRows[0].EXIST === 0) {
                connection.release();
                return res.json({isSuccess: false, code: 501, message: "해당 Playlist가 존재하지 않습니다."});
            }
            const selectPlaylistSongQuery = `
            select EXISTS(select * from PlaylistSong where playlist_idx =? and song_idx =?) as EXIST
            ;
            `;
            let selectPlaylistSongParams = [playlistIdx, userIdx];
            const [existPlaylistSongRows] = await connection.query(
                selectPlaylistSongQuery,
                selectPlaylistSongParams
            );
            if (existPlaylistSongRows[0].EXIST === 0) {
                connection.release();
                return res.json({isSuccess: false, code: 504, message: "Playlist에 해당 Song이 존재하지 않습니다."});
            }
            const selectPlaylistSongStatusQuery = `
            select status from PlaylistSong where playlist_idx = ? and song_idx = ?
            ;
            `;
            let selectPlaylistSongStatusParams = [playlistIdx, songIdx];
            const [isDeletedPlaylistSongRows] = await connection.query(
                selectPlaylistSongStatusQuery,
                selectPlaylistSongStatusParams
            );
            if (isDeletedPlaylistSongRows[0].status === 'Y') {
                connection.release();
                return res.json({isSuccess: false, code: 510, message: "이미 삭제된 Playlist - Song입니다."});
            }
            const updateStatusQuery = `
            UPDATE PlaylistSong
            SET status = 'Y'
            WHERE playlist_idx = ? and song_idx = ?;
            `;
            const updateStatusQueryParams = [playlistIdx, songIdx];
            await connection.query(updateStatusQuery, updateStatusQueryParams);
            connection.release();
            return res.json({isSuccess: true, code: 200, message: "Playlist - Song 삭제 성공"});
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
