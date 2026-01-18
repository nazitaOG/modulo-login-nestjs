import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { AtLeastOneField } from '../../common/validators/at-least-one-field.validator';

export class UpdateUserDto extends PartialType(
  // Omitimos el email porque suele ser la identidad primaria y no se cambia así nomás
  OmitType(CreateUserDto, ['email'] as const),
) {
  @AtLeastOneField(['firstName', 'lastName', 'picture', 'role'], {
    message:
      'Debe proporcionar al menos un campo para actualizar (nombre, apellido, foto o rol).',
  })
  private readonly _atLeastOne!: true;
}
