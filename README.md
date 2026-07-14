# LocalHub Frontend

서울 공공데이터를 기반으로 지역정보를 탐색하고, 익명 커뮤니티와 챗봇을 이용할 수 있는 LocalHub의 프론트엔드 프로젝트입니다.

Vue.js 3와 Vite를 사용하며, FastAPI 백엔드 서버와 REST API로 통신합니다.

---

## 📌 프로젝트 소개

LocalHub는 서울의 관광지, 문화시설, 레포츠, 쇼핑, 숙박, 여행코스, 축제공연행사 정보를 한곳에서 확인할 수 있는 지역정보 공유 서비스입니다.

사용자는 회원가입 없이 지역정보를 탐색하고 익명 게시글을 작성할 수 있으며, 챗봇을 통해 서울 지역정보와 커뮤니티 게시글을 자연어로 검색할 수 있습니다.

### 주요 기능

- 서울 지역정보 목록 및 상세 조회
- 카테고리별 지역정보 필터링
- 지도 기반 장소 마커 시각화
- 축제 일정 캘린더
- 서울 현재 날씨 및 여행 적합도
- 익명 커뮤니티 게시글 CRUD
- 게시글 검색 및 조회수
- 플로팅 챗봇 UI
- 모바일 반응형 화면

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|---|---|
| Framework | Vue.js 3 |
| Build Tool | Vite |
| Language | JavaScript |
| Routing | Vue Router |
| HTTP Client | Axios |
| Map | 추후 확정 |
| Calendar | FullCalendar |
| Deployment | Netlify |
| IDE | Visual Studio Code |

---

## 📁 프로젝트 구조

> 프로젝트 폴더 구조는 팀 협의 후 확정하여 작성할 예정입니다.

```text

```

---

## 🖥️ 페이지 구성

| 화면 | 경로 | 주요 기능 |
|---|---|---|
| 홈 | `/` | 서울 소개, 현재 날씨, 여행 적합도, 추천 장소, 다가오는 축제 |
| 지역정보 탐색 | `/places` | 검색, 카테고리 필터, 목록·지도 전환 |
| 지역정보 상세 | `/places/:contentId` | 장소 상세정보, 이미지, 주소, 지도 위치 |
| 축제 캘린더 | `/festivals` | 월별 축제 일정 조회 |
| 커뮤니티 목록 | `/community` | 게시글 목록, 검색, 정렬, 페이지네이션 |
| 게시글 상세 | `/community/:postId` | 게시글 조회, 수정, 삭제 |
| 게시글 작성 | `/community/write` | 익명 게시글 작성 |
| 게시글 수정 | `/community/:postId/edit` | 기존 게시글 수정 |
| 챗봇 | 전체 페이지 | 플로팅 챗봇 및 대화 히스토리 |

페이지 경로와 세부 구성은 개발 과정에서 변경될 수 있습니다.

---

## ✅ 사전 요구사항

프로젝트 실행 전 다음 프로그램이 설치되어 있어야 합니다.

- Node.js
- npm
- Git
- Visual Studio Code

설치 여부는 다음 명령어로 확인할 수 있습니다.

```sh
node -v
npm -v
git --version
```

---

## 💻 Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

기존에 Vetur 확장 프로그램이 설치되어 있다면 충돌 방지를 위해 비활성화하는 것을 권장합니다.

---

## 🌐 Recommended Browser Setup

### Chromium 기반 브라우저

Chrome, Edge, Brave 등의 브라우저를 사용할 수 있습니다.

