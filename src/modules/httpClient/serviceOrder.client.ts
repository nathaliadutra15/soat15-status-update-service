import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpClient } from './httpClient.service';

@Injectable()
export class ServiceOrderClient extends HttpClient {
  protected serviceUrl: string = process.env.SERVICE_ORDER_URL ?? '';

  constructor(http: HttpService) { super(http); }

  async getRequestedService(id: number) {
    try {
      const { data } = await super.get(`/services-order/requested/${id}`);
      return data;
    }
    catch {
      throw new HttpException('Upstream service unavailable', HttpStatus.BAD_GATEWAY);
    }
  }

  async getServiceOrder(id: number) {
    try {
      const { data } = await super.get(`/services-order/${id}`);
      return data;
    }
    catch {
      throw new HttpException('Upstream service unavailable', HttpStatus.BAD_GATEWAY);
    }
  }
}