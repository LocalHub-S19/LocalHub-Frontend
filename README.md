# LocalHub Frontend

서울의 관광지·문화시설·축제·맛집 등 지역정보를 목록과 지도에서 탐색하고, 익명 커뮤니티와 AI 챗봇을 이용할 수 있는 **LocalHub 프론트엔드**입니다.

Vue 3와 Vite를 기반으로 구현했으며, FastAPI 백엔드와 REST API로 통신합니다.

---

## 📌 프로젝트 소개

LocalHub는 한국관광공사 TourAPI 4.0의 서울 지역정보를 활용한 지역정보 공유 서비스입니다.

사용자는 회원가입 없이 다음 기능을 이용할 수 있습니다.

- 서울 지역정보 목록 탐색
- 카테고리별 지도 핀 확인
- 두 장소 사이 대중교통 경로 검색
- 현재 날씨와 여행 적합도 확인
- 익명 커뮤니티 게시글 작성·조회·수정·삭제
- AI 챗봇을 통한 자연어 지역정보·게시글 검색

---

## ✨ 주요 기능

### 1. 홈

- LocalHub 서비스 소개
- 지역정보 탐색 페이지의 목록 탭·지도 탭 바로가기
- 게시판 카테고리 바로가기
- 최근 게시글 6개 표시
- 한국관광공사 TourAPI 데이터 출처와 라이선스 표시
- LocalHub GitHub 조직 링크

### 2. 서울 여행지 탐색

하나의 `/explore` 페이지에서 목록과 지도를 탭으로 전환합니다.

#### 목록 탭

- 관광지, 문화시설, 축제·행사, 여행코스, 레포츠, 숙박, 쇼핑, 맛집 필터
- 장소명·주소 검색
- 사진이 있는 장소만 보기
- 대표 이미지 또는 카테고리 기본 화면
- 주소와 전화번호 표시
- 전화번호가 있는 장소에 전화 연결
- 선택 장소를 지도에서 확인
- 선택 장소를 경로 출발지로 지정
- 더 보기 방식의 목록 확장

#### 지도 탭

- Leaflet과 OpenStreetMap 기반 지도
- 카테고리마다 서로 다른 색상과 아이콘의 핀
- 선택한 카테고리의 핀만 표시
- 지도 이동·확대 후 현재 화면 범위의 핀만 렌더링
- 카테고리를 추가해도 현재 중심과 줌 유지
- 핀 선택 시 대표 이미지, 장소명, 주소, 전화번호, 우편번호, 분류 표시
- 현재 위치를 경로 출발지로 지정
- 출발지·도착지 선택 및 ODsay 대중교통 경로 검색
- ODsay 키가 없거나 경로 API가 실패한 경우 직선거리 미리보기
- 카카오맵에서 선택 장소 열기

### 3. 서울 날씨와 여행 적합도

- 서울 현재 기온
- 체감온도
- 습도
- 강수량
- 날씨 상태
- 관측 시각
- 여행 적합도 점수와 등급
- 현재 날씨에 따른 추천 문구
- 날씨 API 오류 시 재시도 UI

### 4. 익명 커뮤니티

- 회원가입·로그인 없이 게시글 작성
- 카테고리별 게시글 조회
- 제목·본문·태그 검색
- 최신순·조회수순 정렬
- 페이지네이션
- 게시글 상세 조회 시 조회수 증가
- 작성 시 등록한 비밀번호로 수정·삭제
- 최대 5개의 자유 태그

### 5. AI 챗봇

- 전체 페이지에서 사용하는 플로팅 챗봇
- 사용자 질문과 이전 대화 히스토리 전송
- 서울 지역정보·축제·맛집·게시글·날씨 질문 지원
- 답변에 활용한 장소와 게시글을 참고 카드로 표시
- 장소 참고 카드에 대표 이미지·주소·전화번호 표시
- 게시글 참고 카드에 본문 요약·태그·작성 시각 표시
- 로딩·오류·빈 결과 처리
- 모바일 반응형 모달

---

## 🧭 화면 경로

| 화면 | 경로 | 주요 기능 |
|---|---|---|
| 홈 | `/` | 서비스 소개, 여행지 탐색 바로가기, 게시판 카테고리, 최근 게시글 |
| 여행지 목록 | `/explore?tab=list` | 지역정보 목록, 검색, 카테고리·사진 필터 |
| 여행지 지도 | `/explore?tab=map` | 카테고리별 핀, 장소 상세, 출발지·도착지 경로 검색 |
| 게시글 목록 | `/board` | 검색, 카테고리 필터, 정렬, 페이지네이션 |
| 게시글 상세 | `/board/:id` | 본문, 태그, 조회수, 수정·삭제 |
| 게시글 작성 | `/board/write` | 익명 게시글 작성 |
| 게시글 수정 | `/board/edit/:id` | 비밀번호 확인 후 게시글 수정 |
| 챗봇 | 전체 페이지 | 플로팅 버튼과 챗봇 모달 |

