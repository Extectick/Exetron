# Platform Core API

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Platform Resources

- `GET|POST|PATCH /tenants`
- `GET|POST|PATCH /brands`
- `GET|POST|PATCH /stores`
- `GET|POST|PATCH /users`
- `GET|POST|PATCH /roles`
- `GET /permissions`
- `GET|POST|PATCH /devices`
- `GET /audit`
- `GET|PUT /settings/tenant`
- `GET /settings/stores/:id`
- `PUT /settings/store`
- `GET|PUT /feature-flags`

## Contracts

- Canonical DTOs live in `packages/contracts`.
- OpenAPI is exposed by the Nest app at `/docs`.
- JWT claims include `sub`, `tenantId`, `scope`, `roleIds`, `storeIds`, and
  optional device context.
