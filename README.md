# MyMy (마이마이) - 나만의 노래 관리 서비스 

## 프로젝트 개요
- [AppStore Download Link](https://apps.apple.com/kr/app/%EB%A7%88%EC%9D%B4%EB%A7%88%EC%9D%B4/id1536895731)
(현재는 서버 비용으로 인해 서버를 내린 상태입니다.)
![ScreenShot1](https://user-images.githubusercontent.com/43839938/156963592-d33e842f-8f06-443b-bd3a-8f4d145da4b1.png)
![ScreenShot2](https://user-images.githubusercontent.com/43839938/156963632-b73f8508-5db0-4b79-9e87-2cd0a38ad98b.png)

## 프로젝트 인원
Designer 1, iOS Developer 1, **Server Developer 1 (Me)**

## 프로젝트 기간
2020.07 ~ 2020.10 (4개월)

## 프로젝트 기능
- 랜덤 노래 추천 기능: 사용자가 저장해놓은 플레이리스트, 장르별 플레이리스트, 인기차트에서 랜덤으로 추천을 받을 수 있는 기능
- 노래 검색/추가 기능: 오프라인 노래방에서 검색되는 노래들을 검색하고 자신의 플레이리스트에 담을 수 있는 기능
- 플레이리스트: 나만의 플레이리스트를 생성하여 각 테마에 맞는 노래를 저장할 수 있는 기능.
- 인기차트: 다른 사용자들이 플레이리스트에 담은 인기 곡 순위를 보여주고 자신의 플레이리스트에도 추가할 수 있는 기능

## 기술 스택
AWS EC2, Nginx, Node.js, Express.js, MySQL, AWS RDS

## What I Learned
- Node.js / Express 사용
- Database의 Connection Pool에 대한 이해 (Pool의 최대 개수, 반환하지 않으면 서버가 죽을 수 있다는 점.)
- 예외 처리 중요성 (try, catch, finally, 예외 메시지)
- 로그 남기기의 중요성 (어느 곳에서 에러가 났는지 확인, 사용자 이용 확인)
- cron을 통한 실시간 업데이트 방법
- 랭킹 아이디어 (일주일 단위로 순위, 순위변동)
- Route / Controller → Route / Controller / DAO 로 거대한 비즈니스 로직 코드에서 SQL 관련 부분만 따로 떼어 분리.

## ERD 및 API Sheet
<img width="1275" alt="mymy ERD" src="https://user-images.githubusercontent.com/43839938/156964120-abd70903-46fb-4684-a8f0-247799c99fa4.png">

![mymy API](https://user-images.githubusercontent.com/43839938/156964114-c4985a10-0db5-4688-91b9-e0d40b7b5507.png)
