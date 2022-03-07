const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const request = require("request");
const fetch = require("node-fetch");
const async = require("async");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const regexEmail = require("regex-email");
const crypto = require("crypto");
const secret_config = require("../../../config/secret");
const { type } = require("os");
const { knex } = require("../../../config/knex");
/**
 update : 2020.09.05
 1-1. POST /user 회원가입
 */
exports.signUp = async function (req, res) {
  let { type, email, password, accessToken, nickname, birth, gender } =
    req.body;
  if (!type)
    return res.json({
      isSuccess: false,
      code: 300,
      message: "type을 입력해주세요.",
    });
  const types = ["mymy", "kakao", "naver", "apple"];
  if (!types.includes(type)) {
    return res.json({
      isSuccess: false,
      code: 301,
      message: "type을 확인해주세요.",
    });
  }
  if (!nickname)
    return res.json({
      isSuccess: false,
      code: 330,
      message: "닉네임을 입력 해주세요.",
    });
  if (nickname.length < 2 || nickname.length > 16)
    return res.json({
      isSuccess: false,
      code: 331,
      message: "닉네임은 2자리 이상 16자리 이하로 입력해주세요.",
    });
  const regexDate = /^(19|20)\d{2}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[0-1])$/;
  if (!birth) {
    birth = "";
  } else {
    if (!regexDate.test(birth)) {
      return res.json({
        isSuccess: false,
        code: 340,
        message: "birth 형식을 확인해주세요.",
      });
    }
  }
  const genderDictionary = {
    여성: "F",
    남성: "M",
    기타: "E",
  };
  if (!gender) {
    gender = "";
  }
  if (gender in genderDictionary) {
    gender = genderDictionary[gender];
  }
  if (gender != "" && gender != "M" && gender != "F" && gender != "E") {
    return res.json({
      isSuccess: false,
      code: 350,
      message: "gender 형식을 확인해주세요.",
    });
  }
  if (type === "mymy") {
    if (!email)
      return res.json({
        isSuccess: false,
        code: 310,
        message: "이메일을 입력해주세요.",
      });
    if (email.length > 45)
      return res.json({
        isSuccess: false,
        code: 311,
        message: "이메일은 45자리 미만으로 입력해주세요.",
      });
    if (!regexEmail.test(email))
      return res.json({
        isSuccess: false,
        code: 312,
        message: "이메일을 형식을 정확하게 입력해주세요.",
      });
    if (!password)
      return res.json({
        isSuccess: false,
        code: 320,
        message: "비밀번호를 입력해주세요.",
      });
    if (password.length < 8 || password.length > 15)
      return res.json({
        isSuccess: false,
        code: 321,
        message: "비밀번호는 8~15자리를 입력해주세요.",
      });
    let chk_num = password.search(/[0-9]/g);
    let chk_eng = password.search(/[a-z]/g);
    if (chk_num < 0 || chk_eng < 0) {
      return res.json({
        isSuccess: false,
        code: 322,
        message: "비밀번호는 숫자와 영소문자를 혼합해야 합니다.",
      });
    }
    try {
      const connection = await pool.getConnection(async (conn) => conn);
      try {
        const selectEmailQuery = `
                        SELECT idx
                        FROM UserInfo
                        WHERE email = ? and type = 'M';
                            `;
        const selectEmailParams = [email];
        const [emailRows] = await connection.query(
          selectEmailQuery,
          selectEmailParams
        );
        if (emailRows.length > 0) {
          connection.release();
          return res.json({
            isSuccess: false,
            code: 360,
            message: "이메일 중복 사용불가",
          });
        }
        const selectNicknameQuery = `
                            SELECT idx 
                            FROM UserInfo 
                            WHERE nickname = ?;
                            `;
        const selectNicknameParams = [nickname];
        const [nicknameRows] = await connection.query(
          selectNicknameQuery,
          selectNicknameParams
        );
        if (nicknameRows.length > 0) {
          connection.release();
          return res.json({
            isSuccess: false,
            code: 361,
            message: "닉네임 중복 사용불가",
          });
        }
        await connection.beginTransaction(); 
        const hashedPassword = await crypto
          .createHash("sha512")
          .update(password)
          .digest("hex");
        const insertUserInfoQuery = `
                            INSERT INTO UserInfo(email, password, nickname, birth, gender)
                            VALUES (?, ?, ?, ?, ?);
                                `;
        const insertUserInfoParams = [
          email,
          hashedPassword,
          nickname,
          birth,
          gender,
        ];
        await connection.query(insertUserInfoQuery, insertUserInfoParams);
        await connection.commit(); 
        connection.release();
        return res.json({
          isSuccess: true,
          code: 200,
          message: "회원가입 성공",
        });
      } catch (err) {
        await connection.rollback(); 
        connection.release();
        logger.error(`App - SignUp Query error\n: ${err.message}`);
        return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
      }
    } catch (err) {
      connection.release();
      logger.error(`App - SignUp DB Connection error\n: ${err.message}`);
      return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
    }
  } else {
    if (!accessToken)
      return res.json({
        isSuccess: false,
        code: 302,
        message: "accessToken을 입력해주세요.",
      });
  }
  if (type === "apple") {
    res.json({ isSuccess: true, code: 210, message: "애플 로그인" });
  }
  if (type === "kakao") {
    let kakaoAccessToken = accessToken;
    let header = "Bearer " + kakaoAccessToken; 
    let url = "https:
    let options = {
      method: "GET",
      mode: "cors",
      headers: {
        Authorization: header,
      },
    };
    let response = await fetch(url, options);
    let data = await response.json();
    let responseOK = response && response.ok;
    console.log(responseOK);
    if (!responseOK) {
      console.log(data);
      if (data.code === -401) {
        return res.json({
          isSuccess: false,
          code: 401,
          message: "인증 오류 (accessToken을 확인하세요)",
        });
      } else {
        return res.json({
          isSuccess: false,
          code: 502,
          message: "외부 서버 오류",
        });
      }
    } else {
      console.log(data);
      try {
        const connection = await pool.getConnection(async (conn) => conn);
        try {
          const kakaoId = data["id"];
          console.log("ID는 " + kakaoId);
          const selectKakaoIdQuery = `SELECT
                                    idx FROM UserInfo WHERE kakao_id = ?;`;
          const selectKakaoIdParams = [kakaoId];
          const [kakaoIdRows] = await connection.query(
            selectKakaoIdQuery,
            selectKakaoIdParams
          );
          if (kakaoIdRows.length > 0) {
            connection.release();
            return res.json({
              isSuccess: false,
              code: 111,
              message: "이미 회원가입 되어 있습니다.",
            });
          } else {
            const selectNicknameQuery = `
                                    SELECT idx 
                                    FROM UserInfo 
                                    WHERE nickname = ?;
                                    `;
            const selectNicknameParams = [nickname];
            const [nicknameRows] = await connection.query(
              selectNicknameQuery,
              selectNicknameParams
            );
            if (nicknameRows.length > 0) {
              connection.release();
              return res.json({
                isSuccess: false,
                code: 361,
                message: "닉네임 중복 사용불가",
              });
            }
            const insertUserInfoQuery = `
                                            INSERT INTO UserInfo(nickname, birth, gender, type, kakao_id)
                                            VALUES (?, ?, ?, ?, ?);
                                                `;
            console.log(kakaoId);
            const insertUserInfoParams = [
              nickname,
              birth,
              gender,
              "K",
              kakaoId,
            ];
            await connection.query(insertUserInfoQuery, insertUserInfoParams);
            connection.release();
            return res.json({
              isSuccess: true,
              code: 200,
              message: "카카오 회원가입 성공",
            });
          }
        } catch (err) {
          await connection.rollback(); 
          connection.release();
          logger.error(`App - Social Login Query error\n: ${err.message}`);
          return res.json({
            isSuccess: false,
            code: 500,
            message: "서버 오류",
          });
        }
      } catch (err) {
        logger.error(
          `App - Social Login DB Connection error\n: ${err.message}`
        );
        return res.json({ isSuccess: false, code: 501, message: "서버 오류" });
      }
    }
  }
  if (type === "naver") {
    res.json({ isSuccess: true, code: 200, message: "네이버 로그인" });
  }
};
/**
 update : 2020.09.06
 1-2. POST /login 로그인
 **/
