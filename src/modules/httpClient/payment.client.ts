import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PaymentResponseDto } from '../requestedServiceUpdate/models/payment.model';
import { HttpClient } from './httpClient.service';

@Injectable()
export class PaymentClient extends HttpClient {
  protected serviceUrl: string = `${process.env.PAYMENT_SERVICE_URL}`;

  constructor(http: HttpService) { super(http); }

  async getServiceOrderStatus(id: number) {
    try {
      const { data } = await super.get<PaymentResponseDto>(`/payment/${id}`);
      return data;
    }
    catch {
      throw new HttpException('Upstream service unavailable', HttpStatus.BAD_GATEWAY);
    }
  }
}
