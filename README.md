# PX ↔ VW Converter (CSS PX → VW 변환기)

뷰포트 너비(px)를 기준으로 **PX 값을 VW로 변환**하고, CSS 소스에서 **PX가 포함된 선언만 남긴 뒤** VW로 일괄 변환하는 웹 도구입니다.  
HTML 단일 파일로 동작하며, 별도의 빌드 없이 바로 실행하고 GitHub Pages로 배포할 수 있습니다.

- 배포 주소: https://1bobby-git.github.io/PX-VW-Converter/

---

## 주요 기능

### 1) PX ↔ VW 단일 변환
- PX → VW, VW → PX 즉시 계산
- 뷰포트 너비(px) 설정
- 출력 소수점 자릿수 설정

### 2) CSS 소스 변환 (핵심)
CSS 텍스트를 입력하면 다음 규칙으로 처리됩니다.

#### (1) px가 포함된 선언만 유지
값에 `px`가 포함된 선언만 남기고 나머지는 제거합니다.

**예시**
```
margin-top:16px;text-align:center;color:#333;padding:0 20px;
```
**결과**
```
margin-top:16px;padding:0 20px;
```

#### (2) 속성 제거 후 블록이 비면 규칙 삭제
필터링 결과가 `{}`가 되면 해당 selector 규칙을 통째로 삭제합니다.

**예시**
```
.a{text-align:center;}
```
→ 규칙 삭제

#### (3) 남은 px 값만 vw로 변환
- `16px` → `(16 / viewportWidth) * 100` vw
- `padding:0 20px;` 처럼 복합 값은 px가 포함된 값만 변환
- `calc(100% - 16px)` 형태도 px 값만 변환

---

## 사용 방법

1. 상단에서 **뷰포트 너비(px)** 를 입력합니다. (예: 360 / 375 / 414)
2. 변환 방법을 선택합니다.
   - 단일 변환: PX ↔ VW 영역 사용
   - CSS 변환: CSS 소스 변환 영역에 CSS 입력 후 변환 실행
3. 결과를 복사하여 사용합니다.

---

## 로컬 실행

- `index.html` 파일을 더블 클릭하여 브라우저에서 실행
- 또는 VSCode Live Server 등으로 실행

---

## GitHub Pages 배포

- Repository Settings → Pages
- Source: `main` / `/(root)`
- 루트에 `index.html` 필요

배포 주소: https://1bobby-git.github.io/PX-VW-Converter/

---

## 라이선스