exports.signIn = async function (req, res) {
  const { email, password } = req.body;
  if (!email)
    return res.json({
      isSuccess: false,
      code: 310,
      message: "이메일을 입력해주세요.",
    });
  if (email.length > 45)
    return res.json({
      isSuccess: false,
      code: 311,
      message: "이메일은 45자리 미만으로 입력해주세요.",
    });
  if (!regexEmail.test(email))
    return res.json({
      isSuccess: false,
      code: 312,
      message: "이메일을 형식을 정확하게 입력해주세요.",
    });
  if (!password)
    return res.json({
      isSuccess: false,
      code: 320,
      message: "비밀번호를 입력 해주세요.",
    });
  try {
    const connection = await pool.getConnection(async (conn) => conn);
    try {
      const selectUserInfoQuery = `
            SELECT idx, email, password, nickname, status
            FROM UserInfo 
            WHERE email = ?;
            `;
      let selectUserInfoParams = [email];
      const [userInfoRows] = await connection.query(
        selectUserInfoQuery,
        selectUserInfoParams
      );
      if (userInfoRows.length < 1) {
        connection.release();
        return res.json({
          isSuccess: false,
          code: 370,
          message: "아이디를 확인해주세요.",
        });
      }
      const hashedPassword = await crypto
        .createHash("sha512")
        .update(password)
        .digest("hex");
      if (userInfoRows[0].password !== hashedPassword.substring(0, 45)) {
        connection.release();
        return res.json({
          isSuccess: false,
          code: 371,
          message: "비밀번호를 확인해주세요.",
        });
      }
      if (userInfoRows[0].status === "Y") {
        connection.release();
        return res.json({
          isSuccess: false,
          code: 500,
          message: "탈퇴된 계정입니다. 고객센터에 문의해주세요.",
        });
      }
      let token = await jwt.sign(
        {
          idx: userInfoRows[0].idx,
          email: email,
        }, 
        secret_config.jwtsecret, 
        {
          expiresIn: "365d",
          subject: "userInfo",
        } 
      );
      connection.release();
      return res.json({
        userInfo: {
          idx: userInfoRows[0].idx,
          email: email,
          nickname: userInfoRows[0].nickname,
        },
        jwt: token,
        isSuccess: true,
        code: 200,
        message: "로그인 성공",
      });
    } catch (err) {
      logger.error(`App - SignIn Query error\n: ${JSON.stringify(err)}`);
      connection.release();
      return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
    }
  } catch (err) {
    logger.error(`App - SignIn DB Connection error\n: ${JSON.stringify(err)}`);
    return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
  }
};
/**
 update : 2020.10.04
 1-3. POST /login/auth 소셜 로그인
 **/
