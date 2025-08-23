
import { errorHandler } from "../../src/middleware/errorHandler";
import { Request, Response } from "express";

describe("errorHandler middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();
    mockReq = {};
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  it("debería retornar 500 por defecto", () => {
    const error = new Error("Algo falló");
    errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { message: "Algo falló", details: null },
      })
    );
  });

  it("debería retornar el status y detalles definidos", () => {
    const error: any = new Error("Recurso no encontrado");
    error.status = 404;
    error.details = { id: 123 };

    errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());
    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          message: "Recurso no encontrado",
          details: { id: 123 },
        },
      })
    );
  });
});


/apps/dao-voting/package.json (fragmento actualizado)

{
  "scripts": {
    "test:middleware": "jest tests/middleware/**/*.test.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N356.

