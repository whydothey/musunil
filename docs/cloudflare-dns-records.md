# Cloudflare DNS Records

이 문서는 `musunil.com` 출시 컷오버 때 Cloudflare DNS에 입력할 레코드 템플릿이다. Render Dashboard가 각 custom domain에 대해 보여주는 target을 그대로 복사해야 하며, 임의로 `.onrender.com` 주소를 추측해 넣지 않는다.
Target 값은 호스트명만 허용한다. `https://`, 경로, 포트, `DNS target:` 같은 Dashboard 라벨이 섞이면 `pnpm cloudflare:dns`와 strict check가 실패한다.
추적 문서는 placeholder를 유지한다. 실제 target을 복사한 뒤에는 아래 로컬 환경변수로 검증용 산출물을 만들고 strict check를 실행한다.

## Dashboard Records

| Name | Hostname | Type | Target | Proxy |
|---|---|---|---|---|
| `@` | `musunil.com` | `CNAME` | Render musunil-web custom-domain target | DNS only if Render headers are applied directly; proxied only when using the Web response header fallback |
| `www` | `www.musunil.com` | `CNAME` | musunil.com | same policy as musunil.com |
| `api` | `api.musunil.com` | `CNAME` | Render musunil-api custom-domain target | DNS only until /health, /ready, CORS, media, and identity boundary smoke pass |

## Exact Target Workflow

Render target은 secret이 아니지만 서비스별로 다르므로 추적 문서에는 placeholder로 둔다. Render Dashboard에서 Custom Domain target을 복사한 뒤 로컬 셸에만 아래처럼 넣는다. 문서의 괄호 예시나 `custom-domain target` 문구를 그대로 넣으면 placeholder로 거부된다.

```bash
# Render Dashboard에서 복사한 실제 target을 두 환경변수에 먼저 export한다.
: "${MUSUNIL_RENDER_WEB_DNS_TARGET:?set exact Render Web target from Render first}"
: "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}"
pnpm cloudflare:dns
pnpm cloudflare:check:strict
```

`pnpm cloudflare:dns`는 위 값이 있으면 git-ignored local copy인 `docs/cloudflare-dns-records.local.md`와 `infra/cloudflare/dns-records.local.tfvars`도 쓴다. `MUSUNIL_RENDER_API_DNS_TARGET`이 있으면 strict check는 `api.musunil.com` CNAME이 Render target과 일치하는지 검사한다.

## API Automation

`pnpm cloudflare:apply`는 기본적으로 dry-run 계획만 출력한다. Cloudflare API token과 zone을 준비한 뒤 `--apply`를 붙였을 때만 DNS 레코드를 생성/갱신한다. DNS 적용은 Cloudflare DNS Records API를 사용하고, 기존 같은 이름의 비-CNAME 레코드가 있으면 자동 변경하지 않고 실패한다.

```bash
: "${CLOUDFLARE_API_TOKEN:?set Cloudflare API token first}"
: "${CLOUDFLARE_ZONE_ID:?set Cloudflare zone id first}"
: "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}"
pnpm cloudflare:apply -- --dns
pnpm cloudflare:apply -- --dns --apply
pnpm cloudflare:check:strict
```

## Proxy Policy

- `api.musunil.com`은 API `/health`, `/ready`, CORS, redacted media, identity write boundary smoke가 통과하기 전까지 DNS only로 둔다.
- Web 레코드는 Render Static headers가 직접 적용되면 DNS only가 단순하다.
- Web strict headers가 live 응답에 계속 빠지면 `pnpm cloudflare:headers`로 생성되는 Response Header Transform Rule을 적용하기 위해 Web 레코드만 proxied로 전환한다.
- Web을 proxied로 전환하면 `/`, `/config.js`, `/build-info.json`, `/static-manifest.json`은 캐시하지 않는다.

## Terraform Example

Use [dns-records.tf.example](/Users/mk/Documents/Musunil/infra/cloudflare/dns-records.tf.example) as the copy source. The example intentionally keeps Render targets as variables because only Render Dashboard can provide the correct custom-domain targets.

## Verification

After applying DNS records, run:

```bash
pnpm cloudflare:check
pnpm cloudflare:check:strict
pnpm launch:final-gate
```

`pnpm cloudflare:check` separates DNS failures from API runtime failures. A skipped API check is not a launch pass.
