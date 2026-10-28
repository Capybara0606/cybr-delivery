import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from "vitest";
import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
const config = process.env.CYBR_TEST_DB
  ? JSON.parse(process.env.CYBR_TEST_DB)
  : null;
const R = "a0000000-0000-4000-8000-000000000001";
const OTHER = "a0000000-0000-4000-8000-000000000099";
const OWNER = "10000000-0000-4000-8000-000000000001",
  STAFF = "10000000-0000-4000-8000-000000000002",
  CARLOS = "10000000-0000-4000-8000-000000000003",
  ANDREA = "10000000-0000-4000-8000-000000000004",
  STRANGER = "10000000-0000-4000-8000-000000000005",
  OTHER_OWNER = "10000000-0000-4000-8000-000000000006";
const DRIVER = "f0000000-0000-4000-8000-000000000001",
  SECOND_DRIVER = "f0000000-0000-4000-8000-000000000002";
const CATEGORY = "b0000000-0000-4000-8000-000000000001";
let db: Client;
async function actor(user: string, client = db) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
    user,
  ]);
}
async function superuser(client = db) {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claim.sub','',true)");
}
async function errorCode(operation: () => Promise<unknown>, code: string) {
  await db.query("savepoint denied");
  try {
    await expect(operation()).rejects.toMatchObject({ code });
  } finally {
    await db.query("rollback to savepoint denied");
  }
}
async function order(client = db) {
  const address = randomUUID(),
    id = randomUUID();
  await client.query(
    "insert into public.delivery_addresses(id,restaurant_id,address,location) values($1,$2,'Dirección ficticia',extensions.st_setsrid(extensions.st_makepoint(-89.2182,13.6929),4326)::extensions.geography)",
    [address, R],
  );
  await client.query(
    "insert into public.orders(id,restaurant_id,address_id,customer_name,customer_phone,subtotal_cents,delivery_fee_cents,idempotency_key,request_hash,tracking_token_hash,delivery_code_hash) values($1,$2,$3,'Cliente demo','+50370000000',975,200,$4,repeat('a',64),$5,'hash-only-test')",
    [
      id,
      R,
      address,
      randomUUID(),
      randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", ""),
    ],
  );
  await client.query(
    "insert into public.order_items(restaurant_id,order_id,product_id,product_name,unit_price_cents,quantity,line_total_cents) values($1,$2,'c0000000-0000-4000-8000-000000000001','Capuchino',350,2,700)",
    [R, id],
  );
  await client.query(
    "insert into public.order_items(restaurant_id,order_id,product_id,product_name,unit_price_cents,quantity,line_total_cents) values($1,$2,'c0000000-0000-4000-8000-000000000007','Croissant',275,1,275)",
    [R, id],
  );
  await client.query(
    "insert into public.payments(restaurant_id,order_id,amount_cents) values($1,$2,1175)",
    [R, id],
  );
  return { id, address };
}
async function ready(id: string, client = db) {
  await actor(STAFF, client);
  for (const s of ["accepted", "preparing", "ready_for_pickup"])
    await client.query("select public.advance_order($1,$2)", [id, s]);
}

