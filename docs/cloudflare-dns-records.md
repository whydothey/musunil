# Cloudflare DNS Records

이 문서는 `musunil.com` 출시 컷오버 때 Cloudflare DNS에 입력할 레코드 템플릿이다. Render Dashboard가 각 custom domain에 대해 보여주는 target을 그대로 복사해야 하며, 임의로 `.onrender.com` 주소를 추측해 넣지 않는다.

## Dashboard Records

| Name | Hostname | Type | Target | Proxy |
|---|---|---|---|---|
| `@` | `musunil.com` | `CNAME` | Render musunil-web custom-domain target | DNS only if Render headers are applied directly; proxied only when using the Web response header fallback |
| `www` | `www.musunil.com` | `CNAME` | musunil.com | same policy as musunil.com |
| `api` | `api.musunil.com` | `CNAME` | Render musunil-api custom-domain target | DNS only until /health, /ready, CORS, media, and identity boundary smoke pass |

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
