import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

const PASSWORD_REGEX = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

export class RegisterDto {
  @IsEmail({}, { message: 'Formato de email inválido' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(64, { message: 'La contraseña es demasiado larga' })
  @Matches(PASSWORD_REGEX, {
    message:
      'La contraseña es débil: requiere mayúscula, minúscula y número/caracter especial.',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @IsString()
  @MinLength(2)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;
}
