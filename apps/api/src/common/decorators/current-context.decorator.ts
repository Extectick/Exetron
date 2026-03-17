import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { RequestContext } from "@exetron/types";

export const CurrentContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestContext }>();
    return request.user;
  },
);