> 축제 원본 데이터에 실제 개최 시작일·종료일이 없어 별도의 축제 캘린더 페이지는 구현하지 않았습니다.

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|---|---|
| Framework | Vue 3 |
| Build Tool | Vite |
| Language | JavaScript |
| Routing | Vue Router |
| HTTP | Browser Fetch API |
| Map | Leaflet 1.9.4, OpenStreetMap |
| Public Transit Route | ODsay API |
| Weather | FastAPI 백엔드의 Open-Meteo 연동 결과 |
| AI UI | OpenAI 기반 백엔드 챗봇 API |
| Deployment | Netlify |
| IDE | Visual Studio Code |

### 지도 라이브러리 로딩 방식

현재 `ExploreView.vue`는 Leaflet JavaScript와 CSS를 CDN에서 동적으로 불러옵니다. 따라서 Leaflet 패키지를 별도로 설치하지 않아도 실행할 수 있습니다.

---

## 📁 프로젝트 구조

```text
LocalHub-Frontend/
├─ public/
│  ├─ favicon.ico
│  └─ _redirects                 # Netlify SPA 새로고침 대응
├─ src/
│  ├─ components/
│  │  ├─ ChatbotModal.vue        # 플로팅 챗봇
│  │  └─ CommonHeader.vue        # 공통 헤더
│  ├─ router/
│  │  └─ index.js                # Vue Router 설정
│  ├─ views/
│  │  ├─ HomeView.vue            # 홈
│  │  ├─ ExploreView.vue         # 목록·지도 통합 탐색
│  │  ├─ BoardListView.vue       # 게시글 목록
│  │  ├─ BoardDetailView.vue     # 게시글 상세
│  │  └─ BoardWriteView.vue      # 게시글 작성·수정
│  ├─ api.js                     # 백엔드 API 주소와 카테고리 변환
│  ├─ App.vue                    # 공통 레이아웃과 챗봇 배치
│  └─ main.js                    # Vue 앱 진입점
├─ .gitignore
├─ index.html
├─ package.json
├─ package-lock.json
└─ vite.config.js
```

---

## ✅ 사전 요구사항

`package.json` 기준 권장 Node.js 버전은 다음과 같습니다.

```text
Node.js 22.18 이상 또는 24.12 이상
npm
Git
```

설치 확인:

```sh
node -v
npm -v
git --version
```

---

## 🚀 로컬 실행

### 1. 저장소 Clone

```sh
git clone <LocalHub-Frontend 저장소 URL>
cd LocalHub-Frontend
```

### 2. 패키지 설치

처음 설치하거나 `package-lock.json` 기준으로 동일한 환경을 만들 때:

```sh
npm ci
```

일반 설치:

```sh
npm install
```

### 3. 백엔드 주소 설정

현재 프로젝트는 `src/api.js`의 `BASE_URL`을 통해 API 주소를 관리합니다.

```javascript
const BASE_URL = 'http://localhost:8000'
```

배포 백엔드를 사용할 때:

```javascript
const BASE_URL = 'https://백엔드-서비스명.onrender.com'
```

로컬과 배포 환경을 분리하려면 다음 형태를 권장합니다.

```javascript
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
```

이 방식을 적용한 경우 프로젝트 루트의 `.env.local`에 작성합니다.

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 4. ODsay API 키 설정

대중교통 경로 검색을 사용하려면 프로젝트 루트에 `.env.local`을 생성합니다.

```env
VITE_ODSAY_API_KEY=발급받은_웹_URI_API_KEY
```

ODsay 애플리케이션에는 다음 URI를 등록합니다.

```text
http://localhost:5173
http://127.0.0.1:5173
https://실제-Netlify-주소.netlify.app
```

> `VITE_` 환경변수는 최종 브라우저 코드에서 확인할 수 있습니다.  
> ODsay의 웹 URI 제한을 반드시 설정하고, OpenAI API Key 같은 서버용 비밀키는 프론트엔드에 저장하지 않습니다.

### 5. 개발 서버 실행

```sh
npm run dev
```

기본 접속 주소:

```text
http://localhost:5173
```

---

## 📦 빌드와 미리보기

프로덕션 빌드:

```sh
npm run build
```

빌드 결과:

```text
dist/
```

빌드 결과 미리보기:

```sh
npm run preview
```

---

## 🔗 백엔드 연결