exports.authSignIn = async function (req, res) {
  let { accessToken, type } = req.body;
  if (!type)
    return res.json({
      isSuccess: false,
      code: 300,
      message: "type을 입력해주세요.",
    });
  const types = ["kakao", "naver", "apple"];
  if (!types.includes(type)) {
    return res.json({
      isSuccess: false,
      code: 301,
      message: "type을 확인해주세요.",
    });
  }
  if (!accessToken)
    return res.json({
      isSuccess: false,
      code: 302,
      message: "accessToken을 입력해주세요.",
    });
  if (type === "apple") {
    res.json({ isSuccess: true, code: 210, message: "애플 로그인" });
  }
  if (type === "kakao") {
    let kakaoAccessToken = accessToken;
    let header = "Bearer " + kakaoAccessToken; 
    let url = "https:
    let options = {
      method: "GET",
      mode: "cors",
      headers: {
        Authorization: header,
      },
    };
    let response = await fetch(url, options);
    let data = await response.json();
    let responseOK = response && response.ok;
    console.log(responseOK);
    if (!responseOK) {
      console.log(data);
      if (data.code === -401) {
        return res.json({
          isSuccess: false,
          code: 401,
          message: "인증 오류 (accessToken을 확인하세요)",
        });
      } else {
        return res.json({
          isSuccess: false,
          code: 502,
          message: "외부 서버 오류",
        });
      }
    } else {
      console.log(data);
      try {
        const connection = await pool.getConnection(async (conn) => conn);
        try {
          const kakaoId = data["id"];
          console.log("ID는 " + kakaoId);
          const selectKakaoIdQuery = `SELECT
                                idx, kakao_id, nickname FROM UserInfo WHERE kakao_id = ?;`;
          const selectKakaoIdParams = [kakaoId];
          const [kakaoRows] = await connection.query(
            selectKakaoIdQuery,
            selectKakaoIdParams
          );
          if (kakaoRows.length > 0) {
            let token = await jwt.sign(
              {
                idx: kakaoRows[0].idx,
                kakaoId: kakaoId,
              }, 
              secret_config.jwtsecret,
              {
                expiresIn: "365d", 
                subject: "userInfo",
              }
            );
            console.log("###" + kakaoRows[0].idx);
            connection.release();
            return res.json({
              userInfo: {
                idx: kakaoRows[0].idx,
                kakaoId: kakaoRows[0].kakao_id,
                nickname: kakaoRows[0].nickname,
              },
              jwt: token,
              isSuccess: true,
              code: 201,
              message: "카카오 로그인 성공",
            });
          }
        } catch (err) {
          await connection.rollback(); 
          connection.release();
          logger.error(`App - Social Login Query error\n: ${err.message}`);
          return res.json({
            isSuccess: false,
            code: 500,
            message: "서버 오류",
          });
        }
      } catch (err) {
        logger.error(
          `App - Social Login DB Connection error\n: ${err.message}`
        );
        return res.json({ isSuccess: false, code: 501, message: "서버 오류" });
      }
    }
  }
  if (type === "naver") {
    res.json({ isSuccess: true, code: 200, message: "네이버 로그인" });
  }
};
/**
 update : 2020.09.17
 1-4. POST /login/auto 자동 로그인
 **/
