import { describe, expect, it } from "vitest";
import {
  buildSmnSnapshot,
  parseSmnDateTime,
  parseSmnObservations,
  parseSmnSnapshot,
  parseSmnStations,
} from "@/infrastructure/smn/smnPayload";
import {
  createOfficialObservation,
  smnObservationsText,
  smnStationLine,
  smnStationsText,
} from "../../support/smnFixtures";

const rosario = {
  name: "ROSARIO AERO",
  province: "SANTA FE",
  location: { latitude: -32.9, longitude: -60.766666666666666 },
};

describe("parseSmnStations", () => {
  it("lee las columnas y convierte grados y minutos", () => {
    const stations = parseSmnStations(smnStationsText);

    expect(stations.get("ROSARIO AERO")).toEqual(rosario);
    expect(stations.get("CORDOBA AERO")?.location).toEqual({
      latitude: -31.316666666666666,
      longitude: -64.2,
    });
  });

  it("descarta lineas incompletas o sin coordenadas validas", () => {
    const text = [
      "encabezado",
      "subencabezado",
      "",
      smnStationLine("", "SANTA FE", "-32", "54", "-60", "46"),
      smnStationLine("SIN PROVINCIA", "", "-32", "54", "-60", "46"),
      smnStationLine("MINUTOS INVALIDOS", "SANTA FE", "-32", "60", "-60", "46"),
      smnStationLine("GRADOS INVALIDOS", "SANTA FE", "abc", "54", "-60", "46"),
      smnStationLine("CORTA", "SANTA FE", "-32", "54", "-60", "46").slice(0, 90),
    ].join("\n");

    expect(parseSmnStations(text).size).toBe(0);
  });
});

describe("parseSmnDateTime", () => {
  it("interpreta la hora oficial argentina", () => {
    expect(parseSmnDateTime("23-octubre-2026", "16:00")?.toISOString()).toBe(
      "2026-10-23T19:00:00.000Z",
    );
  });

  it("rechaza formatos y valores fuera de rango", () => {
    expect(parseSmnDateTime("2026-10-23", "16:00")).toBeNull();
    expect(parseSmnDateTime("23-octubre-2026", "25:00")).toBeNull();
    expect(parseSmnDateTime("23-otro-2026", "16:00")).toBeNull();
    expect(parseSmnDateTime("23-octubre-2026", "24:00")).toBeNull();
    expect(parseSmnDateTime("23-octubre-2026", "16:61")).toBeNull();
    expect(parseSmnDateTime("32-octubre-2026", "16:00")).toBeNull();
    expect(parseSmnDateTime("23", "16:00")).toBeNull();
    expect(parseSmnDateTime("23-octubre", "16:00")).toBeNull();
    expect(parseSmnDateTime("31-abril-2026", "16:00")).toBeNull();
  });
});

