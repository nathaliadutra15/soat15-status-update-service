import { Types } from "mongoose";

type StatusEntry = { created_at: Date; name: string };

export type RequestedServiceWithStatus = {
  requested_service_number: number;
  status: StatusEntry[];
};

export type OrderServiceWithRequestedServices = {
  _id: Types.ObjectId;
  service_order_number: number;
  requested_services: number[];
  status: StatusEntry[];
  createdAt: Date;
  updatedAt: Date;
  requested_services_data: RequestedServiceWithStatus[];
};