exports.check = async function (req, res) {
  const token = req.headers["x-access-token"];
  const userIdx = jwt.decode(token).idx;
  try {
    const connection = await pool.getConnection(async (conn) => conn);
    try {
      const selectUserInfoQuery = `
            SELECT status
            FROM UserInfo 
            WHERE idx = ?;
            `;
      let userIdxParams = [userIdx];
      const [userInfoRows] = await connection.query(
        selectUserInfoQuery,
        userIdxParams
      );
      if (userInfoRows[0].status === "Y") {
        connection.release();
        return res.json({
          isSuccess: false,
          code: 500,
          message: "탈퇴된 계정입니다. 고객센터에 문의해주세요.",
        });
      }
      connection.release();
      return res.json({
        isSuccess: true,
        code: 200,
        message: "검증 성공",
        info: req.verifiedToken,
      });
    } catch (err) {
      await connection.rollback(); 
      connection.release();
      logger.error(`App - Query error\n: ${err.message}`);
      return res.json({ isSuccess: false, code: 501, message: "서버 오류" });
    }
  } catch (err) {
    logger.error(`App - DB Connection error\n: ${err.message}`);
    return res.json({ isSuccess: false, code: 501, message: "서버 오류" });
  }
};
/**
 update : 2020.09.16
 1-5. POST /token 비밀번호 재설정
 **/
