import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { AtLeastOneField } from '../../common/validators/at-least-one-field.validator';

class OmitUpdateUserDto extends OmitType(CreateUserDto, ['email'] as const) {}

export class UpdateUserDto extends PartialType(OmitUpdateUserDto) {
  @AtLeastOneField(['firstName', 'lastName', 'picture', 'role'], {
    message:
      'Debe proporcionar al menos un campo para actualizar (nombre, apellido, foto o rol).',
  })
  private readonly _atLeastOne!: true;
}
