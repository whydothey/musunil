# Cloudflare Response Header Rules

이 문서는 `musunil.com` Web 응답 헤더가 Render Static Site Dashboard에서 적용되지 않을 때, Cloudflare edge에서 같은 보안 헤더를 적용하기 위한 운영 템플릿이다. Cloudflare proxied Web record에서만 동작하므로 API 레코드는 `/health`, `/ready`, CORS, media smoke 통과 전까지 DNS only를 유지하고, Web 레코드에만 적용한다. 적용 전 `pnpm cloudflare:check`의 `web_proxy_mode.proxyObserved`가 `true`인지 먼저 본다.

Cloudflare 공식 문서 기준 Response Header Transform Rules는 방문자에게 나가는 HTTP 응답 헤더를 수정할 수 있고, Dashboard에서는 `Set static`으로 같은 이름의 기존 헤더를 덮어쓸 수 있다. Terraform 예시는 `phase = "http_response_headers_transform"`, `action = "rewrite"`, header `operation = "set"` 구조를 사용한다.

References:

- https://developers.cloudflare.com/rules/transform/response-header-modification/
- https://developers.cloudflare.com/rules/transform/response-header-modification/create-dashboard/
- https://developers.cloudflare.com/terraform/additional-configurations/transform-rules/#create-a-response-header-transform-rule

## Dashboard Rule

- Rule type: Response Header Transform Rule
- Rule name: `musunil web response security headers`
- Expression: `(http.host eq "musunil.com" or http.host eq "www.musunil.com")`
- Operation for every header: `Set static`
- Save mode: Deploy only after checking the values below.

Headers:

- Cache-Control
  ```text
  no-store
  ```
- Content-Security-Policy
  ```text
  default-src 'self'; connect-src 'self' https:; img-src 'self' data: blob: https:; media-src 'self' https: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:
  ```
- Permissions-Policy
  ```text
  camera=(self), microphone=(), geolocation=(self)
  ```
- Referrer-Policy
  ```text
  no-referrer
  ```
- X-Content-Type-Options
  ```text
  nosniff
  ```
- X-Frame-Options
  ```text
  DENY
  ```

## Terraform Example

Use [response-headers.tf.example](/Users/mk/Documents/Musunil/infra/cloudflare/response-headers.tf.example) as the copy source. The example intentionally uses `*.tf.example` so it cannot run without an operator choosing the Cloudflare zone and provider setup.

## API Automation

`pnpm cloudflare:apply`는 기본적으로 dry-run 계획만 출력한다. Cloudflare API token을 준비한 뒤 `--apply --headers`를 붙였을 때만 `http_response_headers_transform` phase의 zone ruleset을 생성하거나, `musunil_web_security_headers` rule을 갱신한다. 기본 zone은 `musunil.com` 이름으로 조회하며, token이 zone name 조회 권한을 갖지 못한 경우에만 `CLOUDFLARE_ZONE_ID`를 fallback으로 넣는다.

```bash
: "${CLOUDFLARE_API_TOKEN:?set Cloudflare API token first}"
pnpm cloudflare:check
pnpm cloudflare:apply -- --headers
pnpm cloudflare:apply -- --headers --apply
pnpm cloudflare:check
MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy
```

## Verification

After applying the Render headers or this Cloudflare response header rule, run:

```bash
pnpm cloudflare:check
MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy
pnpm launch:final-gate
```

Passing Cloudflare header checks does not prove API readiness. `api.musunil.com` must still resolve over HTTPS and `/ready` must return `ready=true` before launch.
