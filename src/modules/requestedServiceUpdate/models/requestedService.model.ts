import { IsDateString, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StatusDTO {
    @IsString()
    name: string;

    @IsDateString()
    created_at: Date;
}

export class RequestedServiceDTO {
    @IsInt()
    requested_service_number: number;

    @IsInt()
    service_order_number: number;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => StatusDTO)
    status: StatusDTO;
}

