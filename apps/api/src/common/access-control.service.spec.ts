import type { RequestContext } from "@exetron/types";
import { AccessControlService } from "./access-control.service";

describe("AccessControlService", () => {
  const service = new AccessControlService();

  const tenantMember: RequestContext = {
    userId: "user-1",
    tenantId: "tenant-1",
    scope: "tenant_member",
    roleIds: [],
    permissions: [],
    storeIds: ["store-1"]
  };

  const platformAdmin: RequestContext = {
    userId: "admin-1",
    tenantId: null,
    scope: "platform_admin",
    roleIds: [],
    permissions: [],
    storeIds: []
  };

  it("resolves tenant scope for tenant members", () => {
    expect(service.resolveTenantId(tenantMember, undefined)).toBe("tenant-1");
    expect(service.tenantWhere(tenantMember)).toEqual({ tenantId: "tenant-1" });
  });

  it("accepts explicit tenant ids for platform admins", () => {
    expect(service.resolveTenantId(platformAdmin, "tenant-9")).toBe("tenant-9");
    expect(service.tenantWhere(platformAdmin)).toEqual({});
    expect(service.tenantWhere(platformAdmin, "tenant-9")).toEqual({
      tenantId: "tenant-9"
    });
  });

  it("returns a store filter when member has narrowed store access", () => {
    expect(service.storeFilter(tenantMember)).toEqual({ in: ["store-1"] });
    expect(service.storeFilter(platformAdmin)).toBeUndefined();
  });
});