- [Vue.js Devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- [Chrome DevTools Custom Object Formatter 활성화](http://bit.ly/object-formatters)

### Firefox

- [Vue.js Devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
- [Firefox DevTools Custom Object Formatter 활성화](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

---

## 🚀 Project Setup

### 1. 저장소 Clone

```sh
git clone <LocalHub-Frontend GitLab URL>
cd LocalHub-Frontend
```

### 2. 패키지 설치

```sh
npm install
```

### 3. 환경변수 설정

프로젝트 루트의 `.env.example` 파일을 복사하여 `.env` 파일을 생성합니다.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS 또는 Linux:

```sh
cp .env.example .env
```

`.env` 파일에 로컬 백엔드 서버 주소를 작성합니다.

```env
VITE_API_BASE_URL=http://localhost:8000
```

배포 환경에서는 Netlify 환경변수에 Render 백엔드 URL을 등록합니다.

```env
VITE_API_BASE_URL=https://백엔드-서비스명.onrender.com
```

> `VITE_`로 시작하는 환경변수는 브라우저에서 확인될 수 있습니다.  
> OpenAI API Key, 날씨 API Key와 같은 민감정보는 프론트엔드에 저장하지 않습니다.

---

## ▶️ Compile and Hot-Reload for Development

개발 서버를 실행합니다.

```sh
npm run dev
```

기본 접속 주소:

```text
http://localhost:5173
```

개발 서버를 종료하려면 실행 중인 터미널에서 `Ctrl + C`를 입력합니다.

---

## 📦 Compile and Minify for Production

프로덕션 배포용 파일을 생성합니다.

```sh
npm run build
```

빌드 결과는 기본적으로 `dist` 폴더에 생성됩니다.

---

## 🔍 Preview Production Build

빌드된 결과를 로컬에서 미리 확인합니다.

```sh
npm run preview
```

---

## ⚙️ Customize Configuration

Vite 설정은 아래 공식 문서를 참고합니다.

[Vite Configuration Reference](https://vite.dev/config/)

---

## 🔗 백엔드 API 연결

프론트엔드는 FastAPI 백엔드 서버와 REST API로 통신합니다.

로컬 개발 환경:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
Swagger:  http://localhost:8000/docs
```

API 기본 주소는 환경변수로 관리합니다.

```javascript
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
```

각 컴포넌트에서 백엔드 주소를 직접 작성하지 않고, Axios 공통 설정을 통해 API를 호출합니다.

---

## 📡 주요 API

| 기능 | Method | Endpoint |
|---|---|---|
| 지역정보 목록 | GET | `/api/locations` |
| 지도 마커 목록 | GET | `/api/locations/map` |
| 지역정보 상세 | GET | `/api/locations/{contentId}` |
| 축제 캘린더 | GET | `/api/festivals/calendar` |
| 다가오는 축제 | GET | `/api/festivals/upcoming` |
| 현재 날씨 | GET | `/api/weather/current` |
| 게시글 목록 | GET | `/api/posts` |
| 게시글 작성 | POST | `/api/posts` |
| 게시글 상세 | GET | `/api/posts/{postId}` |
| 게시글 수정 | PUT | `/api/posts/{postId}` |
| 게시글 삭제 | DELETE | `/api/posts/{postId}` |
| 챗봇 | POST | `/api/chat` |

API 요청·응답의 세부 형식은 백엔드 API 명세를 기준으로 합니다.

---

## 🌿 Git Branch Convention

기능별 브랜치를 생성하여 작업합니다.

```text
feature/기능명
fix/수정내용
docs/문서명
chore/설정내용
deploy/배포대상
```

예시:

```text
feature/place-map
feature/festival-calendar
feature/weather-card
feature/community-page
feature/chatbot-ui
fix/chat-message-layout
docs/readme
deploy/netlify
```

### 작업 시작

```sh
git switch main
git pull origin main
git switch -c feature/기능명
```

### 작업 완료

```sh
git status
git add <변경 파일>
git commit -m "type(scope): 작업 내용"
git push -u origin feature/기능명
```

작업 완료 후 GitLab에서 Merge Request를 생성합니다.

```text
feature/기능명 → main
```

`main` 브랜치에는 직접 Push하지 않습니다.

---

## 📝 Commit Convention

커밋 메시지는 다음 형식을 사용합니다.

```text
type(scope): 작업 내용
```

예시:

```text
feat(map): 지역정보 지도 마커 구현
feat(festival): 월별 축제 캘린더 추가
feat(weather): 현재 날씨 카드 구현
feat(chat): 플로팅 챗봇 UI 구현
fix(community): 게시글 페이지네이션 오류 수정
style(home): 메인 화면 반응형 레이아웃 수정
docs(readme): 프로젝트 실행 방법 추가
chore(config): 환경변수 예시 파일 생성
build(netlify): Netlify 배포 설정 추가
```

### Commit Type

| Type | 설명 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 오류 수정 |
| `refactor` | 기능 변화 없는 코드 구조 개선 |
| `style` | CSS, UI, 코드 포맷 변경 |
| `docs` | README, 명세 등 문서 변경 |
| `chore` | 환경설정, 패키지, 폴더 설정 |
| `test` | 테스트 코드 추가 및 수정 |
| `build` | 빌드 및 배포 설정 |
| `perf` | 성능 개선 |
| `revert` | 이전 커밋 되돌리기 |

자세한 규칙은 [COMMIT_CONVENTION.md](./COMMIT_CONVENTION.md)를 참고합니다.

---

## 🔐 환경변수 및 보안 규칙

다음 파일과 정보는 Git에 올리지 않습니다.

```text
.env
node_modules/
dist/
실제 API Key
비밀번호 또는 인증정보
```

커밋 전 반드시 확인합니다.

```sh
git status
```

`.env` 파일이 표시된다면 `.gitignore` 설정을 확인합니다.

```gitignore
.env
.env.local
.env.*.local
!.env.example
```

민감정보가 이미 원격 저장소에 Push된 경우에는 파일만 삭제하지 않고 해당 API Key를 폐기한 뒤 새로 발급해야 합니다.

---

## 🧪 개발 확인 항목

기능 구현 후 다음 내용을 확인합니다.

- 페이지가 새로고침 없이 정상적으로 이동하는지
- FastAPI 서버와 정상적으로 통신하는지
- API 요청 중 로딩 상태가 표시되는지
- API 오류 발생 시 안내 메시지가 표시되는지
- 모바일 화면에서 레이아웃이 깨지지 않는지
- 지도 마커와 팝업이 정상적으로 표시되는지
- 축제 캘린더 월 이동과 일정 선택이 동작하는지
- 날씨 API 실패 시 전체 페이지가 중단되지 않는지
- 챗봇 대화 히스토리가 화면에 유지되는지
- 게시글 작성·조회·수정·삭제가 정상 동작하는지

---

## 🚢 Deployment

프론트엔드는 Netlify를 통해 배포합니다.

### Netlify 기본 설정

| 설정 | 값 |
|---|---|
| Branch | `main` |
| Build command | `npm run build` |
| Publish directory | `dist` |
| 환경변수 | `VITE_API_BASE_URL` |

Vue Router의 직접 URL 접근을 지원하기 위해 SPA 리다이렉트 설정이 필요할 수 있습니다.

`public/_redirects`:

```text
/* /index.html 200
```

배포 후 다음 항목을 확인합니다.

- Netlify URL 정상 접속
- 홈 화면 표시
- 페이지 직접 접근 및 새로고침
- Render 백엔드 API 호출
- 지도·날씨·캘린더·커뮤니티·챗봇 동작

---

## 👥 Team

| 역할 | 담당자 | 주요 업무 |
|---|---|---|
| Frontend |  | Vue 화면 및 API 연결 |
| Backend |  | FastAPI, SQLite, REST API |
| Chatbot |  | OpenAI API 및 챗봇 응답 |
| PM·문서 |  | 일정, 명세, 발표 자료 |

---

## 📄 License and Data Source

본 서비스는 한국관광공사 TourAPI 4.0의 서울 지역 데이터를 활용합니다.

```text
데이터 제공기관: 한국관광공사
데이터명: 국문 관광정보 서비스 TourAPI 4.0
라이선스: 공공누리 제3유형
```

데이터 출처와 라이선스의 자세한 내용은 기능 명세서를 참고합니다.