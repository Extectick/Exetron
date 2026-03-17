import { Body, Controller, Get, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import type {
  AuthMeResponse,
  AuthTokensResponse
} from "@exetron/contracts";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Public } from "../common/decorators/public.decorator";
import type { RequestContext } from "@exetron/types";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshTokenDto } from "./dto/auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @ApiOperation({ summary: "Issue access and refresh tokens." })
  @ApiOkResponse()
  login(@Body() dto: LoginDto): Promise<AuthTokensResponse> {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post("refresh")
  @ApiOperation({ summary: "Rotate refresh token and issue a new access token." })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post("logout")
  @ApiOperation({ summary: "Revoke a refresh session." })
  logout(@Body() dto: RefreshTokenDto): Promise<{ success: true }> {
    return this.authService.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get("me")
  @ApiOperation({ summary: "Return current user, claims and permissions." })
  me(@CurrentContext() context: RequestContext): Promise<AuthMeResponse> {
    return this.authService.me(context);
  }
}
