import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Formato de email inválido' })
  @MaxLength(255, { message: 'El email es demasiado largo' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'La contraseña es requerida' })
  @MaxLength(255, { message: 'La contraseña es demasiado larga' })
  password: string;
}
