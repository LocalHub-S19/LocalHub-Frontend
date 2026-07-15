// 📄 src/api.js

// 💡 1. 여기에 백엔드 개발자가 줄 Render 주소를 딱 한 번만 적습니다.
const BASE_URL = 'https://localhub-backend-tjnj.onrender.com' 

// 💡 2. 백엔드 명세서에 있는 주소(엔드포인트)들을 사전처럼 만들어 둡니다.
export const API = {
  // 커뮤니티 게시판 관련
  POSTS: `${BASE_URL}/api/posts`,                 // 글 목록, 글 쓰기
  POST_DETAIL: (id) => `${BASE_URL}/api/posts/${id}`, // 글 상세, 수정, 삭제

  // 서울 지역 정보 관련
  LOCATIONS: `${BASE_URL}/api/locations`,         
  LOCATION_MAP: `${BASE_URL}/api/locations/map`,  

  // 기타
  WEATHER: `${BASE_URL}/api/weather/current`,
  CHAT: `${BASE_URL}/api/chat`
}