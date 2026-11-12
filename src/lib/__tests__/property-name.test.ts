import { describe, it, expect } from "vitest";
import { basePropertyName, buildPropertyPageH1, cityFromLocation } from "@/lib/property-name";

describe("basePropertyName", () => {
  it("cuts an Airbnb-style suffix at the pipe", () => {
    expect(basePropertyName("Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax")).toBe("Cozy 1BR Haven");
  });

  it("cuts at a bare bullet when there's no pipe segment", () => {
    expect(basePropertyName("Spacious 2BR Haven•Netflix•Wi-Fi")).toBe("Spacious 2BR Haven");
  });

  it("strips a dev-DB bracket tag", () => {
    expect(basePropertyName("[dev] Mickey in Lipa | Full Family House | Sleeps 15")).toBe("Mickey in Lipa");
  });

  it("is a no-op on an already-plain name", () => {
    expect(basePropertyName("Mickey in Lipa")).toBe("Mickey in Lipa");
  });
});

describe("cityFromLocation", () => {
  it("takes the first comma-separated segment", () => {
    expect(cityFromLocation("Lipa City, Batangas")).toBe("Lipa City");
  });

  it("is a no-op when there's no comma", () => {
    expect(cityFromLocation("Lipa City")).toBe("Lipa City");
  });
});

describe("buildPropertyPageH1", () => {
  it("names the home and the city, never the Airbnb-style listing title", () => {
    expect(buildPropertyPageH1("Spacious 2BR Haven | Netflix•Wi-Fi•9 Pax", "Lipa City, Batangas")).toBe(
      "Spacious 2BR Haven in Lipa City"
    );
  });

  it("never includes 'Airbnb' or a pipe/bullet", () => {
    const h1 = buildPropertyPageH1("Cozy 1BR Haven | Solar Power•Netflix•Wi-Fi•5 Pax", "Lipa City, Batangas");
    expect(h1).not.toMatch(/airbnb/i);
    expect(h1).not.toContain("|");
    expect(h1).not.toContain("•");
  });
});
