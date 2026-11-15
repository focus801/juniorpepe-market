# 주니어페페 상점 — 공개 운영용 v1

Vite + Supabase + Vercel. 방문자 공개 조회, 관리자 이메일/비밀번호 로그인, 이미지 업로드, 아이템 등록/수정/삭제, 상태 변경, 실시간 목록 갱신.

## 1. Supabase 프로젝트 생성
1. https://supabase.com 에서 프로젝트 생성.
2. SQL Editor에서 `supabase/schema.sql` 전체 실행. 이미 테이블이나 정책이 있는 프로젝트라면 새 프로젝트를 권장합니다.
3. Authentication > Users에서 **Add user**로 관리자 이메일/비밀번호 계정 생성. 이메일 인증이 필요한 경우 인증 완료.
4. 생성된 사용자의 UUID를 복사해 SQL Editor에서 다음 실행:
   `insert into public.admin_users(user_id) values ('여기에-사용자-UUID');`
5. Project Settings > API 또는 Connect에서 **Project URL**과 **publishable key**(또는 legacy anon key)를 확인. **service_role / secret key는 절대 브라우저나 Vercel VITE_ 변수에 넣지 마세요.**
6. Authentication > Providers에서 필요 없는 신규 가입 방식은 비활성화하고, 관리자 계정에 강력한 비밀번호와 가능하면 MFA를 사용하세요.

## 2. 로컬 실행
Node.js 20.19+ 또는 22.12+ 권장.
```
npm install
cp .env.example .env
```
Windows에서는 `.env.example` 파일을 복사하여 `.env`로 이름을 변경하세요. `.env` 안에 프로젝트 URL과 publishable key 입력.
```
npm run dev
```
터미널에 표시된 로컬 주소를 브라우저에서 엽니다.

## 3. Vercel 공개 배포
1. 이 폴더를 GitHub 비공개 저장소에 올립니다. `.env` 파일은 올리지 않습니다.
2. https://vercel.com > Add New Project > GitHub 저장소 Import.
3. Framework Preset: Vite / Build command: `npm run build` / Output directory: `dist`.
4. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 각각 추가. 값은 Supabase에서 가져온 공개 가능한 키만 사용.
5. Deploy 클릭. 제공된 `*.vercel.app` 주소를 방문자에게 공유합니다.
6. Supabase Authentication > URL Configuration에서 Site URL을 실제 Vercel 주소로 설정합니다. 이메일 링크 기반 인증을 쓴다면 Redirect URLs도 등록합니다.

## 운영 및 보안
- 공개 방문자는 아이템을 읽기만 할 수 있습니다. DB Row Level Security(RLS)가 관리자 외 쓰기를 차단합니다.
- 관리 권한은 `admin_users`에 등록된 Supabase Auth 사용자 UUID로 확인합니다. UI 숨김만으로 권한을 관리하지 않습니다.
- 이미지 버킷은 **공개**입니다. 민감한 이미지나 개인정보를 올리지 마세요.
- 업로드는 JPG/PNG/WEBP 최대 5MB입니다. Storage 정책은 MIME 및 크기 제한을 적용합니다.
- Supabase Realtime의 postgres_changes를 통해 다른 방문자 브라우저에서 아이템 목록을 다시 불러옵니다. 네트워크 끊김 시 새로고침이 필요할 수 있습니다.
- 첫 공개 배포 전 반드시 일반 브라우저에서 비로그인 읽기, 관리자 등록/수정/삭제, 이미지 표시, 다른 브라우저 실시간 반영을 점검하세요.
- 메소 가격 표시용이며 사이트 내 결제 기능은 없습니다. 게임 운영정책에 부합하는 거래만 진행하세요.
- 무료 플랜에는 용량, 요청량, 프로젝트 휴면 등의 제한이 있을 수 있습니다.
