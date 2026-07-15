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

export const catToFront = {
  '자유': '자유',
  '관광지': '관광',
  '여행코스': '여행',
  '숙박': '숙박',
  '음식점': '맛집',
  '쇼핑': '쇼핑',
  '문화시설': '문화',
  '축제공연행사': '행사',
  '레포츠': '레포츠'
}

// 💡 프론트엔드 데이터를 백엔드용(DB용)으로 번역
export const catToBack = {
  '자유': '자유',
  '관광': '관광지',
  '여행': '여행코스',
  '숙박': '숙박',
  '맛집': '음식점',
  '쇼핑': '쇼핑',
  '문화': '문화시설',
  '행사': '축제공연행사',
  '레포츠': '레포츠'
}