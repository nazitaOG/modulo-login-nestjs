import { Role } from '@prisma/client';
import {
  IsEmail,
  MaxLength,
  IsString,
  IsOptional,
  MinLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  readonly email: string;

  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message:
      'El nombre solo puede contener letras y caracteres gramaticales válidos.',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  readonly firstName?: string;

  @IsString({ message: 'El apellido debe ser una cadena de texto.' })
  @IsOptional()
  @MinLength(2, { message: 'El apellido es demasiado corto.' })
  @MaxLength(100, {
    message: 'El apellido no puede superar los 100 caracteres.',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message:
      'El apellido solo puede contener letras y caracteres gramaticales válidos.',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  readonly lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Matches(/\.(jpg|jpeg|png|webp|avif)$/, {
    message:
      'La URL de la imagen debe terminar en un formato de imagen válido.',
  })
  readonly picture?: string;

  @IsEnum(Role, {
    message: `El rol debe ser uno de los siguientes valores: ${Object.values(Role).join(', ')}`,
  })
  @IsOptional()
  readonly role?: Role;
}