describe.skipIf(!config)(
  "PostgreSQL/PostGIS foundation with actual RLS roles",
  () => {
    beforeAll(async () => {
      db = new Client(config);
      await db.connect();
      await db.query(readFileSync("tests/database/bootstrap.sql", "utf8"));
      for (const file of readdirSync("supabase/migrations")
        .filter((f) => f.endsWith(".sql"))
        .sort())
        await db.query(readFileSync(`supabase/migrations/${file}`, "utf8"));
      await db.query(readFileSync("supabase/seed.sql", "utf8"));
      await db.query(readFileSync("supabase/seed.sql", "utf8"));
      for (const user of [OWNER, STAFF, CARLOS, ANDREA, STRANGER, OTHER_OWNER])
        await db.query(
          'insert into auth.users(id,raw_user_meta_data) values($1,\'{"full_name":"Test user","role":"owner"}\')',
          [user],
        );
      await db.query(
        "insert into public.restaurants(id,name,slug,pickup_address,location) values($1,'Isolation fixture','isolation','Ficticia',extensions.st_setsrid(extensions.st_makepoint(-89.2,13.7),4326)::extensions.geography)",
        [OTHER],
      );
      await db.query(
        "insert into public.restaurant_members(restaurant_id,user_id,role) values($1,$2,'owner'),($1,$3,'staff'),($1,$4,'driver'),($1,$5,'driver'),($6,$7,'owner')",
        [R, OWNER, STAFF, CARLOS, ANDREA, OTHER, OTHER_OWNER],
      );
      await db.query("update public.drivers set user_id=$1 where id=$2", [
        CARLOS,
        DRIVER,
      ]);
      await db.query("update public.drivers set user_id=$1 where id=$2", [
        ANDREA,
        SECOND_DRIVER,
      ]);
      await db.query("update public.drivers set is_available=true");
    }, 30000);
    afterAll(async () => {
      await db?.end();
    });
    beforeEach(async () => {
      await db.query("begin");
    });
    afterEach(async () => {
      await db.query("rollback");
    });
    it("applies all 17 RLS tables and repeatable demo seed", async () => {
      const { rows } = await db.query(
        "select count(*)::int as n from pg_tables where schemaname='public' and rowsecurity",
      );
      expect(rows[0].n).toBe(18);
      expect(
        (await db.query("select count(*)::int as n from public.products"))
          .rows[0].n,
      ).toBe(12);
      expect(
        (await db.query("select count(*)::int as n from public.categories"))
          .rows[0].n,
      ).toBe(4);
      expect(
        (await db.query("select count(*)::int as n from public.drivers"))
          .rows[0].n,
      ).toBe(2);
    });
    it("anonymous can read catalog but cannot read customers or create orders", async () => {
      await db.query("set local role anon");
      expect((await db.query("select id from public.products")).rowCount).toBe(
        12,
      );
      await errorCode(
        () => db.query("select customer_phone from public.orders"),
        "42501",
      );
      await errorCode(
        () => db.query("insert into public.orders default values"),
        "42501",
      );
    });
    it("anonymous cannot see inactive catalog entries", async () => {
      await db.query(
        "update public.categories set is_active=false where id=$1",
        [CATEGORY],
      );
      await db.query("set local role anon");
      expect((await db.query("select id from public.products")).rowCount).toBe(
        9,
      );
      expect(
        (await db.query("select id from public.product_options")).rowCount,
      ).toBe(0);
    });
    it("auth metadata never grants owner membership", async () => {
      await actor(STRANGER);
      expect(
        (await db.query("select role from public.restaurant_members")).rowCount,
      ).toBe(0);
      await errorCode(
        () =>
          db.query(
            "insert into public.restaurant_members values($1,$2,'owner')",
            [R, STRANGER],
          ),
        "42501",
      );
    });
    it("staff can edit own menu but other installation cannot", async () => {
      await actor(STAFF);
      expect(
        (
          await db.query(
            "update public.products set price_cents=400 where restaurant_id=$1 returning id",
            [R],
          )
        ).rowCount,
      ).toBe(12);
      await actor(OTHER_OWNER);
      expect(
        (
          await db.query(
            "update public.products set price_cents=1 where restaurant_id=$1 returning id",
            [R],
          )
        ).rowCount,
      ).toBe(0);
    });
    it("rejects category cross-reference and negative prices", async () => {
      await errorCode(
        () =>
          db.query(
            "insert into public.products(restaurant_id,category_id,name,price_cents) values($1,$2,'Cross',100)",
            [OTHER, CATEGORY],
          ),
        "23503",
      );
      await errorCode(
        () => db.query("update public.products set price_cents=-1"),
        "23514",
      );
    });
    it("prevents catalog-only staff from changing settings; owner may", async () => {
      await actor(STAFF);
      expect(
        (
          await db.query(
            "update public.restaurant_settings set delivery_fee_cents=1 returning restaurant_id",
          )
        ).rowCount,
      ).toBe(0);
      await actor(OWNER);
      expect(
        (
          await db.query(
            "update public.restaurant_settings set delivery_fee_cents=250 returning restaurant_id",
          )
        ).rowCount,
      ).toBe(1);
    });
    it("validates actual PostGIS coverage and coordinate bounds", async () => {
      await db.query("set local role anon");
      const a = await db.query(
        "select * from public.check_delivery_coverage(13.6929,-89.2182) where restaurant_id=$1",
        [R],
      );
      expect(a.rows[0]).toMatchObject({
        is_covered: true,
        delivery_fee_cents: 200,
      });
      expect(
        (
          await db.query(
            "select * from public.check_delivery_coverage(14,-89) where restaurant_id=$1",
            [R],
          )
        ).rows[0].is_covered,
      ).toBe(false);
      await errorCode(
        () => db.query("select * from public.check_delivery_coverage(91,0)"),
        "22023",
      );
      await errorCode(
        () => db.query("select * from public.check_delivery_coverage('NaN',0)"),
        "22023",
      );
    });
    it("keeps exact totals and blocks direct price/status changes", async () => {
      const o = await order();
      await actor(STAFF);
      expect(
        (
          await db.query("select total_cents from public.orders where id=$1", [
            o.id,
          ])
        ).rows[0].total_cents,
      ).toBe(1175);
      await errorCode(
        () =>
          db.query("update public.orders set subtotal_cents=1 where id=$1", [
            o.id,
          ]),
        "42501",
      );
      await errorCode(
        () =>
          db.query("update public.orders set status='delivered' where id=$1", [
            o.id,
          ]),
        "42501",
      );
    });
    it("hides token hashes even from staff table queries", async () => {
      await order();
      await actor(OWNER);
      await errorCode(
        () =>
          db.query(
            "select tracking_token_hash,delivery_code_hash from public.orders",
          ),
        "42501",
      );
    });
    it("preserves historical item prices when current catalog changes", async () => {
      const o = await order();
      await actor(STAFF);
      await db.query(
        "update public.products set price_cents=999 where id='c0000000-0000-4000-8000-000000000001'",
      );
      const result = await db.query(
        "select sum(line_total_cents)::int as subtotal from public.order_items where order_id=$1",
        [o.id],
      );
      expect(result.rows[0].subtotal).toBe(975);
      await errorCode(
        () => db.query("update public.order_items set unit_price_cents=1"),
        "42501",
      );
    });
    it("enforces unique idempotency keys", async () => {
      const o = await order();
      await errorCode(
        () =>
          db.query(
            "insert into public.orders(restaurant_id,address_id,customer_name,customer_phone,subtotal_cents,delivery_fee_cents,idempotency_key,request_hash,tracking_token_hash,delivery_code_hash) select restaurant_id,address_id,customer_name,customer_phone,subtotal_cents,delivery_fee_cents,idempotency_key,request_hash,repeat('d',64),delivery_code_hash from public.orders where id=$1",
            [o.id],
          ),
        "23505",
      );
    });
    it("advances through legal states and writes actor audit", async () => {
      const o = await order();
      await ready(o.id);
      const h = await db.query(
        "select new_status,actor_id from public.order_status_history where order_id=$1 order by id",
        [o.id],
      );
      expect(h.rows.map((r) => r.new_status)).toEqual([
        "pending",
        "accepted",
        "preparing",
        "ready_for_pickup",
      ]);
      expect(h.rows[3].actor_id).toBe(STAFF);
      await errorCode(
        () => db.query("delete from public.order_status_history"),
        "42501",
      );
    });
    it("rejects state skips, outsiders and driver kitchen transitions", async () => {
      const o = await order();
      await actor(STAFF);
      await errorCode(
        () =>
          db.query("select public.advance_order($1,'ready_for_pickup')", [
            o.id,
          ]),
        "23514",
      );
      for (const id of [STRANGER, OTHER_OWNER, CARLOS]) {
        await actor(id);
        await errorCode(
          () => db.query("select public.advance_order($1,'accepted')", [o.id]),
          "42501",
        );
      }
    });
    it("driver availability only affects self and cannot escalate role", async () => {
      await actor(CARLOS);
      await db.query("select public.set_driver_availability(false)");
      expect(
        (await db.query("select is_available from public.drivers")).rows,
      ).toEqual([{ is_available: false }]);
      await errorCode(
        () => db.query("update public.drivers set user_id=$1", [STRANGER]),
        "42501",
      );
      await actor(STAFF);
      await errorCode(
        () => db.query("select public.set_driver_availability(true)"),
        "42501",
      );
    });
    it("offers assignment exclusively and exposes only assigned address to its driver", async () => {
      const o = await order(),
        otherOrder = await order();
      await ready(o.id);
      const a = await db.query("select public.offer_assignment($1,$2) as id", [
        o.id,
        DRIVER,
      ]);
      await actor(CARLOS);
      expect((await db.query("select id from public.orders")).rows).toEqual([
        { id: o.id },
      ]);
      expect(
        (await db.query("select id from public.delivery_addresses")).rows,
      ).toEqual([{ id: o.address }]);
      expect(
        (await db.query("select id from public.order_items")).rowCount,
      ).toBe(2);
      await db.query("select public.respond_assignment($1,true)", [
        a.rows[0].id,
      ]);
      await actor(ANDREA);
      expect((await db.query("select id from public.orders")).rowCount).toBe(0);
      await errorCode(
        () =>
          db.query("select public.respond_assignment($1,true)", [a.rows[0].id]),
        "42501",
      );
      expect(otherOrder.id).not.toBe(o.id);
    });
    it("rejects unavailable driver and duplicate active assignment", async () => {
      const o = await order(),
        o2 = await order();
      await db.query(
        "update public.drivers set is_available=false where id=$1",
        [DRIVER],
      );
      await ready(o.id);
      await errorCode(
        () => db.query("select public.offer_assignment($1,$2)", [o.id, DRIVER]),
        "23514",
      );
      await superuser();
      await db.query("update public.drivers set is_available=true");
      await actor(STAFF);
      await db.query("select public.offer_assignment($1,$2)", [o.id, DRIVER]);
      await ready(o2.id);
      await errorCode(
        () =>
          db.query("select public.offer_assignment($1,$2)", [o2.id, DRIVER]),
        "23505",
      );
    });
    it("rejection releases assignment and returns order to pickup queue", async () => {
      const o = await order();
      await ready(o.id);
      const a = await db.query("select public.offer_assignment($1,$2) as id", [
        o.id,
        DRIVER,
      ]);
      await actor(CARLOS);
      await db.query("select public.respond_assignment($1,false)", [
        a.rows[0].id,
      ]);
      const ownHistory = (
        await db.query("select public.driver_workspace() as workspace")
      ).rows[0].workspace.history;
      expect(ownHistory[0].assignment_status).toBe("rejected");
      expect((await db.query("select id from public.orders")).rowCount).toBe(0);
      await actor(STAFF);
      expect(
        (await db.query("select status from public.orders where id=$1", [o.id]))
          .rows[0].status,
      ).toBe("ready_for_pickup");
      await db.query("select public.offer_assignment($1,$2)", [
        o.id,
        SECOND_DRIVER,
      ]);
    });
    it("cancel atomically frees driver, cancels payment, removes last location and cuts access", async () => {
      const o = await order();
      await ready(o.id);
      const a = await db.query("select public.offer_assignment($1,$2) as id", [
        o.id,
        DRIVER,
      ]);
      await actor(CARLOS);
      await db.query("select public.respond_assignment($1,true)", [
        a.rows[0].id,
      ]);
      await superuser();
      await db.query(
        "insert into public.driver_locations(assignment_id,restaurant_id,location,accuracy_m,recorded_at) values($1,$2,extensions.st_setsrid(extensions.st_makepoint(-89.21,13.69),4326)::extensions.geography,10,now())",
        [a.rows[0].id, R],
      );
      await actor(STAFF);
      await db.query("select public.cancel_order($1)", [o.id]);
      expect(
        (
          await db.query(
            "select status from public.payments where order_id=$1",
            [o.id],
          )
        ).rows[0].status,
      ).toBe("cancelled");
      expect(
        (await db.query("select assignment_id from public.driver_locations"))
          .rowCount,
      ).toBe(0);
      await actor(CARLOS);
      expect((await db.query("select id from public.orders")).rowCount).toBe(0);
      await actor(STAFF);
      await errorCode(
        () => db.query("select public.advance_order($1,'accepted')", [o.id]),
        "23514",
      );
    });
    it("only owner may cancel after pickup", async () => {
      const o = await order();
      await ready(o.id);
      await db.query("select public.offer_assignment($1,$2)", [o.id, DRIVER]);
      await superuser();
      await db.query(
        "update public.orders set status='picked_up' where id=$1",
        [o.id],
      );
      await actor(STAFF);
      await errorCode(
        () => db.query("select public.cancel_order($1)", [o.id]),
        "42501",
      );
      await actor(OWNER);
      await db.query("select public.cancel_order($1)", [o.id]);
    });
    it("no client can publish GPS or read payment outside staff role", async () => {
      await actor(CARLOS);
      await errorCode(
        () => db.query("insert into public.driver_locations default values"),
        "42501",
      );
      expect((await db.query("select id from public.payments")).rowCount).toBe(
        0,
      );
    });
    it("bucket paths enforce restaurant ownership and disallow other buckets", async () => {
      await actor(STAFF);
      await db.query(
        "insert into storage.objects(bucket_id,name) values($1,$2)",
        ["product-images", `${R}/photo.webp`],
      );
      await actor(OTHER_OWNER);
      await errorCode(
        () =>
          db.query(
            "insert into storage.objects(bucket_id,name) values($1,$2)",
            ["product-images", `${R}/other.webp`],
          ),
        "42501",
      );
      await actor(STAFF);
      await errorCode(
        () =>
          db.query(
            "insert into storage.objects(bucket_id,name) values($1,$2)",
            ["product-images", "not-a-uuid/photo.webp"],
          ),
        "42501",
      );
    });
    it("trusted provisioning cannot be invoked by browser roles", async () => {
      await actor(STAFF);
      await errorCode(
        () =>
          db.query("select public.provision_member($1,$2,'owner',null)", [
            R,
            STRANGER,
          ]),
        "42501",
      );
      await db.query("set local role anon");
      await errorCode(
        () =>
          db.query("select public.provision_member($1,$2,'owner',null)", [
            R,
            STRANGER,
          ]),
        "42501",
      );
    });
    it("service provisioning atomically links driver and cannot overwrite an occupied profile", async () => {
      await db.query("set local role service_role");
      await errorCode(
        () =>
          db.query("select public.provision_member($1,$2,'driver',$3)", [
            R,
            STRANGER,
            DRIVER,
          ]),
        "23514",
      );
      await superuser();
      expect(
        (
          await db.query(
            "select role from public.restaurant_members where user_id=$1",
            [STRANGER],
          )
        ).rowCount,
      ).toBe(0);
    });
    it("service provisioning grants explicit staff only to existing users", async () => {
      await db.query("set local role service_role");
      await db.query("select public.provision_member($1,$2,'staff',null)", [
        R,
        STRANGER,
      ]);
      await actor(STRANGER);
      expect(
        (
          await db.query(
            "select role from public.restaurant_members where user_id=$1",
            [STRANGER],
          )
        ).rows,
      ).toEqual([{ role: "staff" }]);
    });
    it("rolling back a failed transaction preserves all-or-nothing order writes", async () => {
      const before = (await db.query("select count(*) as n from public.orders"))
        .rows[0].n;
      await db.query("savepoint atomic");
      await order();
      try {
        await db.query(
          "insert into public.order_items(restaurant_id,order_id,product_id,product_name,unit_price_cents,quantity,line_total_cents) values($1,$2,$3,'Invalid',1,0,0)",
          [R, randomUUID(), randomUUID()],
        );
      } catch {
        await db.query("rollback to savepoint atomic");
      }
      expect(
        (await db.query("select count(*) as n from public.orders")).rows[0].n,
      ).toBe(before);
    });
    it("two administrators racing for one order cannot both assign", async () => {
      // Separate connections/committed fixture: real lock contention, not mocked query chains.
      await db.query("rollback");
      const o = await order();
      await db.query("begin");
      await ready(o.id);
      await db.query("commit");
      const c1 = new Client(config),
        c2 = new Client(config);
      await c1.connect();
      await c2.connect();
      try {
        await c1.query("begin");
        await c2.query("begin");
        await actor(STAFF, c1);
        await actor(OWNER, c2);
        await c1.query("select public.offer_assignment($1,$2)", [o.id, DRIVER]);
        const second = c2
          .query("select public.offer_assignment($1,$2)", [o.id, SECOND_DRIVER])
          .then(
            () => ({ ok: true, code: null }),
            (e) => ({ ok: false, code: e.code }),
          );
        await c1.query("commit");
        expect(await second).toEqual({ ok: false, code: "23514" });
        await c2.query("rollback");
        const count = await db.query(
          "select count(*)::int n from public.driver_assignments where order_id=$1 and status in ('offered','accepted')",
          [o.id],
        );
        expect(count.rows[0].n).toBe(1);
      } finally {
        await c1.end();
        await c2.end();
        await db.query("begin");
        await actor(OWNER);
        await db.query("select public.cancel_order($1)", [o.id]);
        await db.query("commit");
        await db.query("begin");
      }
    });
    it("checkout computes 1175 cents, writes all lines/payment and replays safely", async () => {
      await db.query(
        "update public.restaurant_settings set is_accepting_orders=true,opening_hours=$1 where restaurant_id=$2",
        [
          JSON.stringify(
            Object.fromEntries(
              [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ].map((d) => [d, [["00:00", "23:59"]]]),
            ),
          ),
          R,
        ],
      );
      const key = randomUUID(),
        basket = JSON.stringify([
          {
            product_id: "c0000000-0000-4000-8000-000000000001",
            quantity: 2,
            options: [],
          },
          {
            product_id: "c0000000-0000-4000-8000-000000000007",
            quantity: 1,
            options: [],
          },
        ]);
      await db.query("set local role service_role");
      const args = [
        R,
        "Cliente prueba",
        "+50370000000",
        "Calle ficticia 123",
        "",
        13.6929,
        -89.2182,
        basket,
        key,
        "a".repeat(64),
        "b".repeat(64),
        "c".repeat(64),
      ];
      const query =
        "select public.create_guest_order($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) as result";
      const first = (await db.query(query, args)).rows[0].result;
      expect(first.total_cents).toBe(1175);
      expect((await db.query(query, args)).rows[0].result.id).toBe(first.id);
      expect(
        (
          await db.query(
            "select count(*)::int n from public.order_items where order_id=$1",
            [first.id],
          )
        ).rows[0].n,
      ).toBe(2);
      expect(
        (
          await db.query(
            "select amount_cents from public.payments where order_id=$1",
            [first.id],
          )
        ).rows[0].amount_cents,
      ).toBe(1175);
      await errorCode(
        () =>
          db.query(
            query,
            args.map((a, i) => (i === 9 ? "d".repeat(64) : a)),
          ),
        "23505",
      );
      const track = (
        await db.query("select public.guest_order_tracking($1) as data", [
          "b".repeat(64),
        ])
      ).rows[0].data;
      expect(track.total_cents).toBe(1175);
      expect(track.location).toBeUndefined();
    });
    it("checkout denies browser invocation, closed stores and invalid coverage without partial orders", async () => {
      const before = (
        await db.query("select count(*)::int n from public.orders")
      ).rows[0].n;
      const args = [
        R,
        "Cliente",
        "+50370000000",
        "Calle ficticia",
        "",
        13.6929,
        -89.2182,
        JSON.stringify([
          {
            product_id: "c0000000-0000-4000-8000-000000000001",
            quantity: 1,
            options: [],
          },
        ]),
        randomUUID(),
        "a".repeat(64),
        "b".repeat(64),
        "c".repeat(64),
      ];
      const query =
        "select public.create_guest_order($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)";
      await db.query("set local role anon");
      await errorCode(() => db.query(query, args), "42501");
      await db.query("set local role service_role");
      await errorCode(() => db.query(query, args), "23514");
      expect(
        (await db.query("select count(*)::int n from public.orders")).rows[0].n,
      ).toBe(before);
    });
    it("request limiting is persisted and cannot be bypassed with another process", async () => {
      await db.query("set local role service_role");
      for (let i = 0; i < 3; i++)
        expect(
          (
            await db.query(
              "select public.consume_request_limit('test-key',2,60) ok",
            )
          ).rows[0].ok,
        ).toBe(i < 2);
    });

    it("Realtime events contain no customer data and dashboard is staff-only", async () => {
      const o = await order();
      await actor(STAFF);
      const events = await db.query(
        "select * from public.order_events where order_id=$1",
        [o.id],
      );
      expect(events.rows[0]).toHaveProperty("status", "pending");
      expect(events.rows[0]).not.toHaveProperty("customer_phone");
      const dashboard = (
        await db.query("select public.staff_dashboard($1) d", [R])
      ).rows[0].d;
      expect(dashboard.active).toBeGreaterThan(0);
      await actor(CARLOS);
      expect(
        (
          await db.query(
            "select order_id from public.order_events where order_id=$1",
            [o.id],
          )
        ).rowCount,
      ).toBe(0);
      await errorCode(
        () => db.query("select public.staff_dashboard($1)", [R]),
        "42501",
      );
    });

    it("driver completes only its accepted delivery and exact code records cash payment", async () => {
      const o = await order();
      await db.query(
        "update public.orders set delivery_code_hash=encode(extensions.digest('123456','sha256'),'hex') where id=$1",
        [o.id],
      );
      await ready(o.id);
      const a = (
        await db.query("select public.offer_assignment($1,$2) id", [
          o.id,
          DRIVER,
        ])
      ).rows[0].id;
      await actor(CARLOS);
      await db.query("select public.respond_assignment($1,true)", [a]);
      await errorCode(
        () =>
          db.query("select public.driver_progress($1,'on_the_way',null)", [
            o.id,
          ]),
        "23514",
      );
      await db.query("select public.driver_progress($1,'picked_up',null)", [
        o.id,
      ]);
      await db.query("select public.driver_progress($1,'on_the_way',null)", [
        o.id,
      ]);
      const wrong = (
        await db.query(
          "select public.driver_progress($1,'delivered','wrong') result",
          [o.id],
        )
      ).rows[0].result;
      expect(wrong.ok).toBe(false);
      const right = (
        await db.query(
          "select public.driver_progress($1,'delivered',encode(extensions.digest('123456','sha256'),'hex')) result",
          [o.id],
        )
      ).rows[0].result;
      expect(right.ok).toBe(true);
      await superuser();
      expect(
        (
          await db.query(
            "select status,delivery_code_attempts from public.orders where id=$1",
            [o.id],
          )
        ).rows[0],
      ).toEqual({ status: "delivered", delivery_code_attempts: 1 });
      expect(
        (
          await db.query(
            "select status from public.payments where order_id=$1",
            [o.id],
          )
        ).rows[0].status,
      ).toBe("collected");
      expect(
        (
          await db.query(
            "select status from public.driver_assignments where id=$1",
            [a],
          )
        ).rows[0].status,
      ).toBe("completed");
    });
    it("GPS rejects other drivers, stale/invalid positions and stops after cancellation", async () => {
      const o = await order();
      await ready(o.id);
      const a = (
        await db.query("select public.offer_assignment($1,$2) id", [
          o.id,
          DRIVER,
        ])
      ).rows[0].id;
      await actor(CARLOS);
      await db.query("select public.respond_assignment($1,true)", [a]);
      await db.query("select public.driver_progress($1,'picked_up',null)", [
        o.id,
      ]);
      await db.query("select public.driver_progress($1,'on_the_way',null)", [
        o.id,
      ]);
      await actor(ANDREA);
      await errorCode(
        () =>
          db.query(
            "select public.publish_driver_location($1,13.69,-89.21,10,now(),false)",
            [a],
          ),
        "42501",
      );
      await actor(CARLOS);
      await errorCode(
        () =>
          db.query(
            "select public.publish_driver_location($1,13.69,-89.21,10,now()-interval '31 seconds',false)",
            [a],
          ),
        "22023",
      );
      await errorCode(
        () =>
          db.query(
            "select public.publish_driver_location($1,99,-89.21,10,now(),false)",
            [a],
          ),
        "22023",
      );
      await db.query(
        "select public.publish_driver_location($1,13.69,-89.21,10,now(),false)",
        [a],
      );
      expect(
        (await db.query("select assignment_id from public.driver_locations"))
          .rowCount,
      ).toBe(1);
      await actor(OWNER);
      expect(
        (await db.query("select public.staff_active_locations($1) l", [R]))
          .rows[0].l.length,
      ).toBe(1);
      await db.query("select public.cancel_order($1)", [o.id]);
      await actor(CARLOS);
      await errorCode(
        () =>
          db.query(
            "select public.publish_driver_location($1,13.69,-89.21,10,now(),false)",
            [a],
          ),
        "42501",
      );
      expect(
        (await db.query("select assignment_id from public.driver_locations"))
          .rowCount,
      ).toBe(0);
    });
    it("delivery code attempts persist and block brute forcing after five failures", async () => {
      const o = await order();
      await ready(o.id);
      const a = (
        await db.query("select public.offer_assignment($1,$2) id", [
          o.id,
          DRIVER,
        ])
      ).rows[0].id;
      await actor(CARLOS);
      await db.query("select public.respond_assignment($1,true)", [a]);
      await db.query("select public.driver_progress($1,'picked_up',null)", [
        o.id,
      ]);
      await db.query("select public.driver_progress($1,'on_the_way',null)", [
        o.id,
      ]);
      for (let i = 0; i < 5; i++)
        expect(
          (
            await db.query(
              "select public.driver_progress($1,'delivered','bad') r",
              [o.id],
            )
          ).rows[0].r.ok,
        ).toBe(false);
      expect(
        (
          await db.query(
            "select public.driver_progress($1,'delivered','hash-only-test') r",
            [o.id],
          )
        ).rows[0].r.ok,
      ).toBe(false);
      await superuser();
      expect(
        (
          await db.query(
            "select delivery_code_attempts from public.orders where id=$1",
            [o.id],
          )
        ).rows[0].delivery_code_attempts,
      ).toBe(5);
    });

    it("simulated locations are blocked for a real restaurant", async () => {
      const o = await order();
      await db.query(
        "update public.restaurants set is_demo=false where id=$1",
        [R],
      );
      await ready(o.id);
      const a = (
        await db.query("select public.offer_assignment($1,$2) id", [
          o.id,
          DRIVER,
        ])
      ).rows[0].id;
      await actor(CARLOS);
      await db.query("select public.respond_assignment($1,true)", [a]);
      await db.query("select public.driver_progress($1,'picked_up',null)", [
        o.id,
      ]);
      await db.query("select public.driver_progress($1,'on_the_way',null)", [
        o.id,
      ]);
      await errorCode(
        () =>
          db.query(
            "select public.publish_driver_location($1,13.69,-89.21,10,now(),true)",
            [a],
          ),
        "42501",
      );
    });
  },
);
