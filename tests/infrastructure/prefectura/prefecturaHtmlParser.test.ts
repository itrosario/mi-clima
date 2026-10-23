import { describe, expect, it } from "vitest";
import {
  parsePrefecturaHistory,
  parsePrefecturaReadings,
  parsePrefecturaTimestamp,
} from "@/infrastructure/prefectura/prefecturaHtmlParser";

const rosarioRow = `
  <tr class="">
    <th data-label="Puerto:">ROSARIO</th>
    <td data-label="Rio:">PARANA</td>
    <td data-label="Ultimo Registro:" class="warning">3.57</td>
    <td data-label="Variacion">0.03</td>
    <td data-label="Periodo">12</td>
    <td data-label="Fecha Hora:"><b>22/OCT/26 - 1200</b></td>
    <td data-label="Estado:">CRECE</td>
    <td><img src="img/arriba.svg" /></td>
    <td data-label="Registro Anterior:">3.54</td>
    <td data-label="Fecha Anterior:">22/OCT/26 - 0000</td>
    <td data-label="Alerta:">5.00</td>
    <td data-label="Evacuacion:">5.30</td>
    <td><a href="/alturas/?page=historico&tiempo=7&id=280">grafico</a></td>
  </tr>
`;

const incompleteRow = `
  <tr>
    <th data-label="Puerto:">SAN NICOLAS</th>
    <td data-label="Rio:">PARANA</td>
    <td data-label="Ultimo Registro:">-</td>
    <td data-label="Variacion">1.234,56</td>
    <td data-label="Periodo">S/E</td>
    <td data-label="Fecha Hora:">22/XXX/26 - 1200</td>
    <td data-label="Estado:">BAJA</td>
    <td data-label="Registro Anterior:">2,50</td>
    <td data-label="Fecha Anterior:">2026-10-22 12:00</td>
    <td data-label="Alerta:"></td>
    <td data-label="Evacuacion:"></td>
    <td><a href="/alturas/?page=historico&id=999">grafico</a></td>
  </tr>
`;

describe("parsePrefecturaTimestamp", () => {
  it("lee la fecha compacta de la tabla en hora argentina", () => {
    expect(parsePrefecturaTimestamp("22/OCT/26 - 1200")?.toISOString()).toBe(
      "2026-10-22T15:00:00.000Z",
    );
  });

  it("lee la fecha con guion de la pagina historica", () => {
    expect(parsePrefecturaTimestamp("2026-10-20 07:30")?.toISOString()).toBe(
      "2026-10-20T10:30:00.000Z",
    );
  });

  it("devuelve null para fechas ausentes o invalidas", () => {
    expect(parsePrefecturaTimestamp(null)).toBeNull();
    expect(parsePrefecturaTimestamp("22/XXX/26 - 1200")).toBeNull();
    expect(parsePrefecturaTimestamp("32/OCT/26 - 1200")).toBeNull();
    expect(parsePrefecturaTimestamp("sin fecha")).toBeNull();
  });
});

describe("parsePrefecturaReadings", () => {
  it("extrae las filas de puertos con sus umbrales y tendencia", () => {
    const readings = parsePrefecturaReadings(
      `<table>${rosarioRow}${incompleteRow}<tr><td>ruido</td></tr><tr><th data-label="Puerto:">SIN ID</th></tr></table>`,
    );

    expect(readings).toHaveLength(2);

    const rosario = readings[0];
    expect(rosario?.portId).toBe(280);
    expect(rosario?.portName).toBe("ROSARIO");
    expect(rosario?.riverName).toBe("PARANA");
    expect(rosario?.levelMetres).toBe(3.57);
    expect(rosario?.variationMetres).toBe(0.03);
    expect(rosario?.periodHours).toBe(12);
    expect(rosario?.trend).toBe("rising");
    expect(rosario?.alertLevelMetres).toBe(5);
    expect(rosario?.evacuationLevelMetres).toBe(5.3);
    expect(rosario?.observedAt?.toISOString()).toBe("2026-10-22T15:00:00.000Z");

    const incomplete = readings[1];
    expect(incomplete?.portId).toBe(999);
    expect(incomplete?.levelMetres).toBeNull();
    expect(incomplete?.variationMetres).toBe(1234.56);
    expect(incomplete?.periodHours).toBeNull();
    expect(incomplete?.observedAt).toBeNull();
    expect(incomplete?.trend).toBe("falling");
    expect(incomplete?.alertLevelMetres).toBeNull();
    expect(incomplete?.evacuationLevelMetres).toBeNull();
    expect(incomplete?.previousLevelMetres).toBe(2.5);
    expect(incomplete?.previousObservedAt?.toISOString()).toBe("2026-10-22T15:00:00.000Z");
  });

  it("usa tendencia desconocida cuando no puede interpretar el estado", () => {
    const readings = parsePrefecturaReadings(
      `<tr><th data-label="Puerto:">PUERTO</th><td data-label="Estado:">RARO</td><td><a href="?id=1"></a></td></tr>`,
    );

    expect(readings[0]?.trend).toBe("unknown");
    expect(readings[0]?.riverName).toBe("");
    expect(readings[0]?.levelMetres).toBeNull();
  });

  it("reconoce el estado estacionario", () => {
    const readings = parsePrefecturaReadings(
      `<tr><th data-label="Puerto:">PUERTO</th><td data-label="Estado:">ESTAC.</td><td><a href="?id=1"></a></td></tr>`,
    );

    expect(readings[0]?.trend).toBe("steady");
  });

  it("devuelve una lista vacia cuando no hay tabla", () => {
    expect(parsePrefecturaReadings("<html><body>sin datos</body></html>")).toEqual([]);
  });
});

describe("parsePrefecturaHistory", () => {
  it("ordena, deduplica y convierte los puntos del grafico", () => {
    const html = `
      <script>
        series: [{ data: [[1792508400000,3.52],[1792465200000,3.49],[1792508400000,3.55]] }]
        otra: [[1792422000000,3.49]]
      </script>
    `;
    const points = parsePrefecturaHistory(html);

    expect(points.map((point) => point.value)).toEqual([3.49, 3.49, 3.55]);
    expect(points.map((point) => point.timestamp.toISOString())).toEqual([
      "2026-10-19T15:00:00.000Z",
      "2026-10-20T03:00:00.000Z",
      "2026-10-20T15:00:00.000Z",
    ]);
  });

  it("devuelve una lista vacia sin datos embebidos", () => {
    expect(parsePrefecturaHistory("<html></html>")).toEqual([]);
  });
});
