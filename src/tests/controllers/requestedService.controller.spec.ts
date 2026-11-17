import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RequestedServiceController } from '../../modules/requestedServiceUpdate/controllers/requestedService.controller';
import { RequestedServicesStatus } from '../../modules/requestedServiceUpdate/enums/status.enum';
import { RequestedServiceDTO } from '../../modules/requestedServiceUpdate/models/requestedService.model';
import { RequestedServiceService } from '../../modules/requestedServiceUpdate/services/requestedServiceUpdate.service';

describe('RequestedServiceController', () => {
  let controller: RequestedServiceController;

  const mockRequestedServiceService = {
    create: jest.fn() as jest.MockedFunction<any>,
    deliver: jest.fn() as jest.MockedFunction<any>,
    execution: jest.fn() as jest.MockedFunction<any>,
    finish: jest.fn() as jest.MockedFunction<any>,
    getRequestedServiceStatusHistory: jest.fn() as jest.MockedFunction<any>,
    orderResponse: jest.fn() as jest.MockedFunction<any>,
    review: jest.fn() as jest.MockedFunction<any>,
    waiting: jest.fn() as jest.MockedFunction<any>,
  };

  const mockResponse = {
    send: jest.fn() as jest.MockedFunction<any>,
    status: jest.fn() as jest.MockedFunction<any>,
  } as unknown as Response;

  const mockHistory = {
    _id: '665a1b2c3d4e5f6a7b8c9d0e',
    requested_service_number: 1,
    service_order_number: 42,
    status: [
      { created_at: new Date('2026-11-01T00:00:00Z'), name: RequestedServicesStatus.RECEBIDA },
      { created_at: new Date('2026-11-02T00:00:00Z'), name: RequestedServicesStatus.EM_DIAGNOSTICO },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestedServiceController],
      providers: [
        {
          provide: RequestedServiceService,
          useValue: mockRequestedServiceService,
        },
      ],
    }).compile();

    controller = module.get<RequestedServiceController>(RequestedServiceController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestedServiceCreated', () => {
    it('should call create when status is RECEBIDA', async () => {
      mockRequestedServiceService.create.mockResolvedValue([{ _id: 'a' }]);

      const dto: RequestedServiceDTO = { status: RequestedServicesStatus.RECEBIDA } as any;
      const result = await controller.requestedServiceCreated(dto);

      expect(mockRequestedServiceService.create).toHaveBeenCalledWith(dto);
      expect(mockRequestedServiceService.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ _id: 'a' }]);
    });

    it('should call review when status is EM DIAGNÓSTICO', async () => {
      mockRequestedServiceService.review.mockResolvedValue({ acknowledged: true });

      const dto: RequestedServiceDTO = { status: RequestedServicesStatus.EM_DIAGNOSTICO } as any;
      const result = await controller.requestedServiceCreated(dto);

      expect(mockRequestedServiceService.review).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ acknowledged: true });
    });

    it('should call execution when status is EM EXECUÇÃO', async () => {
      mockRequestedServiceService.execution.mockResolvedValue({ acknowledged: true });

      const dto: RequestedServiceDTO = { status: RequestedServicesStatus.EM_EXECUCAO } as any;
      const result = await controller.requestedServiceCreated(dto);

      expect(mockRequestedServiceService.execution).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ acknowledged: true });
    });

    it('should call finish when status is FINALIZADA', async () => {
      mockRequestedServiceService.finish.mockResolvedValue({ acknowledged: true });

      const dto: RequestedServiceDTO = { status: RequestedServicesStatus.FINALIZADA } as any;
      const result = await controller.requestedServiceCreated(dto);

      expect(mockRequestedServiceService.finish).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ acknowledged: true });
    });

    it('should call deliver when status is ENTREGUE', async () => {
      mockRequestedServiceService.deliver.mockResolvedValue(null);

      const dto: RequestedServiceDTO = { status: RequestedServicesStatus.ENTREGUE } as any;
      const result = await controller.requestedServiceCreated(dto);

      expect(mockRequestedServiceService.deliver).toHaveBeenCalledWith(dto);
      expect(result).toBeNull();
    });

    it('should call waiting when status is AGUARDANDO APROVAÇÃO', async () => {
      mockRequestedServiceService.waiting.mockResolvedValue({ acknowledged: true });

      const dto: RequestedServiceDTO = { status: RequestedServicesStatus.AGUARDANDO_APROVACAO } as any;
      const result = await controller.requestedServiceCreated(dto);

      expect(mockRequestedServiceService.waiting).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ acknowledged: true });
    });

    it('should call orderResponse when status is APROVADO', async () => {
      mockRequestedServiceService.orderResponse.mockResolvedValue(undefined);

      const dto: RequestedServiceDTO = { status: RequestedServicesStatus.APROVADO } as any;
      const result = await controller.requestedServiceCreated(dto);

      expect(mockRequestedServiceService.orderResponse).toHaveBeenCalledWith(dto);
      expect(result).toBeUndefined();
    });

    it('should call orderResponse when status is CANCELADO', async () => {
      mockRequestedServiceService.orderResponse.mockResolvedValue(undefined);

      const dto: RequestedServiceDTO = { status: RequestedServicesStatus.CANCELADO } as any;
      const result = await controller.requestedServiceCreated(dto);

      expect(mockRequestedServiceService.orderResponse).toHaveBeenCalledWith(dto);
      expect(result).toBeUndefined();
    });

    it('should throw BadRequestException for invalid status', async () => {
      const dto: RequestedServiceDTO = { status: 'INVALID_STATUS' } as any;

      await expect(controller.requestedServiceCreated(dto)).rejects.toThrow(BadRequestException);
      await expect(controller.requestedServiceCreated(dto)).rejects.toThrow(
        'Status INVALID_STATUS is not valid for requested service update.',
      );
    });

    it('should not call any service method for invalid status', async () => {
      const dto: RequestedServiceDTO = { status: 'BOGUS' } as any;

      try {
        await controller.requestedServiceCreated(dto);
      }
      catch {
        // expected
      }

      expect(mockRequestedServiceService.create).not.toHaveBeenCalled();
      expect(mockRequestedServiceService.review).not.toHaveBeenCalled();
      expect(mockRequestedServiceService.execution).not.toHaveBeenCalled();
      expect(mockRequestedServiceService.finish).not.toHaveBeenCalled();
      expect(mockRequestedServiceService.deliver).not.toHaveBeenCalled();
      expect(mockRequestedServiceService.waiting).not.toHaveBeenCalled();
      expect(mockRequestedServiceService.orderResponse).not.toHaveBeenCalled();
    });

    it('should propagate errors from service', async () => {
      mockRequestedServiceService.create.mockRejectedValue(new Error('DB error'));

      const dto: RequestedServiceDTO = { status: RequestedServicesStatus.RECEBIDA } as any;

      await expect(controller.requestedServiceCreated(dto)).rejects.toThrow('DB error');
    });
  });

  describe('getRequestedServiceStatusHistory', () => {
    it('should return history with 201 status', async () => {
      mockRequestedServiceService.getRequestedServiceStatusHistory.mockResolvedValue(mockHistory);
      (mockResponse.status as jest.MockedFunction<any>).mockReturnValue(mockResponse);

      await controller.getRequestedServiceStatusHistory(1, mockResponse);

      expect(mockRequestedServiceService.getRequestedServiceStatusHistory).toHaveBeenCalledWith(1);
      expect((mockResponse.status as jest.MockedFunction<any>)).toHaveBeenCalledWith(201);
      expect((mockResponse.send as jest.MockedFunction<any>)).toHaveBeenCalledWith(mockHistory);
    });

    it('should return null when history not found', async () => {
      mockRequestedServiceService.getRequestedServiceStatusHistory.mockResolvedValue(null);
      (mockResponse.status as jest.MockedFunction<any>).mockReturnValue(mockResponse);

      await controller.getRequestedServiceStatusHistory(99, mockResponse);

      expect((mockResponse.status as jest.MockedFunction<any>)).toHaveBeenCalledWith(201);
      expect((mockResponse.send as jest.MockedFunction<any>)).toHaveBeenCalledWith(null);
    });

    it('should propagate errors from service', async () => {
      mockRequestedServiceService.getRequestedServiceStatusHistory.mockRejectedValue(new Error('DB error'));

      await expect(controller.getRequestedServiceStatusHistory(1, mockResponse)).rejects.toThrow('DB error');
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(controller.requestedServiceCreated).toBeDefined();
      expect(controller.getRequestedServiceStatusHistory).toBeDefined();
    });
  });
});
