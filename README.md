# Trip Map

국내여행 기록을 지도 위에 남기기 위한 웹 기반 MVP 프로젝트입니다.

현재 버전은 여행지 상세 기록보다 먼저, 대한민국 시군구 지도에서 방문한 지역을 선택하고 색칠하는 흐름에 집중합니다. 선택한 지역은 브라우저 `localStorage`에 저장되어 새로고침 후에도 유지됩니다.

## 프로젝트 소개

Trip Map은 국내여행을 다녀온 지역을 지도에 시각적으로 표시하는 앱입니다.

MVP에서 제공하는 기능은 다음과 같습니다.

- 대한민국 시군구 기반 지도 표시
- 지역 클릭으로 방문 지역 색칠 및 해제
- 선택한 지역 목록 표시
- 전체 선택 해제
- 브라우저 로컬 저장소를 통한 방문 지역 유지
- 수도권 등 라벨이 밀집된 지역의 표시 위치 보정
- 오래된 행정구역 데이터 일부 보정

아직 포함하지 않은 기능은 여행 메모, 사진, 날짜 기록, 계정 기반 동기화, 지도 검색입니다.

## 실행 방법

이 프로젝트는 현재 웹 앱으로 실행합니다.

### 요구 사항

- Node.js
- pnpm

현재 프로젝트는 `pnpm@11.8.0`을 사용하도록 고정되어 있습니다.

### 설치

```bash
pnpm install
```

### 개발 서버 실행

```bash
pnpm start
```

또는:

```bash
pnpm dev
```

실행 후 터미널에 표시되는 로컬 주소로 접속합니다. 기본 Vite 주소는 보통 다음과 같습니다.

```text
http://localhost:5173
```

### 타입 체크

```bash
pnpm typecheck
```

### 프로덕션 빌드

```bash
pnpm build
```

### 빌드 결과 미리보기

```bash
pnpm preview
```

## 기술 스택

- React 19
- TypeScript
- Vite
- d3-geo
- GeoJSON
- CSS
- pnpm

## 주요 파일

- `src/App.tsx`: 지도 렌더링, 지역 선택, 로컬 저장 로직
- `src/styles.css`: 전체 화면 레이아웃과 지도 스타일
- `src/data/skorea_municipalities_geo_simple.json`: 대한민국 시군구 GeoJSON 데이터
- `src/main.tsx`: React 앱 진입점
- `vite.config.ts`: Vite 설정

## 참고

프로젝트는 Expo 템플릿에서 시작했지만, 현재 MVP는 Expo Go 호환성 문제를 피하기 위해 Vite 기반 웹 앱으로 동작합니다. 일부 Expo/React Native 관련 파일과 의존성은 초기 실험 흔적으로 남아 있을 수 있습니다.
