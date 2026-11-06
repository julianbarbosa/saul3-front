export interface ResponseI {
  message: string;
  data: unknown;
  success?: boolean;
  msg?: string;
  code?: number;
}
