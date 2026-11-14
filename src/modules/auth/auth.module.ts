import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './guard/auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: { expiresIn: 3600 * 24 },
      }),
    }),
  ],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
