declare module "cors" {
  import { RequestHandler } from "express";
  type CorsOptions = Record<string, unknown>;
  function cors(options?: CorsOptions): RequestHandler;
  export default cors;
}