로컬 개발 환경:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
Swagger:  http://localhost:8000/docs
```

프론트엔드가 사용하는 API:

| 기능 | Method | Endpoint |
|---|---|---|
| 지역정보 목록 | GET | `/api/locations` |
| 지도 마커 목록 | GET | `/api/locations/map` |
| 지역정보 상세 | GET | `/api/locations/{contentId}` |
| 서울 날씨·여행 적합도 | GET | `/api/weather/current` |
| 게시글 목록 | GET | `/api/posts` |
| 게시글 작성 | POST | `/api/posts` |
| 게시글 상세 | GET | `/api/posts/{postId}` |
| 게시글 수정 | PUT | `/api/posts/{postId}` |
| 게시글 삭제 | DELETE | `/api/posts/{postId}` |
| 챗봇 | POST | `/api/chat` |

---

## 💬 챗봇 요청 형식

```http
POST /api/chat
Content-Type: application/json
```

```json
{
  "message": "종로구에 있는 박물관 세 곳 추천해줘",
  "history": []
}
```

응답의 `references`에는 답변 생성에 실제로 사용한 장소 또는 게시글이 포함됩니다.

```json
{
  "answer": "종로구에서 확인할 수 있는 문화시설을 안내해드릴게요.",
  "references": [
    {
      "type": "location",
      "id": "123456",
      "title": "서울의 문화시설",
      "category": "문화시설",
      "address": "서울특별시 종로구",
      "tel": "02-0000-0000",
      "image_url": "https://example.com/image.jpg"
    }
  ]
}
```

---

## 🚢 Netlify 배포

### 기본 설정

| 설정 | 값 |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Publish directory | `dist` |

환경변수 방식을 적용한 경우 Netlify에 다음 값을 등록합니다.

```text
VITE_API_BASE_URL=https://백엔드-서비스명.onrender.com
VITE_ODSAY_API_KEY=ODsay_웹_URI_API_Key
```

Vue Router의 직접 URL 접근과 새로고침을 위해 `public/_redirects`를 사용합니다.

```text
/* /index.html 200
```

GitHub 저장소를 Netlify와 연결하고 Production branch를 `main`으로 지정하면 `main`에 push 또는 merge될 때 자동으로 재빌드·배포됩니다.

### 배포 후 확인

- `/` 홈 화면
- `/explore?tab=list`
- `/explore?tab=map`
- `/board`
- 게시글 상세 URL 직접 접근과 새로고침
- Render API 연결
- 지도 타일과 핀
- ODsay 경로 검색
- 날씨 카드
- 챗봇 응답과 참고 카드
- 모바일 레이아웃

---

## 🧪 개발 확인 항목

```sh
npm run build
```

수동 확인 항목:

- 홈의 여행지 목록·지도 바로가기
- 목록과 지도 탭 전환
- 카테고리 선택 시 현재 지도 중심·줌 유지
- 목록 카드 이미지·주소·전화번호
- 핀 선택 시 상세 이미지·주소·전화번호
- 출발지·도착지 설정과 경로 검색
- ODsay 키가 없을 때 직선거리 대체 처리
- 날씨 API 실패 시 오류 화면
- 게시글 작성·상세·수정·삭제
- 비밀번호 불일치 오류
- 챗봇 대화 히스토리
- 챗봇 장소·게시글 참고 카드
- 모바일과 태블릿 반응형 화면
- 브라우저 콘솔 오류 여부

---

## 🌿 Git 규칙

### 브랜치

```text
feature/기능명
fix/수정내용
docs/문서명
chore/설정내용
deploy/배포대상
```

예시:

```text
feature/explore-page
feature/chatbot-ui
fix/explore-tab-route
docs/readme
deploy/netlify
```

### 커밋

```text
type(scope): 작업 내용
```

예시:

```text
feat(explore): 목록과 지도 통합 탐색 페이지 구현
feat(map): 카테고리별 핀과 경로 검색 추가
feat(chat): 장소 이미지 참고 카드 표시
fix(home): 탐색 탭 이동 파라미터 오류 수정
docs(readme): 최종 구현 내용 반영
build(netlify): SPA 배포 설정 추가
```

---

## ⚠️ 데이터 및 기능 제한

- TourAPI의 `createdtime`, `modifiedtime`은 장소 데이터 등록·수정 시각이며 축제 개최일이 아닙니다.
- 원본 축제 데이터에 실제 시작일·종료일 필드가 없어 월별 축제 캘린더를 제공하지 않습니다.
- 이미지 URL이 없는 장소는 카테고리 기본 화면으로 표시합니다.
- 지도는 좌표가 있는 장소만 표시합니다.
- ODsay 웹 키는 브라우저에서 확인될 수 있으므로 허용 URI를 제한해야 합니다.
- OpenStreetMap 공개 타일은 교육·시연 용도에 적합하며 대규모 상용 트래픽 용도로는 별도 타일 제공자를 검토해야 합니다.

---

## 📄 데이터 출처와 라이선스

본 서비스는 한국관광공사 TourAPI 4.0의 서울 지역 데이터를 활용합니다.

| 항목 | 내용 |
|---|---|
| 제공 기관 | 한국관광공사 |
| 데이터명 | 국문 관광정보 서비스 TourAPI 4.0 |
| 수집 지역 | 서울 |
| 수집 건수 | 총 6,518건 |
| 라이선스 | 공공누리 제3유형 — 출처 표시, 변경 금지 |

출처 표시:

```text
이 서비스는 한국관광공사 TourAPI 4.0의 관광정보를 활용하였습니다.
출처: 한국관광공사
라이선스: 공공누리 제3유형
```

- 공공데이터포털: https://www.data.go.kr/data/15101578/openapi.do
- 공공누리 제3유형: https://www.kogl.or.kr/info/licenseTypeView.do?licenseType=3
- LocalHub GitHub: https://github.com/LocalHub-S19