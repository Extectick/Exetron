import { Global, Module } from "@nestjs/common";
import { appEnvProvider } from "./app-env.provider";

@Global()
@Module({
  providers: [appEnvProvider],
  exports: [appEnvProvider]
})
export class EnvironmentModule {}
