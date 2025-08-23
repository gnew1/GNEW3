
import { paginate } from "../../src/utils/pagination";

describe("paginate util", () => {
  const dataset = Array.from({ length: 45 }, (_, i) => i + 1);

  it("devuelve la primera página con límite por defecto", () => {
    const result = paginate(dataset, {});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.data.length).toBe(10);
  });

  it("devuelve la página solicitada", () => {
    const result = paginate(dataset, { page: 2, limit: 15 });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(15);
    expect(result.data[0]).toBe(16);
    expect(result.data[14]).toBe(30);
  });

  it("maneja página fuera de rango", () => {
    const result = paginate(dataset, { page: 10, limit: 10 });
    expect(result.data.length).toBe(0);
    expect(result.totalPages).toBe(5);
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "test:utils": "jest tests/utils/**/*.test.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N355.