exports.token = async function (req, res, next) {
  const { email } = req.body;
  if (!email)
    return res.json({
      isSuccess: false,
      code: 310,
      message: "이메일을 입력해주세요.",
    });
  if (email.length > 45)
    return res.json({
      isSuccess: false,
      code: 311,
      message: "이메일은 45자리 미만으로 입력해주세요.",
    });
  if (!regexEmail.test(email))
    return res.json({
      isSuccess: false,
      code: 312,
      message: "이메일을 형식을 정확하게 입력해주세요.",
    });
  let token;
  try {
    const connection = await pool.getConnection(async (conn) => conn);
    try {
      const selectEmailQuery = `
                                        SELECT email
                                        FROM UserInfo
                                        WHERE email = ? and type = 'M';
                                        `;
      const selectEmailParams = [email];
      const [emailRows] = await connection.query(
        selectEmailQuery,
        selectEmailParams
      );
      if (emailRows.length < 1) {
        connection.release();
        return res.json({
          isSuccess: false,
          code: 313,
          message: "해당 이메일 정보가 존재하지 않습니다.",
        });
      }
      token = crypto.randomBytes(5).toString("hex"); 
      console.log(token);
      const updateUserInfoQuery = `
                                        UPDATE UserInfo
                                        SET password_token = ?, password_token_expires= DATE_ADD(NOW(), INTERVAL 10 MINUTE)
                                        WHERE email = ?;
                                                `;
      const updateUserInfoParams = [token, emailRows[0].email];
      await connection.query(updateUserInfoQuery, updateUserInfoParams);
      console.log("업데이트 완료");
      connection.release();
    } catch (err) {
      connection.release();
      logger.error(`App - SignUp Query error\n: ${err.message}`);
      return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
    }
  } catch (err) {
    logger.error(`App - SignUp DB Connection error\n: ${err.message}`);
    return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
  }
  try {
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, 
      auth: {
        user: "makeus.grace@gmail.com", 
        pass: "ugoxvhrwskkclycb", 
      },
    });
    let info = await transporter.sendMail({
      from: "makeus.grace@gmail.com", 
      to: email, 
      subject: "[mymy] 비밀번호 재설정 인증번호", 
      html:
        "<p>비밀번호 재설정 인증번호입니다.</p> <p>인증번호: " +
        token +
        "<p>해당 인증번호를 mymy 앱에 10분 이내에 입력해주세요.</p>", 
    });
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    return res.json({
      isSuccess: true,
      code: 200,
      message: "인증번호 전송 완료",
    });
  } catch (err) {
    console.log(err.message);
    return res.json({ isSuccess: false, code: 400, message: "실패" });
  }
};
/**
 update : 2020.10.19
 1-6. POST /token/auth 토큰인증
 **/
exports.authToken = async function (req, res) {
  const { email, token } = req.body;
  if (!email)
    return res.json({
      isSuccess: false,
      code: 310,
      message: "이메일을 입력해주세요.",
    });
  if (email.length > 45)
    return res.json({
      isSuccess: false,
      code: 311,
      message: "이메일은 45자리 미만으로 입력해주세요.",
    });
  if (!regexEmail.test(email))
    return res.json({
      isSuccess: false,
      code: 312,
      message: "이메일을 형식을 정확하게 입력해주세요.",
    });
  if (!token) {
    return res.json({
      isSuccess: false,
      code: 320,
      message: "인증번호를 입력하세요.",
    });
  }
  try {
    const connection = await pool.getConnection(async (conn) => conn);
    try {
      const selectExpireQuery = `
            select password_token, CASE
            WHEN(password_token_expires < now())THEN 0
            WHEN password_token_expires is null or '' THEN 0
            ELSE 1 END as expires
            from UserInfo
            where email =
                ? and type = 'M' and status = 'N';
                        `;
      const userIdxParams = [email];
      const [tokenRows] = await connection.query(
        selectExpireQuery,
        userIdxParams
      );
      if (tokenRows.length < 1) {
        connection.release();
        return res.json({
          isSuccess: false,
          code: 313,
          message: "해당 이메일 정보가 존재하지 않습니다.",
        });
      }
      if (tokenRows[0]["expires"] == 0) {
        connection.release();
        return res.json({
          isSuccess: false,
          code: 330,
          message: "인증시간이 만료되었습니다.",
        });
      }
      if (tokenRows[0]["password_token"] !== token) {
        connection.release();
        return res.json({
          isSuccess: false,
          code: 340,
          message: "올바르지 않은 인증번호 입니다.",
        });
      }
      connection.release();
      return res.json({
        isSuccess: false,
        code: 200,
        message: "번호 인증 성공",
      });
    } catch (err) {
      logger.error(
        `example non transaction Query error\n: ${JSON.stringify(err)}`
      );
      connection.release();
      return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
    }
  } catch (err) {
    logger.error(
      `example non transaction DB Connection error\n: ${JSON.stringify(err)}`
    );
    return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
  }
};
/**
 update : 2020.10.19
 1-7. POST /reset-password 비밀번호 재설정
 **/