describe("parseSmnObservations", () => {
  it("lee el estado del tiempo sin completar valores", () => {
    const [observation] = parseSmnObservations(smnObservationsText);

    expect(observation).toEqual({
      stationName: "ROSARIO AERO",
      observedAt: new Date("2026-10-23T19:00:00.000Z"),
      condition: "Parcialmente nublado",
      visibilityKilometres: 15,
      temperatureCelsius: 16.1,
      apparentTemperatureCelsius: null,
      relativeHumidityPercent: 79,
      windDirectionText: "Sur",
      windSpeedKilometresPerHour: 16,
      pressureHectopascals: 993.6,
    });
  });

  it("interpreta comas decimales y viento sin velocidad", () => {
    const [observation] = parseSmnObservations(
      "CORDOBA AERO;23-octubre-2026;15:00;;;14,5;13,8; 81;Calma;1000,9 / ",
    );

    expect(observation?.condition).toBeNull();
    expect(observation?.visibilityKilometres).toBeNull();
    expect(observation?.temperatureCelsius).toBe(14.5);
    expect(observation?.apparentTemperatureCelsius).toBe(13.8);
    expect(observation?.windDirectionText).toBe("Calma");
    expect(observation?.windSpeedKilometresPerHour).toBeNull();
    expect(observation?.pressureHectopascals).toBe(1000.9);
  });

  it("descarta lineas incompletas o sin fecha valida", () => {
    const observations = parseSmnObservations(
      [
        "ROSARIO AERO;23-octubre-2026",
        ";;;;",
        ";23-octubre-2026;16:00;;;;;;",
        "ROSARIO AERO;fecha;16:00;;;;;;",
        "  ;23-octubre-2026;16:00;Despejado;15 km;16;16;70;Sur 5;1000",
        "ROSARIO AERO;23-octubre-2026;16:00;Despejado;15 km;16;16;70;Sur 5",
        "ROSARIO AERO;23-octubre-2026;16:00;Despejado;15 km;16;16;70;Sur",
      ].join("\n"),
    );

    expect(observations).toEqual([]);
  });

  it("conserva el texto de una direccion sin numero", () => {
    const [observation] = parseSmnObservations(
      "ROSARIO AERO;23-octubre-2026;16:00;Despejado;15 km;16;16;70;Norte;1000",
    );

    expect(observation?.windDirectionText).toBe("Norte");
    expect(observation?.windSpeedKilometresPerHour).toBeNull();
  });

  it("interpreta presion sin barra", () => {
    const [observation] = parseSmnObservations(
      "ROSARIO AERO;23-octubre-2026;16:00;Despejado;15 km;16;16;70;Sur 5;1000",
    );

    expect(observation?.pressureHectopascals).toBe(1000);
  });

  it("descarta observacion con estacion vacia", () => {
    expect(
      parseSmnObservations("   ;23-octubre-2026;16:00;Despejado;15 km;16;16;70;Sur 5;1000"),
    ).toEqual([]);
  });
});

describe("buildSmnSnapshot", () => {
  it("cruza estaciones y observaciones por nombre", () => {
    const snapshot = buildSmnSnapshot(smnStationsText, smnObservationsText);

    expect(snapshot.source).toBe("SMN - Servicio Meteorologico Nacional");
    expect(snapshot.observations).toHaveLength(2);
    expect(snapshot.observations[0]?.stationName).toBe("ROSARIO AERO");
    expect(snapshot.observations[1]?.temperatureCelsius).toBe(14.5);
  });

  it("descarta observaciones sin estacion conocida", () => {
    const snapshot = buildSmnSnapshot(
      smnStationsText,
      "ESTACION DESCONOCIDA;23-octubre-2026;16:00;Despejado;15 km;16;16;70;Sur 5;1000",
    );

    expect(snapshot.observations).toEqual([]);
  });

  it("normaliza espacios en el nombre de la estacion", () => {
    const snapshot = buildSmnSnapshot(
      smnStationsText,
      "  ROSARIO AERO  ;23-octubre-2026;16:00;Despejado;15 km;16;16;70;Sur 5;1000",
    );

    expect(snapshot.observations[0]?.stationName).toBe("ROSARIO AERO");
  });
});

describe("parseSmnSnapshot", () => {
  it("reconstruye la instantanea entregada por el proxy", () => {
    const snapshot = parseSmnSnapshot({
      source: "SMN",
      observations: [
        {
          ...createOfficialObservation(),
          observedAt: "2026-10-23T19:00:00.000Z",
        },
      ],
    });

    expect(snapshot?.source).toBe("SMN");
    expect(snapshot?.observations[0]?.observedAt).toEqual(new Date("2026-10-23T19:00:00.000Z"));
  });

  it("usa el nombre de fuente por defecto", () => {
    expect(parseSmnSnapshot({ observations: [] })?.source).toBe(
      "SMN - Servicio Meteorologico Nacional",
    );
  });

  it("descarta observaciones invalidas", () => {
    const snapshot = parseSmnSnapshot({
      observations: [
        null,
        { stationName: "ROSARIO AERO" },
        {
          ...createOfficialObservation(),
          observedAt: "no-es-fecha",
        },
        {
          ...createOfficialObservation(),
          location: { latitude: "sur", longitude: -60 },
        },
        {
          ...createOfficialObservation(),
          province: "",
        },
      ],
    });

    expect(snapshot?.observations).toEqual([]);
  });

  it("rechaza una respuesta que no es una instantanea", () => {
    expect(parseSmnSnapshot(null)).toBeNull();
    expect(parseSmnSnapshot({ observations: "no" })).toBeNull();
    expect(parseSmnSnapshot([])).toBeNull();
  });
});
