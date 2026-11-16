import { IsInt, IsString } from 'class-validator';

export class RequestedServiceDTO {
  requested_service_number?: number;

  @IsInt()
  service_order_number: number;

  @IsString()
  status: string;
}