exports.resetpassword = async function (req, res) {
  const { email, pw1, pw2 } = req.body;
  if (!email)
    return res.json({
      isSuccess: false,
      code: 310,
      message: "이메일을 입력해주세요.",
    });
  if (email.length > 45)
    return res.json({
      isSuccess: false,
      code: 311,
      message: "이메일은 45자리 미만으로 입력해주세요.",
    });
  if (!regexEmail.test(email))
    return res.json({
      isSuccess: false,
      code: 312,
      message: "이메일을 형식을 정확하게 입력해주세요.",
    });
  if (!pw1 || !pw2)
    return res.json({
      isSuccess: false,
      code: 320,
      message: "비밀번호를 입력해주세요.",
    });
  if (pw1.length < 8 || pw1.length > 15 || pw2.length < 8 || pw2.length > 15)
    return res.json({
      isSuccess: false,
      code: 321,
      message: "비밀번호는 8~15자리를 입력해주세요.",
    });
  let chk_num = pw1.search(/[0-9]/g);
  let chk_eng = pw1.search(/[a-z]/g);
  let chk_num2 = pw2.search(/[0-9]/g);
  let chk_eng2 = pw2.search(/[a-z]/g);
  if (chk_num < 0 || chk_eng < 0 || chk_num2 < 0 || chk_eng2 < 0) {
    return res.json({
      isSuccess: false,
      code: 322,
      message: "비밀번호는 숫자와 영소문자를 혼합해야 합니다.",
    });
  }
  if (pw1 !== pw2) {
    return res.json({
      isSuccess: false,
      code: 323,
      message: "비밀번호가 일치하지 않습니다.",
    });
  }
  const hashedPassword = await crypto
    .createHash("sha512")
    .update(pw1)
    .digest("hex");
  try {
    const connection = await pool.getConnection(async (conn) => conn);
    try {
      const updatePwQuery = `
            UPDATE UserInfo
            SET password = ?
            WHERE email = ?;
                            `;
      const updateParams = [hashedPassword, email];
      await connection.query(updatePwQuery, updateParams);
      connection.release();
      return res.json({
        isSuccess: true,
        code: 200,
        message: "비밀번호 재설정 완료",
      });
    } catch (err) {
      logger.error(
        `example non transaction Query error\n: ${JSON.stringify(err)}`
      );
      connection.release();
      return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
    }
  } catch (err) {
    logger.error(
      `example non transaction DB Connection error\n: ${JSON.stringify(err)}`
    );
    return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
  }
};
/**
 update : 2020.10.19
 4-1. GET /user 회원 정보 조회
 **/
exports.showUser = async function (req, res) {
  const token = req.headers["x-access-token"];
  const userIdx = jwt.decode(token).idx;
  try {
    const connection = await pool.getConnection(async (conn) => conn);
    try {
      const selectUserInfoQuery = `
            SELECT email,
            nickname,
            IFNULL(birth, '') birth,
            CASE WHEN gender = 'M' THEN '남성' WHEN gender = 'F' THEN '여성' WHEN gender = 'D' THEN '기타' ELSE '' END gender
     FROM UserInfo
     WHERE idx = ?;
            `;
      let userIdxParams = [userIdx];
      const [userInfo] = await connection.query(
        selectUserInfoQuery,
        userIdxParams
      );
      if (userInfo.length < 1) {
        connection.release();
        return res.json({
          isSuccess: false,
          code: 400,
          message: "회원 정보 조회 실패",
        });
      }
      connection.release();
      return res.json({
        userInfo: userInfo[0],
        isSuccess: true,
        code: 200,
        message: "회원 정보 조회",
      });
    } catch (err) {
      logger.error(
        `example non transaction Query error\n: ${JSON.stringify(err)}`
      );
      connection.release();
      return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
    }
  } catch (err) {
    logger.error(
      `example non transaction DB Connection error\n: ${JSON.stringify(err)}`
    );
    return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
  }
};
/**
 update : 2020.10.19
 4-2. PATCH /user 회원 정보 수정
 **/
