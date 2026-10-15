jest.mock("@plum-xoxo/correlation-logger/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock("@utils/db");

import DB from "@utils/db";
import { logger } from "@plum-xoxo/correlation-logger/logger";
import MobikwikTopup from "@vendors/integratedVendors/mobikwikTopup";
import plans from "./fixtures/mobikwikPlans.json";

const buildVendor = (): MobikwikTopup => {
  const config: any = {
    vendorData: { vendorId: 2459, name: "MobikwikTopup", vendorType: "fixedSku" },
    configs: {
      baseUrl: "https://example.com",
      operators: [{ op: "3", name: "BSNL" }, { op: "140", name: "Jio" }],
      agentId: "agent",
      paymentMode: "UPI",
      paymentAccountInfo: "acct",
      remitterName: "Xoxoday",
    },
  };
  return new MobikwikTopup(config);
};

describe("MobikwikTopup.formatProductResponse", () => {
  beforeEach(() => {
    (DB.executeQuery as jest.Mock).mockResolvedValue([
      { filter_value_code: "circle_13", filter_value: "Maharashtra" },
    ]);
  });

  it("builds sku as op_cir_planCode_amount without the decimal", async () => {
    const out = await buildVendor().formatProductResponse([plans[4]]);
    expect(out[0].sku).toBe("140_15_1019241_198");
    expect(out[0].denomination).toBe("198");
  });

  it("skips plans whose sku repeats and keeps the first", async () => {
    const out = await buildVendor().formatProductResponse(plans);
    const skus = out.map((p) => p.sku);
    expect(skus).toEqual([
      "3_13_bsnl-Maharashtra-Goa-local-plans-Rs-169.0_169",
      "3_22_bsnl-UP-WEST-Uttarakhand-full-talktime-plans-Rs-_220",
      "3_22_bsnl-UP-WEST-Uttarakhand-full-talktime-plans-Rs-_500",
      "140_15_1019241_198",
    ]);
    expect(new Set(skus).size).toBe(skus.length);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("plan id 1446281")
    );
  });

  it("keeps plans that share a truncated planCode apart by amount", async () => {
    const out = await buildVendor().formatProductResponse([plans[2], plans[3]]);
    expect(out).toHaveLength(2);
  });

  it("drops the decimal part of fractional amounts in the sku only", async () => {
    const out = await buildVendor().formatProductResponse([{ ...plans[4], amount: 10.6 }]);
    expect(out[0].sku).toBe("140_15_1019241_10");
    expect(out[0].denomination).toBe("10.6");
  });

  it("keeps the payment identity op + cir + amt from the new sku", () => {
    const payload = (buildVendor() as any).buildPaymentPayload({
      sku: "3_13_bsnl-Maharashtra-Goa-local-plans-Rs-169.0_169",
      denomination: "169",
      topupPhoneNumber: "9876543210",
      externalOrderId: "ORD1",
    });
    expect(payload).toMatchObject({ op: "3", cir: "13", amt: "169", cn: "9876543210", reqid: "ORD1" });
  });
});