exports.patchUser = async function (req, res) {
  let { nickname, birth, gender } = req.body;
  const token = req.headers["x-access-token"];
  const userIdx = jwt.decode(token).idx;
  if (!nickname)
    return res.json({
      isSuccess: false,
      code: 330,
      message: "닉네임을 입력 해주세요.",
    });
  if (nickname.length < 2 || nickname.length > 16)
    return res.json({
      isSuccess: false,
      code: 331,
      message: "닉네임은 2자리 이상 16자리 이하로 입력해주세요.",
    });
  const regexDate = /^(19|20)\d{2}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[0-1])$/;
  if (!birth) {
    birth = "";
  } else {
    if (!regexDate.test(birth)) {
      return res.json({
        isSuccess: false,
        code: 340,
        message: "birth 형식을 확인해주세요.",
      });
    }
  }
  const genderDictionary = {
    여성: "F",
    남성: "M",
    기타: "E",
  };
  if (!gender) {
    gender = "";
  }
  if (gender in genderDictionary) {
    gender = genderDictionary[gender];
  }
  if (gender != "" && gender != "M" && gender != "F" && gender != "E") {
    return res.json({
      isSuccess: false,
      code: 350,
      message: "gender 형식을 확인해주세요.",
    });
  }
  if (!nickname && !birth && !gender) {
    return res.json({
      isSuccess: false,
      code: 300,
      message: "수정할 값이 없습니다.",
    });
  }
  knex
    .transaction(function (trx) {
      knex("UserInfo")
        .select("*")
        .whereNotIn(`idx`, [userIdx])
        .where({ nickname: nickname, status: "N" })
        .transacting(trx)
        .then(function (exist) {
          console.log(exist);
          if (exist.length > 0) {
            return res.json({
              isSuccess: false,
              code: 501,
              message: "이미 존재하는 닉네임 입니다.",
            });
          } else {
            return knex("UserInfo")
              .where({ idx: userIdx })
              .update({ nickname: nickname, birth: birth, gender: gender })
              .transacting(trx);
          }
        })
        .then(trx.commit)
        .catch(trx.rollback);
    })
    .then(function () {
      return res.json({
        isSuccess: true,
        code: 200,
        message: "회원 정보 수정 성공",
      });
    })
    .catch(function (error) {
    });
};
/**
 update : 2020.10.19
 4-4. DELETE /user 회원 탈퇴
 **/
exports.deleteUser = async function (req, res) {
  const token = req.headers["x-access-token"];
  const userIdx = jwt.decode(token).idx;
  try {
    const connection = await pool.getConnection(async (conn) => conn);
    try {
      const selectStatusQuery = `
            select status from UserInfo where idx = ?;
            `;
      let userIdxParams = [userIdx];
      const [userStatus] = await connection.query(
        selectStatusQuery,
        userIdxParams
      );
      if (userStatus[0].status === "Y") {
        connection.release();
        return res.json({
          isSuccess: false,
          code: 501,
          message: "이미 탈퇴한 유저입니다.",
        });
      }
      const deleteUserQuery = `
            UPDATE UserInfo
            SET status = 'Y'
            WHERE idx = ?;
            `;
      await connection.query(deleteUserQuery, userIdxParams);
      connection.release();
      return res.json({
        isSuccess: true,
        code: 200,
        message: "탈퇴 되었습니다.",
      });
    } catch (err) {
      logger.error(
        `example non transaction Query error\n: ${JSON.stringify(err)}`
      );
      connection.release();
      return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
    }
  } catch (err) {
    logger.error(
      `example non transaction DB Connection error\n: ${JSON.stringify(err)}`
    );
    return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
  }
};
/**
 update : 2020.10.19
 4-3. GET /info 공지사항 조회
 **/
exports.selectInfo = async function (req, res) {
  const token = req.headers["x-access-token"];
  const userIdx = jwt.decode(token).idx;
  try {
    const connection = await pool.getConnection(async (conn) => conn);
    try {
      const selectInfoQuery = `
            select * from Info;
            `;
      const [Info] = await connection.query(selectInfoQuery);
      connection.release();
      return res.json({
        info: Info,
        isSuccess: true,
        code: 200,
        message: "공지사항 조회",
      });
    } catch (err) {
      logger.error(
        `example non transaction Query error\n: ${JSON.stringify(err)}`
      );
      connection.release();
      return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
    }
  } catch (err) {
    logger.error(
      `example non transaction DB Connection error\n: ${JSON.stringify(err)}`
    );
    return res.json({ isSuccess: false, code: 500, message: "서버 오류" });
  }
};
